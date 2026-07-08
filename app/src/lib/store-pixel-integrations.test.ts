import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { afterEach, test } from "node:test";
import { StorePixelPlatform, StorePixelStatus } from "@prisma/client";
import {
  canPrepareStorePixelCapi,
  upsertStorePixelIntegration,
  validateStorePixelId,
} from "@/lib/store-pixel-integrations";

type StoreRecord = { id: string; ownerId: string; slug: string };
type IntegrationRecord = {
  id: string;
  storeId: string;
  platform: StorePixelPlatform;
  pixelId: string | null;
  accessTokenEncrypted: string | null;
  capiEnabled: boolean;
  browserPixelEnabled: boolean;
  testEventCode: string | null;
  status: StorePixelStatus;
};

function encryptionKey() {
  return randomBytes(32).toString("base64");
}

function createMockDb() {
  const stores: StoreRecord[] = [
    { id: "store_owner", ownerId: "owner_1", slug: "owner" },
    { id: "store_foreign", ownerId: "owner_2", slug: "foreign" },
  ];
  const integrations = new Map<string, IntegrationRecord>();
  const key = (storeId: string, platform: StorePixelPlatform) => `${storeId}:${platform}`;

  return {
    stores,
    integrations,
    db: {
      store: {
        async findFirst(args: { where: { id?: string; ownerId?: string } }) {
          return stores.find((store) => {
            if (args.where.id && store.id !== args.where.id) return false;
            if (args.where.ownerId && store.ownerId !== args.where.ownerId) return false;
            return true;
          }) ?? null;
        },
        async findUnique(args: { where: { id?: string } }) {
          return stores.find((store) => store.id === args.where.id) ?? null;
        },
      },
      storePixelIntegration: {
        async findUnique(args: { where: { storeId_platform: { storeId: string; platform: StorePixelPlatform } } }) {
          return integrations.get(key(args.where.storeId_platform.storeId, args.where.storeId_platform.platform)) ?? null;
        },
        async upsert(args: {
          where: { storeId_platform: { storeId: string; platform: StorePixelPlatform } };
          create: Partial<IntegrationRecord>;
          update: Partial<IntegrationRecord>;
        }) {
          const rowKey = key(args.where.storeId_platform.storeId, args.where.storeId_platform.platform);
          const existing = integrations.get(rowKey);
          const next = existing
            ? { ...existing, ...args.update }
            : {
                id: `spi_${integrations.size + 1}`,
                storeId: args.where.storeId_platform.storeId,
                platform: args.where.storeId_platform.platform,
                pixelId: null,
                accessTokenEncrypted: null,
                capiEnabled: false,
                browserPixelEnabled: false,
                testEventCode: null,
                status: StorePixelStatus.DRAFT,
                ...args.create,
              } as IntegrationRecord;
          integrations.set(rowKey, next);
          return next;
        },
      },
    },
  };
}

afterEach(() => {
  delete process.env.APP_ENCRYPTION_KEY;
});

