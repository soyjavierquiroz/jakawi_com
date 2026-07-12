import { LeadEventType, LeadStatus, MessageRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPolicies } from "@/config/rate-limits";
import { sellerAiConfig } from "@/config/seller-ai";
import { formatMoney } from "@/lib/money";
import { incrementSellerAiConversationUsage, PlanLimitError } from "@/lib/plan-limits";
import { getPrisma } from "@/lib/prisma";
import { checkRateLimit, getClientIpFromHeaders, rateLimitResponse } from "@/lib/rate-limit";
import { describeFoodProductFromName, isFoodRestaurantContext } from "@/lib/seller-ai/context";
import { calculateIntentScore, classifyIntent } from "@/lib/seller-ai/intent";
import { buildWhatsappHandoffMessage, buildWhatsappHandoffUrl, computeLeadQualification, shouldShowWhatsappHandoff } from "@/lib/seller-ai/lead-qualification";
import { getOrCreateCustomerJourney, updateJourneyCommercialSignals } from "@/lib/seller-ai/journey";
import { ensureSellerLead, logLeadEvent } from "@/lib/seller-ai/leads";
import { tryGetSellerAiLlmReply } from "@/lib/seller-ai/llm";
import { buildQuickRepliesForMode, extractCommercialSignals, inferSellerAiMode, type SellerAiMode } from "@/lib/seller-ai/modes";
import { getSellerAiRecommendations, type SellerAiRecommendedProduct } from "@/lib/seller-ai/recommendations";
import { createCommercialSnapshot } from "@/lib/seller-ai/snapshot";
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
  slug?: string | null;
  description?: string | null;
  priceCents: number;
  currency: string;
  categoryId?: string | null;
  category?: { name: string; slug: string } | null;
};

type StoreForReply = {
  slug?: string | null;
  name: string;
  description?: string | null;
  commercialType?: string | null;
  currency?: string | null;
  countryCode?: string | null;
  locale?: string | null;
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

function hasExactIngredientList(description?: string | null) {
  return /\b(ingredientes?|incluye|preparado con|contiene)\s*:/i.test(description ?? "");
}

function wantsIngredients(input?: string | null) {
  const text = normalizeText(input);
  return /\b(ingrediente|ingredientes|que lleva|qué lleva|que trae|qué trae|contiene|con que viene|con qué viene|de que esta hecho|de qué está hecho)\b/.test(text);
}

function wantsPortion(input?: string | null) {
  const text = normalizeText(input);
  return /\b(porcion|tamaño|tamano|cantidad|grande|pequeno|pequeño|para cuantas personas)\b/.test(text);
}

function buildFoodAssistantMessage({
  userMessage,
  product,
  store,
}: {
  userMessage: string;
  product?: ProductForReply | null;
  store: StoreForReply;
}) {
  const text = normalizeText(userMessage);
  if (!product) return "Te ayudo con el menú: puedes preguntarme por ingredientes, porción, precio o pedir por WhatsApp.";

  if (wantsIngredients(userMessage)) {
    if (hasExactIngredientList(product.description)) {
      return `Según la descripción cargada de ${product.name}: ${product.description} Te puedo ayudar a confirmar disponibilidad o dejar el pedido listo por WhatsApp.`;
    }
    return `No tengo la lista exacta de ingredientes cargada todavía, pero por el nombre parece ${describeFoodProductFromName(product.name)}. Te puedo ayudar a confirmar con la tienda por WhatsApp.`;
  }

  if (wantsPortion(userMessage)) {
    return `No tengo el tamaño exacto de la porción cargado todavía para ${product.name}. Te puedo ayudar a confirmarlo con ${store.name} por WhatsApp.`;
  }

  if (includesAny(text, ["precio", "cuanto", "cuesta", "vale", "costo"])) {
    if (!hasPublishedPrice(product)) return "La tienda debe confirmarte el precio actualizado. Te puedo dejar el pedido armado para WhatsApp.";
    return `${priceLine({ product, store })} La tienda puede confirmarte disponibilidad y preparar el pedido por WhatsApp.`;
  }

  if (includesAny(text, ["disponible", "disponibilidad", "stock", "hay"])) {
    return `La disponibilidad de ${product.name} conviene confirmarla con ${store.name}. Te puedo dejar el pedido listo por WhatsApp.`;
  }

  if (includesAny(text, ["whatsapp", "pedir", "pedido", "comprar", "lo quiero"])) {
    return `Perfecto. Te dejo el pedido de ${product.name} armado para WhatsApp.`;
  }

  const description = product.description?.trim();
  if (description) return `${product.name}: ${description} Puedo ayudarte a confirmar disponibilidad o pasarte a WhatsApp para hacer el pedido.`;
  return `${product.name} parece ${describeFoodProductFromName(product.name)}. Puedo ayudarte con ingredientes, porción, precio o a pedir por WhatsApp.`;
}

function mergeQuickReplies(baseReplies: string[], additions: Array<string | null | undefined>) {
  const seen = new Set<string>();
  return [...baseReplies, ...additions]
    .map((reply) => reply?.trim())
    .filter((reply): reply is string => Boolean(reply))
    .filter((reply) => {
      const key = normalizeText(reply);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 4);
}

async function getRecommendedProductsBySlugs({
  store,
  slugs,
}: {
  store: { id: string; currency?: string | null; countryCode?: string | null; locale?: string | null };
  slugs: string[];
}): Promise<SellerAiRecommendedProduct[]> {
  if (slugs.length === 0) return [];
  const products = await getPrisma().product.findMany({
    where: { storeId: store.id, isVisible: true, slug: { in: slugs } },
    include: { category: true },
  });
  const bySlug = new Map(products.map((product) => [product.slug, product]));
  return slugs
    .map((slug) => bySlug.get(slug))
    .filter((product): product is NonNullable<typeof product> => Boolean(product))
    .map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      priceLabel: formatMoney({
        amountCents: product.priceCents,
        currency: store.currency ?? product.currency,
        countryCode: store.countryCode ?? "BO",
        locale: store.locale,
      }),
      imageUrl: product.imageUrl,
      shortReason: product.category?.name ? `Opcion de ${product.category.name}` : "Producto recomendado de la tienda",
    }));
}

