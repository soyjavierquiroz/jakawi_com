import { createHash } from "crypto";
import { type NextRequest } from "next/server";
import { type Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";

export type GrowthClickSourceType = "PARTNER" | "STORE_REFERRAL";

export type GrowthClickStats = {
  total: number;
  last7Days: number;
  last30Days: number;
};

type RequestTrackingMetadata = {
  referrer: string | null;
  userAgent: string | null;
  ipHash: string | null;
  visitorId: string | null;
};

type RecordGrowthLinkClickInput = {
  sourceType: GrowthClickSourceType;
  partnerId?: string | null;
  partnerDestinationId?: string | null;
  referrerStoreId?: string | null;
  code?: string | null;
  destinationSlug?: string | null;
  landingPath: string;
  targetUrl?: string | null;
  metadata: RequestTrackingMetadata;
};

const visitorCookieNames = ["jakawi_visitor_id", "jakawi_visitor_session"] as const;

function truncate(value: string | null | undefined, maxLength: number) {
  if (!value) return null;
  const clean = value.trim();
  if (!clean) return null;
  return clean.length > maxLength ? clean.slice(0, maxLength) : clean;
}

function firstHeader(headers: Headers, names: string[]) {
  for (const name of names) {
    const value = headers.get(name);
    if (value?.trim()) return value.trim();
  }
  return null;
}

function getRequestIp(headers: Headers) {
  const raw = firstHeader(headers, ["x-forwarded-for", "x-real-ip", "cf-connecting-ip"]);
  return raw?.split(",")[0]?.trim() || null;
}

function statsWindow(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function withClickedAt(where: Prisma.GrowthLinkClickWhereInput, clickedAt: Prisma.DateTimeFilter<"GrowthLinkClick">) {
  return { AND: [where, { clickedAt }] } satisfies Prisma.GrowthLinkClickWhereInput;
}

export function emptyGrowthClickStats(): GrowthClickStats {
  return { total: 0, last7Days: 0, last30Days: 0 };
}

function applyCount(statsById: Map<string, GrowthClickStats>, id: string | null, key: keyof GrowthClickStats, count: number) {
  if (!id) return;
  const stats = statsById.get(id) ?? emptyGrowthClickStats();
  stats[key] = count;
  statsById.set(id, stats);
}

export function hashIp(rawIp: string) {
  const salt = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET ?? process.env.SESSION_SECRET ?? "jakawi-growth-link-clicks";
  return createHash("sha256").update(`${salt}:${rawIp}`).digest("hex");
}

export function getRequestTrackingMetadata(request: NextRequest): RequestTrackingMetadata {
  const rawIp = getRequestIp(request.headers);
  const visitorId = visitorCookieNames.map((name) => request.cookies.get(name)?.value).find(Boolean) ?? null;

  return {
    referrer: truncate(firstHeader(request.headers, ["referer", "referrer"]), 500),
    userAgent: truncate(request.headers.get("user-agent"), 500),
    ipHash: rawIp ? hashIp(rawIp) : null,
    visitorId: truncate(visitorId, 160),
  };
}

export async function recordGrowthLinkClick(input: RecordGrowthLinkClickInput) {
  try {
    await getPrisma().growthLinkClick.create({
      data: {
        sourceType: input.sourceType,
        partnerId: input.partnerId ?? null,
        partnerDestinationId: input.partnerDestinationId ?? null,
        referrerStoreId: input.referrerStoreId ?? null,
        code: truncate(input.code, 160),
        destinationSlug: truncate(input.destinationSlug, 160),
        landingPath: truncate(input.landingPath, 1000) ?? input.landingPath.slice(0, 1000),
        targetUrl: truncate(input.targetUrl, 1000),
        referrer: input.metadata.referrer,
        userAgent: input.metadata.userAgent,
        ipHash: input.metadata.ipHash,
        visitorId: input.metadata.visitorId,
      },
    });
  } catch (error) {
    console.warn("Growth link click tracking failed", error);
  }
}

export async function getGrowthClickStats(where: Prisma.GrowthLinkClickWhereInput = {}): Promise<GrowthClickStats> {
  const prisma = getPrisma();
  const last7Days = statsWindow(7);
  const last30Days = statsWindow(30);
  const [total, last7, last30] = await Promise.all([
    prisma.growthLinkClick.count({ where }),
    prisma.growthLinkClick.count({ where: withClickedAt(where, { gte: last7Days }) }),
    prisma.growthLinkClick.count({ where: withClickedAt(where, { gte: last30Days }) }),
  ]);

  return {
    total,
    last7Days: last7,
    last30Days: last30,
  };
}

export async function getPartnerClickStats(partnerId: string) {
  return getGrowthClickStats({ partnerId });
}

export async function getStoreReferralClickStats(storeId: string) {
  return getGrowthClickStats({ sourceType: "STORE_REFERRAL", referrerStoreId: storeId });
}

export async function getGrowthClickStatsByPartner(partnerIds: string[]) {
  const ids = [...new Set(partnerIds.filter(Boolean))];
  const statsById = new Map<string, GrowthClickStats>();
  if (ids.length === 0) return statsById;

  const prisma = getPrisma();
  const last7Days = statsWindow(7);
  const last30Days = statsWindow(30);
  const [totalRows, last7Rows, last30Rows] = await Promise.all([
    prisma.growthLinkClick.groupBy({
      by: ["partnerId"],
      where: { partnerId: { in: ids } },
      _count: { _all: true },
    }),
    prisma.growthLinkClick.groupBy({
      by: ["partnerId"],
      where: { partnerId: { in: ids }, clickedAt: { gte: last7Days } },
      _count: { _all: true },
    }),
    prisma.growthLinkClick.groupBy({
      by: ["partnerId"],
      where: { partnerId: { in: ids }, clickedAt: { gte: last30Days } },
      _count: { _all: true },
    }),
  ]);

  totalRows.forEach((row) => applyCount(statsById, row.partnerId, "total", row._count._all));
  last7Rows.forEach((row) => applyCount(statsById, row.partnerId, "last7Days", row._count._all));
  last30Rows.forEach((row) => applyCount(statsById, row.partnerId, "last30Days", row._count._all));
  return statsById;
}

export async function getGrowthClickStatsByPartnerDestination(destinationIds: string[]) {
  const ids = [...new Set(destinationIds.filter(Boolean))];
  const statsById = new Map<string, GrowthClickStats>();
  if (ids.length === 0) return statsById;

  const prisma = getPrisma();
  const last7Days = statsWindow(7);
  const last30Days = statsWindow(30);
  const [totalRows, last7Rows, last30Rows] = await Promise.all([
    prisma.growthLinkClick.groupBy({
      by: ["partnerDestinationId"],
      where: { partnerDestinationId: { in: ids } },
      _count: { _all: true },
    }),
    prisma.growthLinkClick.groupBy({
      by: ["partnerDestinationId"],
      where: { partnerDestinationId: { in: ids }, clickedAt: { gte: last7Days } },
      _count: { _all: true },
    }),
    prisma.growthLinkClick.groupBy({
      by: ["partnerDestinationId"],
      where: { partnerDestinationId: { in: ids }, clickedAt: { gte: last30Days } },
      _count: { _all: true },
    }),
  ]);

  totalRows.forEach((row) => applyCount(statsById, row.partnerDestinationId, "total", row._count._all));
  last7Rows.forEach((row) => applyCount(statsById, row.partnerDestinationId, "last7Days", row._count._all));
  last30Rows.forEach((row) => applyCount(statsById, row.partnerDestinationId, "last30Days", row._count._all));
  return statsById;
}

export async function getGrowthClickStatsByReferrerStore(storeIds: string[]) {
  const ids = [...new Set(storeIds.filter(Boolean))];
  const statsById = new Map<string, GrowthClickStats>();
  if (ids.length === 0) return statsById;

  const prisma = getPrisma();
  const last7Days = statsWindow(7);
  const last30Days = statsWindow(30);
  const [totalRows, last7Rows, last30Rows] = await Promise.all([
    prisma.growthLinkClick.groupBy({
      by: ["referrerStoreId"],
      where: { sourceType: "STORE_REFERRAL", referrerStoreId: { in: ids } },
      _count: { _all: true },
    }),
    prisma.growthLinkClick.groupBy({
      by: ["referrerStoreId"],
      where: { sourceType: "STORE_REFERRAL", referrerStoreId: { in: ids }, clickedAt: { gte: last7Days } },
      _count: { _all: true },
    }),
    prisma.growthLinkClick.groupBy({
      by: ["referrerStoreId"],
      where: { sourceType: "STORE_REFERRAL", referrerStoreId: { in: ids }, clickedAt: { gte: last30Days } },
      _count: { _all: true },
    }),
  ]);

  totalRows.forEach((row) => applyCount(statsById, row.referrerStoreId, "total", row._count._all));
  last7Rows.forEach((row) => applyCount(statsById, row.referrerStoreId, "last7Days", row._count._all));
  last30Rows.forEach((row) => applyCount(statsById, row.referrerStoreId, "last30Days", row._count._all));
  return statsById;
}

export async function getAdminGrowthClickOverview() {
  const prisma = getPrisma();
  const [all, storeReferral, partner, topPartners, topStores] = await Promise.all([
    getGrowthClickStats(),
    getGrowthClickStats({ sourceType: "STORE_REFERRAL" }),
    getGrowthClickStats({ sourceType: "PARTNER" }),
    prisma.growthLinkClick.groupBy({
      by: ["partnerId"],
      where: { sourceType: "PARTNER", partnerId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { partnerId: "desc" } },
      take: 1,
    }),
    prisma.growthLinkClick.groupBy({
      by: ["referrerStoreId"],
      where: { sourceType: "STORE_REFERRAL", referrerStoreId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { referrerStoreId: "desc" } },
      take: 1,
    }),
  ]);

  const [topPartner, topStore] = await Promise.all([
    topPartners[0]?.partnerId
      ? prisma.partner.findUnique({
          where: { id: topPartners[0].partnerId },
          select: { name: true, code: true },
        })
      : Promise.resolve(null),
    topStores[0]?.referrerStoreId
      ? prisma.store.findUnique({
          where: { id: topStores[0].referrerStoreId },
          select: { name: true, slug: true },
        })
      : Promise.resolve(null),
  ]);

  return {
    all,
    storeReferral,
    partner,
    topPartner: topPartner && topPartners[0] ? { ...topPartner, clicks: topPartners[0]._count._all } : null,
    topStore: topStore && topStores[0] ? { ...topStore, clicks: topStores[0]._count._all } : null,
  };
}
