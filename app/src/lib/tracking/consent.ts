export type TrackingConsent = {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  source?: "manual" | "region_default";
  regionMode?: CookieConsentRegionMode;
  updatedAt?: string;
};

export type CookieConsentRegionMode = "strict" | "default_all";

export const trackingConsentCookieName = "jakawi_tracking_consent";
export const cookieConsentRegionOverrideCookieName = "jakawi_cookie_region";
export const cookieConsentRegionRequestHeaderName = "x-jakawi-cookie-region";

const strictCookieConsentCountries = new Set([
  "AT",
  "BE",
  "BG",
  "CA",
  "CH",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "ES",
  "FI",
  "FR",
  "GB",
  "GR",
  "HR",
  "HU",
  "IE",
  "IS",
  "IT",
  "LI",
  "LT",
  "LU",
  "LV",
  "MT",
  "NL",
  "NO",
  "PL",
  "PT",
  "RO",
  "SE",
  "SI",
  "SK",
  "US",
]);

type HeaderReader = {
  get: (name: string) => string | null;
};

type CookieReader = {
  get: (name: string) => { value: string } | string | undefined;
};

type CookieConsentRegionRequest = {
  headers?: HeaderReader;
  cookies?: CookieReader;
  searchParams?: URLSearchParams | Record<string, string | string[] | undefined>;
  env?: Record<string, string | undefined>;
};

function parseRegionMode(value: unknown): CookieConsentRegionMode | null {
  return value === "strict" || value === "default_all" ? value : null;
}

export function normalizeCookieConsentCountryCode(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return null;
  if (normalized === "XX" || normalized === "T1") return null;
  return normalized;
}

function readHeader(headers: HeaderReader | undefined, name: string) {
  try {
    return headers?.get(name) ?? null;
  } catch {
    return null;
  }
}

function readCookie(cookies: CookieReader | undefined, name: string) {
  try {
    const value = cookies?.get(name);
    if (typeof value === "string") return value;
    return value?.value ?? null;
  } catch {
    return null;
  }
}

function readSearchParam(searchParams: CookieConsentRegionRequest["searchParams"], name: string) {
  if (!searchParams) return null;
  if (searchParams instanceof URLSearchParams) return searchParams.get(name);
  const value = searchParams[name];
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

export function isCookieConsentRegionOverrideEnabled(env: Record<string, string | undefined> = process.env) {
  return env.NODE_ENV !== "production" || env.COOKIE_CONSENT_QA_REGION_OVERRIDE_ENABLED === "true";
}

export function getCookieConsentRegionMode(request: CookieConsentRegionRequest = {}): CookieConsentRegionMode {
  const env = request.env ?? process.env;
  const overrideEnabled = isCookieConsentRegionOverrideEnabled(env);
  const overrideCountry = overrideEnabled
    ? normalizeCookieConsentCountryCode(
        readHeader(request.headers, cookieConsentRegionRequestHeaderName) ??
          readSearchParam(request.searchParams, "cookieRegion") ??
          readCookie(request.cookies, cookieConsentRegionOverrideCookieName),
      )
    : null;
  const country = overrideCountry ?? normalizeCookieConsentCountryCode(readHeader(request.headers, "cf-ipcountry"));

  if (country) return strictCookieConsentCountries.has(country) ? "strict" : "default_all";

  return parseRegionMode(env.COOKIE_CONSENT_UNKNOWN_REGION_MODE) ?? "strict";
}

export function getDefaultConsent(): TrackingConsent {
  return {
    necessary: true,
    analytics: false,
    marketing: false,
  };
}

export const defaultTrackingConsent: TrackingConsent = getDefaultConsent();

export const necessaryOnlyTrackingConsent: TrackingConsent = {
  necessary: true,
  analytics: false,
  marketing: false,
};

export const defaultAllTrackingConsent: TrackingConsent = {
  necessary: true,
  analytics: true,
  marketing: true,
  source: "region_default",
  regionMode: "default_all",
};

export function getDefaultConsentForRegionMode(regionMode: CookieConsentRegionMode = "strict"): TrackingConsent {
  return regionMode === "default_all" ? { ...defaultAllTrackingConsent } : getDefaultConsent();
}

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

function normalizeConsent(value: Partial<TrackingConsent> | null | undefined, regionMode: CookieConsentRegionMode = "strict"): TrackingConsent {
  const defaultConsent = getDefaultConsentForRegionMode(regionMode);
  const normalizedRegionMode = parseRegionMode(value?.regionMode);
  return {
    necessary: true,
    analytics: parseBoolean(value?.analytics, defaultConsent.analytics),
    marketing: parseBoolean(value?.marketing, defaultConsent.marketing),
    ...(value?.source === "manual" || value?.source === "region_default" ? { source: value.source } : {}),
    ...(normalizedRegionMode ? { regionMode: normalizedRegionMode } : {}),
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
    if (parsed.source !== undefined && parsed.source !== "manual" && parsed.source !== "region_default") return null;
    const parsedRegionMode = parseRegionMode(parsed.regionMode);
    if (parsed.regionMode !== undefined && !parsedRegionMode) return null;
    return {
      necessary: true,
      analytics: parsed.analytics,
      marketing: parsed.marketing,
      ...(parsed.source === "manual" || parsed.source === "region_default" ? { source: parsed.source } : {}),
      ...(parsedRegionMode ? { regionMode: parsedRegionMode } : {}),
      ...(typeof parsed.updatedAt === "string" ? { updatedAt: parsed.updatedAt } : {}),
    };
  } catch {
    return null;
  }
}

export function parseConsent(value?: string | null | Partial<TrackingConsent>, options: { regionMode?: CookieConsentRegionMode } = {}): TrackingConsent {
  const regionMode = options.regionMode ?? "strict";
  if (!value) return getDefaultConsentForRegionMode(regionMode);
  if (typeof value === "object") return normalizeConsent(value, regionMode);
  return parseTrackingConsentCookie(value) ?? getDefaultConsentForRegionMode(regionMode);
}

export function shouldOpenConsentBanner(regionMode: CookieConsentRegionMode, storedConsent: TrackingConsent | null) {
  return regionMode === "strict" && !storedConsent;
}

export function serializeTrackingConsent(consent: Partial<TrackingConsent>, updatedAt: Date = new Date()) {
  return JSON.stringify({
    necessary: true,
    analytics: parseBoolean(consent.analytics, defaultTrackingConsent.analytics),
    marketing: parseBoolean(consent.marketing, defaultTrackingConsent.marketing),
    ...(consent.source === "manual" || consent.source === "region_default" ? { source: consent.source } : {}),
    ...(parseRegionMode(consent.regionMode) ? { regionMode: consent.regionMode } : {}),
    updatedAt: updatedAt.toISOString(),
  });
}

export function canTrackAnalytics(consent: TrackingConsent = getDefaultConsent()) {
  return consent.necessary && consent.analytics;
}

export function canTrackMarketing(consent: TrackingConsent = getDefaultConsent()) {
  return consent.necessary && consent.marketing;
}
