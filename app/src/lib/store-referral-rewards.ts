import { type Prisma } from "@prisma/client";
import { formatMoney } from "@/lib/money";
import { getPrisma } from "@/lib/prisma";

export const storeReferralRewardStatuses = ["PENDING", "APPROVED", "APPLIED", "CANCELLED", "EXPIRED"] as const;
export const storeReferralRewardTypes = ["FREE_MONTH", "DISCOUNT", "SELLER_AI_CREDITS", "PLAN_UPGRADE", "INTERNAL_CREDIT", "CUSTOM"] as const;

export type StoreReferralRewardStatus = (typeof storeReferralRewardStatuses)[number];
export type StoreReferralRewardType = (typeof storeReferralRewardTypes)[number];
export type AdminStoreReferralRewardFilter = StoreReferralRewardStatus | StoreReferralRewardType | "all";

export type StoreReferralRewardStatusStats = {
  count: number;
};

export type StoreReferralRewardStats = Record<StoreReferralRewardStatus, StoreReferralRewardStatusStats> & {
  promisedMonths: number;
  promisedSellerAiCredits: number;
};

const rewardStatusSet = new Set<string>(storeReferralRewardStatuses);
const rewardTypeSet = new Set<string>(storeReferralRewardTypes);

export function isStoreReferralRewardStatus(value: string): value is StoreReferralRewardStatus {
  return rewardStatusSet.has(value);
}

export function isStoreReferralRewardType(value: string): value is StoreReferralRewardType {
  return rewardTypeSet.has(value);
}

export function getAdminStoreReferralRewardFilter(value: string | null | undefined): AdminStoreReferralRewardFilter {
  if (!value || value === "all") return "all";
  return isStoreReferralRewardStatus(value) || isStoreReferralRewardType(value) ? value : "all";
}

export function emptyStoreReferralRewardStats(): StoreReferralRewardStats {
  return {
    PENDING: { count: 0 },
    APPROVED: { count: 0 },
    APPLIED: { count: 0 },
    CANCELLED: { count: 0 },
    EXPIRED: { count: 0 },
    promisedMonths: 0,
    promisedSellerAiCredits: 0,
  };
}

export function storeReferralRewardStatusLabel(status: string) {
  if (status === "PENDING") return "Pendiente";
  if (status === "APPROVED") return "Aprobada";
  if (status === "APPLIED") return "Aplicada";
  if (status === "CANCELLED") return "Cancelada";
  if (status === "EXPIRED") return "Expirada";
  return status;
}

export function storeReferralRewardTypeLabel(type: string) {
  if (type === "FREE_MONTH") return "Mes gratis";
  if (type === "DISCOUNT") return "Descuento";
  if (type === "SELLER_AI_CREDITS") return "Conversaciones Seller AI";
  if (type === "PLAN_UPGRADE") return "Upgrade temporal";
  if (type === "INTERNAL_CREDIT") return "Credito interno";
  if (type === "CUSTOM") return "Personalizado";
  return type;
}

export function parseRewardAmountToCents(input: FormDataEntryValue | string | number | null | undefined) {
  const raw = String(input ?? "").trim().replace(",", ".");
  if (!raw) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return null;

  const amount = Number(raw);
  if (!Number.isFinite(amount)) return null;
  return Math.round(amount * 100);
}

export function parseOptionalPositiveInt(input: FormDataEntryValue | string | number | null | undefined) {
  const raw = String(input ?? "").trim();
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) return null;
  return value;
}

