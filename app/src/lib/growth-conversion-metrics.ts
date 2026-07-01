import { type Prisma } from "@prisma/client";
import {
  emptyGrowthClickStats,
  getGrowthClickStats,
  getGrowthClickStatsByPartner,
  getGrowthClickStatsByPartnerDestination,
  getGrowthClickStatsByReferrerStore,
  type GrowthClickStats,
} from "@/lib/growth-link-clicks";
import { getPrisma } from "@/lib/prisma";

export type GrowthConversionPeriod = {
  clicks: number;
  signups: number;
  conversionRate: number | null;
};

export type GrowthConversionSummary = {
  total: GrowthConversionPeriod;
  last7Days: GrowthConversionPeriod;
  last30Days: GrowthConversionPeriod;
};

export type GrowthConversionTopItem = GrowthConversionPeriod & {
  id: string;
  label: string;
  secondary: string | null;
};

export type GrowthTopConverters = {
  rangeDays: number;
  topPartnerBySignups: GrowthConversionTopItem | null;
  topPartnerByConversion: GrowthConversionTopItem | null;
  topStoreBySignups: GrowthConversionTopItem | null;
  topDestinationBySignups: GrowthConversionTopItem | null;
};

type SignupStats = {
  total: number;
  last7Days: number;
  last30Days: number;
};

type PartnerDestinationRef = {
  id: string;
  partnerId: string;
  slug: string;
};

const attributedSignupSourceTypes = ["PARTNER", "STORE_REFERRAL"];
const minClicksForConversionRanking = 3;

