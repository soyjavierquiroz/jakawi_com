import { CommercialSnapshotChannel, JourneyEventType, LeadEventType, LeadStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { addJourneyEvent, getOrCreateCustomerJourney, updateCustomerJourney } from "@/lib/seller-ai/journey";
import { logLeadEvent } from "@/lib/seller-ai/leads";
import { createCommercialSnapshot } from "@/lib/seller-ai/snapshot";
import { generateLeadSummary } from "@/lib/seller-ai/templates";
import { buildWhatsappUrl, isReasonableCustomerPhone, normalizeCustomerPhone } from "@/lib/seller-ai/whatsapp";
import { getStorefrontFlow } from "@/lib/storefront-flow";

const continueSchema = z.object({
  leadId: z.string().min(1),
  journeyId: z.string().min(1).optional(),
  selectedProductId: z.string().optional(),
  customerPhone: z.string().trim().optional(),
  customerName: z.string().trim().max(80).optional(),
});

export async function POST(request: Request) {
  const parsed = continueSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });

  const lead = await getPrisma().lead.findUnique({
    where: { id: parsed.data.leadId },
    include: { store: true, conversation: { include: { messages: { orderBy: { createdAt: "asc" } } } } },
  });
  if (!lead || !lead.conversation) return NextResponse.json({ ok: false, error: "Lead not found" }, { status: 404 });

  const productId = parsed.data.selectedProductId ?? lead.selectedProductId ?? lead.currentProductId ?? undefined;
  const product = productId ? await getPrisma().product.findFirst({ where: { id: productId, storeId: lead.storeId, isVisible: true } }) : null;
  const { journey } = await getOrCreateCustomerJourney({
    storeId: lead.storeId,
    sessionId: lead.sessionId,
    source: "whatsapp_handoff",
    productId: product?.id,
    journeyId: parsed.data.journeyId ?? lead.journeyId,
  });
  const customerPhone = parsed.data.customerPhone ? normalizeCustomerPhone(parsed.data.customerPhone) : lead.customerPhone;
  const customerName = parsed.data.customerName || lead.customerName;
  const flow = getStorefrontFlow(lead.store.plan);

  if (parsed.data.customerPhone && !isReasonableCustomerPhone(parsed.data.customerPhone)) {
    return NextResponse.json({ ok: false, error: "Invalid customer phone" }, { status: 400 });
  }

  if (flow.requirePhoneBeforeWhatsapp && !customerPhone) {
    return NextResponse.json(
      {
        ok: false,
        error: "PHONE_REQUIRED",
        message: "Necesitamos tu WhatsApp para continuar.",
      },
      { status: 400 },
    );
  }

  const summary = lead.conversationSummary ?? generateLeadSummary({ lead, messages: lead.conversation.messages, product });
  const enrichedJourney = await getPrisma().customerJourney.findUnique({ where: { id: journey.id } });
  const snapshot = await createCommercialSnapshot({
    journeyId: journey.id,
    leadId: lead.id,
    channel: CommercialSnapshotChannel.WHATSAPP,
    customerName,
    customerPhone,
    city: lead.city,
    currentItem: product
      ? {
          id: product.id,
          name: product.name,
          slug: product.slug,
          priceCents: product.priceCents,
          currency: lead.store.currency ?? product.currency,
        }
      : undefined,
    recommendedItems: enrichedJourney?.recommendedProducts ?? lead.recommendedProducts ?? undefined,
    viewedItems: enrichedJourney?.viewedProducts ?? lead.viewedProducts ?? undefined,
    detectedNeed: enrichedJourney?.detectedNeed,
    objections: enrichedJourney?.objections ?? (Array.isArray(lead.objections) ? lead.objections.join(", ") : null),
    budget: enrichedJourney?.budget ?? lead.budget,
    urgency: enrichedJourney?.urgency ?? lead.urgency,
    intentScore: Math.max(lead.intentScore, 75),
    customerSummary: summary,
  });
  const finalMessage = snapshot.whatsappMessage ?? snapshot.channelMessage ?? summary;

  const updatedLead = await getPrisma().lead.update({
    where: { id: lead.id },
    data: {
      journeyId: journey.id,
      snapshotId: snapshot.id,
      status: LeadStatus.WHATSAPP_CLICKED,
      whatsappClickedAt: new Date(),
      customerPhone,
      customerName,
      selectedProductId: product?.id ?? lead.selectedProductId,
      conversationSummary: summary,
      whatsappMessage: finalMessage,
      intentScore: Math.max(lead.intentScore, 75),
    },
  });
  await updateCustomerJourney({
    journeyId: journey.id,
    productId: product?.id,
    customerName,
    customerPhone,
    city: lead.city,
    budget: enrichedJourney?.budget ?? lead.budget,
    urgency: enrichedJourney?.urgency ?? lead.urgency,
    objections: enrichedJourney?.objections ?? (Array.isArray(lead.objections) ? lead.objections.join(", ") : null),
    conversationSummary: summary,
    intentScore: Math.max(lead.intentScore, 75),
  });
  await addJourneyEvent({
    journeyId: journey.id,
    type: JourneyEventType.SNAPSHOT_CREATED,
    productId: product?.id,
    payload: { snapshotId: snapshot.id, snapshotCode: snapshot.snapshotCode, leadId: lead.id },
  });
  await addJourneyEvent({
    journeyId: journey.id,
    type: JourneyEventType.CHANNEL_CLICKED,
    productId: product?.id,
    payload: { channel: CommercialSnapshotChannel.WHATSAPP, snapshotCode: snapshot.snapshotCode },
  });

  await logLeadEvent({
    leadId: lead.id,
    sessionId: lead.sessionId,
    storeId: lead.storeId,
    eventType: LeadEventType.WHATSAPP_CLICKED,
    productId: product?.id,
    journeyId: journey.id,
    metadata: { snapshotCode: snapshot.snapshotCode },
    writeJourneyEvent: false,
  });

  return NextResponse.json({
    ok: true,
    whatsappUrl: buildWhatsappUrl(lead.store, finalMessage),
    leadCode: updatedLead.leadCode,
    journeyCode: journey.journeyCode,
    snapshotCode: snapshot.snapshotCode,
    message: finalMessage,
  });
}
