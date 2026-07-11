import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":", 1)[0]?.toLowerCase() ?? "";
  if (!host.startsWith("www.") || host === "www.jakawi.com") return NextResponse.next();

  const lookupUrl = new URL("/api/custom-domain-canonical-redirect", request.url);
  lookupUrl.searchParams.set("host", host);

  try {
    const response = await fetch(lookupUrl, { cache: "no-store" });
    if (!response.ok) return NextResponse.next();
    const payload = (await response.json()) as { redirect?: boolean; canonicalHost?: string };
    if (!payload.redirect || !payload.canonicalHost) return NextResponse.next();

    const redirectUrl = new URL(request.url);
    redirectUrl.protocol = "https:";
    redirectUrl.hostname = payload.canonicalHost;
    return NextResponse.redirect(redirectUrl, 301);
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
