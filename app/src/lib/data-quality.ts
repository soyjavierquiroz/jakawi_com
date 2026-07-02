import { DATA_QUALITY_LABELS, dataQualityConfig, dataQualityDisplay } from "@/config/data-quality";
import { type Prisma } from "@prisma/client";

export type DataQualityLabel = "REAL" | "DEMO" | "QA" | "INTERNAL" | "NEEDS_REVIEW";

export type DataQualityClassification = {
  label: DataQualityLabel;
  reason: string;
  isCommercial: boolean;
};

type UserLike = {
  email?: string | null;
  role?: string | null;
};

type StoreLike = {
  slug?: string | null;
  name?: string | null;
  description?: string | null;
  commercialTagline?: string | null;
  owner?: UserLike | null;
};

type PartnerLike = {
  code?: string | null;
  name?: string | null;
  notes?: string | null;
  portalUser?: UserLike | null;
};

type PartnerDestinationLike = {
  slug?: string | null;
  label?: string | null;
  targetUrl?: string | null;
  notes?: string | null;
  partner?: PartnerLike | null;
};

type AttributionLike = {
  code?: string | null;
  landingPath?: string | null;
  notes?: string | null;
  store?: StoreLike | null;
  referrerStore?: StoreLike | null;
  partner?: PartnerLike | null;
  partnerDestination?: PartnerDestinationLike | null;
  partnerDestinationSlug?: string | null;
};

type PaymentLike = {
  externalReference?: string | null;
  description?: string | null;
  notes?: string | null;
  store?: StoreLike | null;
};

type CommissionLike = {
  description?: string | null;
  notes?: string | null;
  paymentReference?: string | null;
  partner?: PartnerLike | null;
  store?: StoreLike | null;
  attribution?: AttributionLike | null;
};

type RewardLike = {
  valueLabel?: string | null;
  description?: string | null;
  notes?: string | null;
  applicationReference?: string | null;
  referrerStore?: StoreLike | null;
  referredStore?: StoreLike | null;
  attribution?: AttributionLike | null;
};

type GrowthClickLike = {
  code?: string | null;
  destinationSlug?: string | null;
  landingPath?: string | null;
  targetUrl?: string | null;
  referrer?: string | null;
  userAgent?: string | null;
  visitorId?: string | null;
  partner?: PartnerLike | null;
  partnerDestination?: PartnerDestinationLike | null;
  referrerStore?: StoreLike | null;
};

type LeadLike = {
  leadCode?: string | null;
  sessionId?: string | null;
  visitorId?: string | null;
  source?: string | null;
  customerName?: string | null;
  conversationSummary?: string | null;
  whatsappMessage?: string | null;
  store?: StoreLike | null;
};

export { DATA_QUALITY_LABELS, dataQualityDisplay };

function classification(label: DataQualityLabel, reason: string): DataQualityClassification {
  return {
    label,
    reason,
    isCommercial: label === "REAL",
  };
}

