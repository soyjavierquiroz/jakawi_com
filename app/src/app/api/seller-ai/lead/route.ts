import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPolicies } from "@/config/rate-limits";
import { getPrisma } from "@/lib/prisma";
import { checkRateLimit, getClientIpFromHeaders, rateLimitResponse } from "@/lib/rate-limit";
import { ensureSellerLead } from "@/lib/seller-ai/leads";
import { trackInternalEvent } from "@/lib/tracking/track";

const leadSchema = z.object({
  sessionId: z.string().min(6).max(160),
  visitorId: z.string().min(6).max(160).optional(),
  storeSlug: z.string().min(1).max(80),
  journeyId: z.string().min(1).optional(),
  currentProductId: z.string().optional(),
  categoryId: z.string().optional(),
  source: z.string().max(80).optional(),
});

export async function POST(request: Request) {
  const parsed = leadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });

  const rateLimit = await checkRateLimit({
    policy: rateLimitPolicies.SELLER_AI_LEAD,
    keyParts: [getClientIpFromHeaders(request.headers), parsed.data.storeSlug, parsed.data.visitorId, parsed.data.sessionId],
  });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  const store = await getPrisma().store.findUnique({ where: { slug: parsed.data.storeSlug } });
  if (!store || !store.isPublished) return NextResponse.json({ ok: false, error: "Store not found" }, { status: 404 });

  const { lead, journey } = await ensureSellerLead({
    storeId: store.id,
    sessionId: parsed.data.sessionId,
    visitorId: parsed.data.visitorId,
    currentProductId: parsed.data.currentProductId,
    categoryId: parsed.data.categoryId,
    source: parsed.data.source,
    journeyId: parsed.data.journeyId,
  });

  await trackInternalEvent({
    scope: "STORE",
    eventName: "lead_created",
    storeId: store.id,
    productId: parsed.data.currentProductId,
    leadId: lead.id,
    visitorId: parsed.data.visitorId,
    journeyId: journey.id,
    source: parsed.data.source ?? "seller_ai_lead",
    path: new URL(request.url).pathname,
    userAgent: request.headers.get("user-agent"),
    ip: getClientIpFromHeaders(request.headers),
    metadata: { status: lead.status, intentScore: lead.intentScore },
  });

  return NextResponse.json({
    ok: true,
    leadId: lead.id,
    leadCode: lead.leadCode,
    journeyId: journey.id,
    journeyCode: journey.journeyCode,
    status: lead.status,
    intentScore: lead.intentScore,
  });
}
