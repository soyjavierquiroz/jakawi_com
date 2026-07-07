import assert from "node:assert/strict";
import { test } from "node:test";
import type { ReactElement } from "react";
import { StorePixelPlatform, StorePixelStatus } from "@prisma/client";
import { MetaPixel } from "@/components/tracking/MetaPixel";
import {
  buildMetaPixelPageViewEvent,
  buildMetaPixelViewContentEvent,
  getActiveMetaPixelForStore,
  isMetaPixelEnabledForStore,
} from "@/lib/pixels/meta-pixel";

const marketingConsent = { necessary: true, analytics: true, marketing: true };
const noMarketingConsent = { necessary: true, analytics: true, marketing: false };

function integration(overrides: Partial<Parameters<typeof isMetaPixelEnabledForStore>[0]> = {}) {
  return {
    platform: StorePixelPlatform.META,
    status: StorePixelStatus.ACTIVE,
    pixelId: "1234567890",
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

test("getActiveMetaPixelForStore returns null without integration", async () => {
  const mock = createDb(null);
  const result = await getActiveMetaPixelForStore("store_1", { consent: marketingConsent, db: mock.db });
  assert.equal(result, null);
  assert.equal(mock.called, true);
});

test("Meta Pixel is disabled unless integration is ACTIVE with browser flag and pixelId", () => {
  assert.equal(isMetaPixelEnabledForStore(integration({ status: StorePixelStatus.DRAFT }), marketingConsent), false);
  assert.equal(isMetaPixelEnabledForStore(integration({ browserPixelEnabled: false }), marketingConsent), false);
  assert.equal(isMetaPixelEnabledForStore(integration({ pixelId: null }), marketingConsent), false);
  assert.equal(isMetaPixelEnabledForStore(integration(), marketingConsent), true);
});

test("Meta Pixel is disabled without marketing consent", async () => {
  const mock = createDb(integration());
  const result = await getActiveMetaPixelForStore("store_1", { consent: noMarketingConsent, db: mock.db });
  assert.equal(result, null);
});

test("getActiveMetaPixelForStore returns only safe client data", async () => {
  const mock = createDb(integration());
  const result = await getActiveMetaPixelForStore("store_1", { consent: marketingConsent, db: mock.db });
  assert.deepEqual(result, { pixelId: "1234567890" });
  assert.equal(JSON.stringify(result).includes("accessToken"), false);
});

test("ViewContent event includes product content data and eventID", () => {
  const event = buildMetaPixelViewContentEvent({
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

test("MetaPixel component renders the store pixelId and PageView eventID only", () => {
  const element = MetaPixel({ pixelId: "1234567890", event: buildMetaPixelPageViewEvent("jkw_evt_page") }) as ReactElement<{
    children: Array<ReactElement<{ src?: string; children?: unknown }>>;
  }>;
  const children = element.props.children;
  const scriptText = String(children[1].props.children);

  assert.equal(children[0].props.src, "https://connect.facebook.net/en_US/fbevents.js");
  assert.match(scriptText, /1234567890/);
  assert.match(scriptText, /PageView/);
  assert.match(scriptText, /jkw_evt_page/);
  assert.equal(scriptText.includes("accessToken"), false);
});

test("MetaPixel component does not render without pixelId", () => {
  assert.equal(MetaPixel({ pixelId: "", event: buildMetaPixelPageViewEvent("jkw_evt_page") }), null);
});

test("Meta Pixel helper does not call external APIs server-side", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() => {
    throw new Error("external fetch should not be called");
  }) as typeof fetch;
  const mock = createDb(integration());

  try {
    const result = await getActiveMetaPixelForStore("store_1", { consent: marketingConsent, db: mock.db });
    assert.deepEqual(result, { pixelId: "1234567890" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
