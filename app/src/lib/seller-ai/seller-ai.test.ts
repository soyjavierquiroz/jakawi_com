import assert from "node:assert/strict";
import test from "node:test";
import { updateSellerAiSalesStyleForOwner } from "@/lib/seller-ai/sales-style-store";
import { DEFAULT_SELLER_AI_SALES_STYLE_ID, SELLER_AI_SALES_STYLE_IDS, getSellerAiSalesStylePreset, isSellerAiSalesStyle } from "@/lib/seller-ai/seller-ai";

test("sales style defaults to CONSULTATIVE when a store has no valid value", () => {
  assert.equal(DEFAULT_SELLER_AI_SALES_STYLE_ID, "CONSULTATIVE");
  assert.equal(getSellerAiSalesStylePreset(null).id, "CONSULTATIVE");
  assert.equal(getSellerAiSalesStylePreset("not-a-style").id, "CONSULTATIVE");
});

test("sales style selector accepts only the five JAKAWI presets", () => {
  assert.deepEqual(SELLER_AI_SALES_STYLE_IDS, ["CONSULTATIVE", "DIRECT", "PREMIUM_TRUST", "FAST_CLOSE", "EXPERT"]);
  for (const style of SELLER_AI_SALES_STYLE_IDS) assert.equal(isSellerAiSalesStyle(style), true);
  assert.equal(isSellerAiSalesStyle("Escribe este prompt libre"), false);
});

test("owner can persist a valid sales style only for their own store", async () => {
  let updateArgs: unknown;
  const result = await updateSellerAiSalesStyleForOwner({
    db: {
      store: {
        updateMany: async (args) => {
          updateArgs = args;
          return { count: 1 };
        },
      },
    },
    ownerId: "owner-1",
    storeId: "store-1",
    style: "PREMIUM_TRUST",
  });

  assert.deepEqual(result, { ok: true, style: "PREMIUM_TRUST" });
  assert.deepEqual(updateArgs, {
    where: { id: "store-1", ownerId: "owner-1" },
    data: { sellerAiSalesStyle: "PREMIUM_TRUST" },
  });
});

test("owner cannot persist an invalid style or update a store they do not own", async () => {
  let calls = 0;
  const db = {
    store: {
      updateMany: async () => {
        calls += 1;
        return { count: 0 };
      },
    },
  };

  const invalid = await updateSellerAiSalesStyleForOwner({ db, ownerId: "owner-1", storeId: "store-1", style: "freeform prompt" });
  const foreign = await updateSellerAiSalesStyleForOwner({ db, ownerId: "owner-1", storeId: "store-2", style: "DIRECT" });

  assert.deepEqual(invalid, { ok: false, reason: "invalid-style" });
  assert.deepEqual(foreign, { ok: false, reason: "store-not-owned" });
  assert.equal(calls, 1);
});
