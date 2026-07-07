import { NextRequest, NextResponse } from "next/server";
import { getVisitorInfoFromHeaders } from "@/lib/visitor";
import { getOrCreateJourneyId, getOrCreateVisitorId, type TrackingCookieOptions } from "@/lib/tracking/ids";

export function GET(request: NextRequest) {
  const visitor = getVisitorInfoFromHeaders(request.headers);
  const cookieWrites: Array<{ name: string; value: string; options: TrackingCookieOptions }> = [];
  const cookieStore = {
    get: (name: string) => request.cookies.get(name),
    set: (name: string, value: string, options: TrackingCookieOptions) => {
      cookieWrites.push({ name, value, options });
    },
  };
  const visitorId = getOrCreateVisitorId(cookieStore);
  const journeyId = getOrCreateJourneyId(cookieStore);

  const response = NextResponse.json({
    country_code: visitor.countryCode,
    country_name: visitor.countryName,
    city: visitor.city,
    region: visitor.region,
    ipDetected: Boolean(visitor.ip),
    visitorId,
    journeyId,
  });
  cookieWrites.forEach(({ name, value, options }) => response.cookies.set(name, value, options));

  return response;
}
