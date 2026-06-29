import { LeadEventType, LeadStatus, MessageRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sellerAiConfig } from "@/config/seller-ai";
import { getPrisma } from "@/lib/prisma";
import { getRelatedProducts } from "@/lib/seller-ai/context";
import { calculateIntentScore, classifyIntent } from "@/lib/seller-ai/intent";
import { getOrCreateCustomerJourney, inferJourneyStage, updateCustomerJourney } from "@/lib/seller-ai/journey";
import { ensureSellerLead, logLeadEvent } from "@/lib/seller-ai/leads";
import { generateHeuristicReply, getQuickReplies } from "@/lib/seller-ai/templates";

const chatSchema = z.object({
  leadId: z.string().min(1).optional(),
  journeyId: z.string().min(1).optional(),
  sessionId: z.string().min(6).max(160).optional(),
  storeSlug: z.string().min(1).max(80).optional(),
  message: z.string().min(1).max(1000),
  currentProductId: z.string().optional(),
});

export async function POST(request: Request) {
  const parsed = chatSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });

  let lead = parsed.data.leadId
    ? await getPrisma().lead.findUnique({
        where: { id: parsed.data.leadId },
        include: { conversation: { include: { messages: { orderBy: { createdAt: "asc" } } } }, events: true, store: true, journey: true },
      })
    : null;

  if (!lead) {
    if (!parsed.data.storeSlug || !parsed.data.sessionId) return NextResponse.json({ ok: false, error: "Lead not found" }, { status: 404 });
    const store = await getPrisma().store.findUnique({ where: { slug: parsed.data.storeSlug } });
    if (!store || !store.isPublished) return NextResponse.json({ ok: false, error: "Store not found" }, { status: 404 });
    const ensured = await ensureSellerLead({
      storeId: store.id,
      sessionId: parsed.data.sessionId,
      currentProductId: parsed.data.currentProductId,
      source: "seller_ai_chat",
      journeyId: parsed.data.journeyId,
    });
    lead = await getPrisma().lead.findUnique({
      where: { id: ensured.lead.id },
      include: { conversation: { include: { messages: { orderBy: { createdAt: "asc" } } } }, events: true, store: true, journey: true },
    });
  }
  if (!lead || !lead.conversation) return NextResponse.json({ ok: false, error: "Lead not found" }, { status: 404 });

  const { journey } = await getOrCreateCustomerJourney({
    storeId: lead.storeId,
    sessionId: lead.sessionId,
    source: "seller_ai_chat",
    productId: parsed.data.currentProductId ?? lead.currentProductId,
    journeyId: parsed.data.journeyId ?? lead.journeyId,
  });
  if (!lead.journeyId) {
    lead = await getPrisma().lead.update({
      where: { id: lead.id },
      data: { journeyId: journey.id },
      include: { conversation: { include: { messages: { orderBy: { createdAt: "asc" } } } }, events: true, store: true, journey: true },
    });
  }
  const conversation = lead.conversation;
  if (!conversation) return NextResponse.json({ ok: false, error: "Lead not found" }, { status: 404 });

  const userMessageCount = conversation.messages.filter((message) => message.role === MessageRole.USER).length;
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
  const assistantMessage = product
    ? generateHeuristicReply({ userMessage: parsed.data.message, product, relatedProducts, store: lead.store, lead })
    : "Entiendo. Para orientarte mejor: ¿lo buscas para uso personal, regalo, trabajo o algo específico?";

  const userMessage = await getPrisma().conversationMessage.create({
    data: { conversationId: conversation.id, role: MessageRole.USER, content: parsed.data.message },
  });
  const replyMessage = await getPrisma().conversationMessage.create({
    data: { conversationId: conversation.id, role: MessageRole.ASSISTANT, content: assistantMessage, metadata: { productId: product?.id } },
  });

  await logLeadEvent({
    leadId: lead.id,
    sessionId: lead.sessionId,
    storeId: lead.storeId,
    eventType: LeadEventType.CUSTOMER_MESSAGE_SENT,
    productId: product?.id,
    journeyId: journey.id,
    metadata: { message: parsed.data.message },
  });
  await logLeadEvent({
    leadId: lead.id,
    sessionId: lead.sessionId,
    storeId: lead.storeId,
    eventType: LeadEventType.AI_MESSAGE_SENT,
    productId: product?.id,
    journeyId: journey.id,
    metadata: { message: assistantMessage },
  });

  const events = await getPrisma().leadEvent.findMany({ where: { leadId: lead.id } });
  const messages = [...conversation.messages, userMessage, replyMessage];
  const intentScore = calculateIntentScore({ events, messages, whatsappClicked: lead.status === LeadStatus.WHATSAPP_CLICKED });
  const shouldShowWhatsappCta = intentScore >= 55 || /quiero|me interesa|comprar|como compro|cómo compro|pedido|precio/.test(parsed.data.message.toLowerCase());

  await getPrisma().lead.update({
    where: { id: lead.id },
    data: {
      journeyId: journey.id,
      intentScore,
      status: lead.status === LeadStatus.BROWSING ? LeadStatus.ENGAGED : lead.status,
      currentProductId: product?.id ?? lead.currentProductId,
    },
  });
  await updateCustomerJourney({
    journeyId: journey.id,
    productId: product?.id,
    categoryId: product?.categoryId,
    intentScore,
    stage: inferJourneyStage({ productId: product?.id, intentScore, message: parsed.data.message }),
  });

  return NextResponse.json({
    ok: true,
    leadId: lead.id,
    leadCode: lead.leadCode,
    journeyId: journey.id,
    journeyCode: journey.journeyCode,
    assistantMessage,
    quickReplies: getQuickReplies({ product, category: product?.category }),
    intentScore,
    intentLabel: classifyIntent(intentScore),
    shouldShowWhatsappCta,
  });
}