test("upsert creates a DRAFT config for a store/platform", async () => {
  const { db } = createMockDb();
  const result = await upsertStorePixelIntegration(db as never, { userId: "owner_1" }, {
    platform: "META",
    pixelId: "1234567890",
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.integration.platform, StorePixelPlatform.META);
  assert.equal(result.integration.status, StorePixelStatus.DRAFT);
  assert.equal(result.integration.capiEnabled, false);
  assert.equal(result.integration.browserPixelEnabled, false);
});

test("unique store/platform upsert updates an existing integration", async () => {
  const { db, integrations } = createMockDb();
  await upsertStorePixelIntegration(db as never, { userId: "owner_1" }, { platform: "META", pixelId: "1234567890" });
  const result = await upsertStorePixelIntegration(db as never, { userId: "owner_1" }, {
    platform: "META",
    pixelId: "12345678901",
    browserPixelEnabled: true,
  });

  assert.equal(result.ok, true);
  assert.equal(integrations.size, 1);
  if (!result.ok) return;
  assert.equal(result.integration.pixelId, "12345678901");
  assert.equal(result.integration.browserPixelEnabled, true);
});

test("CAPI cannot be enabled without an access token", async () => {
  const { db } = createMockDb();
  const result = await upsertStorePixelIntegration(db as never, { userId: "owner_1" }, {
    platform: "META",
    pixelId: "1234567890",
    capiEnabled: true,
  });

  assert.deepEqual(result, { ok: false, reason: "capi_requires_access_token" });
});

test("access token is rejected when APP_ENCRYPTION_KEY is not configured", async () => {
  const { db } = createMockDb();
  const result = await upsertStorePixelIntegration(db as never, { userId: "owner_1" }, {
    platform: "META",
    pixelId: "1234567890",
    accessToken: "plain-token",
  });

  assert.deepEqual(result, { ok: false, reason: "token_encryption_not_configured" });
});

test("access token is encrypted and does not contain plaintext", async () => {
  process.env.APP_ENCRYPTION_KEY = encryptionKey();
  const { db } = createMockDb();
  const result = await upsertStorePixelIntegration(db as never, { userId: "owner_1" }, {
    platform: "META",
    pixelId: "1234567890",
    accessToken: "plain-token",
    capiEnabled: true,
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.integration.capiEnabled, true);
  assert.ok(result.integration.accessTokenEncrypted);
  assert.equal(result.integration.accessTokenEncrypted.includes("plain-token"), false);
});

test("TikTok can be saved as DRAFT with a reasonable pixel id", async () => {
  const { db } = createMockDb();
  const result = await upsertStorePixelIntegration(db as never, { userId: "owner_1" }, {
    platform: "TIKTOK",
    pixelId: "C1234567890ABCDEFGH",
    browserPixelEnabled: true,
    status: "DRAFT",
    testEventCode: "TEST12345",
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.integration.platform, StorePixelPlatform.TIKTOK);
  assert.equal(result.integration.status, StorePixelStatus.DRAFT);
  assert.equal(result.integration.browserPixelEnabled, true);
  assert.equal(result.integration.capiEnabled, false);
  assert.equal(result.integration.testEventCode, "TEST12345");
});

test("TikTok pixel id rejects short or punctuated values", () => {
  assert.equal(validateStorePixelId(StorePixelPlatform.TIKTOK, "abc"), false);
  assert.equal(validateStorePixelId(StorePixelPlatform.TIKTOK, "C12345_BAD"), false);
  assert.equal(validateStorePixelId(StorePixelPlatform.TIKTOK, "C1234567890ABCDEFGH"), true);
});

test("TikTok CAPI can only be prepared with an encrypted token", async () => {
  const { db } = createMockDb();
  const missingToken = await upsertStorePixelIntegration(db as never, { userId: "owner_1" }, {
    platform: "TIKTOK",
    pixelId: "C1234567890ABCDEFGH",
    capiEnabled: true,
  });

  assert.deepEqual(missingToken, { ok: false, reason: "capi_requires_access_token" });

  process.env.APP_ENCRYPTION_KEY = encryptionKey();
  const result = await upsertStorePixelIntegration(db as never, { userId: "owner_1" }, {
    platform: "TIKTOK",
    pixelId: "C1234567890ABCDEFGH",
    accessToken: "tiktok-token",
    capiEnabled: true,
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.integration.capiEnabled, true);
  assert.ok(result.integration.accessTokenEncrypted);
  assert.equal(result.integration.accessTokenEncrypted.includes("tiktok-token"), false);
});

test("Google CAPI is not prepareable in v1", async () => {
  const { db } = createMockDb();
  const result = await upsertStorePixelIntegration(db as never, { userId: "owner_1" }, {
    platform: "GOOGLE",
    pixelId: "AW-123456789",
    capiEnabled: true,
  });

  assert.equal(canPrepareStorePixelCapi(StorePixelPlatform.GOOGLE), false);
  assert.equal(canPrepareStorePixelCapi(StorePixelPlatform.TIKTOK), true);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.integration.capiEnabled, false);
});

test("owner cannot modify another store", async () => {
  const { db } = createMockDb();
  const result = await upsertStorePixelIntegration(db as never, { userId: "owner_1" }, {
    storeId: "store_foreign",
    platform: "META",
    pixelId: "1234567890",
  });

  assert.deepEqual(result, { ok: false, reason: "store_not_found_or_forbidden" });
});

test("browser pixel enabled requires a valid pixel id", async () => {
  const { db } = createMockDb();
  const result = await upsertStorePixelIntegration(db as never, { userId: "owner_1" }, {
    platform: "META",
    browserPixelEnabled: true,
  });

  assert.deepEqual(result, { ok: false, reason: "browser_pixel_requires_pixel_id" });
  assert.equal(validateStorePixelId(StorePixelPlatform.META, "abc"), false);
});
