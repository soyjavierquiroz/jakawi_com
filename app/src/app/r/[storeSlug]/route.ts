import { NextRequest, NextResponse } from "next/server";
import { siteConfig } from "@/config/site";
import { acquisitionCookieNames, getReferralCookieOptions } from "@/lib/acquisition/cookies";
import { getRequestTrackingMetadata, recordGrowthLinkClick } from "@/lib/growth-link-clicks";
import { getPrisma } from "@/lib/prisma";

function registrationRedirect(request: NextRequest) {
  return NextResponse.redirect(new URL(siteConfig.routes.register, siteConfig.appUrl || request.url));
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;
  const store = await getPrisma().store.findUnique({
    where: { slug: storeSlug },
    select: { id: true, slug: true },
  });

  const response = registrationRedirect(request);
  if (!store) return response;

  const landingPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  await recordGrowthLinkClick({
    sourceType: "STORE_REFERRAL",
    referrerStoreId: store.id,
    code: store.slug,
    landingPath,
    targetUrl: siteConfig.routes.register,
    metadata: getRequestTrackingMetadata(request),
  });

  const options = getReferralCookieOptions();
  response.cookies.set(acquisitionCookieNames.source, "STORE_REFERRAL", options);
  response.cookies.set(acquisitionCookieNames.referrerStoreId, store.id, options);
  response.cookies.set(acquisitionCookieNames.referralCode, store.slug, options);
  response.cookies.set(acquisitionCookieNames.landingPath, landingPath, options);

  return response;
}
