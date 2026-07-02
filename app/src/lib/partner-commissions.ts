import { type Prisma } from "@prisma/client";
import { commercialRealPartnerCommissionWhere } from "@/lib/data-quality";
import { formatMoney } from "@/lib/money";
import { getPrisma } from "@/lib/prisma";

export const partnerCommissionStatuses = ["PENDING", "APPROVED", "PAID", "CANCELLED", "REVERSED"] as const;

export type PartnerCommissionStatus = (typeof partnerCommissionStatuses)[number];

export type PartnerCommissionStatusStats = {
  count: number;
  amountCents: number;
};

export type PartnerCommissionStats = Record<PartnerCommissionStatus, PartnerCommissionStatusStats>;

const partnerCommissionStatusSet = new Set<string>(partnerCommissionStatuses);

export function isPartnerCommissionStatus(value: string): value is PartnerCommissionStatus {
  return partnerCommissionStatusSet.has(value);
}

export function getPartnerCommissionStatus(value: string | null | undefined) {
  if (!value || value === "all") return "all";
  return isPartnerCommissionStatus(value) ? value : "all";
}

export function emptyPartnerCommissionStats(): PartnerCommissionStats {
  return {
    PENDING: { count: 0, amountCents: 0 },
    APPROVED: { count: 0, amountCents: 0 },
    PAID: { count: 0, amountCents: 0 },
    CANCELLED: { count: 0, amountCents: 0 },
    REVERSED: { count: 0, amountCents: 0 },
  };
}

export function partnerCommissionStatusLabel(status: string) {
  if (status === "PENDING") return "Pendiente";
  if (status === "APPROVED") return "Aprobada";
  if (status === "PAID") return "Pagada";
  if (status === "CANCELLED") return "Cancelada";
  if (status === "REVERSED") return "Reversada";
  return status;
}

export function formatCommissionMoney(cents: number | null | undefined, currency?: string | null) {
  return formatMoney({
    amountCents: cents ?? 0,
    currency: currency ?? "BOB",
    countryCode: "BO",
    showCurrencyCodeWhenAmbiguous: true,
  });
}

export function parseCommissionAmountToCents(input: FormDataEntryValue | string | number | null | undefined) {
  const raw = String(input ?? "").trim().replace(",", ".");
  if (!raw) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return null;

  const amount = Number(raw);
  if (!Number.isFinite(amount)) return null;
  return Math.round(amount * 100);
}

export function calculateSuggestedCommission({ amountCents, rateBps }: { amountCents: number | null | undefined; rateBps: number | null | undefined }) {
  if (!amountCents || !rateBps) return null;
  return Math.round((amountCents * rateBps) / 10000);
}

function buildCommissionSearchWhere(q: string): Prisma.PartnerCommissionWhereInput {
  if (!q) return {};

  return {
    OR: [
      { status: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { notes: { contains: q, mode: "insensitive" } },
      { paymentReference: { contains: q, mode: "insensitive" } },
      { partner: { name: { contains: q, mode: "insensitive" } } },
      { partner: { code: { contains: q, mode: "insensitive" } } },
      { store: { name: { contains: q, mode: "insensitive" } } },
      { store: { slug: { contains: q, mode: "insensitive" } } },
      { store: { owner: { email: { contains: q, mode: "insensitive" } } } },
    ],
  };
}

export async function getPartnerCommissionStats(partnerId?: string | null) {
  const rows = await getPrisma().partnerCommission.groupBy({
    by: ["status"],
    where: commercialRealPartnerCommissionWhere(partnerId ? { partnerId } : {}),
    _count: { _all: true },
    _sum: { commissionAmountCents: true },
  });

  const stats = emptyPartnerCommissionStats();
  for (const row of rows) {
    if (!isPartnerCommissionStatus(row.status)) continue;
    stats[row.status] = {
      count: row._count._all,
      amountCents: row._sum.commissionAmountCents ?? 0,
    };
  }

  return stats;
}

export async function getPartnerCommissionStatsByPartner() {
  const rows = await getPrisma().partnerCommission.groupBy({
    by: ["partnerId", "status"],
    where: commercialRealPartnerCommissionWhere(),
    _count: { _all: true },
    _sum: { commissionAmountCents: true },
  });

  const statsByPartner = new Map<string, PartnerCommissionStats>();
  for (const row of rows) {
    if (!isPartnerCommissionStatus(row.status)) continue;
    const stats = statsByPartner.get(row.partnerId) ?? emptyPartnerCommissionStats();
    stats[row.status] = {
      count: row._count._all,
      amountCents: row._sum.commissionAmountCents ?? 0,
    };
    statsByPartner.set(row.partnerId, stats);
  }

  return statsByPartner;
}

export async function getAdminCommissions(params: { q?: string; status?: string; partnerId?: string }) {
  const q = params.q?.trim() ?? "";
  const status = getPartnerCommissionStatus(params.status);
  const where: Prisma.PartnerCommissionWhereInput = {
    ...(status === "all" ? {} : { status }),
    ...(params.partnerId ? { partnerId: params.partnerId } : {}),
  };
  const searchWhere = buildCommissionSearchWhere(q);

  return getPrisma().partnerCommission.findMany({
    where: q ? { AND: [where, searchWhere] } : where,
    include: {
      partner: true,
      store: { include: { owner: true } },
      attribution: { include: { partnerDestination: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 250,
  });
}

export async function getAdminCommissionFormOptions(params: { partnerId?: string; attributionId?: string; storeId?: string }) {
  const prisma = getPrisma();
  const partnerWhere = params.partnerId ? { id: params.partnerId } : undefined;

  const [partners, recentPartnerAttributions, selectedAttribution, selectedStore] = await Promise.all([
    prisma.partner.findMany({
      where: partnerWhere,
      orderBy: { name: "asc" },
      take: params.partnerId ? 1 : 250,
    }),
    prisma.acquisitionAttribution.findMany({
      where: {
        sourceType: "PARTNER",
        ...(params.partnerId ? { partnerId: params.partnerId } : {}),
      },
      include: {
        store: { include: { owner: true } },
        partner: true,
        partnerDestination: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    params.attributionId
      ? prisma.acquisitionAttribution.findUnique({
          where: { id: params.attributionId },
          include: {
            store: { include: { owner: true } },
            partner: true,
            partnerDestination: true,
          },
        })
      : Promise.resolve(null),
    params.storeId ? prisma.store.findUnique({ where: { id: params.storeId }, include: { owner: true } }) : Promise.resolve(null),
  ]);

  const selectedPartner = partners.find((partner) => partner.id === params.partnerId) ?? selectedAttribution?.partner ?? null;

  return {
    partners,
    recentPartnerAttributions,
    selectedAttribution,
    selectedStore,
    selectedPartner,
  };
}
