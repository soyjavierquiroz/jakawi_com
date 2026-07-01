import { notFound } from "next/navigation";
import { getPartnerDestinationReferralLink, getPartnerReferralLink } from "@/lib/acquisition/partners";
import { isSuperAdmin } from "@/lib/admin";
import { requireUser } from "@/lib/auth";
import {
  emptyGrowthConversionSummary,
  getGrowthConversionStatsByPartnerDestination,
  getPartnerConversionSummary,
  getPartnerMainLinkConversionSummary,
} from "@/lib/growth-conversion-metrics";
import { getPartnerCommissionStats } from "@/lib/partner-commissions";
import { getPrisma } from "@/lib/prisma";

export async function getCurrentUserPartnerPortal(partnerId?: string | null) {
  const user = await requireUser();
  const prisma = getPrisma();

  if (isSuperAdmin(user) && partnerId) {
    const partner = await prisma.partner.findUnique({ where: { id: partnerId } });
    if (!partner) notFound();
    return { user, partner, isSuperAdminView: true };
  }

  const partner = await prisma.partner.findFirst({ where: { portalUserId: user.id } });
  return { user, partner, isSuperAdminView: false };
}

export async function getPartnerPortalSummary(partnerId: string) {
  const [attributions, commissionStats, conversionStats] = await Promise.all([
    getPrisma().acquisitionAttribution.findMany({
      where: { partnerId },
      select: {
        status: true,
        store: { select: { plan: true, planStatus: true } },
      },
      take: 500,
    }),
    getPartnerCommissionStats(partnerId),
    getPartnerConversionSummary(partnerId),
  ]);

  const registeredStores = attributions.length;
  const activeStores = attributions.filter((attribution) => {
    return ["ACTIVE", "PAID"].includes(attribution.status) || ["ACTIVE", "TRIALING"].includes(attribution.store.planStatus);
  }).length;
  const paidStores = attributions.filter((attribution) => {
    return attribution.status === "PAID" || (attribution.store.plan !== "TRIAL" && attribution.store.planStatus === "ACTIVE");
  }).length;

  return {
    registeredStores,
    activeStores,
    paidStores,
    commissionStats,
    conversionStats,
  };
}

export async function getPartnerPortalLinks(partnerId: string) {
  const partner = await getPrisma().partner.findUnique({
    where: { id: partnerId },
    include: {
      destinations: {
        where: { status: "ACTIVE" },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!partner) notFound();
  const destinationRefs = partner.destinations.map((destination) => ({
    id: destination.id,
    partnerId: partner.id,
    slug: destination.slug,
  }));
  const [mainConversionStats, conversionStatsByDestination] = await Promise.all([
    getPartnerMainLinkConversionSummary(partnerId, partner.code),
    getGrowthConversionStatsByPartnerDestination(destinationRefs),
  ]);

  return {
    mainLink: getPartnerReferralLink(partner.code),
    mainConversionStats,
    destinations: partner.destinations.map((destination) => ({
      ...destination,
      trackedLink: getPartnerDestinationReferralLink(partner.code, destination.slug),
      conversionStats: conversionStatsByDestination.get(destination.id) ?? emptyGrowthConversionSummary(),
    })),
  };
}

export async function getPartnerPortalAttributions(partnerId: string) {
  return getPrisma().acquisitionAttribution.findMany({
    where: { partnerId },
    include: {
      store: { include: { owner: { select: { email: true } } } },
      partnerDestination: true,
    },
    orderBy: { createdAt: "desc" },
    take: 250,
  });
}

export async function getPartnerPortalCommissions(partnerId: string) {
  return getPrisma().partnerCommission.findMany({
    where: { partnerId },
    include: {
      store: { select: { name: true, slug: true } },
      attribution: { include: { store: { select: { name: true, slug: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 250,
  });
}
