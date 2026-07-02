import { JourneyEventType, LeadEventType, MessageRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPolicies } from "@/config/rate-limits";
import { getStorePlanState } from "@/lib/plan-limits";
import { getPrisma } from "@/lib/prisma";
import { checkRateLimit, getClientIpFromHeaders, rateLimitResponse } from "@/lib/rate-limit";
import { addJourneyEvent, updateJourneyStage } from "@/lib/seller-ai/journey";
import { ensureSellerLead, logLeadEvent } from "@/lib/seller-ai/leads";
import { buildQuickRepliesForMode, getCommercialTypeCopy, inferSellerAiMode } from "@/lib/seller-ai/modes";
import { getOpeningMessage, getQuickReplies } from "@/lib/seller-ai/templates";
import { getSellerVoiceNoteConfig } from "@/lib/seller-ai/voice-notes";

const openingSchema = z.object({
  sessionId: z.string().min(6).max(160),
  visitorId: z.string().min(6).max(160).optional(),
  storeSlug: z.string().min(1).max(80).optional(),
  storeId: z.string().min(1).optional(),
  journeyId: z.string().min(1).optional(),
  productId: z.string().min(1).optional(),
  productSlug: z.string().min(1).max(120).optional(),
  categoryId: z.string().min(1).optional(),
}).refine((data) => data.storeSlug || data.storeId, { message: "storeSlug or storeId is required" });

function getDiscoveryOpening(storeName: string, categories: { name: string }[]) {
  const categoryHint = categories.slice(0, 3).map((category) => category.name).join(", ");
  return categoryHint
    ? `Hola, soy Seller AI de ${storeName}. ¿Qué estás buscando hoy? Puedo ayudarte a elegir entre ${categoryHint} o encontrar otra opción.`
    : `Hola, soy Seller AI de ${storeName}. ¿Qué estás buscando hoy? Te ayudo a elegir la mejor opción.`;
}

export async function POST(request: Request) {
  const parsed = openingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });

  const rateLimit = await checkRateLimit({
    policy: rateLimitPolicies.SELLER_AI_OPENING,
    keyParts: [getClientIpFromHeaders(request.headers), parsed.data.storeSlug ?? parsed.data.storeId],
  });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  const store = parsed.data.storeId
    ? await getPrisma().store.findUnique({ where: { id: parsed.data.storeId }, include: { categories: { orderBy: { name: "asc" } } } })
    : await getPrisma().store.findUnique({ where: { slug: parsed.data.storeSlug }, include: { categories: { orderBy: { name: "asc" } } } });
  if (!store || !store.isPublished) return NextResponse.json({ ok: false, error: "Store not found" }, { status: 404 });
  const planState = getStorePlanState(store);
  if (!planState.sellerAiEnabled) {
    return NextResponse.json(
      {
        ok: false,
        code: planState.trialExpired ? "TRIAL_EXPIRED" : "SELLER_AI_NOT_AVAILABLE",
        message: planState.trialExpired ? "La prueba gratuita de esta tienda terminó." : "Seller AI no está disponible en tu plan.",
        planCode: planState.planCode,
      },
      { status: 403 },
    );
  }

  const product = parsed.data.productId || parsed.data.productSlug
    ? await getPrisma().product.findFirst({
        where: {
          storeId: store.id,
          isVisible: true,
          ...(parsed.data.productId ? { id: parsed.data.productId } : { slug: parsed.data.productSlug }),
        },
        include: { category: true },
      })
    : null;
  if ((parsed.data.productId || parsed.data.productSlug) && !product) return NextResponse.json({ ok: false, error: "Product not found" }, { status: 404 });

  const { lead, journey } = await ensureSellerLead({
    storeId: store.id,
    sessionId: parsed.data.sessionId,
    visitorId: parsed.data.visitorId,
    currentProductId: product?.id,
    categoryId: product?.categoryId ?? parsed.data.categoryId,
    source: product ? "product_page" : "store_discovery",
    journeyId: parsed.data.journeyId,
  });
  const inferred = inferSellerAiMode({
    hasProductContext: Boolean(product),
    productId: product?.id,
    currentStage: product ? "PRODUCT_ADVISOR" : "DISCOVERY",
  });
  const mode = product ? "PRODUCT_ADVISOR" : inferred.mode;
  const stage = mode;
  await updateJourneyStage({ journeyId: journey.id, stage });
  await addJourneyEvent({
    journeyId: journey.id,
    type: JourneyEventType.SELLER_AI_OPENED,
    productId: product?.id,
    categoryId: product?.categoryId ?? parsed.data.categoryId,
    payload: { mode, reason: inferred.reason },
  });

  const recommendations: [] = [];

  const commercialCopy = getCommercialTypeCopy(store.commercialType);
  const discoveryOpening = getDiscoveryOpening(store.name, store.categories).replace("¿Qué estás buscando hoy?", commercialCopy.discoveryOpening);
  const message = product ? getOpeningMessage({ product, category: product.category, store }) : discoveryOpening;
  const conversationId = lead.conversation?.id;

  if (conversationId) {
    await getPrisma().conversationMessage.create({
      data: {
        conversationId,
        role: MessageRole.ASSISTANT,
        content: message,
        metadata: { kind: "opening", mode, stage, productId: product?.id, journeyId: journey.id },
      },
    });
  }

  await getPrisma().lead.update({
    where: { id: lead.id },
    data: {
      recommendedProducts: [],
    },
  });

  await logLeadEvent({
    leadId: lead.id,
    sessionId: parsed.data.sessionId,
    storeId: store.id,
    eventType: LeadEventType.AI_MESSAGE_SENT,
    productId: product?.id,
    journeyId: journey.id,
    metadata: { kind: "opening", mode, stage },
  });

  return NextResponse.json({
    ok: true,
    leadId: lead.id,
    leadCode: lead.leadCode,
    journeyId: journey.id,
    journeyCode: journey.journeyCode,
    message,
    assistantMessage: message,
    mode,
    stage,
    shouldStartPhoneCapture: false,
    quickReplies: buildQuickRepliesForMode({
      mode,
      commercialType: store.commercialType,
      product,
      category: product?.category,
      recommendedProducts: recommendations,
    }) ?? (product ? getQuickReplies({ product, category: product.category }) : commercialCopy.quickReplies),
    recommendedProducts: recommendations,
    showRecommendedProducts: false,
    voiceNotes: {
      intro: getSellerVoiceNoteConfig(store, "INTRO"),
      guidance: getSellerVoiceNoteConfig(store, "GUIDANCE"),
      handoff: getSellerVoiceNoteConfig(store, "HANDOFF"),
    },
  });
}
