import { LeadEventType, MessageRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { getRelatedProducts } from "@/lib/seller-ai/context";
import { ensureSellerLead, logLeadEvent } from "@/lib/seller-ai/leads";
import { getOpeningMessage, getQuickReplies } from "@/lib/seller-ai/templates";

const openingSchema = z.object({
  sessionId: z.string().min(6).max(160),
  storeSlug: z.string().min(1).max(80),
  productId: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = openingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });

  const store = await getPrisma().store.findUnique({ where: { slug: parsed.data.storeSlug } });
  if (!store || !store.isPublished) return NextResponse.json({ ok: false, error: "Store not found" }, { status: 404 });

  const product = await getPrisma().product.findFirst({
    where: { id: parsed.data.productId, storeId: store.id, isVisible: true },
    include: { category: true },
  });
  if (!product) return NextResponse.json({ ok: false, error: "Product not found" }, { status: 404 });

  const { lead } = await ensureSellerLead({
    storeId: store.id,
    sessionId: parsed.data.sessionId,
    currentProductId: product.id,
    source: "product_page",
  });
  const relatedProducts = await getRelatedProducts(store.id, product);
  const message = getOpeningMessage({ product, category: product.category, store });
  const conversationId = lead.conversation?.id;

  if (conversationId) {
    await getPrisma().conversationMessage.create({
      data: {
        conversationId,
        role: MessageRole.ASSISTANT,
        content: message,
        metadata: { kind: "opening", productId: product.id },
      },
    });
  }

  await getPrisma().lead.update({
    where: { id: lead.id },
    data: {
      recommendedProducts: relatedProducts.map((item) => ({ id: item.id, name: item.name, slug: item.slug })),
    },
  });

  await logLeadEvent({
    leadId: lead.id,
    sessionId: parsed.data.sessionId,
    storeId: store.id,
    eventType: LeadEventType.AI_MESSAGE_SENT,
    productId: product.id,
    metadata: { kind: "opening" },
  });

  return NextResponse.json({
    ok: true,
    leadId: lead.id,
    leadCode: lead.leadCode,
    message,
    quickReplies: getQuickReplies({ product, category: product.category }),
    recommendedProducts: relatedProducts.map((item) => ({ id: item.id, name: item.name, slug: item.slug, imageUrl: item.imageUrl })),
  });
}