function clean(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function compact(values: Array<string | null | undefined>) {
  return values.map(clean).filter(Boolean);
}

function isKnownSafeNonPattern(value: string) {
  return (dataQualityConfig.safeNonPatterns as readonly string[]).some((safe) => value === safe || value.includes(safe));
}

function matchesPattern(value: string, pattern: string) {
  if (!value || isKnownSafeNonPattern(value)) return false;
  if (pattern === "qa") return /(^|[^a-z0-9])qa([^a-z0-9]|$)/i.test(value);
  if (pattern === "test") return /(^|[^a-z0-9])test([^a-z0-9]|$)/i.test(value);
  if (pattern === "demo") return /(^|[^a-z0-9])demo([^a-z0-9]|$)/i.test(value);
  if (pattern === "seed") return /(^|[^a-z0-9])seed([^a-z0-9]|$)/i.test(value);
  return value.includes(pattern);
}

function textClassification(values: Array<string | null | undefined>, fieldLabel: string): DataQualityClassification {
  for (const value of compact(values)) {
    const internalPattern = (dataQualityConfig.internalTextPatterns as readonly string[]).find((pattern) => matchesPattern(value, pattern));
    if (internalPattern) return classification("INTERNAL", `${fieldLabel} contiene marcador interno '${internalPattern}'.`);

    const qaPattern = (dataQualityConfig.qaTextPatterns as readonly string[]).find((pattern) => matchesPattern(value, pattern));
    if (qaPattern) {
      const label = qaPattern === "demo" ? "DEMO" : "QA";
      return classification(label, `${fieldLabel} contiene marcador '${qaPattern}'.`);
    }
  }

  return classification("REAL", "Sin marcadores demo/QA/internal conocidos.");
}

function mergeClassifications(items: DataQualityClassification[]): DataQualityClassification {
  const qa = items.find((item) => item.label === "QA");
  if (qa) return qa;
  const demo = items.find((item) => item.label === "DEMO");
  if (demo) return demo;
  const internal = items.find((item) => item.label === "INTERNAL");
  if (internal) return internal;
  const review = items.find((item) => item.label === "NEEDS_REVIEW");
  if (review) return review;
  return classification("REAL", "Sin señales demo/QA/internal conocidas.");
}

export function isCommercialData(input: DataQualityClassification | DataQualityLabel | null | undefined) {
  const label = typeof input === "string" ? input : input?.label;
  return label === "REAL";
}

export function summarizeDataQuality(items: Array<DataQualityClassification | DataQualityLabel | null | undefined>) {
  const summary: Record<DataQualityLabel, number> = {
    REAL: 0,
    DEMO: 0,
    QA: 0,
    INTERNAL: 0,
    NEEDS_REVIEW: 0,
  };

  for (const item of items) {
    const label = typeof item === "string" ? item : item?.label;
    if (!label) continue;
    summary[label] += 1;
  }

  return {
    ...summary,
    commercial: summary.REAL,
    excluded: summary.DEMO + summary.QA + summary.INTERNAL,
    needsReview: summary.NEEDS_REVIEW,
  };
}

export function classifyUserDataQuality(user: UserLike | null | undefined): DataQualityClassification {
  if (!user) return classification("REAL", "Sin usuario asociado.");
  const email = clean(user.email);
  if ((dataQualityConfig.knownDemoEmails as readonly string[]).includes(email)) return classification("DEMO", "Email demo explícito.");
  return textClassification([user.email], "Email de usuario");
}

export function classifyStoreDataQuality(store: StoreLike | null | undefined): DataQualityClassification {
  if (!store) return classification("REAL", "Sin tienda asociada.");
  const slug = clean(store.slug);
  if ((dataQualityConfig.knownDemoStoreSlugs as readonly string[]).includes(slug)) return classification("DEMO", "Slug demo explícito.");
  const owner = classifyUserDataQuality(store.owner);
  if (owner.label !== "REAL") return owner;
  const text = textClassification([store.slug, store.name, store.description, store.commercialTagline], "Datos de tienda");
  if (text.label !== "REAL") return text;
  if ((dataQualityConfig.possibleDemoStoreSlugs as readonly string[]).includes(slug)) {
    return classification("NEEDS_REVIEW", "Slug potencialmente demo ('ejemplo'); revisar antes de tratar como fixture.");
  }
  return classification("REAL", "Tienda sin señales demo/QA/internal conocidas.");
}

export function classifyPartnerDataQuality(partner: PartnerLike | null | undefined): DataQualityClassification {
  if (!partner) return classification("REAL", "Sin partner asociado.");
  const code = clean(partner.code);
  if ((dataQualityConfig.knownDemoPartnerCodes as readonly string[]).includes(code)) return classification("DEMO", "Código de partner demo explícito.");
  const portalUser = classifyUserDataQuality(partner.portalUser);
  if (portalUser.label !== "REAL") return portalUser;
  const text = textClassification([partner.code, partner.name, partner.notes], "Datos de partner");
  return text.label === "REAL" ? classification("REAL", "Partner sin señales demo/QA/internal conocidas.") : text;
}

export function classifyPartnerDestinationDataQuality(destination: PartnerDestinationLike | null | undefined): DataQualityClassification {
  if (!destination) return classification("REAL", "Sin destino partner asociado.");
  return mergeClassifications([
    classifyPartnerDataQuality(destination.partner),
    textClassification([destination.slug, destination.label, destination.targetUrl, destination.notes], "Destino partner"),
  ]);
}

export function classifyAttributionDataQuality(attribution: AttributionLike | null | undefined): DataQualityClassification {
  if (!attribution) return classification("REAL", "Sin atribución asociada.");
  return mergeClassifications([
    classifyStoreDataQuality(attribution.store),
    classifyStoreDataQuality(attribution.referrerStore),
    classifyPartnerDataQuality(attribution.partner),
    classifyPartnerDestinationDataQuality(attribution.partnerDestination),
    textClassification([attribution.code, attribution.landingPath, attribution.notes, attribution.partnerDestinationSlug], "Atribución"),
  ]);
}

export function classifyPaymentDataQuality(payment: PaymentLike | null | undefined): DataQualityClassification {
  if (!payment) return classification("REAL", "Sin pago asociado.");
  return mergeClassifications([
    classifyStoreDataQuality(payment.store),
    textClassification([payment.externalReference, payment.description, payment.notes], "Pago"),
  ]);
}

export function classifyCommissionDataQuality(commission: CommissionLike | null | undefined): DataQualityClassification {
  if (!commission) return classification("REAL", "Sin comisión asociada.");
  return mergeClassifications([
    classifyPartnerDataQuality(commission.partner),
    classifyStoreDataQuality(commission.store),
    classifyAttributionDataQuality(commission.attribution),
    textClassification([commission.description, commission.notes, commission.paymentReference], "Comisión"),
  ]);
}

export function classifyRewardDataQuality(reward: RewardLike | null | undefined): DataQualityClassification {
  if (!reward) return classification("REAL", "Sin recompensa asociada.");
  return mergeClassifications([
    classifyStoreDataQuality(reward.referrerStore),
    classifyStoreDataQuality(reward.referredStore),
    classifyAttributionDataQuality(reward.attribution),
    textClassification([reward.valueLabel, reward.description, reward.notes, reward.applicationReference], "Reward"),
  ]);
}

export function classifyGrowthClickDataQuality(click: GrowthClickLike | null | undefined): DataQualityClassification {
  if (!click) return classification("REAL", "Sin click asociado.");
  return mergeClassifications([
    classifyPartnerDataQuality(click.partner),
    classifyPartnerDestinationDataQuality(click.partnerDestination),
    classifyStoreDataQuality(click.referrerStore),
    textClassification([click.code, click.destinationSlug, click.landingPath, click.targetUrl, click.referrer, click.userAgent, click.visitorId], "Growth click"),
  ]);
}

export function classifyLeadDataQuality(lead: LeadLike | null | undefined): DataQualityClassification {
  if (!lead) return classification("REAL", "Sin lead asociado.");
  if ((dataQualityConfig.knownQaLeadCodes as readonly string[]).includes(String(lead.leadCode ?? ""))) return classification("QA", "Lead code QA explícito.");
  return mergeClassifications([
    classifyStoreDataQuality(lead.store),
    textClassification([lead.leadCode, lead.sessionId, lead.visitorId, lead.source, lead.customerName, lead.conversationSummary, lead.whatsappMessage], "Lead"),
  ]);
}

export function getDataQualityDisplay(label: DataQualityLabel) {
  return dataQualityDisplay[label];
}

export function getDataQualityForUser(user: UserLike | null | undefined) {
  return classifyUserDataQuality(user).label;
}

export function getDataQualityForStore(store: StoreLike | null | undefined) {
  return classifyStoreDataQuality(store).label;
}

export function getDataQualityForPartner(partner: PartnerLike | null | undefined) {
  return classifyPartnerDataQuality(partner).label;
}

export function getDataQualityForPartnerDestination(destination: PartnerDestinationLike | null | undefined) {
  return classifyPartnerDestinationDataQuality(destination).label;
}

export function getDataQualityForAttribution(attribution: AttributionLike | null | undefined) {
  return classifyAttributionDataQuality(attribution).label;
}

export function getDataQualityForStorePayment(payment: PaymentLike | null | undefined) {
  return classifyPaymentDataQuality(payment).label;
}

export function getDataQualityForPartnerCommission(commission: CommissionLike | null | undefined) {
  return classifyCommissionDataQuality(commission).label;
}

export function getDataQualityForStoreReferralReward(reward: RewardLike | null | undefined) {
  return classifyRewardDataQuality(reward).label;
}

export function isCommercialRealDataQuality(label: DataQualityLabel) {
  return isCommercialData(label);
}

function markerContainsWhere<T>(fields: string[], patterns: readonly string[]): T[] {
  return fields.flatMap((field) =>
    patterns.map((pattern) => ({ [field]: { contains: pattern, mode: "insensitive" as const } }) as T),
  );
}

const qaPatterns = dataQualityConfig.qaTextPatterns as readonly string[];
const internalPatterns = dataQualityConfig.internalTextPatterns as readonly string[];
const nonCommercialPatterns = [...qaPatterns, ...internalPatterns];

function storeTextMarkers(): Prisma.StoreWhereInput[] {
  return [
    { slug: { in: [...dataQualityConfig.knownDemoStoreSlugs], mode: "insensitive" } },
    { owner: { email: { in: [...dataQualityConfig.knownDemoEmails], mode: "insensitive" } } },
    ...markerContainsWhere<Prisma.StoreWhereInput>(["slug", "name", "description", "commercialTagline"], nonCommercialPatterns),
  ];
}

function partnerTextMarkers(): Prisma.PartnerWhereInput[] {
  return [
    { code: { in: [...dataQualityConfig.knownDemoPartnerCodes], mode: "insensitive" } },
    ...markerContainsWhere<Prisma.PartnerWhereInput>(["code", "name", "notes"], nonCommercialPatterns),
  ];
}

function destinationTextMarkers(): Prisma.PartnerDestinationWhereInput[] {
  return markerContainsWhere<Prisma.PartnerDestinationWhereInput>(["slug", "label", "targetUrl", "notes"], nonCommercialPatterns);
}

function attributionTextMarkers(): Prisma.AcquisitionAttributionWhereInput[] {
  return markerContainsWhere<Prisma.AcquisitionAttributionWhereInput>(["code", "landingPath", "notes", "partnerDestinationSlug"], nonCommercialPatterns);
}

function growthClickTextMarkers(): Prisma.GrowthLinkClickWhereInput[] {
  return markerContainsWhere<Prisma.GrowthLinkClickWhereInput>(["code", "destinationSlug", "landingPath", "targetUrl", "referrer", "userAgent", "visitorId"], nonCommercialPatterns);
}

function paymentTextMarkers(): Prisma.StorePaymentWhereInput[] {
  return markerContainsWhere<Prisma.StorePaymentWhereInput>(["externalReference", "description", "notes"], nonCommercialPatterns);
}

function commissionTextMarkers(): Prisma.PartnerCommissionWhereInput[] {
  return markerContainsWhere<Prisma.PartnerCommissionWhereInput>(["description", "notes", "paymentReference"], nonCommercialPatterns);
}

function rewardTextMarkers(): Prisma.StoreReferralRewardWhereInput[] {
  return markerContainsWhere<Prisma.StoreReferralRewardWhereInput>(["valueLabel", "description", "notes", "applicationReference"], nonCommercialPatterns);
}

export function nonRealStoreWhere(): Prisma.StoreWhereInput {
  return { OR: storeTextMarkers() };
}

export function commercialRealStoreWhere(): Prisma.StoreWhereInput {
  return { NOT: [nonRealStoreWhere()] };
}

export function nonRealPartnerWhere(): Prisma.PartnerWhereInput {
  return { OR: partnerTextMarkers() };
}

export function commercialRealPartnerWhere(): Prisma.PartnerWhereInput {
  return { NOT: [nonRealPartnerWhere()] };
}

export function nonRealPartnerDestinationWhere(): Prisma.PartnerDestinationWhereInput {
  return { OR: [...destinationTextMarkers(), { partner: nonRealPartnerWhere() }] };
}

export function commercialRealPartnerDestinationWhere(): Prisma.PartnerDestinationWhereInput {
  return { NOT: [nonRealPartnerDestinationWhere()] };
}

export function nonRealAttributionWhere(): Prisma.AcquisitionAttributionWhereInput {
  return {
    OR: [
      ...attributionTextMarkers(),
      { store: nonRealStoreWhere() },
      { referrerStore: nonRealStoreWhere() },
      { partner: nonRealPartnerWhere() },
      { partnerDestination: nonRealPartnerDestinationWhere() },
    ],
  };
}

export function commercialRealAttributionWhere(where: Prisma.AcquisitionAttributionWhereInput = {}): Prisma.AcquisitionAttributionWhereInput {
  return { AND: [where, { NOT: [nonRealAttributionWhere()] }] };
}

export function nonRealGrowthClickWhere(): Prisma.GrowthLinkClickWhereInput {
  return {
    OR: [
      ...growthClickTextMarkers(),
      { partner: nonRealPartnerWhere() },
      { partnerDestination: nonRealPartnerDestinationWhere() },
      { referrerStore: nonRealStoreWhere() },
    ],
  };
}

export function commercialRealGrowthClickWhere(where: Prisma.GrowthLinkClickWhereInput = {}): Prisma.GrowthLinkClickWhereInput {
  return { AND: [where, { NOT: [nonRealGrowthClickWhere()] }] };
}

export function nonRealStorePaymentWhere(): Prisma.StorePaymentWhereInput {
  return { OR: [...paymentTextMarkers(), { store: nonRealStoreWhere() }] };
}

export function commercialRealStorePaymentWhere(where: Prisma.StorePaymentWhereInput = {}): Prisma.StorePaymentWhereInput {
  return { AND: [where, { NOT: [nonRealStorePaymentWhere()] }] };
}

export function excludedStorePaymentWhere(where: Prisma.StorePaymentWhereInput = {}): Prisma.StorePaymentWhereInput {
  return { AND: [where, nonRealStorePaymentWhere()] };
}

export function nonRealPartnerCommissionWhere(): Prisma.PartnerCommissionWhereInput {
  return {
    OR: [
      ...commissionTextMarkers(),
      { partner: nonRealPartnerWhere() },
      { store: nonRealStoreWhere() },
      { attribution: nonRealAttributionWhere() },
    ],
  };
}

export function commercialRealPartnerCommissionWhere(where: Prisma.PartnerCommissionWhereInput = {}): Prisma.PartnerCommissionWhereInput {
  return { AND: [where, { NOT: [nonRealPartnerCommissionWhere()] }] };
}

export function nonRealStoreReferralRewardWhere(): Prisma.StoreReferralRewardWhereInput {
  return {
    OR: [
      ...rewardTextMarkers(),
      { referrerStore: nonRealStoreWhere() },
      { referredStore: nonRealStoreWhere() },
      { attribution: nonRealAttributionWhere() },
    ],
  };
}

export function commercialRealStoreReferralRewardWhere(where: Prisma.StoreReferralRewardWhereInput = {}): Prisma.StoreReferralRewardWhereInput {
  return { AND: [where, { NOT: [nonRealStoreReferralRewardWhere()] }] };
}

export function commercialRealLeadWhere(where: Prisma.LeadWhereInput = {}): Prisma.LeadWhereInput {
  return {
    AND: [
      where,
      {
        NOT: [
          { leadCode: { in: [...dataQualityConfig.knownQaLeadCodes] } },
          { store: nonRealStoreWhere() },
          ...markerContainsWhere<Prisma.LeadWhereInput>(["leadCode", "sessionId", "visitorId", "source", "customerName", "conversationSummary", "whatsappMessage"], nonCommercialPatterns),
        ],
      },
    ],
  };
}
