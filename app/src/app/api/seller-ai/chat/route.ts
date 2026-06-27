import { LeadEventType, LeadStatus, MessageRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sellerAiConfig } from "@/config/seller-ai";
import { getPrisma } from "@/lib/prisma";
import { getRelatedProducts } from "@/lib/seller-ai/context";
import { calculateIntentScore, classifyIntent } from "@/lib/seller-ai/intent";
import { logLeadEvent } from "@/lib/seller-ai/leads";
import { generateHeuristicReply, getQuickReplies } from "@/lib/seller-ai/templates";

const chatSchema = z.object({
  leadId: z.string().min(1),
  message: z.string().min(1).max(1000),
  currentProductId: z.string().optional(),
});

export async function POST(request: Request) {
  const parsed = chatSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });

  const lead = await getPrisma().lead.findUnique({
    where: { id: parsed.data.leadId },
    include: { conversation: { include: { messages: { orderBy: { createdAt: "asc" } } } }, events: true, store: true },
  });
  if (!lead || !lead.conversation) return NextResponse.json({ ok: false, error: "Lead not found" }, { status: 404 });

  const userMessageCount = lead.conversation.messages.filter((message) => message.role === MessageRole.USER).length;
  if (userMessageCount >= 30) {
    return NextResponse.json({
      ok: true,
      assistantMessage: sellerAiConfig.reserved.maxMessages,
      quickReplies: [],
      intentScore: lead.intentScore,
      intentLabel: classifyIntent(lead.intentScore),
      shouldShowWhatsappCta: true,
    });
  }

  const product = parsed.data.currentProductId || lead.currentProductId
    ? await getPrisma().product.findFirst({
        where: { id: parsed.data.currentProductId ?? lead.currentProductId ?? undefined, storeId: lead.storeId, isVisible: true },
        include: { category: true },
      })
    : null;
  const relatedProducts = product ? await getRelatedProducts(lead.storeId, product) : [];
  const assistantMessage = generateHeuristicReply({ userMessage: parsed.data.message, product, relatedProducts, store: lead.store, lead });

  const userMessage = await getPrisma().conversationMessage.create({
    data: { conversationId: lead.conversation.id, role: MessageRole.USER, content: parsed.data.message },
  });
  const replyMessage = await getPrisma().conversationMessage.create({
    data: { conversationId: lead.conversation.id, role: MessageRole.ASSISTANT, content: assistantMessage, metadata: { productId: product?.id } },
  });

  await logLeadEvent({
    leadId: lead.id,
    sessionId: lead.sessionId,
    storeId: lead.storeId,
    eventType: LeadEventType.CUSTOMER_MESSAGE_SENT,
    productId: product?.id,
  });
  await logLeadEvent({
    leadId: lead.id,
    sessionId: lead.sessionId,
    storeId: lead.storeId,
    eventType: LeadEventType.AI_MESSAGE_SENT,
    productId: product?.id,
  });

  const events = await getPrisma().leadEvent.findMany({ where: { leadId: lead.id } });
  const messages = [...lead.conversation.messages, userMessage, replyMessage];
  const intentScore = calculateIntentScore({ events, messages, whatsappClicked: lead.status === LeadStatus.WHATSAPP_CLICKED });
  const shouldShowWhatsappCta = intentScore >= 55 || /quiero|me interesa|comprar|como compro|cómo compro|pedido|precio/.test(parsed.data.message.toLowerCase());

  await getPrisma().lead.update({
    where: { id: lead.id },
    data: {
      intentScore,
      status: lead.status === LeadStatus.BROWSING ? LeadStatus.ENGAGED : lead.status,
      currentProductId: product?.id ?? lead.currentProductId,
    },
  });

  return NextResponse.json({
    ok: true,
    assistantMessage,
    quickReplies: getQuickReplies({ product, category: product?.category }),
    intentScore,
    intentLabel: classifyIntent(intentScore),
    shouldShowWhatsappCta,
  });
}