function statsWindow(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function emptySignupStats(): SignupStats {
  return { total: 0, last7Days: 0, last30Days: 0 };
}

function withSignedUpAt(where: Prisma.AcquisitionAttributionWhereInput, since: Date) {
  return { AND: [where, { signedUpAt: { gte: since } }] } satisfies Prisma.AcquisitionAttributionWhereInput;
}

function applySignupCount(statsById: Map<string, SignupStats>, id: string | null, key: keyof SignupStats, count: number) {
  if (!id) return;
  const stats = statsById.get(id) ?? emptySignupStats();
  stats[key] = count;
  statsById.set(id, stats);
}

function buildPeriod(signups: number, clicks: number): GrowthConversionPeriod {
  return {
    clicks,
    signups,
    conversionRate: safeConversionRate(signups, clicks),
  };
}

function combineStats(clicks: GrowthClickStats, signups: SignupStats): GrowthConversionSummary {
  return {
    total: buildPeriod(signups.total, clicks.total),
    last7Days: buildPeriod(signups.last7Days, clicks.last7Days),
    last30Days: buildPeriod(signups.last30Days, clicks.last30Days),
  };
}

function buildTopItem(params: {
  id: string;
  label: string;
  secondary?: string | null;
  clicks: number;
  signups: number;
}): GrowthConversionTopItem {
  return {
    id: params.id,
    label: params.label,
    secondary: params.secondary ?? null,
    clicks: params.clicks,
    signups: params.signups,
    conversionRate: safeConversionRate(params.signups, params.clicks),
  };
}

export function safeConversionRate(signups: number, clicks: number) {
  if (!Number.isFinite(signups) || !Number.isFinite(clicks) || clicks <= 0) return null;
  return signups / clicks;
}

export function formatConversionRate(rate: number | null | undefined) {
  if (rate === null || rate === undefined || !Number.isFinite(rate)) return "Sin clicks";
  const percent = rate * 100;
  const decimals = percent > 0 && percent < 10 ? 1 : 0;
  return `${percent.toFixed(decimals)}%`;
}

export function formatConversionContext(period: GrowthConversionPeriod) {
  if (period.clicks === 0 && period.signups > 0) return "Historico sin clicks";
  if (period.clicks === 0) return "Sin trafico registrado";
  if (period.clicks < minClicksForConversionRanking) return "Datos iniciales";
  if (period.signups === 0) return "Trafico inicial, sin registros atribuidos todavia";
  return `${period.clicks} clicks -> ${period.signups} registros atribuidos`;
}

export function emptyGrowthConversionSummary(): GrowthConversionSummary {
  return combineStats(emptyGrowthClickStats(), emptySignupStats());
}

async function getGrowthSignupStats(where: Prisma.AcquisitionAttributionWhereInput = {}): Promise<SignupStats> {
  const prisma = getPrisma();
  const last7Days = statsWindow(7);
  const last30Days = statsWindow(30);
  const [total, last7, last30] = await Promise.all([
    prisma.acquisitionAttribution.count({ where }),
    prisma.acquisitionAttribution.count({ where: withSignedUpAt(where, last7Days) }),
    prisma.acquisitionAttribution.count({ where: withSignedUpAt(where, last30Days) }),
  ]);

  return {
    total,
    last7Days: last7,
    last30Days: last30,
  };
}

async function getGrowthSignupStatsByPartner(partnerIds: string[]) {
  const ids = [...new Set(partnerIds.filter(Boolean))];
  const statsById = new Map<string, SignupStats>();
  if (ids.length === 0) return statsById;

  const prisma = getPrisma();
  const last7Days = statsWindow(7);
  const last30Days = statsWindow(30);
  const baseWhere = { sourceType: "PARTNER", partnerId: { in: ids } } satisfies Prisma.AcquisitionAttributionWhereInput;
  const [totalRows, last7Rows, last30Rows] = await Promise.all([
    prisma.acquisitionAttribution.groupBy({
      by: ["partnerId"],
      where: baseWhere,
      _count: { _all: true },
    }),
    prisma.acquisitionAttribution.groupBy({
      by: ["partnerId"],
      where: withSignedUpAt(baseWhere, last7Days),
      _count: { _all: true },
    }),
    prisma.acquisitionAttribution.groupBy({
      by: ["partnerId"],
      where: withSignedUpAt(baseWhere, last30Days),
      _count: { _all: true },
    }),
  ]);

  totalRows.forEach((row) => applySignupCount(statsById, row.partnerId, "total", row._count._all));
  last7Rows.forEach((row) => applySignupCount(statsById, row.partnerId, "last7Days", row._count._all));
  last30Rows.forEach((row) => applySignupCount(statsById, row.partnerId, "last30Days", row._count._all));
  return statsById;
}

async function getGrowthSignupStatsByReferrerStore(storeIds: string[]) {
  const ids = [...new Set(storeIds.filter(Boolean))];
  const statsById = new Map<string, SignupStats>();
  if (ids.length === 0) return statsById;

  const prisma = getPrisma();
  const last7Days = statsWindow(7);
  const last30Days = statsWindow(30);
  const baseWhere = { sourceType: "STORE_REFERRAL", referrerStoreId: { in: ids } } satisfies Prisma.AcquisitionAttributionWhereInput;
  const [totalRows, last7Rows, last30Rows] = await Promise.all([
    prisma.acquisitionAttribution.groupBy({
      by: ["referrerStoreId"],
      where: baseWhere,
      _count: { _all: true },
    }),
    prisma.acquisitionAttribution.groupBy({
      by: ["referrerStoreId"],
      where: withSignedUpAt(baseWhere, last7Days),
      _count: { _all: true },
    }),
    prisma.acquisitionAttribution.groupBy({
      by: ["referrerStoreId"],
      where: withSignedUpAt(baseWhere, last30Days),
      _count: { _all: true },
    }),
  ]);

  totalRows.forEach((row) => applySignupCount(statsById, row.referrerStoreId, "total", row._count._all));
  last7Rows.forEach((row) => applySignupCount(statsById, row.referrerStoreId, "last7Days", row._count._all));
  last30Rows.forEach((row) => applySignupCount(statsById, row.referrerStoreId, "last30Days", row._count._all));
  return statsById;
}

async function getGrowthSignupStatsByPartnerDestination(destinations: PartnerDestinationRef[]) {
  const refs = destinations.filter((destination) => destination.id && destination.partnerId && destination.slug);
  const statsById = new Map<string, SignupStats>();
  if (refs.length === 0) return statsById;

  const ids = [...new Set(refs.map((destination) => destination.id))];
  const partnerIds = [...new Set(refs.map((destination) => destination.partnerId))];
  const slugs = [...new Set(refs.map((destination) => destination.slug))];
  const destinationIdByPartnerSlug = new Map(refs.map((destination) => [`${destination.partnerId}:${destination.slug}`, destination.id]));
  const prisma = getPrisma();
  const last7Days = statsWindow(7);
  const last30Days = statsWindow(30);
  const idWhere = { sourceType: "PARTNER", partnerDestinationId: { in: ids } } satisfies Prisma.AcquisitionAttributionWhereInput;
  const slugWhere = {
    sourceType: "PARTNER",
    partnerDestinationId: null,
    partnerId: { in: partnerIds },
    partnerDestinationSlug: { in: slugs },
  } satisfies Prisma.AcquisitionAttributionWhereInput;

  const [
    totalIdRows,
    last7IdRows,
    last30IdRows,
    totalSlugRows,
    last7SlugRows,
    last30SlugRows,
  ] = await Promise.all([
    prisma.acquisitionAttribution.groupBy({
      by: ["partnerDestinationId"],
      where: idWhere,
      _count: { _all: true },
    }),
    prisma.acquisitionAttribution.groupBy({
      by: ["partnerDestinationId"],
      where: withSignedUpAt(idWhere, last7Days),
      _count: { _all: true },
    }),
    prisma.acquisitionAttribution.groupBy({
      by: ["partnerDestinationId"],
      where: withSignedUpAt(idWhere, last30Days),
      _count: { _all: true },
    }),
    prisma.acquisitionAttribution.groupBy({
      by: ["partnerId", "partnerDestinationSlug"],
      where: slugWhere,
      _count: { _all: true },
    }),
    prisma.acquisitionAttribution.groupBy({
      by: ["partnerId", "partnerDestinationSlug"],
      where: withSignedUpAt(slugWhere, last7Days),
      _count: { _all: true },
    }),
    prisma.acquisitionAttribution.groupBy({
      by: ["partnerId", "partnerDestinationSlug"],
      where: withSignedUpAt(slugWhere, last30Days),
      _count: { _all: true },
    }),
  ]);

  totalIdRows.forEach((row) => applySignupCount(statsById, row.partnerDestinationId, "total", row._count._all));
  last7IdRows.forEach((row) => applySignupCount(statsById, row.partnerDestinationId, "last7Days", row._count._all));
  last30IdRows.forEach((row) => applySignupCount(statsById, row.partnerDestinationId, "last30Days", row._count._all));

  const applySlugRows = (rows: typeof totalSlugRows, key: keyof SignupStats) => {
    rows.forEach((row) => {
      if (!row.partnerId || !row.partnerDestinationSlug) return;
      const destinationId = destinationIdByPartnerSlug.get(`${row.partnerId}:${row.partnerDestinationSlug}`);
      applySignupCount(statsById, destinationId ?? null, key, row._count._all);
    });
  };
  applySlugRows(totalSlugRows, "total");
  applySlugRows(last7SlugRows, "last7Days");
  applySlugRows(last30SlugRows, "last30Days");

  return statsById;
}

export async function getGrowthConversionSummary(params: {
  clickWhere?: Prisma.GrowthLinkClickWhereInput;
  signupWhere?: Prisma.AcquisitionAttributionWhereInput;
}) {
  const [clickStats, signupStats] = await Promise.all([
    getGrowthClickStats(params.clickWhere ?? {}),
    getGrowthSignupStats(params.signupWhere ?? {}),
  ]);

  return combineStats(clickStats, signupStats);
}

export async function getPartnerConversionSummary(partnerId: string) {
  return getGrowthConversionSummary({
    clickWhere: { sourceType: "PARTNER", partnerId },
    signupWhere: { sourceType: "PARTNER", partnerId },
  });
}

export async function getPartnerMainLinkConversionSummary(partnerId: string, code: string) {
  const landingPath = `/partner/${code}`;
  return getGrowthConversionSummary({
    clickWhere: { sourceType: "PARTNER", partnerId, landingPath: { startsWith: landingPath } },
    signupWhere: { sourceType: "PARTNER", partnerId, landingPath: { startsWith: landingPath } },
  });
}

export async function getPartnerDestinationConversionSummary(partnerId: string) {
  const destinations = await getPrisma().partnerDestination.findMany({
    where: { partnerId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  const conversionStatsByDestination = await getGrowthConversionStatsByPartnerDestination(destinations);

  return destinations.map((destination) => ({
    ...destination,
    conversionStats: conversionStatsByDestination.get(destination.id) ?? emptyGrowthConversionSummary(),
  }));
}

export async function getStoreReferralConversionSummary(storeId: string) {
  return getGrowthConversionSummary({
    clickWhere: { sourceType: "STORE_REFERRAL", referrerStoreId: storeId },
    signupWhere: { sourceType: "STORE_REFERRAL", referrerStoreId: storeId },
  });
}

export async function getGrowthConversionStatsByPartner(partnerIds: string[]) {
  const ids = [...new Set(partnerIds.filter(Boolean))];
  const statsById = new Map<string, GrowthConversionSummary>();
  if (ids.length === 0) return statsById;

  const [clickStatsByPartner, signupStatsByPartner] = await Promise.all([
    getGrowthClickStatsByPartner(ids),
    getGrowthSignupStatsByPartner(ids),
  ]);

  ids.forEach((id) => {
    statsById.set(id, combineStats(clickStatsByPartner.get(id) ?? emptyGrowthClickStats(), signupStatsByPartner.get(id) ?? emptySignupStats()));
  });
  return statsById;
}

export async function getGrowthConversionStatsByPartnerDestination(destinations: PartnerDestinationRef[]) {
  const refs = destinations.filter((destination) => destination.id);
  const statsById = new Map<string, GrowthConversionSummary>();
  if (refs.length === 0) return statsById;

  const [clickStatsByDestination, signupStatsByDestination] = await Promise.all([
    getGrowthClickStatsByPartnerDestination(refs.map((destination) => destination.id)),
    getGrowthSignupStatsByPartnerDestination(refs),
  ]);

  refs.forEach((destination) => {
    statsById.set(
      destination.id,
      combineStats(clickStatsByDestination.get(destination.id) ?? emptyGrowthClickStats(), signupStatsByDestination.get(destination.id) ?? emptySignupStats()),
    );
  });
  return statsById;
}

export async function getGrowthConversionStatsByReferrerStore(storeIds: string[]) {
  const ids = [...new Set(storeIds.filter(Boolean))];
  const statsById = new Map<string, GrowthConversionSummary>();
  if (ids.length === 0) return statsById;

  const [clickStatsByStore, signupStatsByStore] = await Promise.all([
    getGrowthClickStatsByReferrerStore(ids),
    getGrowthSignupStatsByReferrerStore(ids),
  ]);

  ids.forEach((id) => {
    statsById.set(id, combineStats(clickStatsByStore.get(id) ?? emptyGrowthClickStats(), signupStatsByStore.get(id) ?? emptySignupStats()));
  });
  return statsById;
}

export async function getTopGrowthConverters({ rangeDays, limit }: { rangeDays: number; limit: number }): Promise<GrowthTopConverters> {
  const prisma = getPrisma();
  const since = statsWindow(rangeDays);
  const signupRangeFilter = { gte: since } satisfies Prisma.DateTimeFilter<"AcquisitionAttribution">;
  const clickRangeWhere = { clickedAt: { gte: since } } satisfies Prisma.GrowthLinkClickWhereInput;
  const take = Math.max(limit, 1) * 5;

  const [partnerSignupRows, storeSignupRows, destinationSignupRows] = await Promise.all([
    prisma.acquisitionAttribution.groupBy({
      by: ["partnerId"],
      where: { sourceType: "PARTNER", partnerId: { not: null }, signedUpAt: signupRangeFilter },
      _count: { _all: true },
      orderBy: { _count: { partnerId: "desc" } },
      take,
    }),
    prisma.acquisitionAttribution.groupBy({
      by: ["referrerStoreId"],
      where: { sourceType: "STORE_REFERRAL", referrerStoreId: { not: null }, signedUpAt: signupRangeFilter },
      _count: { _all: true },
      orderBy: { _count: { referrerStoreId: "desc" } },
      take,
    }),
    prisma.acquisitionAttribution.groupBy({
      by: ["partnerDestinationId"],
      where: { sourceType: "PARTNER", partnerDestinationId: { not: null }, signedUpAt: signupRangeFilter },
      _count: { _all: true },
      orderBy: { _count: { partnerDestinationId: "desc" } },
      take,
    }),
  ]);

  const partnerIds = partnerSignupRows.flatMap((row) => (row.partnerId ? [row.partnerId] : []));
  const storeIds = storeSignupRows.flatMap((row) => (row.referrerStoreId ? [row.referrerStoreId] : []));
  const destinationIds = destinationSignupRows.flatMap((row) => (row.partnerDestinationId ? [row.partnerDestinationId] : []));

  const [partners, stores, destinations, partnerClickRows, storeClickRows, destinationClickRows] = await Promise.all([
    prisma.partner.findMany({
      where: { id: { in: partnerIds } },
      select: { id: true, name: true, code: true },
    }),
    prisma.store.findMany({
      where: { id: { in: storeIds } },
      select: { id: true, name: true, slug: true },
    }),
    prisma.partnerDestination.findMany({
      where: { id: { in: destinationIds } },
      select: { id: true, label: true, slug: true, partner: { select: { code: true, name: true } } },
    }),
    prisma.growthLinkClick.groupBy({
      by: ["partnerId"],
      where: { sourceType: "PARTNER", partnerId: { in: partnerIds }, ...clickRangeWhere },
      _count: { _all: true },
    }),
    prisma.growthLinkClick.groupBy({
      by: ["referrerStoreId"],
      where: { sourceType: "STORE_REFERRAL", referrerStoreId: { in: storeIds }, ...clickRangeWhere },
      _count: { _all: true },
    }),
    prisma.growthLinkClick.groupBy({
      by: ["partnerDestinationId"],
      where: { sourceType: "PARTNER", partnerDestinationId: { in: destinationIds }, ...clickRangeWhere },
      _count: { _all: true },
    }),
  ]);

  const partnerById = new Map(partners.map((partner) => [partner.id, partner]));
  const storeById = new Map(stores.map((store) => [store.id, store]));
  const destinationById = new Map(destinations.map((destination) => [destination.id, destination]));
  const partnerClicksById = new Map(partnerClickRows.flatMap((row) => (row.partnerId ? [[row.partnerId, row._count._all] as const] : [])));
  const storeClicksById = new Map(storeClickRows.flatMap((row) => (row.referrerStoreId ? [[row.referrerStoreId, row._count._all] as const] : [])));
  const destinationClicksById = new Map(destinationClickRows.flatMap((row) => (row.partnerDestinationId ? [[row.partnerDestinationId, row._count._all] as const] : [])));

  const partnerItems = partnerSignupRows.flatMap((row) => {
    if (!row.partnerId) return [];
    const partner = partnerById.get(row.partnerId);
    if (!partner) return [];
    return [
      buildTopItem({
        id: partner.id,
        label: partner.name,
        secondary: partner.code,
        clicks: partnerClicksById.get(partner.id) ?? 0,
        signups: row._count._all,
      }),
    ];
  });

  const storeItems = storeSignupRows.flatMap((row) => {
    if (!row.referrerStoreId) return [];
    const store = storeById.get(row.referrerStoreId);
    if (!store) return [];
    return [
      buildTopItem({
        id: store.id,
        label: store.name,
        secondary: store.slug,
        clicks: storeClicksById.get(store.id) ?? 0,
        signups: row._count._all,
      }),
    ];
  });

  const destinationItems = destinationSignupRows.flatMap((row) => {
    if (!row.partnerDestinationId) return [];
    const destination = destinationById.get(row.partnerDestinationId);
    if (!destination) return [];
    return [
      buildTopItem({
        id: destination.id,
        label: destination.label,
        secondary: `${destination.partner.code}/${destination.slug}`,
        clicks: destinationClicksById.get(destination.id) ?? 0,
        signups: row._count._all,
      }),
    ];
  });

  const conversionRankedPartners = [...partnerItems]
    .filter((item) => item.clicks >= minClicksForConversionRanking && item.signups > 0)
    .sort((a, b) => (b.conversionRate ?? 0) - (a.conversionRate ?? 0) || b.signups - a.signups || b.clicks - a.clicks);

  return {
    rangeDays,
    topPartnerBySignups: partnerItems[0] ?? null,
    topPartnerByConversion: conversionRankedPartners[0] ?? null,
    topStoreBySignups: storeItems[0] ?? null,
    topDestinationBySignups: destinationItems[0] ?? null,
  };
}

export async function getAdminGrowthConversionSummary() {
  const [all, partner, storeReferral, topConverters] = await Promise.all([
    getGrowthConversionSummary({
      clickWhere: {},
      signupWhere: { sourceType: { in: attributedSignupSourceTypes } },
    }),
    getGrowthConversionSummary({
      clickWhere: { sourceType: "PARTNER" },
      signupWhere: { sourceType: "PARTNER" },
    }),
    getGrowthConversionSummary({
      clickWhere: { sourceType: "STORE_REFERRAL" },
      signupWhere: { sourceType: "STORE_REFERRAL" },
    }),
    getTopGrowthConverters({ rangeDays: 30, limit: 1 }),
  ]);

  return {
    all,
    partner,
    storeReferral,
    topConverters,
  };
}
