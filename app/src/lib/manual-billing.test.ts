import test from "node:test";
import assert from "node:assert/strict";
import {
  getOwnerManualBillingSnapshot,
  manualBillingContactHref,
  manualBillingOwnerCopy,
  parseOptionalManualBillingDate,
  updateManualBillingStore,
} from "./manual-billing";

type StoreRow = {
  id: string;
  name: string;
  slug: string;
  currency: string | null;
  plan: string | null;
  planStatus: string | null;
  planStartedAt: Date | null;
  planRenewsAt: Date | null;
  trialEndsAt: Date | null;
  createdAt: Date;
};

type PaymentRow = {
  id: string;
  storeId: string;
  planKey: string | null;
  paymentType: string;
  amountCents: number;
  currency: string;
  status: string;
  paymentMethod: string | null;
  externalReference: string | null;
  notes: string | null;
  description: string | null;
  periodEnd: Date | null;
  createdAt: Date;
  createdByUserId: string | null;
};

class FakeManualBillingDb {
  stores: StoreRow[] = [
    {
      id: "store-1",
      name: "Demo Store",
      slug: "demo-store",
      currency: "BOB",
      plan: null,
      planStatus: null,
      planStartedAt: null,
      planRenewsAt: null,
      trialEndsAt: new Date("2099-01-01T00:00:00.000Z"),
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
    },
  ];
  payments: PaymentRow[] = [];
  nextPaymentId = 1;

  store = {
    findUnique: async (args: { where: { id: string } }) => {
      return this.stores.find((store) => store.id === args.where.id) ?? null;
    },
    update: async (args: { where: { id: string }; data: Partial<StoreRow> }) => {
      const store = this.stores.find((row) => row.id === args.where.id);
      if (!store) throw new Error("store not found");
      Object.assign(store, args.data);
      return store;
    },
  };

  storePayment = {
    findFirst: async (args: { where: Partial<PaymentRow> }) => {
      return (
        this.payments.find((payment) => {
          return Object.entries(args.where).every(([key, value]) => payment[key as keyof PaymentRow] === value);
        }) ?? null
      );
    },
    create: async (args: { data: Omit<PaymentRow, "id" | "createdAt"> & { createdAt?: Date } }) => {
      const payment: PaymentRow = {
        ...args.data,
        id: `payment-${this.nextPaymentId++}`,
        createdAt: args.data.createdAt ?? new Date("2026-07-09T00:00:00.000Z"),
      };
      this.payments.push(payment);
      return payment;
    },
    update: async (args: { where: { id: string }; data: Partial<PaymentRow> }) => {
      const payment = this.payments.find((row) => row.id === args.where.id);
      if (!payment) throw new Error("payment not found");
      Object.assign(payment, args.data);
      return payment;
    },
  };
}

test("owner billing snapshot has safe defaults when no billing record exists", () => {
  const store = new FakeManualBillingDb().stores[0];
  const snapshot = getOwnerManualBillingSnapshot(store);

  assert.equal(snapshot.planCode, "TRIAL");
  assert.equal(snapshot.billingStatus, "trial");
  assert.equal(snapshot.manualPaymentReference, null);
  assert.equal(snapshot.noCheckoutCopy.includes("No hay checkout"), true);
});

test("owner sees plan and visible payment reference only", () => {
  const store = {
    ...new FakeManualBillingDb().stores[0],
    plan: "PRO",
    planStatus: "ACTIVE",
    planRenewsAt: new Date("2026-12-31T00:00:00.000Z"),
  };
  const snapshot = getOwnerManualBillingSnapshot(store, [
    {
      amountCents: 0,
      externalReference: "internal-ref",
      notes: "secret internal billing note",
      description: "Manual Billing / Plan Ops v1",
      periodEnd: null,
      createdAt: new Date(),
    },
    {
      amountCents: 99700,
      externalReference: "manual-ref-123",
      notes: "secret payment note",
      description: "Pago manual",
      periodEnd: new Date("2026-12-31T00:00:00.000Z"),
      createdAt: new Date(),
    },
  ]);

  assert.equal(snapshot.planName, "Tienda Pro");
  assert.equal(snapshot.billingStatus, "active");
  assert.equal(snapshot.manualPaymentReference, "manual-ref-123");
  assert.equal(JSON.stringify(snapshot).includes("secret"), false);
});

test("owner cannot update manual billing", async () => {
  const db = new FakeManualBillingDb();
  const result = await updateManualBillingStore(db as never, { id: "user-1", role: "OWNER" }, {
    storeId: "store-1",
    plan: "PRO",
    billingStatus: "ACTIVE",
  });

  assert.deepEqual(result, { ok: false, reason: "forbidden" });
  assert.equal(db.stores[0].plan, null);
});

test("superadmin can update billing status and internal notes", async () => {
  const db = new FakeManualBillingDb();
  const result = await updateManualBillingStore(db as never, { id: "admin-1", role: "SUPER_ADMIN" }, {
    storeId: "store-1",
    plan: "PRO",
    billingStatus: "past_due",
    trialEndsAt: "2026-07-15",
    currentPeriodEndsAt: "2026-08-15",
    manualPaymentReference: "manual-beta-001",
    internalBillingNotes: "Coordinar pago asistido.",
  });

  assert.equal(result.ok, true);
  assert.equal(db.stores[0].plan, "PRO");
  assert.equal(db.stores[0].planStatus, "PAST_DUE");
  assert.equal(db.stores[0].planRenewsAt?.toISOString(), "2026-08-15T00:00:00.000Z");
  assert.equal(db.payments.length, 1);
  assert.equal(db.payments[0].amountCents, 0);
  assert.equal(db.payments[0].externalReference, "manual-beta-001");
  assert.equal(db.payments[0].notes, "Coordinar pago asistido.");
});

test("invalid billing status fails", async () => {
  const db = new FakeManualBillingDb();
  const result = await updateManualBillingStore(db as never, { id: "admin-1", role: "SUPER_ADMIN" }, {
    storeId: "store-1",
    plan: "PRO",
    billingStatus: "charging_card",
  });

  assert.deepEqual(result, { ok: false, reason: "invalid_status" });
});

test("invalid manual billing dates fail", async () => {
  assert.equal(parseOptionalManualBillingDate("2026-02-31").ok, false);

  const db = new FakeManualBillingDb();
  const result = await updateManualBillingStore(db as never, { id: "admin-1", role: "SUPER_ADMIN" }, {
    storeId: "store-1",
    plan: "PRO",
    billingStatus: "ACTIVE",
    currentPeriodEndsAt: "not-a-date",
  });

  assert.deepEqual(result, { ok: false, reason: "invalid_date" });
});

test("manual billing owner copy is explicit and has no checkout gateway link", () => {
  assert.equal(manualBillingOwnerCopy.mode, "Pago manual/asistido");
  assert.equal(manualBillingOwnerCopy.noCheckout.includes("No hay checkout"), true);
  assert.equal(manualBillingContactHref.startsWith("mailto:"), true);
  assert.equal(/^https?:\/\//.test(manualBillingContactHref), false);
  assert.equal(/stripe|paypal/i.test(manualBillingContactHref), false);
});
