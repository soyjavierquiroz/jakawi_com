import { NextRequest, NextResponse } from "next/server";
import { siteConfig } from "@/config/site";
import { acquisitionCookieNames, getReferralCookieOptions } from "@/lib/acquisition/cookies";
import { normalizePartnerCode, normalizePartnerDestinationSlug } from "@/lib/acquisition/partners";
import { getRequestTrackingMetadata, recordGrowthLinkClick } from "@/lib/growth-link-clicks";
import { getPrisma } from "@/lib/prisma";

function registrationRedirect(request: NextRequest) {
  return NextResponse.redirect(new URL(siteConfig.routes.register, siteConfig.appUrl || request.url));
}

function redirectToTarget(targetUrl: string, request: NextRequest) {
  return NextResponse.redirect(new URL(targetUrl, siteConfig.appUrl || request.url));
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string; destinationSlug: string }> }) {
  const { code, destinationSlug } = await params;
  const normalizedCode = normalizePartnerCode(code);
  const normalizedDestinationSlug = normalizePartnerDestinationSlug(destinationSlug);

  if (!normalizedCode || !normalizedDestinationSlug) return registrationRedirect(request);

  const partner = await getPrisma().partner.findFirst({
    where: { code: normalizedCode, status: "ACTIVE" },
    select: {
      id: true,
      code: true,
      destinations: {
        where: { slug: normalizedDestinationSlug, status: "ACTIVE" },
        select: { id: true, slug: true, targetUrl: true },
        take: 1,
      },
    },
  });
  const destination = partner?.destinations[0];

  if (!partner || !destination) return registrationRedirect(request);

  const response = redirectToTarget(destination.targetUrl, request);
  const landingPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  await recordGrowthLinkClick({
    sourceType: "PARTNER",
    partnerId: partner.id,
    partnerDestinationId: destination.id,
    destinationSlug: destination.slug,
    code: partner.code,
    landingPath,
    targetUrl: destination.targetUrl,
    metadata: getRequestTrackingMetadata(request),
  });

  const options = getReferralCookieOptions();
  response.cookies.set(acquisitionCookieNames.source, "PARTNER", options);
  response.cookies.set(acquisitionCookieNames.partnerId, partner.id, options);
  response.cookies.set(acquisitionCookieNames.partnerDestination, destination.slug, options);
  response.cookies.set(acquisitionCookieNames.partnerDestinationId, destination.id, options);
  response.cookies.set(acquisitionCookieNames.referralCode, partner.code, options);
  response.cookies.set(acquisitionCookieNames.landingPath, landingPath, options);

  return response;
}
