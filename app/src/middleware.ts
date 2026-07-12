import { NextResponse, type NextRequest } from "next/server";
import {
  cookieConsentRegionOverrideCookieName,
  cookieConsentRegionRequestHeaderName,
  isCookieConsentRegionOverrideEnabled,
  normalizeCookieConsentCountryCode,
} from "@/lib/tracking/consent";

const cookieRegionOverrideMaxAgeSeconds = 60 * 60 * 2;

function nextWithCookieRegionOverride(request: NextRequest) {
  if (!isCookieConsentRegionOverrideEnabled()) return NextResponse.next();

  const overrideCountry = normalizeCookieConsentCountryCode(request.nextUrl.searchParams.get("cookieRegion"));
  if (!overrideCountry) return NextResponse.next();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(cookieConsentRegionRequestHeaderName, overrideCountry);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.cookies.set(cookieConsentRegionOverrideCookieName, overrideCountry, {
    path: "/",
    maxAge: cookieRegionOverrideMaxAgeSeconds,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":", 1)[0]?.toLowerCase() ?? "";
  if (!host.startsWith("www.") || host === "www.jakawi.com") return nextWithCookieRegionOverride(request);

  const lookupUrl = new URL("/api/custom-domain-canonical-redirect", request.url);
  lookupUrl.searchParams.set("host", host);

  try {
    const response = await fetch(lookupUrl, { cache: "no-store" });
    if (!response.ok) return nextWithCookieRegionOverride(request);
    const payload = (await response.json()) as { redirect?: boolean; canonicalHost?: string };
    if (!payload.redirect || !payload.canonicalHost) return nextWithCookieRegionOverride(request);

    const redirectUrl = new URL(request.url);
    redirectUrl.protocol = "https:";
    redirectUrl.hostname = payload.canonicalHost;
    return NextResponse.redirect(redirectUrl, 301);
  } catch {
    return nextWithCookieRegionOverride(request);
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
