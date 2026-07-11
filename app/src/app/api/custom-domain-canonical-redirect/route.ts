import { NextResponse } from "next/server";
import { normalizeCanonicalCustomDomainInput } from "@/lib/custom-domains";
import { isJakawiPlatformHost, normalizeHostname } from "@/lib/domains";
import { getPrisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const host = normalizeHostname(url.searchParams.get("host"));
  if (!host.startsWith("www.") || isJakawiPlatformHost(host)) {
    return NextResponse.json({ redirect: false });
  }

  const { canonicalHost } = normalizeCanonicalCustomDomainInput(host);
  const domain = await getPrisma().storeDomain.findFirst({
    where: {
      hostname: canonicalHost,
      status: "ACTIVE",
      type: "CUSTOM_DOMAIN",
      store: { isPublished: true },
    },
    select: { hostname: true },
  });

  if (!domain) return NextResponse.json({ redirect: false });

  return NextResponse.json({
    redirect: true,
    canonicalHost: domain.hostname,
  });
}
