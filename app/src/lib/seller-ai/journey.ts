import { CustomerJourneyStage, CustomerJourneyStatus, JourneyEventType, Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { generateJourneyCode } from "@/lib/seller-ai/journey-code";

const reusableStatuses: CustomerJourneyStatus[] = [CustomerJourneyStatus.ACTIVE, CustomerJourneyStatus.ENGAGED, CustomerJourneyStatus.READY_FOR_CHANNEL];
const terminalStatuses: CustomerJourneyStatus[] = [CustomerJourneyStatus.CONVERTED, CustomerJourneyStatus.LOST, CustomerJourneyStatus.EXPIRED];

export async function createUniqueJourneyCode() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const journeyCode = generateJourneyCode();
    const existing = await getPrisma().customerJourney.findUnique({ where: { journeyCode } });
    if (!existing) return journeyCode;
  }

  return `JNY-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

function mergeIds(current: Prisma.JsonValue | null | undefined, id?: string | null) {
  const existing = Array.isArray(current) ? current.filter((item): item is string => typeof item === "string") : [];
  if (!id || existing.includes(id)) return existing;
  return [...existing, id].slice(-30);
}

function nextStatusForStage(stage: CustomerJourneyStage, current?: CustomerJourneyStatus | null) {
  if (current && terminalStatuses.includes(current)) return CustomerJourneyStatus.ACTIVE;
  if (stage === CustomerJourneyStage.CLOSING_PREP) return CustomerJourneyStatus.READY_FOR_CHANNEL;
  if (stage === CustomerJourneyStage.PRODUCT_ADVISOR || stage === CustomerJourneyStage.DECISION_SUPPORT) return CustomerJourneyStatus.ENGAGED;
  return current ?? CustomerJourneyStatus.ACTIVE;
}

export function inferJourneyStage({
  productId,
  intentScore,
  message,
  eventType,
}: {
  productId?: string | null;
  intentScore?: number | null;
  message?: string | null;
  eventType?: JourneyEventType | null;
}) {
  const text = (message ?? "").toLowerCase();
  if (eventType === JourneyEventType.SNAPSHOT_CREATED || eventType === JourneyEventType.CHANNEL_CLICKED) return CustomerJourneyStage.CLOSING_PREP;
  if ((intentScore ?? 0) >= 65 || /quiero|me interesa|comprar|como compro|cómo compro|pedido|precio|disponible|disponibilidad|lo llevo/.test(text)) {
    return CustomerJourneyStage.CLOSING_PREP;
  }
  if (/duda|comparar|conviene|recomiendas|recomendación|regalo|uso|necesito/.test(text)) return CustomerJourneyStage.DECISION_SUPPORT;
  if (productId) return CustomerJourneyStage.PRODUCT_ADVISOR;
  return CustomerJourneyStage.DISCOVERY;
}

export async function addJourneyEvent({
  journeyId,
  type,
  productId,
  categoryId,
  payload,
}: {
  journeyId: string;
  type: JourneyEventType;
  productId?: string | null;
  categoryId?: string | null;
  payload?: Prisma.InputJsonValue;
}) {
  return getPrisma().journeyEvent.create({
    data: {
      journeyId,
      type,
      productId,
      categoryId,
      payload,
    },
  });
}

export async function updateCustomerJourney({
  journeyId,
  productId,
  categoryId,
  source,
  detectedNeed,
  budget,
  urgency,
  objections,
  conversationSummary,
  intentScore,
  customerName,
  customerPhone,
  city,
  recommendedProducts,
  stage,
}: {
  journeyId: string;
  productId?: string | null;
  categoryId?: string | null;
  source?: string | null;
  detectedNeed?: string | null;
  budget?: string | null;
  urgency?: string | null;
  objections?: string | null;
  conversationSummary?: string | null;
  intentScore?: number | null;
  customerName?: string | null;
  customerPhone?: string | null;
  city?: string | null;
  recommendedProducts?: Prisma.InputJsonValue;
  stage?: CustomerJourneyStage | null;
}) {
  const current = await getPrisma().customerJourney.findUnique({ where: { id: journeyId } });
  if (!current) return null;

  const nextStage = stage ?? inferJourneyStage({ productId: productId ?? current.currentProductId, intentScore: intentScore ?? current.intentScore });

  return getPrisma().customerJourney.update({
    where: { id: journeyId },
    data: {
      source: source ?? current.source,
      stage: nextStage,
      status: nextStatusForStage(nextStage, current.status),
      currentProductId: productId ?? current.currentProductId,
      currentCategoryId: categoryId ?? current.currentCategoryId,
      viewedProducts: mergeIds(current.viewedProducts, productId ?? current.currentProductId),
      recommendedProducts: recommendedProducts ?? current.recommendedProducts ?? undefined,
      detectedNeed: detectedNeed ?? current.detectedNeed,
      budget: budget ?? current.budget,
      urgency: urgency ?? current.urgency,
      objections: objections ?? current.objections,
      conversationSummary: conversationSummary ?? current.conversationSummary,
      intentScore: Math.max(current.intentScore, intentScore ?? current.intentScore),
      customerName: customerName ?? current.customerName,
      customerPhone: customerPhone ?? current.customerPhone,
      city: city ?? current.city,
    },
  });
}

export async function getOrCreateCustomerJourney({
  storeId,
  sessionId,
  source,
  productId,
  categoryId,
  journeyId,
}: {
  storeId: string;
  sessionId: string;
  source?: string | null;
  productId?: string | null;
  categoryId?: string | null;
  journeyId?: string | null;
}) {
  const stage = inferJourneyStage({ productId });
  const existing = journeyId
    ? await getPrisma().customerJourney.findFirst({ where: { id: journeyId, storeId } })
    : await getPrisma().customerJourney.findFirst({
        where: { storeId, sessionId, status: { in: reusableStatuses } },
        orderBy: { updatedAt: "desc" },
      });

  if (existing && reusableStatuses.includes(existing.status)) {
    const journey = await getPrisma().customerJourney.update({
      where: { id: existing.id },
      data: {
        source: source ?? existing.source,
        stage,
        status: nextStatusForStage(stage, existing.status),
        currentProductId: productId ?? existing.currentProductId,
        currentCategoryId: categoryId ?? existing.currentCategoryId,
        viewedProducts: mergeIds(existing.viewedProducts, productId),
      },
    });

    if (productId) await addJourneyEvent({ journeyId: journey.id, type: JourneyEventType.PRODUCT_VIEWED, productId, categoryId });
    if (categoryId && !productId) await addJourneyEvent({ journeyId: journey.id, type: JourneyEventType.CATEGORY_VIEWED, categoryId });
    return { journey, created: false };
  }

  const journey = await getPrisma().customerJourney.create({
    data: {
      journeyCode: await createUniqueJourneyCode(),
      storeId,
      sessionId,
      source,
      stage,
      status: nextStatusForStage(stage),
      currentProductId: productId,
      currentCategoryId: categoryId,
      viewedProducts: mergeIds(null, productId),
      events: {
        create: {
          type: JourneyEventType.JOURNEY_STARTED,
          productId,
          categoryId,
          payload: source ? { source } : undefined,
        },
      },
    },
  });

  if (productId) await addJourneyEvent({ journeyId: journey.id, type: JourneyEventType.PRODUCT_VIEWED, productId, categoryId });
  if (categoryId && !productId) await addJourneyEvent({ journeyId: journey.id, type: JourneyEventType.CATEGORY_VIEWED, categoryId });
  return { journey, created: true };
}

export async function createOrUpdateJourneyFromEvent({
  storeId,
  sessionId,
  source,
  journeyId,
  type,
  productId,
  categoryId,
  payload,
  intentScore,
  message,
}: {
  storeId: string;
  sessionId: string;
  source?: string | null;
  journeyId?: string | null;
  type: JourneyEventType;
  productId?: string | null;
  categoryId?: string | null;
  payload?: Prisma.InputJsonValue;
  intentScore?: number | null;
  message?: string | null;
}) {
  const { journey } = await getOrCreateCustomerJourney({ storeId, sessionId, source, productId, categoryId, journeyId });
  const stage = inferJourneyStage({ productId: productId ?? journey.currentProductId, intentScore, message, eventType: type });
  const updated = await updateCustomerJourney({
    journeyId: journey.id,
    productId,
    categoryId,
    intentScore,
    stage,
  });
  await addJourneyEvent({ journeyId: journey.id, type, productId, categoryId, payload });
  return updated ?? journey;
}

export async function getJourneyWithTimeline({ journeyId, storeId }: { journeyId: string; storeId?: string }) {
  return getPrisma().customerJourney.findFirst({
    where: { id: journeyId, storeId },
    include: {
      events: { orderBy: { createdAt: "asc" } },
      snapshots: { orderBy: { createdAt: "desc" } },
      leads: { orderBy: { createdAt: "desc" } },
    },
  });
}
