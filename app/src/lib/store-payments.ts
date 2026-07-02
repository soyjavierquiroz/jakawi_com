import { type Prisma } from "@prisma/client";
import { commercialRealStorePaymentWhere, excludedStorePaymentWhere } from "@/lib/data-quality";
import { formatMoney } from "@/lib/money";
import { getPrisma } from "@/lib/prisma";

export const storePaymentPlanKeys = ["TRIAL", "BASIC", "PRO", "PREMIUM", "CUSTOM"] as const;
export const storePaymentTypes = ["NEW_SUBSCRIPTION", "RENEWAL", "UPGRADE", "DOWNGRADE", "ADJUSTMENT", "REFUND", "OTHER"] as const;
export const storePaymentStatuses = ["PENDING", "CONFIRMED", "CANCELLED", "REFUNDED"] as const;
export const storePaymentMethods = ["MANUAL_BANK_TRANSFER", "MANUAL_QR", "MANUAL_CASH", "MANUAL_OTHER", "HOTMART_EXTERNAL", "STRIPE_EXTERNAL", "OTHER"] as const;

export type StorePaymentStatus = (typeof storePaymentStatuses)[number];
export type StorePaymentType = (typeof storePaymentTypes)[number];
export type StorePaymentPlanKey = (typeof storePaymentPlanKeys)[number];
export type StorePaymentMethod = (typeof storePaymentMethods)[number];
export type AdminStorePaymentFilter = StorePaymentStatus | StorePaymentPlanKey | StorePaymentType | "all";

export type StorePaymentStatusStats = {
  count: number;
  amountCents: number;
};

export type StorePaymentStats = Record<StorePaymentStatus, StorePaymentStatusStats> & {
  confirmedLast30DaysCents: number;
  confirmedStoreCount: number;
  excludedConfirmedCount: number;
  excludedConfirmedAmountCents: number;
};

const statusSet = new Set<string>(storePaymentStatuses);
const typeSet = new Set<string>(storePaymentTypes);
const planKeySet = new Set<string>(storePaymentPlanKeys);
const methodSet = new Set<string>(storePaymentMethods);

export function isStorePaymentStatus(value: string): value is StorePaymentStatus {
  return statusSet.has(value);
}

export function isStorePaymentType(value: string): value is StorePaymentType {
  return typeSet.has(value);
}

export function isStorePaymentPlanKey(value: string): value is StorePaymentPlanKey {
  return planKeySet.has(value);
}

export function isStorePaymentMethod(value: string): value is StorePaymentMethod {
  return methodSet.has(value);
}

export function getAdminStorePaymentFilter(value: string | null | undefined): AdminStorePaymentFilter {
  if (!value || value === "all") return "all";
  return isStorePaymentStatus(value) || isStorePaymentPlanKey(value) || isStorePaymentType(value) ? value : "all";
}

export function emptyStorePaymentStats(): StorePaymentStats {
  return {
    PENDING: { count: 0, amountCents: 0 },
    CONFIRMED: { count: 0, amountCents: 0 },
    CANCELLED: { count: 0, amountCents: 0 },
    REFUNDED: { count: 0, amountCents: 0 },
    confirmedLast30DaysCents: 0,
    confirmedStoreCount: 0,
    excludedConfirmedCount: 0,
    excludedConfirmedAmountCents: 0,
  };
}

export function storePaymentStatusLabel(status: string) {
  if (status === "PENDING") return "Pendiente";
  if (status === "CONFIRMED") return "Confirmado";
  if (status === "CANCELLED") return "Cancelado";
  if (status === "REFUNDED") return "Reembolsado";
  return status;
}

export function storePaymentTypeLabel(type: string) {
  if (type === "NEW_SUBSCRIPTION") return "Nuevo pago";
  if (type === "RENEWAL") return "Renovación";
  if (type === "UPGRADE") return "Upgrade";
  if (type === "DOWNGRADE") return "Downgrade";
  if (type === "ADJUSTMENT") return "Ajuste manual";
  if (type === "REFUND") return "Reembolso";
  if (type === "OTHER") return "Otro";
  return type;
}

export function storePaymentMethodLabel(method: string | null | undefined) {
  if (method === "MANUAL_BANK_TRANSFER") return "Transferencia manual";
  if (method === "MANUAL_QR") return "QR manual";
  if (method === "MANUAL_CASH") return "Efectivo manual";
  if (method === "MANUAL_OTHER") return "Manual otro";
  if (method === "HOTMART_EXTERNAL") return "Hotmart externo";
  if (method === "STRIPE_EXTERNAL") return "Stripe externo";
  if (method === "OTHER") return "Otro";
  return "Sin método";
}

export function parsePaymentAmountToCents(input: FormDataEntryValue | string | number | null | undefined) {
  const raw = String(input ?? "").trim().replace(",", ".");
  if (!raw) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return null;

  const amount = Number(raw);
  if (!Number.isFinite(amount)) return null;
  return Math.round(amount * 100);
}

