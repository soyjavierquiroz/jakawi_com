import { notFound } from "next/navigation";
import { type StorePlanCode } from "@/config/plans";
import { requireUser } from "@/lib/auth";
import {
  emptyGrowthConversionSummary,
  getAdminGrowthConversionSummary as getAdminGrowthConversionSummaryInternal,
  getGrowthConversionStatsByPartner,
  getGrowthConversionStatsByPartnerDestination,
  getGrowthConversionStatsByReferrerStore,
} from "@/lib/growth-conversion-metrics";
import { getStorePlanState } from "@/lib/plan-limits";
import { emptyPartnerCommissionStats, getPartnerCommissionStats, getPartnerCommissionStatsByPartner } from "@/lib/partner-commissions";
import { getPrisma } from "@/lib/prisma";
import { getStoreReferralRewardStats } from "@/lib/store-referral-rewards";
import { getAdminPaymentStats } from "@/lib/store-payments";
import { AnalyticsEventType, type Prisma } from "@prisma/client";

export { getAdminGrowthClickOverview } from "@/lib/growth-link-clicks";
export { getAdminGrowthConversionSummary } from "@/lib/growth-conversion-metrics";

type UserWithRole = {
  role?: string | null;
};

export function isSuperAdmin(user: UserWithRole | null | undefined) {
  return user?.role === "SUPER_ADMIN";
}

export async function requireSuperAdmin() {
  const user = await requireUser();
  if (!isSuperAdmin(user)) notFound();
  return user;
}

export const adminStoreFilters = [
  { key: "all", label: "Todos" },
  { key: "trial", label: "Trial" },
  { key: "basic", label: "Basic" },
  { key: "pro", label: "Pro" },
  { key: "premium", label: "Premium" },
  { key: "trial-expired", label: "Trial vencido" },
  { key: "seller-ai", label: "Seller AI activo" },
] as const;

export type AdminStoreFilter = (typeof adminStoreFilters)[number]["key"];

export function getAdminStoreFilter(value: string | null | undefined): AdminStoreFilter {
  return adminStoreFilters.some((filter) => filter.key === value) ? (value as AdminStoreFilter) : "all";
}

export const adminAttributionFilters = [
  { key: "all", label: "Todos" },
  { key: "store-referral", label: "Tiendas referidoras" },
  { key: "partner", label: "Partners" },
  { key: "organic", label: "Orgánico" },
  { key: "signed-up", label: "Registradas" },
  { key: "active", label: "Activas" },
  { key: "paid", label: "Pagadas" },
] as const;

export type AdminAttributionFilter = (typeof adminAttributionFilters)[number]["key"];

export function getAdminAttributionFilter(value: string | null | undefined): AdminAttributionFilter {
  return adminAttributionFilters.some((filter) => filter.key === value) ? (value as AdminAttributionFilter) : "all";
}

function emptyPlanCounts() {
  return {
    TRIAL: 0,
    BASIC: 0,
    PRO: 0,
    PREMIUM: 0,
  } satisfies Record<StorePlanCode, number>;
}

