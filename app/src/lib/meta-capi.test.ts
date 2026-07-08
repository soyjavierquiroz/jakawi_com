import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { afterEach, test } from "node:test";
import { Prisma, StorePixelPlatform, StorePixelStatus, TrackingScope } from "@prisma/client";
import { encryptSecret } from "@/lib/crypto/encryption";
import {
  buildMetaCapiEvent,
  getMetaCapiIntegrationForStore,
  isMetaCapiGloballyEnabled,
  sendMetaCapiEvent,
} from "@/lib/pixels/meta-capi";

function encryptionKey() {
  return randomBytes(32).toString("base64");
}

function fakeAccessValue() {
  return `fake-${randomBytes(8).toString("hex")}`;
}

type IntegrationRecord = {
  platform: StorePixelPlatform;
  status: StorePixelStatus;
  pixelId: string | null;
  accessTokenEncrypted: string | null;
  capiEnabled: boolean;
  testEventCode: string | null;
};

type TrackingEventRecord = {
  eventId: string;
  scope: TrackingScope;
  eventName: string;
  storeId: string | null;
  productId: string | null;
  visitorId: string | null;
  journeyId: string | null;
  userAgent: string | null;
  consentMarketing: boolean;
  metadata: Prisma.JsonObject;
  occurredAt: Date;
};

const baseIntegration: IntegrationRecord = {
  platform: StorePixelPlatform.META,
  status: StorePixelStatus.ACTIVE,
  pixelId: "1234567890",
  accessTokenEncrypted: "encrypted-value",
  capiEnabled: true,
  testEventCode: null,
};

const baseTrackingEvent: TrackingEventRecord = {
  eventId: "jkw_evt_meta_1",
  scope: TrackingScope.STORE,
  eventName: "store_view",
  storeId: "store_1",
  productId: null,
  visitorId: "jkw_visitor_1",
  journeyId: "jkw_journey_1",
  userAgent: "Mozilla/5.0",
  consentMarketing: true,
  metadata: {},
  occurredAt: new Date("2026-07-08T00:00:00.000Z"),
};

function createDb(options: {
  trackingEvent?: TrackingEventRecord | null;
  integration?: IntegrationRecord | null;
} = {}) {
  const updates: unknown[] = [];
  const trackingEvent = options.trackingEvent === undefined ? baseTrackingEvent : options.trackingEvent;
  const integration = options.integration === undefined ? baseIntegration : options.integration;

  return {
    updates,
    db: {
      storePixelIntegration: {
        async findFirst() {
          if (
            !integration ||
            integration.platform !== StorePixelPlatform.META ||
            integration.status !== StorePixelStatus.ACTIVE ||
            !integration.capiEnabled ||
            !integration.pixelId ||
            !integration.accessTokenEncrypted
          ) {
            return null;
          }
          return integration;
        },
      },
      trackingEvent: {
        async findUnique() {
          return trackingEvent;
        },
        async update(args: unknown) {
          updates.push(args);
          return args;
        },
      },
    },
  };
}

async function withSilencedWarn<T>(fn: () => Promise<T>) {
  const originalWarn = console.warn;
  console.warn = () => undefined;
  try {
    return await fn();
  } finally {
    console.warn = originalWarn;
  }
}

afterEach(() => {
  delete process.env.APP_ENCRYPTION_KEY;
  delete process.env.META_CAPI_ENABLED;
  delete process.env.META_CAPI_GRAPH_VERSION;
  delete process.env.META_CAPI_TIMEOUT_MS;
});

test("META_CAPI_ENABLED=false does not send", async () => {
  const fetchMock = (() => {
    throw new Error("fetch should not be called");
  }) as typeof fetch;

  assert.equal(isMetaCapiGloballyEnabled(), false);
  const result = await sendMetaCapiEvent("jkw_evt_meta_1", { db: createDb().db, fetch: fetchMock });

  assert.deepEqual(result, { ok: true, sent: false, eventId: "jkw_evt_meta_1", reason: "disabled" });
});

test("missing marketing consent does not send", async () => {
  process.env.META_CAPI_ENABLED = "true";
  const mock = createDb({ trackingEvent: { ...baseTrackingEvent, consentMarketing: false } });
  const result = await sendMetaCapiEvent("jkw_evt_meta_1", { db: mock.db, fetch: (() => Promise.reject(new Error("nope"))) as typeof fetch });

  assert.equal(result.sent, false);
  assert.equal("reason" in result && result.reason, "marketing_consent_missing");
});

