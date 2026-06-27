import { NextRequest, NextResponse } from "next/server";
import { getVisitorInfoFromHeaders } from "@/lib/visitor";

export function GET(request: NextRequest) {
  const visitor = getVisitorInfoFromHeaders(request.headers);

  return NextResponse.json({
    country_code: visitor.countryCode,
    country_name: visitor.countryName,
    city: visitor.city,
    region: visitor.region,
    ipDetected: Boolean(visitor.ip),
  });
}
