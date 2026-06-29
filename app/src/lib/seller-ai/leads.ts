import { JourneyEventType, LeadEventType, LeadStatus, Prisma } from "@prisma/client";
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

export async function ensureSellerLead({
  storeId,
  sessionId,
  currentProductId,
  categoryId,
  source,
  journeyId,
}: {
  storeId: string;
  sessionId: string;
  currentProductId?: string | null;
  categoryId?: string | null;
  source?: string | null;
  journeyId?: string | null;
}) {
  const { journey } = await getOrCreateCustomerJourney({
    storeId,
    sessionId,
    source,
    productId: currentProductId,
    categoryId,
    journeyId,
  });
  const activeStatuses = [LeadStatus.BROWSING, LeadStatus.ENGAGED];
  const existing = await getPrisma().lead.findFirst({
    where: { storeId, sessionId, status: { in: activeStatuses } },
    include: { conversation: true },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    const lead = await getPrisma().lead.update({
      where: { id: existing.id },
      data: {
        journeyId: existing.journeyId ?? journey.id,
        currentProductId: currentProductId ?? existing.currentProductId,
        source: source ?? existing.source,
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

    return { lead: { ...lead, conversation }, journey, created: false };
  }

  const lead = await getPrisma().lead.create({
    data: {
      leadCode: await createUniqueLeadCode(),
      storeId,
      sessionId,
      journeyId: journey.id,
      currentProductId,
      source,
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

  return { lead, journey, created: true };
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
}: {
  leadId?: string | null;
  sessionId: string;
  storeId: string;
  eventType: LeadEventType;
  productId?: string | null;
  journeyId?: string | null;
  metadata?: Prisma.InputJsonValue;
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

  const journeyEventType = mapLeadEventToJourneyEvent(eventType);
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
