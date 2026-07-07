import { headers } from "next/headers";
import { cookies } from "next/headers";
import type { AnalyticsEventType } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { analyticsEventNameForLegacyType } from "@/lib/tracking/events";
import { trackingCookieNames, normalizeTrackingId } from "@/lib/tracking/ids";
import { hashTrackingIp, trackInternalEvent } from "@/lib/tracking/track";

function hashIp(ip: string | null) {
  if (!ip) return null;
  return hashTrackingIp(ip);
}

async function getRequestTrackingIds() {
  try {
    const cookieStore = await cookies();
    const visitorId =
      normalizeTrackingId(cookieStore.get(trackingCookieNames.visitorId)?.value) ??
      normalizeTrackingId(cookieStore.get(trackingCookieNames.legacyVisitorSession)?.value);
    const journeyId = normalizeTrackingId(cookieStore.get(trackingCookieNames.journeyId)?.value);
    return { visitorId, journeyId };
  } catch {
    return { visitorId: null, journeyId: null };
  }
}

export async function trackEvent(type: AnalyticsEventType, storeId: string, productId?: string) {
  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = headerStore.get("user-agent");
  const referrer = headerStore.get("referer") ?? headerStore.get("referrer");
  const path = headerStore.get("x-invoke-path") ?? headerStore.get("next-url");
  const trackingIds = await getRequestTrackingIds();

  await getPrisma().analyticsEvent.create({
    data: {
      type,
      storeId,
      productId,
      ipHash: hashIp(forwarded),
      userAgent,
    },
  });

  await trackInternalEvent({
    scope: "STORE",
    eventName: analyticsEventNameForLegacyType(type),
    storeId,
    productId,
    visitorId: trackingIds.visitorId,
    journeyId: trackingIds.journeyId,
    source: "legacy_analytics",
    path,
    referrer,
    userAgent,
    ip: forwarded,
    metadata: { legacyType: type },
  });
}
