import { LeadEventType, LeadStatus, MessageRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sellerAiConfig } from "@/config/seller-ai";
import { formatMoney } from "@/lib/money";
import { getPrisma } from "@/lib/prisma";
import { calculateIntentScore, classifyIntent } from "@/lib/seller-ai/intent";
import { getOrCreateCustomerJourney, updateJourneyCommercialSignals } from "@/lib/seller-ai/journey";
import { ensureSellerLead, logLeadEvent } from "@/lib/seller-ai/leads";
import { buildQuickRepliesForMode, extractCommercialSignals, inferSellerAiMode, type SellerAiMode } from "@/lib/seller-ai/modes";
import { getSellerAiRecommendations, type SellerAiRecommendedProduct } from "@/lib/seller-ai/recommendations";

const chatSchema = z.object({
  leadId: z.string().min(1).optional(),
  journeyId: z.string().min(1).optional(),
  sessionId: z.string().min(6).max(160).optional(),
  storeSlug: z.string().min(1).max(80).optional(),
  message: z.string().min(1).max(1000),
  currentProductId: z.string().optional(),
});

type ProductForReply = {
  id: string;
  name: string;
  description?: string | null;
  priceCents: number;
  currency: string;
  categoryId?: string | null;
  category?: { name: string; slug: string } | null;
};

function includesAny(input: string, words: string[]) {
  const text = input.toLowerCase();
  return words.some((word) => text.includes(word));
}

function priceLine({
  product,
  store,
}: {
  product: ProductForReply;
  store: { currency?: string | null; countryCode?: string | null; locale?: string | null };
}) {
  return `${product.name} está publicado en ${formatMoney({
    amountCents: product.priceCents,
    currency: store.currency ?? product.currency,
    countryCode: store.countryCode ?? "BO",
    locale: store.locale,
  })}.`;
}

function buildAssistantMessage({
  mode,
  userMessage,
  product,
  store,
  detectedNeed,
  recommendations,
}: {
  mode: SellerAiMode;
  userMessage: string;
  product?: ProductForReply | null;
  store: { name: string; commercialType?: string | null; currency?: string | null; countryCode?: string | null; locale?: string | null };
  detectedNeed?: string | null;
  recommendations: SellerAiRecommendedProduct[];
}) {
  const text = userMessage.toLowerCase();
  const recommendationNames = recommendations.slice(0, 3).map((item) => item.name);

  if (mode === "CLOSING_PREP") {
    return "Perfecto. Te dejo la consulta armada para la tienda. ¿A qué WhatsApp pueden escribirte?";
  }

  if (mode === "DECISION_SUPPORT") {
    if (product && includesAny(text, ["precio", "cuánto", "cuanto", "cuesta", "vale", "costo"])) {
      const price = priceLine({ product, store });
      const shipping = includesAny(text, ["envío", "envio", "entrega", "delivery"]) ? " Sobre envío, mejor lo confirma la tienda." : "";
      return `${price}${shipping} Te puedo pasar a WhatsApp con la consulta armada.`;
    }
    if (!product && includesAny(text, ["precio", "cuánto", "cuanto", "cuesta", "vale", "costo"])) {
      const shipping = includesAny(text, ["envío", "envio", "entrega", "delivery"]) ? " Sobre envío, mejor lo confirma la tienda." : "";
      return `El precio te lo muestro aquí si está disponible.${shipping} Te puedo pasar a WhatsApp con la consulta armada.`;
    }
    if (includesAny(text, ["disponible", "stock", "envío", "envio", "garantía", "garantia", "talla", "color", "pago", "descuento"])) {
      const subject = product?.name ? ` de ${product.name}` : "";
      return `Esa duda${subject} conviene confirmarla con la tienda para no inventarte datos. Te puedo pasar a WhatsApp con la consulta armada.`;
    }
    if (recommendationNames.length > 0) {
      return `Para reducir la duda, compararía máximo estas opciones: ${recommendationNames.join(", ")}. ¿Cuál te interesa más?`;
    }
    return "Te ayudo a resolverlo corto: si falta disponibilidad, envío o forma de pago, la tienda lo confirma por WhatsApp con tu consulta armada.";
  }

  if (mode === "PRODUCT_ADVISOR") {
    if (!product) return "Cuéntame qué uso le quieres dar y te recomiendo una opción sin marearte.";
    if (detectedNeed === "fotos") {
      return `Si lo quieres para fotos, conviene priorizar cámara, memoria y batería. ${product.name} puede servirte para redes y uso diario. ¿Quieres que te pase la consulta armada a WhatsApp?`;
    }
    if (detectedNeed) {
      return `${product.name} puede encajar si lo quieres para ${detectedNeed}. ¿Priorizas precio, rapidez o que la tienda confirme disponibilidad?`;
    }
    return `${product.name} puede ser buena opción si encaja con el uso que tienes en mente. ¿Lo buscas para trabajo, regalo o uso diario?`;
  }

  if (detectedNeed && recommendationNames.length > 0) {
    return `Para ${detectedNeed}, empezaría comparando estas opciones: ${recommendationNames.join(", ")}. ¿Quieres precio, disponibilidad o ayuda para elegir una?`;
  }
  if (recommendationNames.length > 0) {
    return `Te puedo orientar con estas opciones: ${recommendationNames.join(", ")}. ¿Lo buscas para ti, para regalar o con presupuesto económico?`;
  }
  return store.commercialType === "MENU" ? "¿Qué se te antoja hoy: algo rápido, carne, pollo o algo para compartir?" : "¿Qué estás buscando hoy: algo para ti, para regalar, económico o lo más recomendado?";
}

