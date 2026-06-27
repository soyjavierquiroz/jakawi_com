import { LeadEventType, LeadStatus, Prisma } from "@prisma/client";
import { sellerAiConfig } from "@/config/seller-ai";
import { generateLeadCode } from "@/lib/lead-code";
import { getPrisma } from "@/lib/prisma";

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
  source,
}: {
  storeId: string;
  sessionId: string;
  currentProductId?: string | null;
  source?: string | null;
}) {
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

    return { lead: { ...lead, conversation }, created: false };
  }

  const lead = await getPrisma().lead.create({
    data: {
      leadCode: await createUniqueLeadCode(),
      storeId,
      sessionId,
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

  return { lead, created: true };
}

export async function logLeadEvent({
  leadId,
  sessionId,
  storeId,
  eventType,
  productId,
  metadata,
}: {
  leadId?: string | null;
  sessionId: string;
  storeId: string;
  eventType: LeadEventType;
  productId?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  return getPrisma().leadEvent.create({
    data: {
      leadId,
      sessionId,
      storeId,
      eventType,
      productId,
      metadata,
    },
  });
}
