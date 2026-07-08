export type TrackingConsent = {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  updatedAt?: string;
};

export const trackingConsentCookieName = "jakawi_tracking_consent";

export function getDefaultConsent(): TrackingConsent {
  return {
    necessary: true,
    analytics: true,
    marketing: false,
  };
}

export const defaultTrackingConsent: TrackingConsent = getDefaultConsent();

export const necessaryOnlyTrackingConsent: TrackingConsent = {
  necessary: true,
  analytics: false,
  marketing: false,
};

function parseBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function isTrackingConsentObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeConsent(value: Partial<TrackingConsent> | null | undefined): TrackingConsent {
  return {
    necessary: true,
    analytics: parseBoolean(value?.analytics, defaultTrackingConsent.analytics),
    marketing: parseBoolean(value?.marketing, defaultTrackingConsent.marketing),
    ...(typeof value?.updatedAt === "string" ? { updatedAt: value.updatedAt } : {}),
  };
}

export function parseTrackingConsentCookie(value?: string | null): TrackingConsent | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!isTrackingConsentObject(parsed)) return null;
    if (parsed.necessary !== true) return null;
    if (typeof parsed.analytics !== "boolean" || typeof parsed.marketing !== "boolean") return null;
    if (parsed.updatedAt !== undefined && typeof parsed.updatedAt !== "string") return null;
    return {
      necessary: true,
      analytics: parsed.analytics,
      marketing: parsed.marketing,
      ...(typeof parsed.updatedAt === "string" ? { updatedAt: parsed.updatedAt } : {}),
    };
  } catch {
    return null;
  }
}

export function parseConsent(value?: string | null | Partial<TrackingConsent>): TrackingConsent {
  if (!value) return getDefaultConsent();
  if (typeof value === "object") return normalizeConsent(value);
  return parseTrackingConsentCookie(value) ?? getDefaultConsent();
}

export function serializeTrackingConsent(consent: Partial<TrackingConsent>, updatedAt: Date = new Date()) {
  return JSON.stringify({
    necessary: true,
    analytics: parseBoolean(consent.analytics, defaultTrackingConsent.analytics),
    marketing: parseBoolean(consent.marketing, defaultTrackingConsent.marketing),
    updatedAt: updatedAt.toISOString(),
  });
}

export function canTrackAnalytics(consent: TrackingConsent = getDefaultConsent()) {
  return consent.necessary && consent.analytics;
}

export function canTrackMarketing(consent: TrackingConsent = getDefaultConsent()) {
  return consent.necessary && consent.marketing;
}
