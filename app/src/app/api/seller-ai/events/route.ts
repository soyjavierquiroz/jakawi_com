import { LeadEventType, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { logLeadEvent } from "@/lib/seller-ai/leads";

const eventSchema = z.object({
  sessionId: z.string().min(6).max(160),
  storeSlug: z.string().min(1).max(80),
  eventType: z.enum(LeadEventType),
  productId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = eventSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: true });

  const store = await getPrisma().store.findUnique({ where: { slug: parsed.data.storeSlug } });
  if (!store) return NextResponse.json({ ok: true });

  const lead = await getPrisma().lead.findFirst({
    where: {
      storeId: store.id,
      sessionId: parsed.data.sessionId,
      status: { in: ["BROWSING", "ENGAGED"] },
    },
    orderBy: { createdAt: "desc" },
  });

  await logLeadEvent({
    leadId: lead?.id,
    sessionId: parsed.data.sessionId,
    storeId: store.id,
    eventType: parsed.data.eventType,
    productId: parsed.data.productId,
    metadata: parsed.data.metadata as Prisma.InputJsonObject | undefined,
  });

  return NextResponse.json({ ok: true });
}
