import { CommercialSnapshotChannel, Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { generateSnapshotCode } from "@/lib/seller-ai/journey-code";

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

function itemName(value?: Prisma.JsonValue | null) {
  if (!value || typeof value !== "object" || Array.isArray(value) || !("name" in value)) return null;
  const name = value.name;
  return typeof name === "string" ? name : null;
}

function itemNames(value?: Prisma.JsonValue | null) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "object" && item && "name" in item ? item.name : null))
    .filter((name): name is string => typeof name === "string" && name.length > 0)
    .slice(0, 3);
}

export function buildChannelMessageFromSnapshot(snapshot: SnapshotMessageInput) {
  const currentItemName = itemName(snapshot.currentItem);
  const recommendedNames = itemNames(snapshot.recommendedItems);
  const lines = [
    "Hola, vengo de JAKAWI.",
    currentItemName ? `Me interesa: ${currentItemName}.` : null,
    !currentItemName && snapshot.detectedNeed ? `Estoy buscando: ${snapshot.detectedNeed}.` : null,
    currentItemName && snapshot.detectedNeed ? `Lo quiero para: ${snapshot.detectedNeed}.` : null,
    recommendedNames.length > 0 ? `Opciones recomendadas: ${recommendedNames.join(", ")}.` : null,
    snapshot.objections ? `Duda principal: ${snapshot.objections}.` : null,
    snapshot.customerPhone ? `Mi número: ${snapshot.customerPhone}.` : null,
    snapshot.customerName ? `Mi nombre: ${snapshot.customerName}.` : null,
    snapshot.budget ? `Presupuesto: ${snapshot.budget}.` : null,
    snapshot.urgency ? `Urgencia: ${snapshot.urgency}.` : null,
    snapshot.city ? `Ciudad: ${snapshot.city}.` : null,
    snapshot.customerSummary ? `Resumen: ${snapshot.customerSummary}` : null,
    `Código: ${snapshot.snapshotCode}.`,
    "Quiero saber cómo comprar.",
  ].filter(Boolean);

  return lines.join("\n");
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
  const providedMessage = whatsappMessage && whatsappMessage.includes(snapshotCode) ? whatsappMessage : whatsappMessage ? `${whatsappMessage}\nSnapshot: ${snapshotCode}` : null;
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
