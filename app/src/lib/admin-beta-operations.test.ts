import assert from "node:assert/strict";
import test from "node:test";
import { StorePixelPlatform, StorePixelStatus } from "@prisma/client";
import {
  buildAdminBetaStoreSnapshot,
  redactAdminBetaEmail,
  type AdminBetaStoreInput,
} from "@/lib/admin-beta-operations";
import { isSuperAdmin } from "@/lib/admin";

function fixture(overrides: Partial<AdminBetaStoreInput> = {}): AdminBetaStoreInput {
  return {
    id: "store-1",
    name: "Tienda Beta",
    slug: "tienda-beta",
    whatsapp: "+59170000000",
    isPublished: true,
    plan: "TRIAL",
    planStatus: "TRIALING",
    trialEndsAt: new Date("2026-08-01T00:00:00.000Z"),
    planRenewsAt: null,
    owner: { email: "owner@example.com" },
    productCount: 2,
    visibleProductCount: 1,
    integrations: [],
    domain: null,
    latestPayment: null,
    ...overrides,
  };
}

test("snapshot redacts owner email and never exposes token or billing notes", () => {
  const unsafeInput = {
    ...fixture(),
    accessTokenEncrypted: "encrypted-sensitive-value",
    notes: "internal owner billing note",
    integrations: [
      {
        platform: StorePixelPlatform.META,
        status: StorePixelStatus.DRAFT,
        browserPixelEnabled: false,
        capiEnabled: false,
        accessTokenEncrypted: "encrypted-sensitive-value",
      },
    ],
  };
  const snapshot = buildAdminBetaStoreSnapshot(unsafeInput);
  const serialized = JSON.stringify(snapshot);

  assert.equal(snapshot.ownerEmail, "ow***@example.com");
  assert.equal(serialized.includes("owner@example.com"), false);
  assert.equal(serialized.includes("encrypted-sensitive-value"), false);
  assert.equal(serialized.includes("internal owner billing note"), false);
  assert.equal("accessTokenEncrypted" in snapshot, false);
  assert.equal("notes" in snapshot, false);
});

test("store with a visible product and complete public settings is READY", () => {
  assert.equal(buildAdminBetaStoreSnapshot(fixture()).readiness, "READY");
});

test("store without a visible product NEEDS_ATTENTION", () => {
  const snapshot = buildAdminBetaStoreSnapshot(fixture({ visibleProductCount: 0 }));
  assert.equal(snapshot.readiness, "NEEDS_ATTENTION");
  assert.ok(snapshot.warnings.includes("Requiere al menos un producto visible"));
});

test("store with a pending manual payment NEEDS_ATTENTION", () => {
  const snapshot = buildAdminBetaStoreSnapshot(
    fixture({
      latestPayment: {
        status: "PENDING",
        amountCents: 4900,
        currency: "BOB",
        paidAt: null,
        confirmedAt: null,
        createdAt: new Date("2026-07-09T00:00:00.000Z"),
      },
    }),
  );
  assert.equal(snapshot.readiness, "NEEDS_ATTENTION");
  assert.ok(snapshot.warnings.includes("Pago manual pendiente"));
});

test("suspended and canceled stores are SUSPENDED", () => {
  assert.equal(buildAdminBetaStoreSnapshot(fixture({ planStatus: "SUSPENDED" })).readiness, "SUSPENDED");
  assert.equal(buildAdminBetaStoreSnapshot(fixture({ planStatus: "CANCELED" })).readiness, "SUSPENDED");
});

test("integrations expose operational summary without token material", () => {
  const snapshot = buildAdminBetaStoreSnapshot(
    fixture({
      integrations: [
        {
          platform: StorePixelPlatform.TIKTOK,
          status: StorePixelStatus.ACTIVE,
          browserPixelEnabled: true,
          capiEnabled: false,
        },
      ],
    }),
  );

  assert.deepEqual(snapshot.integrations, [
    { platform: StorePixelPlatform.META, state: "OFF", configured: false },
    { platform: StorePixelPlatform.TIKTOK, state: "ON", configured: true },
    { platform: StorePixelPlatform.GOOGLE, state: "OFF", configured: false },
  ]);
  assert.equal(JSON.stringify(snapshot.integrations).includes("token"), false);
});

test("email redaction handles malformed values safely", () => {
  assert.equal(redactAdminBetaEmail("not-an-email"), "oculto");
});

test("admin beta authorization accepts only SUPER_ADMIN", () => {
  assert.equal(isSuperAdmin({ role: "SUPER_ADMIN" }), true);
  assert.equal(isSuperAdmin({ role: "OWNER" }), false);
  assert.equal(isSuperAdmin(null), false);
});
