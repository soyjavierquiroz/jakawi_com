import { type Prisma } from "@prisma/client";
import { formatMoney } from "@/lib/money";
import { getPrisma } from "@/lib/prisma";

export type RevenueCurrencyTotal = {
  currency: string;
  amountCents: number;
};

export type RevenueMetricPeriod = {
  clicks: number;
  signups: number;
  paidStores: number;
  confirmedPayments: number;
  revenue: RevenueCurrencyTotal[];
  clickToSignupRate: number | null;
  signupToPaymentRate: number | null;
  revenuePerClick: RevenueCurrencyTotal[];
  revenuePerSignup: RevenueCurrencyTotal[];
};

export type RevenueMetricSummary = {
  total: RevenueMetricPeriod;
  last30Days: RevenueMetricPeriod;
  last7Days: RevenueMetricPeriod;
};

export type RevenueOnlyPeriod = {
  paidStores: number;
  confirmedPayments: number;
  revenue: RevenueCurrencyTotal[];
};

export type RevenueOnlySummary = {
  total: RevenueOnlyPeriod;
  last30Days: RevenueOnlyPeriod;
  last7Days: RevenueOnlyPeriod;
};

export type RevenueSourceKey = "PARTNER" | "STORE_REFERRAL" | "ORGANIC";

export type RevenueSourceBreakdownItem = RevenueMetricSummary & {
  key: RevenueSourceKey;
  label: string;
  detail: string;
};

export type AdminRevenueAttributionSummary = {
  totalRevenue: RevenueCurrencyTotal[];
  last30DaysRevenue: RevenueCurrencyTotal[];
  last7DaysRevenue: RevenueCurrencyTotal[];
  confirmedStores: number;
  confirmedPayments: number;
  partnerRevenue: RevenueCurrencyTotal[];
  storeReferralRevenue: RevenueCurrencyTotal[];
  organicRevenue: RevenueCurrencyTotal[];
  attributedFunnel: RevenueMetricSummary;
  sourceBreakdown: RevenueSourceBreakdownItem[];
};

export type TopRevenuePartner = RevenueMetricSummary & {
  id: string;
  name: string;
  code: string;
};

export type TopRevenueStoreReferrer = RevenueMetricSummary & {
  id: string;
  name: string;
  slug: string;
  approvedRewards: number;
  appliedRewards: number;
};

export type TopRevenuePartnerDestination = RevenueMetricSummary & {
  id: string;
  label: string;
  slug: string;
  targetUrl: string;
  partnerId: string;
  partnerName: string;
  partnerCode: string;
};

type PaymentRef = {
  id: string;
  storeId: string;
  amountCents: number;
  currency: string;
  confirmedAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
  store: {
    acquisitionAttribution: {
      sourceType: string;
      partnerId: string | null;
      partnerDestinationId: string | null;
      partnerDestinationSlug: string | null;
      referrerStoreId: string | null;
    } | null;
  };
};

type RevenueBucket = {
  paymentIds: Set<string>;
  storeIds: Set<string>;
  totals: Map<string, number>;
};

type AttributionRef = {
  storeId: string;
  partnerId?: string | null;
  partnerDestinationId?: string | null;
  partnerDestinationSlug?: string | null;
  referrerStoreId?: string | null;
};

type DestinationRef = {
  id: string;
  partnerId: string;
  slug: string;
};

const sourceLabels: Record<RevenueSourceKey, { label: string; detail: string }> = {
  PARTNER: {
    label: "Atribuido a partner",
    detail: "Stores con AcquisitionAttribution sourceType PARTNER.",
  },
  STORE_REFERRAL: {
    label: "Atribuido a tienda referidora",
    detail: "Stores con AcquisitionAttribution sourceType STORE_REFERRAL.",
  },
  ORGANIC: {
    label: "Orgánico / sin atribución",
    detail: "Pagos sin atribución partner/store referral o con sourceType ORGANIC.",
  },
};