test("missing token, capi disabled, and DRAFT status do not send", async () => {
  process.env.META_CAPI_ENABLED = "true";
  const variants = [
    { ...baseIntegration, accessTokenEncrypted: null },
    { ...baseIntegration, capiEnabled: false },
    { ...baseIntegration, status: StorePixelStatus.DRAFT },
  ];

  for (const integration of variants) {
    const db = createDb({ integration }).db;
    assert.equal(await getMetaCapiIntegrationForStore("store_1", { db }), null);
    const result = await sendMetaCapiEvent("jkw_evt_meta_1", {
      db,
      fetch: (() => {
        throw new Error("fetch should not be called");
      }) as typeof fetch,
    });
    assert.equal(result.sent, false);
    assert.equal("reason" in result && result.reason, "integration_not_ready");
  }
});

test("PageView mapping keeps event_id equal to TrackingEvent.eventId", () => {
  const event = buildMetaCapiEvent(baseTrackingEvent, baseIntegration);

  assert.equal(event?.event_name, "PageView");
  assert.equal(event?.event_id, "jkw_evt_meta_1");
  assert.equal(event?.action_source, "website");
  assert.deepEqual(event?.user_data, { client_user_agent: "Mozilla/5.0" });
});

test("ViewContent mapping includes value, currency, and content_ids", () => {
  const event = buildMetaCapiEvent(
    {
      ...baseTrackingEvent,
      eventName: "product_view",
      productId: "prod_1",
      metadata: { product: { id: "prod_1", name: "Camara Pro", currency: "BOB", valueCents: 12345 } },
    },
    baseIntegration,
  );

  assert.equal(event?.event_name, "ViewContent");
  assert.deepEqual(event?.custom_data?.content_ids, ["prod_1"]);
  assert.equal(event?.custom_data?.content_name, "Camara Pro");
  assert.equal(event?.custom_data?.currency, "BOB");
  assert.equal(event?.custom_data?.value, 123.45);
});

test("Lead and Contact mappings are supported", () => {
  assert.equal(buildMetaCapiEvent({ ...baseTrackingEvent, eventName: "lead_created" }, baseIntegration)?.event_name, "Lead");
  assert.equal(buildMetaCapiEvent({ ...baseTrackingEvent, eventName: "whatsapp_click" }, baseIntegration)?.event_name, "Contact");
  assert.equal(buildMetaCapiEvent({ ...baseTrackingEvent, eventName: "seller_ai_handoff" }, baseIntegration)?.event_name, "Contact");
});

test("test_event_code is included and Graph URL is correct", async () => {
  process.env.APP_ENCRYPTION_KEY = encryptionKey();
  process.env.META_CAPI_ENABLED = "true";
  process.env.META_CAPI_GRAPH_VERSION = "v20.0";
  const accessValue = fakeAccessValue();
  const encrypted = encryptSecret(accessValue);
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetchMock = (async (url: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return Response.json({ events_received: 1, fbtrace_id: "trace_1" }, { status: 200 });
  }) as typeof fetch;

  const result = await sendMetaCapiEvent("jkw_evt_meta_1", {
    db: createDb({ integration: { ...baseIntegration, accessTokenEncrypted: encrypted, testEventCode: "TEST12345" } }).db,
    fetch: fetchMock,
  });

  assert.equal(result.ok, true);
  assert.equal(calls[0].url, "https://graph.facebook.com/v20.0/1234567890/events");
  const body = JSON.parse(String(calls[0].init?.body));
  assert.equal(body.test_event_code, "TEST12345");
  assert.equal(body.data[0].event_id, "jkw_evt_meta_1");
});

test("token does not appear in errors or metadata results", async () => {
  process.env.APP_ENCRYPTION_KEY = encryptionKey();
  process.env.META_CAPI_ENABLED = "true";
  const accessValue = fakeAccessValue();
  const encrypted = encryptSecret(accessValue);
  const mock = createDb({ integration: { ...baseIntegration, accessTokenEncrypted: encrypted } });
  const result = await withSilencedWarn(() =>
    sendMetaCapiEvent("jkw_evt_meta_1", {
      db: mock.db,
      fetch: (async () => Response.json({ error: { message: "bad request" } }, { status: 400 })) as typeof fetch,
    }),
  );

  assert.equal(result.ok, false);
  assert.equal(JSON.stringify(result).includes(accessValue), false);
  assert.equal(JSON.stringify(mock.updates).includes(accessValue), false);
});

test("4xx/5xx failures return a controlled result without throwing", async () => {
  process.env.APP_ENCRYPTION_KEY = encryptionKey();
  process.env.META_CAPI_ENABLED = "true";
  const encrypted = encryptSecret(fakeAccessValue());
  const result = await withSilencedWarn(() =>
    sendMetaCapiEvent("jkw_evt_meta_1", {
      db: createDb({ integration: { ...baseIntegration, accessTokenEncrypted: encrypted } }).db,
      fetch: (async () => Response.json({ error: { message: "server error" } }, { status: 500 })) as typeof fetch,
    }),
  );

  assert.equal(result.ok, false);
  assert.equal(result.sent, true);
  assert.equal("reason" in result && result.reason, "http_500");
});
