export type TrackingConsent = {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
};

export const defaultTrackingConsent: TrackingConsent = {
  necessary: true,
  analytics: true,
  marketing: false,
};

export const trackingConsentCookieName = "jakawi_tracking_consent";

function parseBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

export function parseConsent(value?: string | null | Partial<TrackingConsent>): TrackingConsent {
  if (!value) return defaultTrackingConsent;
  if (typeof value === "object") {
    return {
      necessary: parseBoolean(value.necessary, defaultTrackingConsent.necessary),
      analytics: parseBoolean(value.analytics, defaultTrackingConsent.analytics),
      marketing: parseBoolean(value.marketing, defaultTrackingConsent.marketing),
    };
  }

  try {
    const parsed = JSON.parse(value) as Partial<TrackingConsent>;
    return parseConsent(parsed);
  } catch {
    return defaultTrackingConsent;
  }
}

export function canTrackAnalytics(consent: TrackingConsent = defaultTrackingConsent) {
  return consent.necessary && consent.analytics;
}

export function canTrackMarketing(consent: TrackingConsent = defaultTrackingConsent) {
  return consent.necessary && consent.marketing;
}
