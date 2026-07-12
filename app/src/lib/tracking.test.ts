import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canTrackAnalytics,
  canTrackMarketing,
  defaultTrackingConsent,
  getCookieConsentRegionMode,
  necessaryOnlyTrackingConsent,
  parseConsent,
  parseTrackingConsentCookie,
  serializeTrackingConsent,
  shouldOpenConsentBanner,
  trackingConsentCookieName,
} from "@/lib/tracking/consent";
import { analyticsEventNameForLegacyType, isEventAllowedForScope } from "@/lib/tracking/events";
import { createTrackingEventId, createVisitorId, getOrCreateJourneyId, getOrCreateVisitorId, trackingCookieNames } from "@/lib/tracking/ids";
import { trackInternalEvent } from "@/lib/tracking/track";

function createMockDb(options: { duplicate?: boolean } = {}) {
  const writes: unknown[] = [];
  return {
    writes,
    db: {
      trackingEvent: {
        async create(args: { data: unknown }) {
          writes.push(args.data);
          if (options.duplicate) throw { code: "P2002" };
          return args.data;
        },
      },
    },
  };
}

function headersForCountry(country: string | null) {
  return {
    get(name: string) {
      if (name.toLowerCase() === "cf-ipcountry") return country;
      return null;
    },
  };
}

function cookiesFrom(values: Record<string, string>) {
  return {
    get(name: string) {
      const value = values[name];
      return value ? { value } : undefined;
    },
  };
}

test("tracking event id is generated with an internal prefix", () => {
  const eventId = createTrackingEventId();
  assert.match(eventId, /^jkw_evt_[a-z0-9]+_[a-f0-9]{32}$/);
});

test("visitor and journey ids are stable when cookies already exist", () => {
  const visitorId = createVisitorId();
  const cookieStore = new Map<string, string>([[trackingCookieNames.visitorId, visitorId]]);
  const writes: Array<{ name: string; value: string }> = [];
  const store = {
    get: (name: string) => cookieStore.get(name),
    set: (name: string, value: string) => writes.push({ name, value }),
  };

  assert.equal(getOrCreateVisitorId(store), visitorId);
  assert.equal(writes[0]?.name, trackingCookieNames.visitorId);
  assert.equal(writes[0]?.value, visitorId);

  const journeyId = getOrCreateJourneyId(store);
  assert.match(journeyId, /^jkw_journey_/);
});

test("strict consent is necessary-only by default", () => {
  assert.equal(defaultTrackingConsent.necessary, true);
  assert.equal(defaultTrackingConsent.analytics, false);
  assert.equal(defaultTrackingConsent.marketing, false);
  assert.equal(canTrackAnalytics(), false);
  assert.equal(canTrackMarketing(), false);
  assert.deepEqual(parseConsent('{"necessary":true,"analytics":true,"marketing":true}'), {
    necessary: true,
    analytics: true,
    marketing: true,
  });
});

test("invalid consent cookie falls back to default consent", () => {
  assert.equal(parseTrackingConsentCookie("not-json"), null);
  assert.equal(parseTrackingConsentCookie('{"necessary":false,"analytics":true,"marketing":true}'), null);
  assert.deepEqual(parseConsent("not-json"), defaultTrackingConsent);
  assert.equal(canTrackAnalytics(parseConsent("not-json")), false);
  assert.equal(canTrackMarketing(parseConsent("not-json")), false);
});

test("LATAM countries default to all consent without opening the banner", () => {
  for (const country of ["CO", "MX"]) {
    const regionMode = getCookieConsentRegionMode({ headers: headersForCountry(country), env: { NODE_ENV: "production" } });
    const consent = parseConsent(null, { regionMode });

    assert.equal(regionMode, "default_all");
    assert.equal(shouldOpenConsentBanner(regionMode, null), false);
    assert.equal(consent.analytics, true);
    assert.equal(consent.marketing, true);
    assert.equal(consent.source, "region_default");
    assert.equal(consent.regionMode, "default_all");
  }
});

test("strict countries require consent before analytics or marketing", () => {
  for (const country of ["US", "ES", "GB"]) {
    const regionMode = getCookieConsentRegionMode({ headers: headersForCountry(country), env: { NODE_ENV: "production" } });
    const consent = parseConsent(null, { regionMode });

    assert.equal(regionMode, "strict");
    assert.equal(shouldOpenConsentBanner(regionMode, null), true);
    assert.equal(consent.analytics, false);
    assert.equal(consent.marketing, false);
  }
});