export function buildAssistantMessage({
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
  store: StoreForReply;
  detectedNeed?: string | null;
  recommendations: SellerAiRecommendedProduct[];
  shouldAskPhone?: boolean;
}) {
  const text = normalizeText(userMessage);
  const recommendationNames = recommendations.slice(0, 3).map((item) => item.name);
  const foodMode = isFoodRestaurantContext({ store, product, category: product?.category });

  if (foodMode && mode !== "CLOSING_PREP") {
    return buildFoodAssistantMessage({ userMessage, product, store });
  }

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

  const rateLimit = await checkRateLimit({
    policy: rateLimitPolicies.SELLER_AI_CHAT,
    keyParts: [getClientIpFromHeaders(request.headers), parsed.data.storeSlug, parsed.data.visitorId, parsed.data.sessionId, parsed.data.leadId],
  });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

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
    const whatsappHandoff = computeLeadQualification({
      score: lead.intentScore,
      messages: conversation.messages.filter((message) => message.role === MessageRole.USER).map((message) => message.content),
      whatsappNumber: lead.store.whatsapp,
      whatsappClicked: lead.status === LeadStatus.WHATSAPP_CLICKED,
    });
    const showWhatsappHandoff = shouldShowWhatsappHandoff(whatsappHandoff, lead.store.whatsapp);
    return NextResponse.json({
      ok: true,
      assistantMessage: sellerAiConfig.reserved.maxMessages,
      quickReplies: [],
      recommendedProducts: [],
      showRecommendedProducts: false,
      intentScore: lead.intentScore,
      intentLabel: classifyIntent(lead.intentScore),
      shouldShowWhatsappCta: showWhatsappHandoff,
      whatsappHandoff: {
        visible: showWhatsappHandoff,
        leadScore: whatsappHandoff.score,
        leadStage: whatsappHandoff.stage,
      },
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
  const ruleRecommendations = keepClearlyRelatedAlternatives(rawRecommendations, product);
  let recommendations = ruleRecommendations;
  let showRecommendedProducts = wantsAlternatives && recommendations.length > 0;
  let assistantMessage = buildAssistantMessage({
    mode: inferred.mode,
    userMessage: parsed.data.message,
    product,
    store: lead.store,
    detectedNeed: signals.detectedNeed ?? journey.detectedNeed,
    recommendations,
    shouldAskPhone: shouldStartPhoneCapture,
  });
  const llmReply = await tryGetSellerAiLlmReply({
    store: lead.store,
    currentProduct: product,
    commercialSignals: {
      ...signals,
      detectedNeed: signals.detectedNeed ?? journey.detectedNeed ?? undefined,
      budget: signals.budget ?? journey.budget ?? undefined,
      urgency: signals.urgency ?? journey.urgency ?? undefined,
      objections: signals.objections.length > 0 ? signals.objections : Array.isArray(journey.objections) ? journey.objections : [],
    },
    mode: inferred.mode,
    journeySummary: journey.conversationSummary,
    recentMessages: messagesBeforeReply,
    visitorMessage: parsed.data.message,
  });
  if (llmReply) {
    assistantMessage = llmReply.output.reply;
    recommendations = await getRecommendedProductsBySlugs({ store: lead.store, slugs: llmReply.output.recommendedProductSlugs });
    showRecommendedProducts = recommendations.length > 0;
  }
  const replyMessage = await getPrisma().conversationMessage.create({
    data: {
      conversationId: conversation.id,
      role: MessageRole.ASSISTANT,
      content: assistantMessage,
      metadata: {
        productId: product?.id,
        journeyId: journey.id,
        mode: inferred.mode,
        stage: inferred.stage,
        provider: llmReply ? "openai" : "rules",
        objectionType: llmReply?.output.objectionType,
      },
    },
  });
  if (llmReply) {
    await getPrisma().conversation.update({
      where: { id: conversation.id },
      data: {
        modelUsed: llmReply.modelUsed,
        tokensInput: llmReply.tokensInput ?? undefined,
        tokensOutput: llmReply.tokensOutput ?? undefined,
      },
    });
  }
  await logLeadEvent({
    leadId: lead.id,
    sessionId: lead.sessionId,
    storeId: lead.storeId,
    eventType: LeadEventType.AI_MESSAGE_SENT,
    productId: product?.id,
    journeyId: journey.id,
    metadata: { message: assistantMessage, mode: inferred.mode, stage: inferred.stage, provider: llmReply ? "openai" : "rules" },
  });
  const messages = [...messagesBeforeReply, replyMessage];
  const intentScore = Math.min(100, Math.max(provisionalIntentScore, calculateIntentScore({ events, messages, whatsappClicked: lead.status === LeadStatus.WHATSAPP_CLICKED })));
  const whatsappHandoff = computeLeadQualification({
    score: intentScore,
    messages: messages.filter((message) => message.role === MessageRole.USER).map((message) => message.content),
    whatsappNumber: lead.store.whatsapp,
    whatsappClicked: lead.status === LeadStatus.WHATSAPP_CLICKED,
  });
  const shouldShowWhatsappCta = shouldShowWhatsappHandoff(whatsappHandoff, lead.store.whatsapp);
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
  const rulesQuickReplies = buildQuickRepliesForMode({
    mode: inferred.mode,
    commercialType: lead.store.commercialType,
    store: lead.store,
    product,
    category: product?.category,
    detectedNeed: signals.detectedNeed ?? updatedJourney?.detectedNeed,
    objections: signals.objections.length > 0 ? signals.objections : updatedJourney?.objections,
    recommendedProducts: recommendations,
    usedReplies: messagesBeforeReply.filter((message) => message.role === MessageRole.USER).map((message) => message.content),
    lastUserMessage: parsed.data.message,
  });
  const foodMode = isFoodRestaurantContext({ store: lead.store, product, category: product?.category });
  const quickReplies = llmReply
    ? foodMode
      ? rulesQuickReplies
      : mergeQuickReplies(llmReply.output.quickReplies, [llmReply.output.handoffReady ? (llmReply.output.whatsappCtaLabel ?? "Continuar por WhatsApp") : null])
    : rulesQuickReplies;
  const handoffVoiceNote = getSellerVoiceNoteConfig(lead.store, "HANDOFF");
  const guidanceVoiceNote = getSellerVoiceNoteConfig(lead.store, "GUIDANCE");
  const voiceNote =
    inferred.mode === "CLOSING_PREP" || shouldStartPhoneCapture || llmReply?.output.handoffReady
      ? handoffVoiceNote
      : hasVoiceGuidanceContext(parsed.data.message, signals)
        ? guidanceVoiceNote
        : null;
  const voiceNoteSuggestion = voiceNote?.enabled ? voiceNote.type : undefined;
  const existingSnapshot = shouldShowWhatsappCta && lead.snapshotId ? await getPrisma().commercialSnapshot.findUnique({ where: { id: lead.snapshotId } }) : null;
  const snapshot =
    existingSnapshot ??
    (shouldShowWhatsappCta
      ? await createCommercialSnapshot({
          journeyId: journey.id,
          leadId: lead.id,
          customerName: lead.customerName,
          customerPhone: lead.customerPhone,
          city: lead.city,
          currentItem: product
            ? {
                id: product.id,
                name: product.name,
                slug: product.slug,
                priceCents: product.priceCents,
                currency: lead.store.currency ?? product.currency,
              }
            : undefined,
          recommendedItems: recommendations.map((item) => ({ id: item.id, name: item.name, slug: item.slug })),
          viewedItems: updatedJourney?.viewedProducts ?? lead.viewedProducts ?? undefined,
          detectedNeed: signals.detectedNeed ?? updatedJourney?.detectedNeed,
          objections: signals.objections.length > 0 ? signals.objections.join(", ") : updatedJourney?.objections,
          budget: signals.budget ?? updatedJourney?.budget,
          urgency: signals.urgency ?? updatedJourney?.urgency,
          intentScore: whatsappHandoff.score,
          customerSummary: lead.conversationSummary,
        })
      : null);
  if (snapshot && snapshot.id !== lead.snapshotId) {
    await getPrisma().lead.update({ where: { id: lead.id }, data: { snapshotId: snapshot.id } });
  }
  const handoffCode = snapshot?.snapshotCode;
  const handoffMessage = handoffCode ? buildWhatsappHandoffMessage(handoffCode) : undefined;
  const handoffUrl = handoffCode ? buildWhatsappHandoffUrl({ whatsappNumber: lead.store.whatsapp, code: handoffCode }) : undefined;

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
    shouldStartPhoneCapture: shouldShowWhatsappCta && (shouldStartPhoneCapture || Boolean(llmReply?.output.shouldAskPhone)),
    whatsappHandoff: {
      visible: shouldShowWhatsappCta,
      code: handoffCode,
      url: handoffUrl,
      message: handoffMessage,
      leadScore: whatsappHandoff.score,
      leadStage: whatsappHandoff.stage,
    },
    voiceNote: voiceNote?.enabled ? voiceNote : null,
    voiceNoteSuggestion,
  });
}
