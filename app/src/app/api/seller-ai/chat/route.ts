import { LeadEventType, LeadStatus, MessageRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sellerAiConfig } from "@/config/seller-ai";
import { formatMoney } from "@/lib/money";
import { incrementSellerAiConversationUsage, PlanLimitError } from "@/lib/plan-limits";
import { getPrisma } from "@/lib/prisma";
import { calculateIntentScore, classifyIntent } from "@/lib/seller-ai/intent";
import { getOrCreateCustomerJourney, updateJourneyCommercialSignals } from "@/lib/seller-ai/journey";
import { ensureSellerLead, logLeadEvent } from "@/lib/seller-ai/leads";
import { buildQuickRepliesForMode, extractCommercialSignals, inferSellerAiMode, type SellerAiMode } from "@/lib/seller-ai/modes";
import { getSellerAiRecommendations, type SellerAiRecommendedProduct } from "@/lib/seller-ai/recommendations";
import { getSellerVoiceNoteConfig } from "@/lib/seller-ai/voice-notes";

const chatSchema = z.object({
  leadId: z.string().min(1).optional(),
  journeyId: z.string().min(1).optional(),
  sessionId: z.string().min(6).max(160).optional(),
  visitorId: z.string().min(6).max(160).optional(),
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
  const text = normalizeText(input);
  return words.some((word) => text.includes(normalizeText(word)));
}

function normalizeText(input?: string | null) {
  return (input ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function wantsRecommendationAlternatives(input?: string | null) {
  const text = normalizeText(input);
  return /\b(ver otra opcion|comparar opciones|comparar|no me convence|tienes algo mas barato|algo mas barato|mas economico|algo mas economico|tienes algo parecido|algo parecido|algo similar|muestrame alternativas|mostrar alternativas|otra opcion|quiero comparar)\b/.test(text);
}

function hasVoiceGuidanceContext(input: string, signals: ReturnType<typeof extractCommercialSignals>) {
  if (signals.objections.length > 0 || signals.hasStrongIntent) return false;
  if (signals.detectedNeed) return true;
  return includesAny(input, ["estudio", "universidad", "colegio", "trabajo", "oficina", "fotos", "redes", "juegos", "para regalar", "regalo", "viaje", "uso diario", "para mi", "para mí", "uso personal"]);
}

function keepClearlyRelatedAlternatives(recommendations: SellerAiRecommendedProduct[], product?: ProductForReply | null) {
  if (!product) return recommendations;
  const productTokens = normalizeText(product.name)
    .split(/\s+/)
    .filter((token) => token.length >= 5);
  if (productTokens.length === 0) return [];

  return recommendations.filter((recommendation) => {
    const recommendationName = normalizeText(recommendation.name);
    return productTokens.some((token) => recommendationName.includes(token));
  });
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

function hasPublishedPrice(product?: ProductForReply | null) {
  return product?.priceCents != null && product.priceCents > 0;
}

function buildAssistantMessage({
  mode,
  userMessage,
  product,
  store,
  detectedNeed,
  recommendations,
  shouldAskPhone,
}: {
  mode: SellerAiMode;
  userMessage: string;
  product?: ProductForReply | null;
  store: { name: string; commercialType?: string | null; currency?: string | null; countryCode?: string | null; locale?: string | null };
  detectedNeed?: string | null;
  recommendations: SellerAiRecommendedProduct[];
  shouldAskPhone?: boolean;
}) {
  const text = normalizeText(userMessage);
  const recommendationNames = recommendations.slice(0, 3).map((item) => item.name);

  if (mode === "CLOSING_PREP") {
    return shouldAskPhone
      ? `Perfecto. Te dejo la consulta armada para la tienda${product?.name ? ` con ${product.name}` : ""}. ¿A qué WhatsApp pueden escribirte?`
      : "Perfecto. Ya tengo la consulta bastante armada. Cuando quieras, puedes continuar por WhatsApp con este contexto.";
  }

  if (mode === "DECISION_SUPPORT") {
    if (product && includesAny(text, ["precio", "cuanto", "cuesta", "vale", "costo"])) {
      if (!hasPublishedPrice(product)) return "La tienda debe confirmarte el precio actualizado. Te puedo dejar la consulta armada para WhatsApp.";
      return `${priceLine({ product, store })} La tienda puede confirmarte disponibilidad y forma de pago por WhatsApp.`;
    }
    if (!product && includesAny(text, ["precio", "cuanto", "cuesta", "vale", "costo"])) {
      return "La tienda debe confirmarte el precio actualizado. Te puedo dejar la consulta armada para WhatsApp.";
    }
    if (includesAny(text, ["disponible", "disponibilidad", "stock"])) {
      return `Sobre disponibilidad, mejor lo confirma la tienda para no darte un dato incorrecto. Te puedo dejar la consulta lista por WhatsApp${product?.name ? ` preguntando por ${product.name}` : ""}.`;
    }
    if (includesAny(text, ["envio", "enviar", "entrega", "delivery"])) {
      return "El envío lo confirma la tienda según tu zona. Puedo dejar la consulta lista por WhatsApp con el producto y tu duda.";
    }
    if (includesAny(text, ["garantia", "talla", "color", "pago", "descuento"])) {
      const subject = product?.name ? ` de ${product.name}` : "";
      return `Esa duda${subject} conviene confirmarla con la tienda para no darte un dato incorrecto. Te puedo dejar la consulta lista por WhatsApp.`;
    }
    if (recommendationNames.length > 0) {
      return `Para reducir la duda, compararía máximo estas opciones: ${recommendationNames.join(", ")}. ¿Cuál te interesa más?`;
    }
    if (wantsRecommendationAlternatives(userMessage)) {
      return "Por ahora te ayudo con este producto y dejamos la consulta clara para la tienda.";
    }
    return "Te ayudo a resolverlo corto: si falta disponibilidad, envío o forma de pago, la tienda lo confirma por WhatsApp con tu consulta armada.";
  }

  if (mode === "PRODUCT_ADVISOR") {
    if (!product) return "Cuéntame qué uso le quieres dar y te recomiendo una opción sin marearte.";
    if (wantsRecommendationAlternatives(userMessage) && recommendationNames.length === 0) {
      return "Por ahora te ayudo con este producto y dejamos la consulta clara para la tienda.";
    }
    if (wantsRecommendationAlternatives(userMessage) && recommendationNames.length > 0) {
      return `Para comparar sin marearte, miraría también: ${recommendationNames.join(", ")}. ¿Quieres seguir con ${product.name} o preguntar por una alternativa?`;
    }
    if (detectedNeed === "regalo") {
      return `Perfecto. Si es para regalar, te ayudo a ver si ${product.name} encaja. ¿Es para alguien que estudia, trabaja o lo usaría a diario?`;
    }
    if (detectedNeed === "fotos") {
      return `Si lo quieres para fotos, conviene priorizar cámara, memoria y batería. ${product.name} puede servirte para redes y uso diario. ¿Quieres que te pase la consulta armada a WhatsApp?`;
    }
    if (detectedNeed) {
      if (detectedNeed === "estudio") {
        return `Perfecto. Para estudio, ${product.name} puede encajar si buscas algo práctico para uso diario. ¿Quieres confirmar disponibilidad, precio o envío con la tienda?`;
      }
      return `${product.name} puede encajar si lo quieres para ${detectedNeed}. ¿Quieres confirmar disponibilidad, precio o envío con la tienda?`;
    }
    return `${product.name} puede ser buena opción si encaja con el uso que tienes en mente. ¿Lo buscas para trabajo, regalo o uso diario?`;
  }

  if (detectedNeed === "regalo") {
    return "Buenísimo. Para regalar conviene algo práctico y fácil de usar. ¿Para quién es el regalo?";
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
      visitorId: parsed.data.visitorId,
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
    visitorId: parsed.data.visitorId ?? lead.visitorId,
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
      recommendedProducts: [],
      showRecommendedProducts: false,
      intentScore: lead.intentScore,
      intentLabel: classifyIntent(lead.intentScore),
      shouldShowWhatsappCta: true,
      shouldStartPhoneCapture: false,
    });
  }

  const product = parsed.data.currentProductId || lead.currentProductId
    ? await getPrisma().product.findFirst({
        where: { id: parsed.data.currentProductId ?? lead.currentProductId ?? undefined, storeId: lead.storeId, isVisible: true },
        include: { category: true },
      })
    : null;
  const signals = extractCommercialSignals(parsed.data.message);

  try {
    await incrementSellerAiConversationUsage(lead.storeId, { journeyId: journey.id });
  } catch (error) {
    if (error instanceof PlanLimitError) {
      return NextResponse.json(
        {
          ok: false,
          ...error.payload,
        },
        { status: 403 },
      );
    }
    throw error;
  }

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
  const shouldStartPhoneCapture = inferred.mode === "CLOSING_PREP" && inferred.reason === "explicit closing intent";
  const wantsAlternatives = wantsRecommendationAlternatives(parsed.data.message);
  const rawRecommendations =
    !wantsAlternatives || inferred.mode === "CLOSING_PREP"
      ? []
      : await getSellerAiRecommendations({
          storeId: lead.storeId,
          currentProductId: product?.id,
          categoryId: product?.categoryId,
          detectedNeed: signals.detectedNeed ?? journey.detectedNeed,
          budget: signals.budget ?? journey.budget,
        });
  const recommendations = keepClearlyRelatedAlternatives(rawRecommendations, product);
  const showRecommendedProducts = wantsAlternatives && recommendations.length > 0;
  const assistantMessage = buildAssistantMessage({
    mode: inferred.mode,
    userMessage: parsed.data.message,
    product,
    store: lead.store,
    detectedNeed: signals.detectedNeed ?? journey.detectedNeed,
    recommendations,
    shouldAskPhone: shouldStartPhoneCapture,
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
  const shouldShowWhatsappCta = shouldStartPhoneCapture || inferred.mode === "DECISION_SUPPORT" || (intentScore >= 70 && inferred.mode !== "DISCOVERY");
  const hasVisibleCommercialSignal =
    signals.intentBoost > 0 ||
    Boolean(product) ||
    inferred.mode === "DECISION_SUPPORT" ||
    inferred.mode === "CLOSING_PREP" ||
    shouldShowWhatsappCta ||
    Boolean(signals.detectedNeed || signals.budget || signals.urgency || signals.objections.length > 0);

  await getPrisma().lead.update({
    where: { id: lead.id },
    data: {
      journeyId: journey.id,
      visitorId: parsed.data.visitorId ?? lead.visitorId,
      intentScore,
      status: lead.status === LeadStatus.BROWSING && hasVisibleCommercialSignal ? LeadStatus.ENGAGED : lead.status,
      currentProductId: product?.id ?? lead.currentProductId,
      lastActivityAt: new Date(),
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
    objections: signals.objections.length > 0 ? signals.objections : updatedJourney?.objections,
    recommendedProducts: recommendations,
    usedReplies: messagesBeforeReply.filter((message) => message.role === MessageRole.USER).map((message) => message.content),
    lastUserMessage: parsed.data.message,
  });
  const handoffVoiceNote = getSellerVoiceNoteConfig(lead.store, "HANDOFF");
  const guidanceVoiceNote = getSellerVoiceNoteConfig(lead.store, "GUIDANCE");
  const voiceNote =
    inferred.mode === "CLOSING_PREP" || shouldStartPhoneCapture
      ? handoffVoiceNote
      : hasVoiceGuidanceContext(parsed.data.message, signals)
        ? guidanceVoiceNote
        : null;
  const voiceNoteSuggestion = voiceNote?.enabled ? voiceNote.type : undefined;

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
    showRecommendedProducts,
    intentScore,
    detectedNeed: signals.detectedNeed ?? updatedJourney?.detectedNeed,
    budget: signals.budget ?? updatedJourney?.budget,
    urgency: signals.urgency ?? updatedJourney?.urgency,
    objections: signals.objections.length > 0 ? signals.objections.join(", ") : updatedJourney?.objections,
    intentLabel: classifyIntent(intentScore),
    shouldShowWhatsappCta,
    shouldStartPhoneCapture,
    voiceNote: voiceNote?.enabled ? voiceNote : null,
    voiceNoteSuggestion,
  });
}
