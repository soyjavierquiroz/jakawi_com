import { notFound } from "next/navigation";
import { type StorePlanCode } from "@/config/plans";
import { requireUser } from "@/lib/auth";
import { getStorePlanState } from "@/lib/plan-limits";
import { getPrisma } from "@/lib/prisma";
import { AnalyticsEventType, type Prisma } from "@prisma/client";

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

export async function getSuperAdminDashboardStats() {
  const prisma = getPrisma();
  const [stores, whatsappClicksLast7Days, leadSignals] = await Promise.all([
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
  };
}

export async function getAdminStoreRows(params: { q?: string; filter?: string }) {
  const q = params.q?.trim() ?? "";
  const activeFilter = getAdminStoreFilter(params.filter);
  const stores = await getPrisma().store.findMany({
    where: buildStoreSearchWhere(q),
    include: {
      owner: true,
      _count: { select: { products: true, leads: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 250,
  });

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
