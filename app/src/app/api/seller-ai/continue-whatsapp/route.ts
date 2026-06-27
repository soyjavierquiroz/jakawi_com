import { LeadEventType, LeadStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { logLeadEvent } from "@/lib/seller-ai/leads";
import { generateLeadSummary } from "@/lib/seller-ai/templates";
import { buildWhatsappLeadMessage, buildWhatsappUrl, isReasonableCustomerPhone, normalizeCustomerPhone } from "@/lib/seller-ai/whatsapp";
import { getStorefrontFlow } from "@/lib/storefront-flow";

const continueSchema = z.object({
  leadId: z.string().min(1),
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
  const message = buildWhatsappLeadMessage({
    lead: {
      ...lead,
      customerPhone,
      customerName,
    },
    store: lead.store,
    product,
    summary,
  });

  const updatedLead = await getPrisma().lead.update({
    where: { id: lead.id },
    data: {
      status: LeadStatus.WHATSAPP_CLICKED,
      whatsappClickedAt: new Date(),
      customerPhone,
      customerName,
      selectedProductId: product?.id ?? lead.selectedProductId,
      conversationSummary: summary,
      whatsappMessage: message,
      intentScore: Math.max(lead.intentScore, 75),
    },
  });

  await logLeadEvent({
    leadId: lead.id,
    sessionId: lead.sessionId,
    storeId: lead.storeId,
    eventType: LeadEventType.WHATSAPP_CLICKED,
    productId: product?.id,
  });

  return NextResponse.json({
    ok: true,
    whatsappUrl: buildWhatsappUrl(lead.store, message),
    leadCode: updatedLead.leadCode,
    message,
  });
}