function statsWindow(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function emptyRevenueBucket(): RevenueBucket {
  return {
    paymentIds: new Set<string>(),
    storeIds: new Set<string>(),
    totals: new Map<string, number>(),
  };
}

function emptyRevenueOnlyPeriod(): RevenueOnlyPeriod {
  return {
    paidStores: 0,
    confirmedPayments: 0,
    revenue: [],
  };
}

function emptyRevenueMetricPeriod(): RevenueMetricPeriod {
  return {
    clicks: 0,
    signups: 0,
    paidStores: 0,
    confirmedPayments: 0,
    revenue: [],
    clickToSignupRate: null,
    signupToPaymentRate: null,
    revenuePerClick: [],
    revenuePerSignup: [],
  };
}

function emptyRevenueOnlySummary(): RevenueOnlySummary {
  return {
    total: emptyRevenueOnlyPeriod(),
    last30Days: emptyRevenueOnlyPeriod(),
    last7Days: emptyRevenueOnlyPeriod(),
  };
}

function normalizeCurrency(currency: string | null | undefined) {
  return (currency ?? "BOB").trim().toUpperCase() || "BOB";
}

function paymentEffectiveDate(payment: Pick<PaymentRef, "confirmedAt" | "paidAt" | "createdAt">) {
  return payment.confirmedAt ?? payment.paidAt ?? payment.createdAt;
}

function isInRange(payment: Pick<PaymentRef, "confirmedAt" | "paidAt" | "createdAt">, since?: Date) {
  if (!since) return true;
  return paymentEffectiveDate(payment) >= since;
}

function addPaymentToBucket(bucket: RevenueBucket, payment: Pick<PaymentRef, "id" | "storeId" | "amountCents" | "currency">) {
  bucket.paymentIds.add(payment.id);
  bucket.storeIds.add(payment.storeId);
  const currency = normalizeCurrency(payment.currency);
  bucket.totals.set(currency, (bucket.totals.get(currency) ?? 0) + payment.amountCents);
}

function totalsFromMap(totals: Map<string, number>): RevenueCurrencyTotal[] {
  return [...totals.entries()]
    .map(([currency, amountCents]) => ({ currency, amountCents }))
    .filter((total) => total.amountCents > 0)
    .sort((a, b) => (a.currency === "BOB" ? -1 : b.currency === "BOB" ? 1 : a.currency.localeCompare(b.currency)));
}

function bucketToRevenueOnly(bucket: RevenueBucket): RevenueOnlyPeriod {
  return {
    paidStores: bucket.storeIds.size,
    confirmedPayments: bucket.paymentIds.size,
    revenue: totalsFromMap(bucket.totals),
  };
}

function divideRevenue(totals: RevenueCurrencyTotal[], denominator: number) {
  if (!Number.isFinite(denominator) || denominator <= 0) return [];
  return totals.map((total) => ({
    currency: total.currency,
    amountCents: Math.round(total.amountCents / denominator),
  }));
}

function buildMetricPeriod(params: {
  clicks: number;
  signups: number;
  revenueOnly: RevenueOnlyPeriod;
}): RevenueMetricPeriod {
  return {
    clicks: params.clicks,
    signups: params.signups,
    paidStores: params.revenueOnly.paidStores,
    confirmedPayments: params.revenueOnly.confirmedPayments,
    revenue: params.revenueOnly.revenue,
    clickToSignupRate: safeRate(params.signups, params.clicks),
    signupToPaymentRate: safeRate(params.revenueOnly.paidStores, params.signups),
    revenuePerClick: divideRevenue(params.revenueOnly.revenue, params.clicks),
    revenuePerSignup: divideRevenue(params.revenueOnly.revenue, params.signups),
  };
}

function sumRevenue(totals: RevenueCurrencyTotal[]) {
  const bucket = emptyRevenueBucket();
  for (const total of totals) {
    bucket.totals.set(total.currency, (bucket.totals.get(total.currency) ?? 0) + total.amountCents);
  }
  return totalsFromMap(bucket.totals);
}

function primaryRevenueCents(totals: RevenueCurrencyTotal[]) {
  return totals.find((total) => total.currency === "BOB")?.amountCents ?? totals[0]?.amountCents ?? 0;
}

function sourceKeyForPayment(payment: PaymentRef): RevenueSourceKey {
  const attribution = payment.store.acquisitionAttribution;
  if (attribution?.sourceType === "PARTNER") return "PARTNER";
  if (attribution?.sourceType === "STORE_REFERRAL") return "STORE_REFERRAL";
  return "ORGANIC";
}

function destinationKey(destination: Pick<DestinationRef, "partnerId" | "slug">) {
  return `${destination.partnerId}:${destination.slug}`;
}

function buildDestinationAttributionWhere(destination: DestinationRef): Prisma.AcquisitionAttributionWhereInput {
  return {
    sourceType: "PARTNER",
    OR: [
      { partnerDestinationId: destination.id },
      {
        partnerDestinationId: null,
        partnerId: destination.partnerId,
        partnerDestinationSlug: destination.slug,
      },
    ],
  };
}

function buildDestinationClickWhere(destination: DestinationRef): Prisma.GrowthLinkClickWhereInput {
  return {
    sourceType: "PARTNER",
    OR: [
      { partnerDestinationId: destination.id },
      {
        partnerDestinationId: null,
        partnerId: destination.partnerId,
        destinationSlug: destination.slug,
      },
    ],
  };
}

export function safeRate(numerator: number, denominator: number) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return null;
  return numerator / denominator;
}

export function formatRate(rate: number | null | undefined, emptyLabel = "Sin datos") {
  if (rate === null || rate === undefined || !Number.isFinite(rate)) return emptyLabel;
  const percent = rate * 100;
  const decimals = percent > 0 && percent < 10 ? 1 : 0;
  return `${percent.toFixed(decimals)}%`;
}

