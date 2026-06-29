import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { ensureSellerLead } from "@/lib/seller-ai/leads";

const leadSchema = z.object({
  sessionId: z.string().min(6).max(160),
  storeSlug: z.string().min(1).max(80),
  journeyId: z.string().min(1).optional(),
  currentProductId: z.string().optional(),
  categoryId: z.string().optional(),
  source: z.string().max(80).optional(),
});

export async function POST(request: Request) {
  const parsed = leadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });

  const store = await getPrisma().store.findUnique({ where: { slug: parsed.data.storeSlug } });
  if (!store || !store.isPublished) return NextResponse.json({ ok: false, error: "Store not found" }, { status: 404 });

  const { lead, journey } = await ensureSellerLead({
    storeId: store.id,
    sessionId: parsed.data.sessionId,
    currentProductId: parsed.data.currentProductId,
    categoryId: parsed.data.categoryId,
    source: parsed.data.source,
    journeyId: parsed.data.journeyId,
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