export async function POST(request: Request) {
  const parsed = chatSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });

  let lead = parsed.data.leadId
    ? await getPrisma().lead.findUnique({
        where: { id: parsed.data.leadId },
        include: { conversation: { include: { messages: { orderBy: { createdAt: "asc" } } } }, events: true, store: true, journey: true },
      })
    : null;

  if (!lead) {
    if (!parsed.data.storeSlug || !parsed.data.sessionId) return NextResponse.json({ ok: false, error: "Lead not found" }, { status: 404 });
    const store = await getPrisma().store.findUnique({ where: { slug: parsed.data.storeSlug } });
    if (!store || !store.isPublished) return NextResponse.json({ ok: false, error: "Store not found" }, { status: 404 });
    const ensured = await ensureSellerLead({
      storeId: store.id,
      sessionId: parsed.data.sessionId,
      currentProductId: parsed.data.currentProductId,
      source: "seller_ai_chat",
      journeyId: parsed.data.journeyId,
    });
    lead = await getPrisma().lead.findUnique({
      where: { id: ensured.lead.id },
      include: { conversation: { include: { messages: { orderBy: { createdAt: "asc" } } } }, events: true, store: true, journey: true },
    });
  }
  if (!lead || !lead.conversation) return NextResponse.json({ ok: false, error: "Lead not found" }, { status: 404 });

  const { journey } = await getOrCreateCustomerJourney({
    storeId: lead.storeId,
    sessionId: lead.sessionId,
    source: "seller_ai_chat",
    productId: parsed.data.currentProductId ?? lead.currentProductId,
    journeyId: parsed.data.journeyId ?? lead.journeyId,
  });
  if (!lead.journeyId) {
    lead = await getPrisma().lead.update({
      where: { id: lead.id },
      data: { journeyId: journey.id },
      include: { conversation: { include: { messages: { orderBy: { createdAt: "asc" } } } }, events: true, store: true, journey: true },
    });
  }
  const conversation = lead.conversation;
  if (!conversation) return NextResponse.json({ ok: false, error: "Lead not found" }, { status: 404 });

  const userMessageCount = conversation.messages.filter((message) => message.role === MessageRole.USER).length;
  if (userMessageCount >= 30) {
    return NextResponse.json({
      ok: true,
      assistantMessage: sellerAiConfig.reserved.maxMessages,
      quickReplies: [],
      intentScore: lead.intentScore,
      intentLabel: classifyIntent(lead.intentScore),
      shouldShowWhatsappCta: true,
    });
  }

  const product = parsed.data.currentProductId || lead.currentProductId
    ? await getPrisma().product.findFirst({
        where: { id: parsed.data.currentProductId ?? lead.currentProductId ?? undefined, storeId: lead.storeId, isVisible: true },
        include: { category: true },
      })
    : null;
  const signals = extractCommercialSignals(parsed.data.message);

  const userMessage = await getPrisma().conversationMessage.create({
    data: { conversationId: conversation.id, role: MessageRole.USER, content: parsed.data.message, metadata: { journeyId: journey.id, productId: product?.id, signals } },
  });

  await logLeadEvent({
    leadId: lead.id,
    sessionId: lead.sessionId,
    storeId: lead.storeId,
    eventType: LeadEventType.CUSTOMER_MESSAGE_SENT,
    productId: product?.id,
    journeyId: journey.id,
    metadata: { message: parsed.data.message },
  });

  const events = await getPrisma().leadEvent.findMany({ where: { leadId: lead.id } });
  const messagesBeforeReply = [...conversation.messages, userMessage];
  const calculatedIntentScore = calculateIntentScore({ events, messages: messagesBeforeReply, whatsappClicked: lead.status === LeadStatus.WHATSAPP_CLICKED });
  const provisionalIntentScore = Math.min(100, Math.max(calculatedIntentScore, journey.intentScore + signals.intentBoost, lead.intentScore + signals.intentBoost));
  const inferred = inferSellerAiMode({
    currentStage: journey.stage as SellerAiMode,
    hasProductContext: Boolean(product),
    productId: product?.id,
    message: parsed.data.message,
    intentScore: provisionalIntentScore,
    objections: signals.objections,
  });
  const recommendations = await getSellerAiRecommendations({
    storeId: lead.storeId,
    currentProductId: product?.id,
    categoryId: product?.categoryId,
    detectedNeed: signals.detectedNeed ?? journey.detectedNeed,
    budget: signals.budget ?? journey.budget,
  });
  const assistantMessage = buildAssistantMessage({
    mode: inferred.mode,
    userMessage: parsed.data.message,
    product,
    store: lead.store,
    detectedNeed: signals.detectedNeed ?? journey.detectedNeed,
    recommendations,
  });
  const replyMessage = await getPrisma().conversationMessage.create({
    data: { conversationId: conversation.id, role: MessageRole.ASSISTANT, content: assistantMessage, metadata: { productId: product?.id, journeyId: journey.id, mode: inferred.mode, stage: inferred.stage } },
  });
  await logLeadEvent({
    leadId: lead.id,
    sessionId: lead.sessionId,
    storeId: lead.storeId,
    eventType: LeadEventType.AI_MESSAGE_SENT,
    productId: product?.id,
    journeyId: journey.id,
    metadata: { message: assistantMessage, mode: inferred.mode, stage: inferred.stage },
  });
  const messages = [...messagesBeforeReply, replyMessage];
  const intentScore = Math.min(100, Math.max(provisionalIntentScore, calculateIntentScore({ events, messages, whatsappClicked: lead.status === LeadStatus.WHATSAPP_CLICKED })));
  const shouldShowWhatsappCta = inferred.mode === "CLOSING_PREP" || intentScore >= 55 || /quiero|me interesa|comprar|como compro|cómo compro|pedido|precio/.test(parsed.data.message.toLowerCase());

  await getPrisma().lead.update({
    where: { id: lead.id },
    data: {
      journeyId: journey.id,
      intentScore,
      status: lead.status === LeadStatus.BROWSING ? LeadStatus.ENGAGED : lead.status,
      currentProductId: product?.id ?? lead.currentProductId,
      budget: signals.budget ?? lead.budget,
      urgency: signals.urgency ?? lead.urgency,
      objections: signals.objections.length > 0 ? [...new Set([...(Array.isArray(lead.objections) ? lead.objections : []), ...signals.objections])] : lead.objections,
      recommendedProducts: recommendations.map((item) => ({ id: item.id, name: item.name, slug: item.slug, priceLabel: item.priceLabel, shortReason: item.shortReason })),
    },
  });
  const updatedJourney = await updateJourneyCommercialSignals({
    journeyId: journey.id,
    productId: product?.id,
    categoryId: product?.categoryId,
    detectedNeed: signals.detectedNeed,
    budget: signals.budget,
    urgency: signals.urgency,
    objections: signals.objections,
    intentBoost: Math.max(0, intentScore - journey.intentScore),
    stage: inferred.stage,
    recommendedProducts: recommendations.map((item) => ({ id: item.id, name: item.name, slug: item.slug, priceLabel: item.priceLabel, shortReason: item.shortReason })),
  });
  const quickReplies = buildQuickRepliesForMode({
    mode: inferred.mode,
    commercialType: lead.store.commercialType,
    product,
    category: product?.category,
    detectedNeed: signals.detectedNeed ?? updatedJourney?.detectedNeed,
    recommendedProducts: recommendations,
  });

  return NextResponse.json({
    ok: true,
    leadId: lead.id,
    leadCode: lead.leadCode,
    journeyId: journey.id,
    journeyCode: journey.journeyCode,
    message: assistantMessage,
    assistantMessage,
    mode: inferred.mode,
    stage: inferred.stage,
    quickReplies,
    recommendedProducts: recommendations,
    intentScore,
    detectedNeed: signals.detectedNeed ?? updatedJourney?.detectedNeed,
    budget: signals.budget ?? updatedJourney?.budget,
    urgency: signals.urgency ?? updatedJourney?.urgency,
    objections: signals.objections.length > 0 ? signals.objections.join(", ") : updatedJourney?.objections,
    intentLabel: classifyIntent(intentScore),
    shouldShowWhatsappCta,
  });
}
