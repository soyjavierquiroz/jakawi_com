"use server";

import { LeadEventType, LeadStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

async function updateLeadStatus(formData: FormData, status: LeadStatus) {
  const user = await requireUser();
  const leadId = String(formData.get("leadId") ?? "");
  const lead = await getPrisma().lead.findFirst({
    where: { id: leadId, store: { ownerId: user.id } },
  });

  if (!lead) redirect("/app/leads");

  await getPrisma().lead.update({ where: { id: lead.id }, data: { status } });
  await getPrisma().leadEvent.create({
    data: {
      leadId: lead.id,
      sessionId: lead.sessionId,
      storeId: lead.storeId,
      eventType: LeadEventType.LEAD_STATUS_CHANGED,
      metadata: { status },
    },
  });

  revalidatePath("/app/leads");
  revalidatePath(`/app/leads/${lead.id}`);
}

export async function markLeadWon(formData: FormData) {
  await updateLeadStatus(formData, LeadStatus.WON);
}

export async function markLeadLost(formData: FormData) {
  await updateLeadStatus(formData, LeadStatus.LOST);
}

export async function markLeadContacted(formData: FormData) {
  await updateLeadStatus(formData, LeadStatus.CONTACTED);
}