export function formatRevenueCents(cents: number | null | undefined, currency?: string | null) {
  return formatMoney({
    amountCents: cents ?? 0,
    currency: currency ?? "BOB",
    countryCode: "BO",
    showCurrencyCodeWhenAmbiguous: true,
  });
}

export function formatRevenueTotals(totals: RevenueCurrencyTotal[] | null | undefined) {
  const values = totals?.filter((total) => total.amountCents > 0) ?? [];
  if (values.length === 0) return formatRevenueCents(0, "BOB");
  return values.map((total) => formatRevenueCents(total.amountCents, total.currency)).join(" + ");
}

export function formatRevenueRate(totals: RevenueCurrencyTotal[] | null | undefined, emptyLabel: string) {
  const values = totals?.filter((total) => total.amountCents > 0) ?? [];
  if (values.length === 0) return emptyLabel;
  return formatRevenueTotals(values);
}

export function getConfirmedPaymentDateWhere(rangeDays?: number): Prisma.StorePaymentWhereInput {
  const base = {
    status: "CONFIRMED",
    amountCents: { gt: 0 },
  } satisfies Prisma.StorePaymentWhereInput;

  if (!rangeDays) return base;

  const since = statsWindow(rangeDays);
  return {
    AND: [
      base,
      {
        OR: [
          { confirmedAt: { gte: since } },
          { confirmedAt: null, paidAt: { gte: since } },
          { confirmedAt: null, paidAt: null, createdAt: { gte: since } },
        ],
      },
    ],
  };
}

async function getConfirmedPayments(rangeDays?: number): Promise<PaymentRef[]> {
  return getPrisma().storePayment.findMany({
    where: getConfirmedPaymentDateWhere(rangeDays),
    select: {
      id: true,
      storeId: true,
      amountCents: true,
      currency: true,
      confirmedAt: true,
      paidAt: true,
      createdAt: true,
      store: {
        select: {
          acquisitionAttribution: {
            select: {
              sourceType: true,
              partnerId: true,
              partnerDestinationId: true,
              partnerDestinationSlug: true,
              referrerStoreId: true,
            },
          },
        },
      },
    },
  });
}

async function countClicks(where: Prisma.GrowthLinkClickWhereInput, rangeDays?: number) {
  return getPrisma().growthLinkClick.count({
    where: rangeDays ? { AND: [where, { clickedAt: { gte: statsWindow(rangeDays) } }] } : where,
  });
}

async function countSignups(where: Prisma.AcquisitionAttributionWhereInput, rangeDays?: number) {
  return getPrisma().acquisitionAttribution.count({
    where: rangeDays ? { AND: [where, { signedUpAt: { gte: statsWindow(rangeDays) } }] } : where,
  });
}

async function getRevenueOnlyForStoreIds(storeIds: string[], rangeDays?: number): Promise<RevenueOnlyPeriod> {
  const ids = [...new Set(storeIds.filter(Boolean))];
  if (ids.length === 0) return emptyRevenueOnlyPeriod();

  const payments = await getPrisma().storePayment.findMany({
    where: {
      AND: [getConfirmedPaymentDateWhere(rangeDays), { storeId: { in: ids } }],
    },
    select: {
      id: true,
      storeId: true,
      amountCents: true,
      currency: true,
    },
  });
  const bucket = emptyRevenueBucket();
  payments.forEach((payment) => addPaymentToBucket(bucket, payment));
  return bucketToRevenueOnly(bucket);
}

async function getRevenueMetricSummary(params: {
  clickWhere: Prisma.GrowthLinkClickWhereInput;
  signupWhere: Prisma.AcquisitionAttributionWhereInput;
  attributionWhere: Prisma.AcquisitionAttributionWhereInput;
}): Promise<RevenueMetricSummary> {
  const attributions = await getPrisma().acquisitionAttribution.findMany({
    where: params.attributionWhere,
    select: { storeId: true },
  });
  const storeIds = attributions.map((attribution) => attribution.storeId);
  const [totalRevenue, last30Revenue, last7Revenue, totalClicks, last30Clicks, last7Clicks, totalSignups, last30Signups, last7Signups] =
    await Promise.all([
      getRevenueOnlyForStoreIds(storeIds),
      getRevenueOnlyForStoreIds(storeIds, 30),
      getRevenueOnlyForStoreIds(storeIds, 7),
      countClicks(params.clickWhere),
      countClicks(params.clickWhere, 30),
      countClicks(params.clickWhere, 7),
      countSignups(params.signupWhere),
      countSignups(params.signupWhere, 30),
      countSignups(params.signupWhere, 7),
    ]);

  return {
    total: buildMetricPeriod({ clicks: totalClicks, signups: totalSignups, revenueOnly: totalRevenue }),
    last30Days: buildMetricPeriod({ clicks: last30Clicks, signups: last30Signups, revenueOnly: last30Revenue }),
    last7Days: buildMetricPeriod({ clicks: last7Clicks, signups: last7Signups, revenueOnly: last7Revenue }),
  };
}

