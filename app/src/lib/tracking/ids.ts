import { randomUUID } from "crypto";

export const trackingCookieNames = {
  visitorId: "jakawi_visitor_id",
  legacyVisitorSession: "jakawi_visitor_session",
  journeyId: "jakawi_journey_id",
} as const;

export const visitorCookieMaxAgeSeconds = 60 * 60 * 24 * 365;
export const journeyCookieMaxAgeSeconds = 60 * 60 * 24 * 30;

export type TrackingCookieOptions = {
  httpOnly: boolean;
  sameSite: "lax";
  secure: boolean;
  path: "/";
  maxAge: number;
};

export type TrackingCookieStore = {
  get: (name: string) => { value?: string } | string | undefined;
  set?: (name: string, value: string, options: TrackingCookieOptions) => void;
};

const trackingIdPattern = /^jkw_(visitor|journey)_[a-z0-9]{6,20}_[a-z0-9-]{12,80}$/;

function randomTrackingSuffix() {
  return randomUUID().replace(/-/g, "");
}

export function createTrackingEventId(prefix = "evt") {
  return `jkw_${prefix}_${Date.now().toString(36)}_${randomTrackingSuffix()}`;
}

export function createVisitorId() {
  return `jkw_visitor_${Date.now().toString(36)}_${randomTrackingSuffix()}`;
}

export function createJourneyId() {
  return `jkw_journey_${Date.now().toString(36)}_${randomTrackingSuffix()}`;
}

export function normalizeTrackingId(value: string | null | undefined) {
  const clean = value?.trim();
  if (!clean || clean.length > 160) return null;
  if (trackingIdPattern.test(clean)) return clean;
  if (/^jkw_[a-z0-9]+_[a-z0-9]{8,80}$/i.test(clean)) return clean;
  return null;
}

export function getTrackingCookieOptions(maxAge: number): TrackingCookieOptions {
  return {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

function readCookie(store: TrackingCookieStore | undefined, name: string) {
  const value = store?.get(name);
  return typeof value === "string" ? value : value?.value;
}

export function getOrCreateVisitorId(store?: TrackingCookieStore) {
  const existing =
    normalizeTrackingId(readCookie(store, trackingCookieNames.visitorId)) ??
    normalizeTrackingId(readCookie(store, trackingCookieNames.legacyVisitorSession));
  if (existing) {
    store?.set?.(trackingCookieNames.visitorId, existing, getTrackingCookieOptions(visitorCookieMaxAgeSeconds));
    return existing;
  }

  const visitorId = createVisitorId();
  store?.set?.(trackingCookieNames.visitorId, visitorId, getTrackingCookieOptions(visitorCookieMaxAgeSeconds));
  return visitorId;
}

export function getOrCreateJourneyId(store?: TrackingCookieStore) {
  const existing = normalizeTrackingId(readCookie(store, trackingCookieNames.journeyId));
  if (existing) {
    store?.set?.(trackingCookieNames.journeyId, existing, getTrackingCookieOptions(journeyCookieMaxAgeSeconds));
    return existing;
  }

  const journeyId = createJourneyId();
  store?.set?.(trackingCookieNames.journeyId, journeyId, getTrackingCookieOptions(journeyCookieMaxAgeSeconds));
  return journeyId;
}