function buildStoreSearchWhere(q: string): Prisma.StoreWhereInput {
  if (!q) return {};

  return {
    OR: [
      { name: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
      { countryCode: { contains: q, mode: "insensitive" } },
      { countryName: { contains: q, mode: "insensitive" } },
      { currency: { contains: q, mode: "insensitive" } },
      { plan: { contains: q, mode: "insensitive" } },
      { owner: { email: { contains: q, mode: "insensitive" } } },
    ],
  };
}

function buildAttributionWhere(params: { q: string; filter: AdminAttributionFilter }): Prisma.AcquisitionAttributionWhereInput {
  const where: Prisma.AcquisitionAttributionWhereInput = {};
  if (params.filter === "store-referral") where.sourceType = "STORE_REFERRAL";
  if (params.filter === "partner") where.sourceType = "PARTNER";
  if (params.filter === "organic") where.sourceType = "ORGANIC";
  if (params.filter === "signed-up") where.status = "SIGNED_UP";
  if (params.filter === "active") where.status = "ACTIVE";
  if (params.filter === "paid") where.status = "PAID";

  if (!params.q) return where;

  return {
    AND: [
      where,
      {
        OR: [
          { code: { contains: params.q, mode: "insensitive" } },
          { sourceType: { contains: params.q, mode: "insensitive" } },
          { status: { contains: params.q, mode: "insensitive" } },
          { store: { name: { contains: params.q, mode: "insensitive" } } },
          { store: { slug: { contains: params.q, mode: "insensitive" } } },
          { store: { owner: { email: { contains: params.q, mode: "insensitive" } } } },
          { partner: { name: { contains: params.q, mode: "insensitive" } } },
          { partner: { code: { contains: params.q, mode: "insensitive" } } },
          { referrerStore: { name: { contains: params.q, mode: "insensitive" } } },
          { referrerStore: { slug: { contains: params.q, mode: "insensitive" } } },
        ],
      },
    ],
  };
}

export async function getSuperAdminDashboardStats() {
  const prisma = getPrisma();
  const [
    stores,
    whatsappClicksLast7Days,
    leadSignals,
    activePartners,
    activePartnerDestinations,
    storeReferralAttributions,
    partnerAttributions,
    organicAttributions,
    partnerCommissionStats,
    storePaymentStats,
    storeReferralRewardStats,
    growthConversionSummary,
  ] = await Promise.all([
    prisma.store.findMany({
      select: {
        id: true,
        plan: true,
        planStatus: true,
        createdAt: true,
        trialEndsAt: true,
      },
    }),
    prisma.analyticsEvent.count({
      where: {
        type: AnalyticsEventType.WHATSAPP_CLICK,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.lead.count(),
    prisma.partner.count({ where: { status: "ACTIVE" } }),
    prisma.partnerDestination.count({ where: { status: "ACTIVE" } }),
    prisma.acquisitionAttribution.count({ where: { sourceType: "STORE_REFERRAL" } }),
    prisma.acquisitionAttribution.count({ where: { sourceType: "PARTNER" } }),
    prisma.acquisitionAttribution.count({ where: { sourceType: "ORGANIC" } }),
    getPartnerCommissionStats(),
    getAdminPaymentStats(),
    getStoreReferralRewardStats(),
    getAdminGrowthConversionSummaryInternal(),
  ]);

  const planCounts = emptyPlanCounts();
  let activeStores = 0;
  let activeTrials = 0;
  let expiredTrials = 0;
  let sellerAiEnabledStores = 0;

  for (const store of stores) {
    const planState = getStorePlanState(store);
    planCounts[planState.planCode] += 1;

    if (!planState.trialExpired && planState.planStatus !== "CANCELED") activeStores += 1;
    if (planState.planCode === "TRIAL" && !planState.trialExpired) activeTrials += 1;
    if (planState.trialExpired) expiredTrials += 1;
    if (planState.sellerAiEnabled) sellerAiEnabledStores += 1;
  }

  return {
    totalStores: stores.length,
    activeStores,
    activeTrials,
    expiredTrials,
    planCounts,
    sellerAiEnabledStores,
    whatsappClicksLast7Days,
    leadSignals,
    activePartners,
    activePartnerDestinations,
    storeReferralAttributions,
    partnerAttributions,
    organicAttributions,
    partnerCommissionStats,
    storePaymentStats,
    storeReferralRewardStats,
    growthConversionSummary,
  };
}

export async function getAdminPartnerRows() {
  const [partners, commissionStatsByPartner] = await Promise.all([
    getPrisma().partner.findMany({
      include: {
        destinations: { orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] },
        portalUser: { select: { email: true, role: true } },
        _count: { select: { attributions: true, commissions: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 250,
    }),
    getPartnerCommissionStatsByPartner(),
  ]);
  const partnerIds = partners.map((partner) => partner.id);
  const destinationRefs = partners.flatMap((partner) =>
    partner.destinations.map((destination) => ({
      id: destination.id,
      partnerId: partner.id,
      slug: destination.slug,
    })),
  );
  const [conversionStatsByPartner, conversionStatsByDestination] = await Promise.all([
    getGrowthConversionStatsByPartner(partnerIds),
    getGrowthConversionStatsByPartnerDestination(destinationRefs),
  ]);

  return partners.map((partner) => ({
    ...partner,
    commissionStats: commissionStatsByPartner.get(partner.id) ?? emptyPartnerCommissionStats(),
    conversionStats: conversionStatsByPartner.get(partner.id) ?? emptyGrowthConversionSummary(),
    destinations: partner.destinations.map((destination) => ({
      ...destination,
      conversionStats: conversionStatsByDestination.get(destination.id) ?? emptyGrowthConversionSummary(),
    })),
  }));
}

export async function getAdminAttributionRows(params: { q?: string; filter?: string }) {
  const q = params.q?.trim() ?? "";
  const activeFilter = getAdminAttributionFilter(params.filter);

  const rows = await getPrisma().acquisitionAttribution.findMany({
    where: buildAttributionWhere({ q, filter: activeFilter }),
    include: {
      store: { include: { owner: true } },
      referrerStore: true,
      partner: true,
      partnerDestination: true,
    },
    orderBy: { createdAt: "desc" },
    take: 250,
  });
  const partnerIds = rows.flatMap((row) => (row.sourceType === "PARTNER" && row.partnerId ? [row.partnerId] : []));
  const referrerStoreIds = rows.flatMap((row) => (row.sourceType === "STORE_REFERRAL" && row.referrerStoreId ? [row.referrerStoreId] : []));
  const destinationRefs = rows.flatMap((row) =>
    row.sourceType === "PARTNER" && row.partnerDestinationId
      ? [
          {
            id: row.partnerDestinationId,
            partnerId: row.partnerId ?? "",
            slug: row.partnerDestinationSlug ?? row.partnerDestination?.slug ?? "",
          },
        ]
      : [],
  );
  const [conversionStatsByPartner, conversionStatsByDestination, conversionStatsByReferrerStore] = await Promise.all([
    getGrowthConversionStatsByPartner(partnerIds),
    getGrowthConversionStatsByPartnerDestination(destinationRefs),
    getGrowthConversionStatsByReferrerStore(referrerStoreIds),
  ]);

  return rows.map((row) => ({
    ...row,
    growthConversionStats:
      row.sourceType === "PARTNER" && row.partnerDestinationId
        ? conversionStatsByDestination.get(row.partnerDestinationId) ?? emptyGrowthConversionSummary()
        : row.sourceType === "PARTNER" && row.partnerId
          ? conversionStatsByPartner.get(row.partnerId) ?? emptyGrowthConversionSummary()
          : row.sourceType === "STORE_REFERRAL" && row.referrerStoreId
            ? conversionStatsByReferrerStore.get(row.referrerStoreId) ?? emptyGrowthConversionSummary()
            : emptyGrowthConversionSummary(),
  }));
}

export async function getAdminStoreRows(params: { q?: string; filter?: string }) {
  const q = params.q?.trim() ?? "";
  const activeFilter = getAdminStoreFilter(params.filter);
  const prisma = getPrisma();
  const stores = await prisma.store.findMany({
    where: buildStoreSearchWhere(q),
    include: {
      owner: true,
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { products: true, leads: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 250,
  });
  const paymentTotals = await prisma.storePayment.groupBy({
    by: ["storeId"],
    where: {
      storeId: { in: stores.map((store) => store.id) },
      status: "CONFIRMED",
    },
    _sum: { amountCents: true },
  });
  const confirmedTotalByStore = new Map(paymentTotals.map((row) => [row.storeId, row._sum.amountCents ?? 0]));

  const rows = stores.map((store) => {
    const planState = getStorePlanState(store);
    const sellerAiLimit = planState.limits.sellerAiMonthlyConversations;
    const sellerAiUsed = store.sellerAiConversationCount ?? 0;

    return {
      store,
      planState,
      productUsage: {
        used: store._count.products,
        limit: planState.limits.productLimit,
      },
      sellerAiUsage: {
        enabled: planState.sellerAiEnabled,
        used: sellerAiUsed,
        limit: sellerAiLimit,
      },
      paymentSummary: {
        lastPayment: store.payments[0] ?? null,
        confirmedTotalCents: confirmedTotalByStore.get(store.id) ?? 0,
      },
      leadSignals: store._count.leads,
    };
  });

  return rows.filter((row) => {
    if (activeFilter === "trial") return row.planState.planCode === "TRIAL";
    if (activeFilter === "basic") return row.planState.planCode === "BASIC";
    if (activeFilter === "pro") return row.planState.planCode === "PRO";
    if (activeFilter === "premium") return row.planState.planCode === "PREMIUM";
    if (activeFilter === "trial-expired") return row.planState.trialExpired;
    if (activeFilter === "seller-ai") return row.planState.sellerAiEnabled;
    return true;
  });
}
