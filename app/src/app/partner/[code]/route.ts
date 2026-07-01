import { NextRequest, NextResponse } from "next/server";
import { siteConfig } from "@/config/site";
import { acquisitionCookieNames, getReferralCookieOptions } from "@/lib/acquisition/cookies";
import { normalizePartnerCode } from "@/lib/acquisition/partners";
import { getRequestTrackingMetadata, recordGrowthLinkClick } from "@/lib/growth-link-clicks";
import { getPrisma } from "@/lib/prisma";

function redirectToTarget(targetUrl: string, request: NextRequest) {
  return NextResponse.redirect(new URL(targetUrl, siteConfig.appUrl || request.url));
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const normalizedCode = normalizePartnerCode(code);
  const partner = normalizedCode
    ? await getPrisma().partner.findFirst({
        where: { code: normalizedCode, status: "ACTIVE" },
        select: {
          id: true,
          code: true,
          destinations: {
            where: { status: "ACTIVE", isDefault: true },
            select: { id: true, slug: true, targetUrl: true },
            orderBy: { createdAt: "asc" },
            take: 1,
          },
        },
      })
    : null;

  const destination = partner?.destinations[0];
  const response = redirectToTarget(destination?.targetUrl ?? siteConfig.routes.register, request);
  if (!partner) return response;

  const landingPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  await recordGrowthLinkClick({
    sourceType: "PARTNER",
    partnerId: partner.id,
    partnerDestinationId: destination?.id ?? null,
    destinationSlug: destination?.slug ?? null,
    code: partner.code,
    landingPath,
    targetUrl: destination?.targetUrl ?? siteConfig.routes.register,
    metadata: getRequestTrackingMetadata(request),
  });

  const options = getReferralCookieOptions();
  response.cookies.set(acquisitionCookieNames.source, "PARTNER", options);
  response.cookies.set(acquisitionCookieNames.partnerId, partner.id, options);
  if (destination) {
    response.cookies.set(acquisitionCookieNames.partnerDestination, destination.slug, options);
    response.cookies.set(acquisitionCookieNames.partnerDestinationId, destination.id, options);
  }
  response.cookies.set(acquisitionCookieNames.referralCode, partner.code, options);
  response.cookies.set(acquisitionCookieNames.landingPath, landingPath, options);

  return response;
}