test("unknown country falls back to strict by default", () => {
  const regionMode = getCookieConsentRegionMode({ headers: headersForCountry("XX"), env: { NODE_ENV: "production" } });
  const consent = parseConsent(null, { regionMode });

  assert.equal(regionMode, "strict");
  assert.equal(consent.analytics, false);
  assert.equal(consent.marketing, false);
});

test("QA cookieRegion override is gated by environment", () => {
  assert.equal(
    getCookieConsentRegionMode({
      headers: headersForCountry("CO"),
      searchParams: new URLSearchParams("cookieRegion=US"),
      env: { NODE_ENV: "development" },
    }),
    "strict",
  );
  assert.equal(
    getCookieConsentRegionMode({
      headers: headersForCountry("US"),
      searchParams: new URLSearchParams("cookieRegion=CO"),
      env: { NODE_ENV: "production" },
    }),
    "strict",
  );
  assert.equal(
    getCookieConsentRegionMode({
      headers: headersForCountry("US"),
      searchParams: new URLSearchParams("cookieRegion=CO"),
      env: { NODE_ENV: "production", COOKIE_CONSENT_QA_REGION_OVERRIDE_ENABLED: "true" },
    }),
    "default_all",
  );
});

test("manual user preferences are respected in default_all regions", () => {
  const manualConsent = serializeTrackingConsent(
    { necessary: true, analytics: false, marketing: false, source: "manual", regionMode: "default_all" },
    new Date("2026-07-08T00:00:00.000Z"),
  );
  const regionMode = getCookieConsentRegionMode({
    headers: headersForCountry("CO"),
    cookies: cookiesFrom({ [trackingConsentCookieName]: manualConsent }),
    env: { NODE_ENV: "production" },
  });
  const consent = parseConsent(manualConsent, { regionMode });

  assert.equal(regionMode, "default_all");
  assert.equal(shouldOpenConsentBanner(regionMode, consent), false);
  assert.equal(consent.analytics, false);
  assert.equal(consent.marketing, false);
  assert.equal(consent.source, "manual");
});

test("accept all consent serializes marketing=true", () => {
  const value = serializeTrackingConsent(
    { necessary: true, analytics: true, marketing: true },
    new Date("2026-07-08T00:00:00.000Z"),
  );

  assert.deepEqual(parseTrackingConsentCookie(value), {
    necessary: true,
    analytics: true,
    marketing: true,
    updatedAt: "2026-07-08T00:00:00.000Z",
  });
});

test("necessary-only consent serializes analytics=false and marketing=false", () => {
  const value = serializeTrackingConsent(necessaryOnlyTrackingConsent, new Date("2026-07-08T00:00:00.000Z"));

  assert.deepEqual(parseTrackingConsentCookie(value), {
    necessary: true,
    analytics: false,
    marketing: false,
    updatedAt: "2026-07-08T00:00:00.000Z",
  });
});

test("STORE scope does not allow platform events", () => {
  assert.equal(isEventAllowedForScope("STORE", "store_view"), true);
  assert.equal(isEventAllowedForScope("STORE", "jakawi_landing_view"), false);
  assert.equal(isEventAllowedForScope("PLATFORM", "jakawi_landing_view"), true);
});

test("trackInternalEvent writes STORE events without external APIs", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() => {
    throw new Error("external fetch should not be called");
  }) as typeof fetch;
  const { db, writes } = createMockDb();

  try {
    const result = await trackInternalEvent(
      {
        scope: "STORE",
        eventName: "store_view",
        storeId: "store_1",
        visitorId: "jkw_visitor_mabc123456_abcdefabcdef",
        journeyId: "jkw_journey_mabc123456_abcdefabcdef",
        path: "/demo",
        consent: { marketing: false },
      },
      { db },
    );

    assert.equal(result.ok, true);
    assert.equal(writes.length, 1);
    assert.equal((writes[0] as { scope: string }).scope, "STORE");
    assert.equal((writes[0] as { eventName: string }).eventName, "store_view");
    assert.equal((writes[0] as { consentMarketing: boolean }).consentMarketing, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("legacy store and product analytics map to STORE tracking events", () => {
  assert.equal(analyticsEventNameForLegacyType("STORE_VIEW"), "store_view");
  assert.equal(analyticsEventNameForLegacyType("PRODUCT_VIEW"), "product_view");
});

test("duplicate tracking event ids are handled safely", async () => {
  const { db } = createMockDb({ duplicate: true });
  const result = await trackInternalEvent(
    {
      eventId: "jkw_evt_duplicate",
      scope: "STORE",
      eventName: "product_view",
      storeId: "store_1",
      productId: "product_1",
    },
    { db },
  );

  assert.deepEqual(result, { ok: true, eventId: "jkw_evt_duplicate", duplicate: true });
});
