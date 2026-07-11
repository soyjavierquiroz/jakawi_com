import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import {
  parseHandoffResolvePayload,
  resolveHandoffContext,
  type HandoffSnapshot,
} from "@/lib/seller-ai/handoff-context";

export async function POST(request: Request) {
  const payload = parseHandoffResolvePayload(await request.json().catch(() => null));
  if (!payload.ok) return NextResponse.json({ ok: false, error: payload.error }, { status: 400 });

  const result = await resolveHandoffContext({
    code: payload.value.code,
    phone: payload.value.phone,
    findSnapshot: async (snapshotCode) =>
      (await getPrisma().commercialSnapshot.findUnique({
        where: { snapshotCode },
        select: {
          snapshotCode: true,
          intentScore: true,
          customerPhone: true,
          customerSummary: true,
          currentItem: true,
          journey: {
            select: {
              id: true,
              intentScore: true,
              customerPhone: true,
              conversationSummary: true,
              store: {
                select: { id: true, name: true, whatsapp: true, currency: true, countryCode: true, locale: true },
              },
              currentProduct: {
                select: { id: true, storeId: true, name: true, priceCents: true, currency: true },
              },
            },
          },
          lead: {
            select: {
              id: true,
              storeId: true,
              customerPhone: true,
              intentScore: true,
              conversationSummary: true,
              conversation: {
                select: {
                  id: true,
                  storeId: true,
                  messages: {
                    select: { role: true, content: true, createdAt: true },
                    orderBy: { createdAt: "desc" },
                    take: 6,
                  },
                },
              },
            },
          },
        },
      })) as HandoffSnapshot | null,
  });

  return NextResponse.json(result.body, { status: result.status });
}