export function parseOptionalDate(input: FormDataEntryValue | string | null | undefined) {
  const raw = String(input ?? "").trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function formatRewardMoney(cents: number | null | undefined, currency?: string | null) {
  return formatMoney({
    amountCents: cents ?? 0,
    currency: currency ?? "BOB",
    countryCode: "BO",
    showCurrencyCodeWhenAmbiguous: true,
  });
}

export function buildRewardValueLabel(params: {
  rewardType: string;
  valueLabel?: string | null;
  valueAmountCents?: number | null;
  currency?: string | null;
  sellerAiCredits?: number | null;
  months?: number | null;
}) {
  const label = params.valueLabel?.trim();
  if (label) return label;

  if (params.rewardType === "FREE_MONTH" && params.months) return `${params.months} ${params.months === 1 ? "mes gratis" : "meses gratis"}`;
  if (params.rewardType === "SELLER_AI_CREDITS" && params.sellerAiCredits) return `${params.sellerAiCredits} conversaciones Seller AI`;
  if ((params.rewardType === "DISCOUNT" || params.rewardType === "INTERNAL_CREDIT") && params.valueAmountCents) {
    return formatRewardMoney(params.valueAmountCents, params.currency);
  }
  return storeReferralRewardTypeLabel(params.rewardType);
}

function buildRewardSearchWhere(q: string): Prisma.StoreReferralRewardWhereInput {
  if (!q) return {};

  return {
    OR: [
      { status: { contains: q, mode: "insensitive" } },
      { rewardType: { contains: q, mode: "insensitive" } },
      { valueLabel: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { notes: { contains: q, mode: "insensitive" } },
      { applicationReference: { contains: q, mode: "insensitive" } },
      { referrerStore: { name: { contains: q, mode: "insensitive" } } },
      { referrerStore: { slug: { contains: q, mode: "insensitive" } } },
      { referrerStore: { owner: { email: { contains: q, mode: "insensitive" } } } },
      { referredStore: { name: { contains: q, mode: "insensitive" } } },
      { referredStore: { slug: { contains: q, mode: "insensitive" } } },
      { referredStore: { owner: { email: { contains: q, mode: "insensitive" } } } },
    ],
  };
}

export async function getStoreReferralRewardStats() {
  const prisma = getPrisma();
  const [statusRows, sumRows] = await Promise.all([
    prisma.storeReferralReward.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.storeReferralReward.aggregate({
      _sum: {
        months: true,
        sellerAiCredits: true,
      },
    }),
  ]);

  const stats = emptyStoreReferralRewardStats();
  for (const row of statusRows) {
    if (!isStoreReferralRewardStatus(row.status)) continue;
    stats[row.status] = { count: row._count._all };
  }
  stats.promisedMonths = sumRows._sum.months ?? 0;
  stats.promisedSellerAiCredits = sumRows._sum.sellerAiCredits ?? 0;
  return stats;
}

export async function getAdminStoreReferralRewards(params: { q?: string; filter?: string }) {
  const q = params.q?.trim() ?? "";
  const filter = getAdminStoreReferralRewardFilter(params.filter);
  const where: Prisma.StoreReferralRewardWhereInput = {
    ...(isStoreReferralRewardStatus(filter) ? { status: filter } : {}),
    ...(isStoreReferralRewardType(filter) ? { rewardType: filter } : {}),
  };
  const searchWhere = buildRewardSearchWhere(q);

  return getPrisma().storeReferralReward.findMany({
    where: q ? { AND: [where, searchWhere] } : where,
    include: {
      referrerStore: { include: { owner: true } },
      referredStore: { include: { owner: true } },
      attribution: true,
    },
    orderBy: { createdAt: "desc" },
    take: 250,
  });
}

export async function getAdminStoreReferralRewardFormOptions(params: { referrerStoreId?: string; referredStoreId?: string; attributionId?: string }) {
  const prisma = getPrisma();

  const [stores, recentStoreReferralAttributions, selectedAttribution, selectedReferrerStore, selectedReferredStore] = await Promise.all([
    prisma.store.findMany({
      include: { owner: true },
      orderBy: { name: "asc" },
      take: 250,
    }),
    prisma.acquisitionAttribution.findMany({
      where: { sourceType: "STORE_REFERRAL" },
      include: {
        store: { include: { owner: true } },
        referrerStore: { include: { owner: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    params.attributionId
      ? prisma.acquisitionAttribution.findUnique({
          where: { id: params.attributionId },
          include: {
            store: { include: { owner: true } },
            referrerStore: { include: { owner: true } },
          },
        })
      : Promise.resolve(null),
    params.referrerStoreId ? prisma.store.findUnique({ where: { id: params.referrerStoreId }, include: { owner: true } }) : Promise.resolve(null),
    params.referredStoreId ? prisma.store.findUnique({ where: { id: params.referredStoreId }, include: { owner: true } }) : Promise.resolve(null),
  ]);

  return {
    stores,
    recentStoreReferralAttributions,
    selectedAttribution,
    selectedReferrerStore: selectedReferrerStore ?? selectedAttribution?.referrerStore ?? null,
    selectedReferredStore: selectedReferredStore ?? selectedAttribution?.store ?? null,
  };
}

export async function getOwnerStoreReferralData(storeId: string) {
  return Promise.all([
    getPrisma().acquisitionAttribution.findMany({
      where: { referrerStoreId: storeId },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
            planStatus: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    getPrisma().storeReferralReward.findMany({
      where: { referrerStoreId: storeId },
      include: {
        referredStore: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);
}
