import assert from "node:assert/strict";
import { test } from "node:test";
import type { ReactElement } from "react";
import { StorePixelPlatform, StorePixelStatus } from "@prisma/client";
import { TikTokPixel } from "@/components/tracking/TikTokPixel";
import {
  buildTikTokPageViewEvent,
  buildTikTokViewContentEvent,
  getActiveTikTokPixelForStore,
  isTikTokPixelEnabledForStore,
} from "@/lib/pixels/tiktok-pixel";

const marketingConsent = { necessary: true, analytics: true, marketing: true };
const noMarketingConsent = { necessary: true, analytics: true, marketing: false };

function integration(overrides: Partial<Parameters<typeof isTikTokPixelEnabledForStore>[0]> = {}) {
  return {
    platform: StorePixelPlatform.TIKTOK,
    status: StorePixelStatus.ACTIVE,
    pixelId: "C1234567890ABCDEFGH",
    browserPixelEnabled: true,
    ...overrides,
  };
}

function createDb(row: ReturnType<typeof integration> | null) {
  let called = false;
  return {
    get called() {
      return called;
    },
    db: {
      storePixelIntegration: {
        async findFirst() {
          called = true;
          return row;
        },
      },
    },
  };
}

test("getActiveTikTokPixelForStore returns null without integration", async () => {
  const mock = createDb(null);
  const result = await getActiveTikTokPixelForStore("store_1", { consent: marketingConsent, db: mock.db });

  assert.equal(result, null);
  assert.equal(mock.called, true);
});

test("TikTok Pixel is disabled unless integration is ACTIVE with browser flag and pixelId", () => {
  assert.equal(isTikTokPixelEnabledForStore(integration({ status: StorePixelStatus.DRAFT }), marketingConsent), false);
  assert.equal(isTikTokPixelEnabledForStore(integration({ browserPixelEnabled: false }), marketingConsent), false);
  assert.equal(isTikTokPixelEnabledForStore(integration({ pixelId: null }), marketingConsent), false);
  assert.equal(isTikTokPixelEnabledForStore(integration(), marketingConsent), true);
});

test("TikTok Pixel is disabled without marketing consent", async () => {
  const mock = createDb(integration());
  const result = await getActiveTikTokPixelForStore("store_1", { consent: noMarketingConsent, db: mock.db });

  assert.equal(isTikTokPixelEnabledForStore(integration(), noMarketingConsent), false);
  assert.equal(result, null);
});

test("TikTok Pixel renders with the store pixelId and PageView event", async () => {
  const mock = createDb(integration());
  const result = await getActiveTikTokPixelForStore("store_1", { consent: marketingConsent, db: mock.db });
  const element = result ? TikTokPixel({ pixelId: result.pixelId, event: buildTikTokPageViewEvent("jkw_evt_page") }) : null;

  assert.deepEqual(result, { pixelId: "C1234567890ABCDEFGH" });
  assert.notEqual(element, null);
});

test("getActiveTikTokPixelForStore returns only safe client data", async () => {
  const mock = createDb(integration());
  const result = await getActiveTikTokPixelForStore("store_1", { consent: marketingConsent, db: mock.db });

  assert.deepEqual(result, { pixelId: "C1234567890ABCDEFGH" });
  assert.equal(JSON.stringify(result).includes("accessToken"), false);
});

test("TikTok ViewContent event includes product content data and event_id", () => {
  const event = buildTikTokViewContentEvent({
    eventId: "jkw_evt_1",
    productId: "prod_1",
    productName: "Camara Pro",
    currency: "BOB",
    valueCents: 12345,
  });

  assert.equal(event.eventName, "ViewContent");
  assert.equal(event.eventId, "jkw_evt_1");
  assert.deepEqual(event.params.content_ids, ["prod_1"]);
  assert.equal(event.params.content_name, "Camara Pro");
  assert.equal(event.params.value, 123.45);
});

test("TikTokPixel component renders PageView without access token", () => {
  const element = TikTokPixel({ pixelId: "C1234567890ABCDEFGH", event: buildTikTokPageViewEvent("jkw_evt_page") }) as ReactElement<{
    children?: unknown;
  }>;
  const scriptText = String(element.props.children);

  assert.match(scriptText, /C1234567890ABCDEFGH/);
  assert.match(scriptText, /ttq\.page/);
  assert.match(scriptText, /event_id/);
  assert.match(scriptText, /jkw_evt_page/);
  assert.equal(scriptText.includes("accessToken"), false);
});

test("TikTokPixel component renders ViewContent for product page", () => {
  const event = buildTikTokViewContentEvent({
    eventId: "jkw_evt_product",
    productId: "prod_1",
    productName: "Camara Pro",
    currency: "BOB",
    valueCents: 12345,
  });
  const element = TikTokPixel({ pixelId: "C1234567890ABCDEFGH", event }) as ReactElement<{ children?: unknown }>;
  const scriptText = String(element.props.children);

  assert.match(scriptText, /ttq\.track/);
  assert.match(scriptText, /ViewContent/);
  assert.match(scriptText, /prod_1/);
  assert.match(scriptText, /Camara Pro/);
  assert.match(scriptText, /jkw_evt_product/);
  assert.equal(scriptText.includes("accessToken"), false);
});

test("TikTokPixel component does not render without pixelId", () => {
  assert.equal(TikTokPixel({ pixelId: "", event: buildTikTokPageViewEvent("jkw_evt_page") }), null);
});

test("TikTok Pixel helper does not call external APIs server-side", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() => {
    throw new Error("external fetch should not be called");
  }) as typeof fetch;
  const mock = createDb(integration());

  try {
    const result = await getActiveTikTokPixelForStore("store_1", { consent: marketingConsent, db: mock.db });
    assert.deepEqual(result, { pixelId: "C1234567890ABCDEFGH" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