async function getSourceMetricSummary(key: RevenueSourceKey): Promise<RevenueMetricSummary> {
  if (key === "PARTNER") {
    return getRevenueMetricSummary({
      clickWhere: { sourceType: "PARTNER" },
      signupWhere: { sourceType: "PARTNER" },
      attributionWhere: { sourceType: "PARTNER" },
    });
  }
  if (key === "STORE_REFERRAL") {
    return getRevenueMetricSummary({
      clickWhere: { sourceType: "STORE_REFERRAL" },
      signupWhere: { sourceType: "STORE_REFERRAL" },
      attributionWhere: { sourceType: "STORE_REFERRAL" },
    });
  }

  const [payments, last30Payments, last7Payments, totalSignups, last30Signups, last7Signups] = await Promise.all([
    getConfirmedPayments(),
    getConfirmedPayments(30),
    getConfirmedPayments(7),
    countSignups({ OR: [{ sourceType: "ORGANIC" }, { sourceType: { notIn: ["PARTNER", "STORE_REFERRAL"] } }] }),
    countSignups({ OR: [{ sourceType: "ORGANIC" }, { sourceType: { notIn: ["PARTNER", "STORE_REFERRAL"] } }] }, 30),
    countSignups({ OR: [{ sourceType: "ORGANIC" }, { sourceType: { notIn: ["PARTNER", "STORE_REFERRAL"] } }] }, 7),
  ]);
  const totalBucket = emptyRevenueBucket();
  const last30Bucket = emptyRevenueBucket();
  const last7Bucket = emptyRevenueBucket();
  payments.filter((payment) => sourceKeyForPayment(payment) === "ORGANIC").forEach((payment) => addPaymentToBucket(totalBucket, payment));
  last30Payments.filter((payment) => sourceKeyForPayment(payment) === "ORGANIC").forEach((payment) => addPaymentToBucket(last30Bucket, payment));
  last7Payments.filter((payment) => sourceKeyForPayment(payment) === "ORGANIC").forEach((payment) => addPaymentToBucket(last7Bucket, payment));
  const totalRevenue = bucketToRevenueOnly(totalBucket);
  const last30Revenue = bucketToRevenueOnly(last30Bucket);
  const last7Revenue = bucketToRevenueOnly(last7Bucket);

  return {
    total: buildMetricPeriod({ clicks: 0, signups: totalSignups, revenueOnly: totalRevenue }),
    last30Days: buildMetricPeriod({ clicks: 0, signups: last30Signups, revenueOnly: last30Revenue }),
    last7Days: buildMetricPeriod({ clicks: 0, signups: last7Signups, revenueOnly: last7Revenue }),
  };
}

export async function getRevenueBySourceBreakdown(): Promise<RevenueSourceBreakdownItem[]> {
  const [partner, storeReferral, organic] = await Promise.all([
    getSourceMetricSummary("PARTNER"),
    getSourceMetricSummary("STORE_REFERRAL"),
    getSourceMetricSummary("ORGANIC"),
  ]);

  return ([
    ["PARTNER", partner],
    ["STORE_REFERRAL", storeReferral],
    ["ORGANIC", organic],
  ] as const).map(([key, summary]) => ({
    key,
    label: sourceLabels[key].label,
    detail: sourceLabels[key].detail,
    ...summary,
  }));
}

