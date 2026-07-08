import { headers } from "next/headers";
import { cookies } from "next/headers";
import { Prisma, type AnalyticsEventType } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { analyticsEventNameForLegacyType } from "@/lib/tracking/events";
import { trackingCookieNames, normalizeTrackingId } from "@/lib/tracking/ids";
import { parseConsent, trackingConsentCookieName, type TrackingConsent } from "@/lib/tracking/consent";
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

async function getRequestTrackingConsent() {
  try {
    const cookieStore = await cookies();
    return parseConsent(cookieStore.get(trackingConsentCookieName)?.value);
  } catch {
    return parseConsent();
  }
}

export async function trackEvent(
  type: AnalyticsEventType,
  storeId: string,
  productId?: string,
  options: { consent?: Partial<TrackingConsent> | string | null; metadata?: Prisma.InputJsonObject } = {},
) {
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

  const consent = options.consent ? parseConsent(options.consent) : await getRequestTrackingConsent();
  const trackingResult = await trackInternalEvent({
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
    consent,
    metadata: { legacyType: type, ...(options.metadata ?? {}) },
  });
  return trackingResult.eventId;
}
