import { NextRequest, NextResponse } from "next/server";
import { siteConfig } from "@/config/site";
import { acquisitionCookieNames, getReferralCookieOptions } from "@/lib/acquisition/cookies";
import { normalizePartnerCode } from "@/lib/acquisition/partners";
import { getPrisma } from "@/lib/prisma";

function registrationRedirect(request: NextRequest) {
  return NextResponse.redirect(new URL(siteConfig.routes.register, siteConfig.appUrl || request.url));
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const normalizedCode = normalizePartnerCode(code);
  const partner = normalizedCode
    ? await getPrisma().partner.findFirst({
        where: { code: normalizedCode, status: "ACTIVE" },
        select: { id: true, code: true },
      })
    : null;

  const response = registrationRedirect(request);
  if (!partner) return response;

  const landingPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const options = getReferralCookieOptions();
  response.cookies.set(acquisitionCookieNames.source, "PARTNER", options);
  response.cookies.set(acquisitionCookieNames.partnerId, partner.id, options);
  response.cookies.set(acquisitionCookieNames.referralCode, partner.code, options);
  response.cookies.set(acquisitionCookieNames.landingPath, landingPath, options);

  return response;
}
