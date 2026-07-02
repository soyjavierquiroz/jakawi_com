import { JourneyEventType, LeadEventType, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPolicies } from "@/config/rate-limits";
import { getPrisma } from "@/lib/prisma";
import { checkRateLimit, getClientIpFromHeaders, rateLimitResponse } from "@/lib/rate-limit";
import { addJourneyEvent, getOrCreateCustomerJourney } from "@/lib/seller-ai/journey";
import { logLeadEvent } from "@/lib/seller-ai/leads";

const eventSchema = z.object({
  sessionId: z.string().min(6).max(160),
  visitorId: z.string().min(6).max(160).optional(),
  storeSlug: z.string().min(1).max(80).optional(),
  storeId: z.string().min(1).optional(),
  journeyId: z.string().min(1).optional(),
  eventType: z.enum(LeadEventType),
  productId: z.string().optional(),
  categoryId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).refine((data) => data.storeSlug || data.storeId, { message: "storeSlug or storeId is required" });

function mapJourneyEvent(eventType: LeadEventType) {
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

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = eventSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: true });

  const rateLimit = await checkRateLimit({
    policy: rateLimitPolicies.SELLER_AI_EVENTS,
    keyParts: [getClientIpFromHeaders(request.headers), parsed.data.storeSlug ?? parsed.data.storeId],
  });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  const store = parsed.data.storeId
    ? await getPrisma().store.findUnique({ where: { id: parsed.data.storeId } })
    : await getPrisma().store.findUnique({ where: { slug: parsed.data.storeSlug } });
  if (!store) return NextResponse.json({ ok: true });

  const { journey } = await getOrCreateCustomerJourney({
    storeId: store.id,
    sessionId: parsed.data.sessionId,
    visitorId: parsed.data.visitorId,
    source: "seller_ai_event",
    productId: parsed.data.productId,
    categoryId: parsed.data.categoryId,
    journeyId: parsed.data.journeyId,
  });
  const journeyEventType = mapJourneyEvent(parsed.data.eventType);
  if (
    journeyEventType &&
    journeyEventType !== JourneyEventType.PRODUCT_VIEWED &&
    journeyEventType !== JourneyEventType.CATEGORY_VIEWED
  ) {
    await addJourneyEvent({
      journeyId: journey.id,
      type: journeyEventType,
      productId: parsed.data.productId,
      categoryId: parsed.data.categoryId,
      payload: parsed.data.metadata as Prisma.InputJsonObject | undefined,
    });
  }

  const identityFilters = [{ sessionId: parsed.data.sessionId }, ...(parsed.data.visitorId ? [{ visitorId: parsed.data.visitorId }] : [])];
  const lead = await getPrisma().lead.findFirst({
    where: {
      storeId: store.id,
      OR: identityFilters,
      status: { in: ["BROWSING", "ENGAGED", "WHATSAPP_CLICKED", "CONTACTED"] },
    },
    orderBy: [{ lastActivityAt: "desc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
  });

  await logLeadEvent({
    leadId: lead?.id,
    sessionId: parsed.data.sessionId,
    storeId: store.id,
    eventType: parsed.data.eventType,
    productId: parsed.data.productId,
    journeyId: journey.id,
    metadata: parsed.data.metadata as Prisma.InputJsonObject | undefined,
    writeJourneyEvent: false,
  });

  return NextResponse.json({ ok: true, journeyId: journey.id, journeyCode: journey.journeyCode });
}
