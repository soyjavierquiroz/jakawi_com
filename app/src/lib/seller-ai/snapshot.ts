import { CommercialSnapshotChannel, Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { generateSnapshotCode } from "@/lib/seller-ai/journey-code";
import { buildWhatsappHandoffMessage } from "@/lib/seller-ai/lead-qualification";

type SnapshotMessageInput = {
  snapshotCode: string;
  customerSummary?: string | null;
  detectedNeed?: string | null;
  currentItem?: Prisma.JsonValue | null;
  recommendedItems?: Prisma.JsonValue | null;
  viewedItems?: Prisma.JsonValue | null;
  objections?: string | null;
  budget?: string | null;
  urgency?: string | null;
  intentScore?: number | null;
  customerName?: string | null;
  customerPhone?: string | null;
  city?: string | null;
};

export async function createUniqueSnapshotCode() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const snapshotCode = generateSnapshotCode();
    const existing = await getPrisma().commercialSnapshot.findUnique({ where: { snapshotCode } });
    if (!existing) return snapshotCode;
  }

  return `SNP-${Date.now().toString(36).toUpperCase().slice(-7)}`;
}

export function buildChannelMessageFromSnapshot(snapshot: SnapshotMessageInput) {
  return buildWhatsappHandoffMessage(snapshot.snapshotCode);
}

export async function createCommercialSnapshot({
  journeyId,
  leadId,
  channel = CommercialSnapshotChannel.WHATSAPP,
  customerName,
  customerPhone,
  city,
  currentItem,
  recommendedItems,
  viewedItems,
  detectedNeed,
  objections,
  budget,
  urgency,
  intentScore = 0,
  customerSummary,
  whatsappMessage,
  channelMessage,
}: {
  journeyId: string;
  leadId?: string | null;
  channel?: CommercialSnapshotChannel;
  customerName?: string | null;
  customerPhone?: string | null;
  city?: string | null;
  currentItem?: Prisma.InputJsonValue;
  recommendedItems?: Prisma.InputJsonValue;
  viewedItems?: Prisma.InputJsonValue;
  detectedNeed?: string | null;
  objections?: string | null;
  budget?: string | null;
  urgency?: string | null;
  intentScore?: number;
  customerSummary?: string | null;
  whatsappMessage?: string | null;
  channelMessage?: string | null;
}) {
  const snapshotCode = await createUniqueSnapshotCode();
  const providedMessage = whatsappMessage && whatsappMessage.includes(snapshotCode) ? whatsappMessage : null;
  const generatedMessage =
    channelMessage ??
    providedMessage ??
    buildChannelMessageFromSnapshot({
      snapshotCode,
      customerSummary,
      detectedNeed,
      currentItem: currentItem as Prisma.JsonValue,
      recommendedItems: recommendedItems as Prisma.JsonValue,
      viewedItems: viewedItems as Prisma.JsonValue,
      objections,
      budget,
      urgency,
      intentScore,
      customerName,
      customerPhone,
      city,
    });

  return getPrisma().commercialSnapshot.create({
    data: {
      snapshotCode,
      journeyId,
      leadId,
      channel,
      customerName,
      customerPhone,
      city,
      currentItem,
      recommendedItems,
      viewedItems,
      detectedNeed,
      objections,
      budget,
      urgency,
      intentScore,
      customerSummary,
      whatsappMessage: providedMessage ?? generatedMessage,
      channelMessage: generatedMessage,
    },
  });
}

export async function buildSnapshotFromJourney({
  journeyId,
  leadId,
  channel = CommercialSnapshotChannel.WHATSAPP,
  customerName,
  customerPhone,
  city,
  customerSummary,
  whatsappMessage,
  currentItem,
}: {
  journeyId: string;
  leadId?: string | null;
  channel?: CommercialSnapshotChannel;
  customerName?: string | null;
  customerPhone?: string | null;
  city?: string | null;
  customerSummary?: string | null;
  whatsappMessage?: string | null;
  currentItem?: Prisma.InputJsonValue;
}) {
  const journey = await getPrisma().customerJourney.findUnique({
    where: { id: journeyId },
    include: { currentProduct: true },
  });
  if (!journey) throw new Error("Journey not found");

  const journeyItem =
    currentItem ??
    (journey.currentProduct
      ? {
          id: journey.currentProduct.id,
          name: journey.currentProduct.name,
          slug: journey.currentProduct.slug,
          priceCents: journey.currentProduct.priceCents,
          currency: journey.currentProduct.currency,
        }
      : undefined);

  return createCommercialSnapshot({
    journeyId,
    leadId,
    channel,
    customerName: customerName ?? journey.customerName,
    customerPhone: customerPhone ?? journey.customerPhone,
    city: city ?? journey.city,
    currentItem: journeyItem,
    recommendedItems: journey.recommendedProducts as Prisma.InputJsonValue | undefined,
    viewedItems: journey.viewedProducts as Prisma.InputJsonValue | undefined,
    detectedNeed: journey.detectedNeed,
    objections: journey.objections,
    budget: journey.budget,
    urgency: journey.urgency,
    intentScore: journey.intentScore,
    customerSummary: customerSummary ?? journey.conversationSummary,
    whatsappMessage,
  });
}

export async function getSnapshotByCode({ snapshotCode }: { snapshotCode: string }) {
  return getPrisma().commercialSnapshot.findUnique({
    where: { snapshotCode },
    include: { journey: true, lead: true },
  });
}