export async function getAdminRevenueAttributionSummary(): Promise<AdminRevenueAttributionSummary> {
  const [payments, last30Payments, last7Payments, sourceBreakdown] = await Promise.all([
    getConfirmedPayments(),
    getConfirmedPayments(30),
    getConfirmedPayments(7),
    getRevenueBySourceBreakdown(),
  ]);

  const totalBucket = emptyRevenueBucket();
  const last30Bucket = emptyRevenueBucket();
  const last7Bucket = emptyRevenueBucket();
  payments.forEach((payment) => addPaymentToBucket(totalBucket, payment));
  last30Payments.forEach((payment) => addPaymentToBucket(last30Bucket, payment));
  last7Payments.forEach((payment) => addPaymentToBucket(last7Bucket, payment));

  const emptySourceSummary = {
    total: emptyRevenueMetricPeriod(),
    last30Days: emptyRevenueMetricPeriod(),
    last7Days: emptyRevenueMetricPeriod(),
  };
  const partner = sourceBreakdown.find((source) => source.key === "PARTNER") ?? emptySourceSummary;
  const storeReferral = sourceBreakdown.find((source) => source.key === "STORE_REFERRAL") ?? emptySourceSummary;
  const organic = sourceBreakdown.find((source) => source.key === "ORGANIC") ?? emptySourceSummary;

  const attributedTotalRevenue = {
    total: {
      clicks: partner.total.clicks + storeReferral.total.clicks,
      signups: partner.total.signups + storeReferral.total.signups,
      revenueOnly: {
        paidStores: partner.total.paidStores + storeReferral.total.paidStores,
        confirmedPayments: partner.total.confirmedPayments + storeReferral.total.confirmedPayments,
        revenue: sumRevenue([...partner.total.revenue, ...storeReferral.total.revenue]),
      },
    },
    last30Days: {
      clicks: partner.last30Days.clicks + storeReferral.last30Days.clicks,
      signups: partner.last30Days.signups + storeReferral.last30Days.signups,
      revenueOnly: {
        paidStores: partner.last30Days.paidStores + storeReferral.last30Days.paidStores,
        confirmedPayments: partner.last30Days.confirmedPayments + storeReferral.last30Days.confirmedPayments,
        revenue: sumRevenue([...partner.last30Days.revenue, ...storeReferral.last30Days.revenue]),
      },
    },
    last7Days: {
      clicks: partner.last7Days.clicks + storeReferral.last7Days.clicks,
      signups: partner.last7Days.signups + storeReferral.last7Days.signups,
      revenueOnly: {
        paidStores: partner.last7Days.paidStores + storeReferral.last7Days.paidStores,
        confirmedPayments: partner.last7Days.confirmedPayments + storeReferral.last7Days.confirmedPayments,
        revenue: sumRevenue([...partner.last7Days.revenue, ...storeReferral.last7Days.revenue]),
      },
    },
  };

  return {
    totalRevenue: bucketToRevenueOnly(totalBucket).revenue,
    last30DaysRevenue: bucketToRevenueOnly(last30Bucket).revenue,
    last7DaysRevenue: bucketToRevenueOnly(last7Bucket).revenue,
    confirmedStores: totalBucket.storeIds.size,
    confirmedPayments: totalBucket.paymentIds.size,
    partnerRevenue: partner.total.revenue,
    storeReferralRevenue: storeReferral.total.revenue,
    organicRevenue: organic.total.revenue,
    attributedFunnel: {
      total: buildMetricPeriod(attributedTotalRevenue.total),
      last30Days: buildMetricPeriod(attributedTotalRevenue.last30Days),
      last7Days: buildMetricPeriod(attributedTotalRevenue.last7Days),
    },
    sourceBreakdown,
  };
}

export async function getPartnerRevenueAttributionSummary(partnerId: string) {
  return getRevenueMetricSummary({
    clickWhere: { sourceType: "PARTNER", partnerId },
    signupWhere: { sourceType: "PARTNER", partnerId },
    attributionWhere: { sourceType: "PARTNER", partnerId },
  });
}

