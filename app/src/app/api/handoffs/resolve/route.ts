import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import {
  parseHandoffResolvePayload,
  resolveHandoffContext,
  type HandoffSnapshot,
} from "@/lib/seller-ai/handoff-context";

export async function POST(request: Request) {
  const payload = parseHandoffResolvePayload(await request.json().catch(() => null));
  if (!payload) return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });

  const result = await resolveHandoffContext({
    code: payload.code,
    phone: payload.phone,
    findSnapshot: async (snapshotCode) =>
      (await getPrisma().commercialSnapshot.findUnique({
        where: { snapshotCode },
        include: {
          journey: {
            include: {
              store: {
                select: { id: true, name: true, whatsapp: true, currency: true, countryCode: true, locale: true },
              },
              currentProduct: {
                select: { id: true, name: true, priceCents: true, currency: true },
              },
            },
          },
          lead: {
            include: {
              conversation: {
                select: {
                  id: true,
                  messages: {
                    select: { role: true, content: true, createdAt: true },
                    orderBy: { createdAt: "desc" },
                    take: 8,
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
