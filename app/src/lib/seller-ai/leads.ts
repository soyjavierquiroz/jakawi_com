import { CustomerJourneyStage, JourneyEventType, LeadEventType, LeadStatus, Prisma } from "@prisma/client";
import { sellerAiConfig } from "@/config/seller-ai";
import { generateLeadCode } from "@/lib/lead-code";
import { getPrisma } from "@/lib/prisma";
import { addJourneyEvent, getOrCreateCustomerJourney, updateCustomerJourney } from "@/lib/seller-ai/journey";

export async function createUniqueLeadCode() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const leadCode = generateLeadCode(sellerAiConfig.leadCodePrefix);
    const existing = await getPrisma().lead.findUnique({ where: { leadCode } });
    if (!existing) return leadCode;
  }

  return `${sellerAiConfig.leadCodePrefix}-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

function mergeViewedProducts(current: Prisma.JsonValue | null | undefined, productId?: string | null) {
  const existing = Array.isArray(current) ? current.filter((item): item is string => typeof item === "string") : [];
  if (!productId || existing.includes(productId)) return existing;
  return [...existing, productId].slice(-20);
}

export function visibleLeadWhere(storeId: string): Prisma.LeadWhereInput {
  return {
    storeId,
    OR: [
      { status: { in: [LeadStatus.ENGAGED, LeadStatus.WHATSAPP_CLICKED, LeadStatus.CONTACTED, LeadStatus.WON, LeadStatus.LOST] } },
      { intentScore: { gte: 30 } },
      { customerPhone: { not: null } },
      { whatsappClickedAt: { not: null } },
      { journey: { stage: { in: [CustomerJourneyStage.DECISION_SUPPORT, CustomerJourneyStage.CLOSING_PREP] } } },
      { journey: { detectedNeed: { not: null } } },
      { journey: { objections: { not: null } } },
      { events: { some: { eventType: { in: [LeadEventType.CHAT_OPENED, LeadEventType.CUSTOMER_MESSAGE_SENT, LeadEventType.PRODUCT_RECOMMENDED, LeadEventType.WHATSAPP_CLICKED] } } } },
      { journey: { events: { some: { type: { in: [JourneyEventType.CUSTOMER_MESSAGE_SENT, JourneyEventType.NEED_DETECTED, JourneyEventType.OBJECTION_DETECTED, JourneyEventType.INTENT_UPDATED, JourneyEventType.CHANNEL_CLICKED] } } } } },
    ],
  };
}

type LeadSnapshotLike = {
  customerPhone?: string | null;
  whatsappMessage?: string | null;
  channelMessage?: string | null;
  detectedNeed?: string | null;
  objections?: string | null;
  intentScore?: number | null;
};

type LeadJourneyLike = {
  stage?: CustomerJourneyStage | null;
  detectedNeed?: string | null;
  objections?: string | null;
  intentScore?: number | null;
  events?: { type: JourneyEventType }[];
} | null;

type LeadEventLike = { eventType: LeadEventType };

export type LeadContactMethod = "PHONE" | "NONE";
export type LeadDisplayGroup = "CONTACTABLE" | "WHATSAPP_STARTED" | "ANONYMOUS_INTENT" | "OTHER";

export type LeadClassificationInput = {
  customerPhone?: string | null;
  status: LeadStatus;
  intentScore?: number | null;
  visitorId?: string | null;
  currentProductId?: string | null;
  selectedProductId?: string | null;
  whatsappMessage?: string | null;
  whatsappClickedAt?: Date | null;
  journey?: LeadJourneyLike;
  activeSnapshot?: LeadSnapshotLike | null;
  snapshots?: LeadSnapshotLike[];
  events?: LeadEventLike[];
};

const commercialLeadEvents = new Set<LeadEventType>([
  LeadEventType.PRODUCT_VIEW,
  LeadEventType.CHAT_OPENED,
  LeadEventType.AI_MESSAGE_SENT,
  LeadEventType.CUSTOMER_MESSAGE_SENT,
  LeadEventType.PRODUCT_RECOMMENDED,
]);
const commercialJourneyEvents = new Set<JourneyEventType>([
  JourneyEventType.PRODUCT_VIEWED,
  JourneyEventType.CUSTOMER_MESSAGE_SENT,
  JourneyEventType.NEED_DETECTED,
  JourneyEventType.OBJECTION_DETECTED,
  JourneyEventType.INTENT_UPDATED,
  JourneyEventType.PRODUCT_RECOMMENDED,
]);

function hasText(value?: string | null) {
  return Boolean(value?.trim());
}

function hasValidBuyerPhone(value?: string | null) {
  if (!value) return false;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

function hasWhatsappStartedSignal(lead: LeadClassificationInput) {
  return (
    lead.status === LeadStatus.WHATSAPP_CLICKED ||
    Boolean(lead.whatsappClickedAt) ||
    hasText(lead.whatsappMessage) ||
    lead.events?.some((event) => event.eventType === LeadEventType.WHATSAPP_CLICKED) ||
    lead.journey?.events?.some((event) => event.type === JourneyEventType.CHANNEL_CLICKED) ||
    getLeadSnapshots(lead).some((snapshot) => hasText(snapshot.whatsappMessage) || hasText(snapshot.channelMessage))
  );
}

function getLeadSnapshots(lead: LeadClassificationInput) {
  return [lead.activeSnapshot, ...(lead.snapshots ?? [])].filter((snapshot): snapshot is LeadSnapshotLike => Boolean(snapshot));
}

export function getLeadWhatsappMessage(lead: LeadClassificationInput) {
  if (hasText(lead.whatsappMessage)) return lead.whatsappMessage ?? null;
  const snapshot = getLeadSnapshots(lead).find((item) => hasText(item.whatsappMessage) || hasText(item.channelMessage));
  return snapshot?.whatsappMessage ?? snapshot?.channelMessage ?? null;
}

export function hasCommercialSignal(lead: LeadClassificationInput) {
  const snapshots = getLeadSnapshots(lead);
  return (
    (lead.intentScore ?? 0) >= 30 ||
    (lead.journey?.intentScore ?? 0) >= 30 ||
    hasText(lead.journey?.detectedNeed) ||
    hasText(lead.journey?.objections) ||
    lead.journey?.stage === CustomerJourneyStage.DECISION_SUPPORT ||
    lead.journey?.stage === CustomerJourneyStage.CLOSING_PREP ||
    Boolean(lead.currentProductId || lead.selectedProductId) ||
    snapshots.some((snapshot) => (snapshot.intentScore ?? 0) >= 30 || hasText(snapshot.detectedNeed) || hasText(snapshot.objections)) ||
    Boolean(lead.events?.some((event) => commercialLeadEvents.has(event.eventType))) ||
    Boolean(lead.journey?.events?.some((event) => commercialJourneyEvents.has(event.type)))
  );
}

export function classifyLead(lead: LeadClassificationInput) {
  const hasBuyerPhone = hasValidBuyerPhone(lead.customerPhone) || getLeadSnapshots(lead).some((snapshot) => hasValidBuyerPhone(snapshot.customerPhone));
  const hasDirectContact = hasBuyerPhone;
  const hasWhatsappStarted = hasWhatsappStartedSignal(lead);
  const isContactable = hasDirectContact;
  const isWhatsappStartedOnly = !isContactable && hasWhatsappStarted;
  const isAnonymousIntent = !isContactable && !isWhatsappStartedOnly && hasCommercialSignal(lead);
  const contactMethod: LeadContactMethod = hasBuyerPhone ? "PHONE" : "NONE";
  const displayGroup: LeadDisplayGroup = isContactable ? "CONTACTABLE" : isWhatsappStartedOnly ? "WHATSAPP_STARTED" : isAnonymousIntent ? "ANONYMOUS_INTENT" : "OTHER";

  return {
    hasBuyerPhone,
    hasDirectContact,
    hasWhatsappStarted,
    isContactable,
    isWhatsappStartedOnly,
    isAnonymousIntent,
    contactMethod,
    displayGroup,
    canOpenWhatsapp: hasBuyerPhone,
  };
}

export async function ensureSellerLead({
  storeId,
  sessionId,
  visitorId,
  currentProductId,
  categoryId,
  source,
  journeyId,
}: {
  storeId: string;
  sessionId: string;
  visitorId?: string | null;
  currentProductId?: string | null;
  categoryId?: string | null;
  source?: string | null;
  journeyId?: string | null;
}) {
  const { journey } = await getOrCreateCustomerJourney({
    storeId,
    sessionId,
    visitorId,
    source,
    productId: currentProductId,
    categoryId,
    journeyId,
  });
  const activeStatuses = [LeadStatus.BROWSING, LeadStatus.ENGAGED, LeadStatus.WHATSAPP_CLICKED, LeadStatus.CONTACTED];
  const identityFilters: Prisma.LeadWhereInput[] = [{ journeyId: journey.id }, { sessionId }];
  if (visitorId) identityFilters.splice(1, 0, { visitorId });
  const existing = await getPrisma().lead.findFirst({
    where: { storeId, OR: identityFilters, status: { in: activeStatuses } },
    include: { conversation: true },
    orderBy: [{ lastActivityAt: "desc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
  });

  if (existing) {
    const previousCurrentProductId = existing.currentProductId;
    const lead = await getPrisma().lead.update({
      where: { id: existing.id },
      data: {
        journeyId: existing.journeyId ?? journey.id,
        visitorId: visitorId ?? existing.visitorId,
        currentProductId: currentProductId ?? existing.currentProductId,
        source: source ?? existing.source,
        lastActivityAt: new Date(),
        viewedProducts: mergeViewedProducts(existing.viewedProducts, currentProductId),
      },
      include: { conversation: true },
    });

    const conversation =
      lead.conversation ??
      (await getPrisma().conversation.create({
        data: { leadId: lead.id, storeId },
      }));

    await updateCustomerJourney({
      journeyId: journey.id,
      productId: currentProductId,
      categoryId,
      intentScore: lead.intentScore,
      customerName: lead.customerName,
      customerPhone: lead.customerPhone,
      city: lead.city,
      budget: lead.budget,
      urgency: lead.urgency,
      objections: Array.isArray(lead.objections) ? lead.objections.join(", ") : null,
      conversationSummary: lead.conversationSummary,
    });

    return {
      lead: { ...lead, conversation },
      journey,
      created: false,
      previousCurrentProductId,
      productChanged: Boolean(currentProductId && previousCurrentProductId && currentProductId !== previousCurrentProductId),
    };
  }

  const lead = await getPrisma().lead.create({
    data: {
      leadCode: await createUniqueLeadCode(),
      storeId,
      sessionId,
      visitorId,
      journeyId: journey.id,
      currentProductId,
      source,
      lastActivityAt: new Date(),
      viewedProducts: mergeViewedProducts(null, currentProductId),
      conversation: { create: { storeId } },
      events: {
        create: {
          sessionId,
          storeId,
          eventType: LeadEventType.LEAD_CREATED,
          productId: currentProductId,
        },
      },
    },
    include: { conversation: true },
  });

  await addJourneyEvent({
    journeyId: journey.id,
    type: JourneyEventType.LEAD_CREATED,
    productId: currentProductId,
    categoryId,
    payload: { leadId: lead.id, leadCode: lead.leadCode },
  });

  return { lead, journey, created: true, previousCurrentProductId: null, productChanged: false };
}

function mapLeadEventToJourneyEvent(eventType: LeadEventType) {
  const mapping: Partial<Record<LeadEventType, JourneyEventType>> = {
    STORE_VIEW: JourneyEventType.STORE_VIEWED,
    PRODUCT_VIEW: JourneyEventType.PRODUCT_VIEWED,
    CATEGORY_VIEW: JourneyEventType.CATEGORY_VIEWED,
    CHAT_OPENED: JourneyEventType.SELLER_AI_OPENED,
    AI_MESSAGE_SENT: JourneyEventType.AI_MESSAGE_SENT,
    CUSTOMER_MESSAGE_SENT: JourneyEventType.CUSTOMER_MESSAGE_SENT,
    PRODUCT_RECOMMENDED: JourneyEventType.PRODUCT_RECOMMENDED,
    WHATSAPP_CLICKED: JourneyEventType.CHANNEL_CLICKED,
    LEAD_CREATED: JourneyEventType.LEAD_CREATED,
    LEAD_STATUS_CHANGED: JourneyEventType.STATUS_CHANGED,
  };
  return mapping[eventType];
}

export async function logLeadEvent({
  leadId,
  sessionId,
  storeId,
  eventType,
  productId,
  journeyId,
  metadata,
  writeJourneyEvent = true,
}: {
  leadId?: string | null;
  sessionId: string;
  storeId: string;
  eventType: LeadEventType;
  productId?: string | null;
  journeyId?: string | null;
  metadata?: Prisma.InputJsonValue;
  writeJourneyEvent?: boolean;
}) {
  const leadEvent = await getPrisma().leadEvent.create({
    data: {
      leadId,
      sessionId,
      storeId,
      eventType,
      productId,
      metadata,
    },
  });

  const journeyEventType = writeJourneyEvent ? mapLeadEventToJourneyEvent(eventType) : null;
  if (journeyEventType) {
    const journeyFilters: Prisma.CustomerJourneyWhereInput[] = [];
    if (journeyId) journeyFilters.push({ id: journeyId });
    if (leadId) journeyFilters.push({ leads: { some: { id: leadId } } });

    const journey =
      journeyFilters.length > 0
        ? await getPrisma().customerJourney.findFirst({
            where: {
              storeId,
              OR: journeyFilters,
            },
            orderBy: { updatedAt: "desc" },
          })
        : await getPrisma().customerJourney.findFirst({
            where: { storeId, sessionId, status: { in: ["ACTIVE", "ENGAGED", "READY_FOR_CHANNEL"] } },
            orderBy: { updatedAt: "desc" },
          });

    if (journey) {
      await addJourneyEvent({
        journeyId: journey.id,
        type: journeyEventType,
        productId,
        payload: metadata ?? { leadEventId: leadEvent.id },
      });
    }
  }

  return leadEvent;
}