export function parseOptionalPaymentDate(input: FormDataEntryValue | string | null | undefined) {
  const raw = String(input ?? "").trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function formatStorePaymentMoney(cents: number | null | undefined, currency?: string | null) {
  return formatMoney({
    amountCents: cents ?? 0,
    currency: currency ?? "BOB",
    countryCode: "BO",
    showCurrencyCodeWhenAmbiguous: true,
  });
}

function buildPaymentSearchWhere(q: string): Prisma.StorePaymentWhereInput {
  if (!q) return {};

  return {
    OR: [
      { status: { contains: q, mode: "insensitive" } },
      { planKey: { contains: q, mode: "insensitive" } },
      { paymentType: { contains: q, mode: "insensitive" } },
      { paymentMethod: { contains: q, mode: "insensitive" } },
      { externalReference: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { notes: { contains: q, mode: "insensitive" } },
      { store: { name: { contains: q, mode: "insensitive" } } },
      { store: { slug: { contains: q, mode: "insensitive" } } },
      { store: { owner: { email: { contains: q, mode: "insensitive" } } } },
    ],
  };
}

export async function getAdminPaymentStats() {
  const prisma = getPrisma();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [statusRows, last30, confirmedStores, excludedConfirmed] = await Promise.all([
    prisma.storePayment.groupBy({
      by: ["status"],
      where: commercialRealStorePaymentWhere(),
      _count: { _all: true },
      _sum: { amountCents: true },
    }),
    prisma.storePayment.aggregate({
      where: commercialRealStorePaymentWhere({ status: "CONFIRMED", confirmedAt: { gte: since } }),
      _sum: { amountCents: true },
    }),
    prisma.storePayment.groupBy({
      by: ["storeId"],
      where: commercialRealStorePaymentWhere({ status: "CONFIRMED" }),
    }),
    prisma.storePayment.aggregate({
      where: excludedStorePaymentWhere({ status: "CONFIRMED", amountCents: { gt: 0 } }),
      _count: { _all: true },
      _sum: { amountCents: true },
    }),
  ]);

  const stats = emptyStorePaymentStats();
  for (const row of statusRows) {
    if (!isStorePaymentStatus(row.status)) continue;
    stats[row.status] = {
      count: row._count._all,
      amountCents: row._sum.amountCents ?? 0,
    };
  }
  stats.confirmedLast30DaysCents = last30._sum.amountCents ?? 0;
  stats.confirmedStoreCount = confirmedStores.length;
  stats.excludedConfirmedCount = excludedConfirmed._count._all;
  stats.excludedConfirmedAmountCents = excludedConfirmed._sum.amountCents ?? 0;
  return stats;
}

export async function getStorePaymentSummary(storeId: string) {
  const prisma = getPrisma();
  const [stats, recentPayments, lastConfirmed] = await Promise.all([
    prisma.storePayment.groupBy({
      by: ["status"],
      where: { storeId },
      _count: { _all: true },
      _sum: { amountCents: true },
    }),
    prisma.storePayment.findMany({
      where: { storeId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.storePayment.findFirst({
      where: { storeId, status: "CONFIRMED" },
      orderBy: [{ confirmedAt: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  const summary = emptyStorePaymentStats();
  for (const row of stats) {
    if (!isStorePaymentStatus(row.status)) continue;
    summary[row.status] = {
      count: row._count._all,
      amountCents: row._sum.amountCents ?? 0,
    };
  }

  return {
    stats: summary,
    recentPayments,
    lastConfirmed,
  };
}

export async function getStorePaymentsForOwner(storeId: string) {
  return getPrisma().storePayment.findMany({
    where: { storeId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export async function getStorePaymentsForAdmin(params: { q?: string; filter?: string; storeId?: string }) {
  const q = params.q?.trim() ?? "";
  const filter = getAdminStorePaymentFilter(params.filter);
  const where: Prisma.StorePaymentWhereInput = {
    ...(isStorePaymentStatus(filter) ? { status: filter } : {}),
    ...(isStorePaymentPlanKey(filter) ? { planKey: filter } : {}),
    ...(isStorePaymentType(filter) ? { paymentType: filter } : {}),
    ...(params.storeId ? { storeId: params.storeId } : {}),
  };
  const searchWhere = buildPaymentSearchWhere(q);

  return getPrisma().storePayment.findMany({
    where: q ? { AND: [where, searchWhere] } : where,
    include: {
      store: {
        include: {
          owner: true,
          acquisitionAttribution: {
            include: {
              partner: true,
              partnerDestination: true,
              referrerStore: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 250,
  });
}

export async function getAdminStorePaymentFormOptions(params: { storeId?: string }) {
  const [stores, selectedStore] = await Promise.all([
    getPrisma().store.findMany({
      include: { owner: true },
      orderBy: { createdAt: "desc" },
      take: 250,
    }),
    params.storeId ? getPrisma().store.findUnique({ where: { id: params.storeId }, include: { owner: true } }) : Promise.resolve(null),
  ]);

  return {
    stores,
    selectedStore,
  };
}
