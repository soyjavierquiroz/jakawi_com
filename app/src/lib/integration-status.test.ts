import assert from "node:assert/strict";
import { test } from "node:test";
import { StorePixelPlatform, StorePixelStatus } from "@prisma/client";
import { buildIntegrationStatus, type IntegrationStatusRecord } from "@/lib/integration-status";

function integration(overrides: Partial<IntegrationStatusRecord> = {}): IntegrationStatusRecord {
  return {
    platform: StorePixelPlatform.META,
    status: StorePixelStatus.ACTIVE,
    pixelId: "1234567890",
    accessTokenEncrypted: "encrypted-token",
    capiEnabled: true,
    browserPixelEnabled: true,
    testEventCode: "TEST12345",
    ...overrides,
  };
}

test("Meta without pixel is not operational", () => {
  const status = buildIntegrationStatus(StorePixelPlatform.META, integration({ pixelId: null }), { metaCapiEnabled: true });

  assert.equal(status.pixelIdPresent, false);
  assert.equal(status.browserOperational, false);
  assert.equal(status.serverOperational, false);
  assert.deepEqual(status.browserBlockedReasons, ["pixelId missing"]);
  assert.deepEqual(status.serverBlockedReasons, ["pixelId missing"]);
});

test("Meta browser enabled, active, and pixel present is browser operational", () => {
  const status = buildIntegrationStatus(
    StorePixelPlatform.META,
    integration({ capiEnabled: false, accessTokenEncrypted: null, testEventCode: null }),
    { metaCapiEnabled: false },
  );

  assert.equal(status.browserEnabled, true);
  assert.equal(status.pixelIdPresent, true);
  assert.equal(status.browserOperational, true);
  assert.deepEqual(status.browserBlockedReasons, []);
});

test("Meta CAPI enabled but META_CAPI_ENABLED=false is not server operational", () => {
  const status = buildIntegrationStatus(StorePixelPlatform.META, integration(), { metaCapiEnabled: false });

  assert.equal(status.serverEnabled, true);
  assert.equal(status.serverOperational, false);
  assert.deepEqual(status.serverBlockedReasons, ["global META_CAPI_ENABLED false"]);
});

test("Meta token missing is not server operational", () => {
  const status = buildIntegrationStatus(StorePixelPlatform.META, integration({ accessTokenEncrypted: null }), { metaCapiEnabled: true });

  assert.equal(status.tokenPresent, false);
  assert.equal(status.serverOperational, false);
  assert.deepEqual(status.serverBlockedReasons, ["access token missing"]);
});

test("TikTok browser enabled, active, and pixel present is browser operational", () => {
  const status = buildIntegrationStatus(
    StorePixelPlatform.TIKTOK,
    integration({ platform: StorePixelPlatform.TIKTOK, pixelId: "C1234567890ABCDEFGH", capiEnabled: false, accessTokenEncrypted: null }),
    { metaCapiEnabled: false },
  );

  assert.equal(status.browserEnabled, true);
  assert.equal(status.pixelIdPresent, true);
  assert.equal(status.browserOperational, true);
  assert.deepEqual(status.browserBlockedReasons, []);
});

test("Google is not implemented", () => {
  const status = buildIntegrationStatus(StorePixelPlatform.GOOGLE, null, { metaCapiEnabled: true });

  assert.equal(status.browserOperational, false);
  assert.equal(status.serverOperational, false);
  assert.deepEqual(status.browserBlockedReasons, ["provider not implemented"]);
  assert.deepEqual(status.serverBlockedReasons, ["provider not implemented"]);
});

test("integration status does not return token values", () => {
  const status = buildIntegrationStatus(StorePixelPlatform.META, integration({ accessTokenEncrypted: "secret-encrypted-value" }), {
    metaCapiEnabled: true,
  });
  const serialized = JSON.stringify(status);

  assert.equal(status.tokenPresent, true);
  assert.equal(serialized.includes("secret-encrypted-value"), false);
  assert.equal(serialized.includes("accessTokenEncrypted"), false);
});