export async function getPartnerDestinationRevenueAttributionSummary(partnerId: string) {
  const destinations = await getPrisma().partnerDestination.findMany({
    where: { partnerId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  const metricsByDestination = await getRevenueMetricsByPartnerDestinationIds(destinations);
  return destinations.map((destination) => ({
    ...destination,
    revenueMetrics: metricsByDestination.get(destination.id) ?? {
      total: emptyRevenueMetricPeriod(),
      last30Days: emptyRevenueMetricPeriod(),
      last7Days: emptyRevenueMetricPeriod(),
    },
  }));
}

export async function getStoreReferralRevenueAttributionSummary(storeId: string) {
  return getRevenueMetricSummary({
    clickWhere: { sourceType: "STORE_REFERRAL", referrerStoreId: storeId },
    signupWhere: { sourceType: "STORE_REFERRAL", referrerStoreId: storeId },
    attributionWhere: { sourceType: "STORE_REFERRAL", referrerStoreId: storeId },
  });
}

async function buildRevenueOnlyByAttributionKey(params: {
  attributions: AttributionRef[];
  keyForAttribution: (attribution: AttributionRef) => string | null;
}): Promise<Map<string, RevenueOnlySummary>> {
  const storeIds = [...new Set(params.attributions.map((attribution) => attribution.storeId).filter(Boolean))];
  const storeKeys = new Map<string, string[]>();
  for (const attribution of params.attributions) {
    const key = params.keyForAttribution(attribution);
    if (!key) continue;
    const keys = storeKeys.get(attribution.storeId) ?? [];
    keys.push(key);
    storeKeys.set(attribution.storeId, keys);
  }

  const summaries = new Map<string, { total: RevenueBucket; last30Days: RevenueBucket; last7Days: RevenueBucket }>();
  const ensure = (key: string) => {
    const existing = summaries.get(key);
    if (existing) return existing;
    const next = {
      total: emptyRevenueBucket(),
      last30Days: emptyRevenueBucket(),
      last7Days: emptyRevenueBucket(),
    };
    summaries.set(key, next);
    return next;
  };

  if (storeIds.length > 0) {
    const payments = await getPrisma().storePayment.findMany({
      where: {
        AND: [getConfirmedPaymentDateWhere(), { storeId: { in: storeIds } }],
      },
      select: {
        id: true,
        storeId: true,
        amountCents: true,
        currency: true,
        confirmedAt: true,
        paidAt: true,
        createdAt: true,
      },
    });
    const last30 = statsWindow(30);
    const last7 = statsWindow(7);

    for (const payment of payments) {
      const keys = storeKeys.get(payment.storeId) ?? [];
      for (const key of keys) {
        const summary = ensure(key);
        addPaymentToBucket(summary.total, payment);
        if (isInRange(payment, last30)) addPaymentToBucket(summary.last30Days, payment);
        if (isInRange(payment, last7)) addPaymentToBucket(summary.last7Days, payment);
      }
    }
  }

  const result = new Map<string, RevenueOnlySummary>();
  for (const [key, summary] of summaries.entries()) {
    result.set(key, {
      total: bucketToRevenueOnly(summary.total),
      last30Days: bucketToRevenueOnly(summary.last30Days),
      last7Days: bucketToRevenueOnly(summary.last7Days),
    });
  }
  return result;
}

export async function getRevenueOnlyByPartnerIds(partnerIds: string[]) {
  const ids = [...new Set(partnerIds.filter(Boolean))];
  if (ids.length === 0) return new Map<string, RevenueOnlySummary>();

  const attributions = await getPrisma().acquisitionAttribution.findMany({
    where: { sourceType: "PARTNER", partnerId: { in: ids } },
    select: { storeId: true, partnerId: true },
  });

  return buildRevenueOnlyByAttributionKey({
    attributions,
    keyForAttribution: (attribution) => attribution.partnerId ?? null,
  });
}

export async function getRevenueOnlyByReferrerStoreIds(storeIds: string[]) {
  const ids = [...new Set(storeIds.filter(Boolean))];
  if (ids.length === 0) return new Map<string, RevenueOnlySummary>();

  const attributions = await getPrisma().acquisitionAttribution.findMany({
    where: { sourceType: "STORE_REFERRAL", referrerStoreId: { in: ids } },
    select: { storeId: true, referrerStoreId: true },
  });

  return buildRevenueOnlyByAttributionKey({
    attributions,
    keyForAttribution: (attribution) => attribution.referrerStoreId ?? null,
  });
}

export async function getRevenueOnlyByPartnerDestinationRefs(destinations: DestinationRef[]) {
  const refs = destinations.filter((destination) => destination.id && destination.partnerId && destination.slug);
  if (refs.length === 0) return new Map<string, RevenueOnlySummary>();

  const ids = refs.map((destination) => destination.id);
  const partnerIds = [...new Set(refs.map((destination) => destination.partnerId))];
  const slugs = [...new Set(refs.map((destination) => destination.slug))];
  const fallbackKeyByPartnerSlug = new Map(refs.map((destination) => [destinationKey(destination), destination.id]));

  const attributions = await getPrisma().acquisitionAttribution.findMany({
    where: {
      sourceType: "PARTNER",
      OR: [
        { partnerDestinationId: { in: ids } },
        {
          partnerDestinationId: null,
          partnerId: { in: partnerIds },
          partnerDestinationSlug: { in: slugs },
        },
      ],
    },
    select: {
      storeId: true,
      partnerId: true,
      partnerDestinationId: true,
      partnerDestinationSlug: true,
    },
  });

  return buildRevenueOnlyByAttributionKey({
    attributions,
    keyForAttribution: (attribution) => {
      if (attribution.partnerDestinationId) return attribution.partnerDestinationId;
      if (!attribution.partnerId || !attribution.partnerDestinationSlug) return null;
      return fallbackKeyByPartnerSlug.get(destinationKey({ partnerId: attribution.partnerId, slug: attribution.partnerDestinationSlug })) ?? null;
    },
  });
}

export async function getRevenueMetricsByPartnerIds(partnerIds: string[]) {
  const ids = [...new Set(partnerIds.filter(Boolean))];
  const metrics = new Map<string, RevenueMetricSummary>();
  if (ids.length === 0) return metrics;

  const [revenueByPartner, clickRows, click30Rows, click7Rows, signupRows, signup30Rows, signup7Rows] = await Promise.all([
    getRevenueOnlyByPartnerIds(ids),
    getPrisma().growthLinkClick.groupBy({ by: ["partnerId"], where: { sourceType: "PARTNER", partnerId: { in: ids } }, _count: { _all: true } }),
    getPrisma().growthLinkClick.groupBy({ by: ["partnerId"], where: { sourceType: "PARTNER", partnerId: { in: ids }, clickedAt: { gte: statsWindow(30) } }, _count: { _all: true } }),
    getPrisma().growthLinkClick.groupBy({ by: ["partnerId"], where: { sourceType: "PARTNER", partnerId: { in: ids }, clickedAt: { gte: statsWindow(7) } }, _count: { _all: true } }),
    getPrisma().acquisitionAttribution.groupBy({ by: ["partnerId"], where: { sourceType: "PARTNER", partnerId: { in: ids } }, _count: { _all: true } }),
    getPrisma().acquisitionAttribution.groupBy({ by: ["partnerId"], where: { sourceType: "PARTNER", partnerId: { in: ids }, signedUpAt: { gte: statsWindow(30) } }, _count: { _all: true } }),
    getPrisma().acquisitionAttribution.groupBy({ by: ["partnerId"], where: { sourceType: "PARTNER", partnerId: { in: ids }, signedUpAt: { gte: statsWindow(7) } }, _count: { _all: true } }),
  ]);

  const countByPartner = (rows: typeof clickRows) => new Map(rows.flatMap((row) => (row.partnerId ? [[row.partnerId, row._count._all] as const] : [])));
  const clicks = countByPartner(clickRows);
  const clicks30 = countByPartner(click30Rows);
  const clicks7 = countByPartner(click7Rows);
  const signups = countByPartner(signupRows);
  const signups30 = countByPartner(signup30Rows);
  const signups7 = countByPartner(signup7Rows);

  ids.forEach((id) => {
    const revenue = revenueByPartner.get(id) ?? emptyRevenueOnlySummary();
    metrics.set(id, {
      total: buildMetricPeriod({ clicks: clicks.get(id) ?? 0, signups: signups.get(id) ?? 0, revenueOnly: revenue.total }),
      last30Days: buildMetricPeriod({ clicks: clicks30.get(id) ?? 0, signups: signups30.get(id) ?? 0, revenueOnly: revenue.last30Days }),
      last7Days: buildMetricPeriod({ clicks: clicks7.get(id) ?? 0, signups: signups7.get(id) ?? 0, revenueOnly: revenue.last7Days }),
    });
  });

  return metrics;
}

export async function getRevenueMetricsByReferrerStoreIds(storeIds: string[]) {
  const ids = [...new Set(storeIds.filter(Boolean))];
  const metrics = new Map<string, RevenueMetricSummary>();
  if (ids.length === 0) return metrics;

  const [revenueByStore, clickRows, click30Rows, click7Rows, signupRows, signup30Rows, signup7Rows] = await Promise.all([
    getRevenueOnlyByReferrerStoreIds(ids),
    getPrisma().growthLinkClick.groupBy({ by: ["referrerStoreId"], where: { sourceType: "STORE_REFERRAL", referrerStoreId: { in: ids } }, _count: { _all: true } }),
    getPrisma().growthLinkClick.groupBy({ by: ["referrerStoreId"], where: { sourceType: "STORE_REFERRAL", referrerStoreId: { in: ids }, clickedAt: { gte: statsWindow(30) } }, _count: { _all: true } }),
    getPrisma().growthLinkClick.groupBy({ by: ["referrerStoreId"], where: { sourceType: "STORE_REFERRAL", referrerStoreId: { in: ids }, clickedAt: { gte: statsWindow(7) } }, _count: { _all: true } }),
    getPrisma().acquisitionAttribution.groupBy({ by: ["referrerStoreId"], where: { sourceType: "STORE_REFERRAL", referrerStoreId: { in: ids } }, _count: { _all: true } }),
    getPrisma().acquisitionAttribution.groupBy({ by: ["referrerStoreId"], where: { sourceType: "STORE_REFERRAL", referrerStoreId: { in: ids }, signedUpAt: { gte: statsWindow(30) } }, _count: { _all: true } }),
    getPrisma().acquisitionAttribution.groupBy({ by: ["referrerStoreId"], where: { sourceType: "STORE_REFERRAL", referrerStoreId: { in: ids }, signedUpAt: { gte: statsWindow(7) } }, _count: { _all: true } }),
  ]);

  const countByStore = (rows: typeof clickRows) => new Map(rows.flatMap((row) => (row.referrerStoreId ? [[row.referrerStoreId, row._count._all] as const] : [])));
  const clicks = countByStore(clickRows);
  const clicks30 = countByStore(click30Rows);
  const clicks7 = countByStore(click7Rows);
  const signups = countByStore(signupRows);
  const signups30 = countByStore(signup30Rows);
  const signups7 = countByStore(signup7Rows);

  ids.forEach((id) => {
    const revenue = revenueByStore.get(id) ?? emptyRevenueOnlySummary();
    metrics.set(id, {
      total: buildMetricPeriod({ clicks: clicks.get(id) ?? 0, signups: signups.get(id) ?? 0, revenueOnly: revenue.total }),
      last30Days: buildMetricPeriod({ clicks: clicks30.get(id) ?? 0, signups: signups30.get(id) ?? 0, revenueOnly: revenue.last30Days }),
      last7Days: buildMetricPeriod({ clicks: clicks7.get(id) ?? 0, signups: signups7.get(id) ?? 0, revenueOnly: revenue.last7Days }),
    });
  });

  return metrics;
}

export async function getRevenueMetricsByPartnerDestinationIds(destinations: DestinationRef[]) {
  const refs = destinations.filter((destination) => destination.id && destination.partnerId && destination.slug);
  const metrics = new Map<string, RevenueMetricSummary>();
  if (refs.length === 0) return metrics;

  const revenueByDestination = await getRevenueOnlyByPartnerDestinationRefs(refs);
  await Promise.all(
    refs.map(async (destination) => {
      const clickWhere = buildDestinationClickWhere(destination);
      const signupWhere = buildDestinationAttributionWhere(destination);
      const revenue = revenueByDestination.get(destination.id) ?? emptyRevenueOnlySummary();
      const [totalClicks, last30Clicks, last7Clicks, totalSignups, last30Signups, last7Signups] = await Promise.all([
        countClicks(clickWhere),
        countClicks(clickWhere, 30),
        countClicks(clickWhere, 7),
        countSignups(signupWhere),
        countSignups(signupWhere, 30),
        countSignups(signupWhere, 7),
      ]);

      metrics.set(destination.id, {
        total: buildMetricPeriod({ clicks: totalClicks, signups: totalSignups, revenueOnly: revenue.total }),
        last30Days: buildMetricPeriod({ clicks: last30Clicks, signups: last30Signups, revenueOnly: revenue.last30Days }),
        last7Days: buildMetricPeriod({ clicks: last7Clicks, signups: last7Signups, revenueOnly: revenue.last7Days }),
      });
    }),
  );

  return metrics;
}

export async function getTopRevenuePartners({ rangeDays, limit }: { rangeDays: number; limit: number }): Promise<TopRevenuePartner[]> {
  const partners = await getPrisma().partner.findMany({
    select: { id: true, name: true, code: true },
    orderBy: { createdAt: "desc" },
    take: 250,
  });
  const metricsByPartner = await getRevenueMetricsByPartnerIds(partners.map((partner) => partner.id));
  return partners
    .map((partner) => {
      const metrics = metricsByPartner.get(partner.id);
      return metrics ? { ...partner, ...metrics } : null;
    })
    .filter((partner): partner is TopRevenuePartner => Boolean(partner))
    .sort((a, b) => primaryRevenueCents(rangeDays === 7 ? b.last7Days.revenue : b.last30Days.revenue) - primaryRevenueCents(rangeDays === 7 ? a.last7Days.revenue : a.last30Days.revenue))
    .slice(0, limit);
}

export async function getTopRevenueStoreReferrers({ rangeDays, limit }: { rangeDays: number; limit: number }): Promise<TopRevenueStoreReferrer[]> {
  const stores = await getPrisma().store.findMany({
    where: { referredStoreAttributions: { some: { sourceType: "STORE_REFERRAL" } } },
    select: {
      id: true,
      name: true,
      slug: true,
      referralRewardsEarned: {
        select: { status: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 250,
  });
  const metricsByStore = await getRevenueMetricsByReferrerStoreIds(stores.map((store) => store.id));
  return stores
    .map((store) => {
      const metrics = metricsByStore.get(store.id);
      if (!metrics) return null;
      return {
        id: store.id,
        name: store.name,
        slug: store.slug,
        approvedRewards: store.referralRewardsEarned.filter((reward) => reward.status === "APPROVED").length,
        appliedRewards: store.referralRewardsEarned.filter((reward) => reward.status === "APPLIED").length,
        ...metrics,
      };
    })
    .filter((store): store is TopRevenueStoreReferrer => Boolean(store))
    .sort((a, b) => primaryRevenueCents(rangeDays === 7 ? b.last7Days.revenue : b.last30Days.revenue) - primaryRevenueCents(rangeDays === 7 ? a.last7Days.revenue : a.last30Days.revenue))
    .slice(0, limit);
}

export async function getTopRevenuePartnerDestinations({ rangeDays, limit }: { rangeDays: number; limit: number }): Promise<TopRevenuePartnerDestination[]> {
  const destinations = await getPrisma().partnerDestination.findMany({
    select: {
      id: true,
      label: true,
      slug: true,
      targetUrl: true,
      partnerId: true,
      partner: { select: { name: true, code: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 250,
  });
  const metricsByDestination = await getRevenueMetricsByPartnerDestinationIds(destinations);
  return destinations
    .map((destination) => {
      const metrics = metricsByDestination.get(destination.id);
      if (!metrics) return null;
      return {
        id: destination.id,
        label: destination.label,
        slug: destination.slug,
        targetUrl: destination.targetUrl,
        partnerId: destination.partnerId,
        partnerName: destination.partner.name,
        partnerCode: destination.partner.code,
        ...metrics,
      };
    })
    .filter((destination): destination is TopRevenuePartnerDestination => Boolean(destination))
    .sort((a, b) => primaryRevenueCents(rangeDays === 7 ? b.last7Days.revenue : b.last30Days.revenue) - primaryRevenueCents(rangeDays === 7 ? a.last7Days.revenue : a.last30Days.revenue))
    .slice(0, limit);
}
