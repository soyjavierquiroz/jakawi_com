import { type StorePlanCode } from "@/config/plans";
import { getNormalizedPlanCode, getStorePlanState } from "@/lib/plan-limits";
import { getPrisma } from "@/lib/prisma";
import { normalizeStorePlanCode } from "@/lib/storefront-flow";

export const manualBillingOpsDescription = "Manual Billing / Plan Ops v1";
export const manualBillingContactEmail = "hola@jakawi.com";
export const manualBillingContactHref = `mailto:${manualBillingContactEmail}?subject=Pago%20manual%2Fasistido%20JAKAWI`;
export const manualBillingOwnerCopy = {
  mode: "Pago manual/asistido",
  noCheckout: "No hay checkout automatico ni cobro en linea desde JAKAWI.",
  instructions: "Coordina el pago manual/asistido con JAKAWI. Cuando el equipo confirme el pago fuera del sistema, tu estado se actualizara aqui.",
};

export const manualBillingStatuses = ["TRIALING", "ACTIVE", "PAST_DUE", "SUSPENDED", "CANCELED"] as const;
export type ManualBillingStatus = (typeof manualBillingStatuses)[number];
export type OwnerBillingStatus = "trial" | "active" | "past_due" | "suspended" | "cancelled";

type ActorLike = {
  id: string;
  role?: string | null;
};

type StoreLike = {
  id: string;
  name?: string | null;
  slug?: string | null;
  currency?: string | null;
  plan?: string | null;
  planStatus?: string | null;
  planStartedAt?: Date | null;
  planRenewsAt?: Date | null;
  trialEndsAt?: Date | null;
  createdAt?: Date | null;
};

type StorePaymentLike = {
  id?: string;
  amountCents?: number | null;
  externalReference?: string | null;
  notes?: string | null;
  description?: string | null;
  periodEnd?: Date | null;
  createdAt?: Date | null;
};

type ManualBillingDb = {
  store: {
    findUnique(args: { where: { id: string }; select?: Record<string, boolean> }): Promise<StoreLike | null>;
    update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<StoreLike>;
    findMany?(args: unknown): Promise<Array<StoreLike & { owner?: unknown; payments?: StorePaymentLike[] }>>;
  };
  storePayment: {
    findFirst(args: unknown): Promise<StorePaymentLike | null>;
    findMany?(args: unknown): Promise<StorePaymentLike[]>;
    create(args: { data: Record<string, unknown> }): Promise<StorePaymentLike>;
    update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<StorePaymentLike>;
  };
};

type ManualBillingUpdateInput = {
  storeId: string;
  plan: string;
  billingStatus: string;
  trialEndsAt?: string | null;
  currentPeriodEndsAt?: string | null;
  manualPaymentReference?: string | null;
  internalBillingNotes?: string | null;
};

export type ManualBillingUpdateResult =
  | { ok: true; store: StoreLike }
  | { ok: false; reason: "forbidden" | "store_not_found" | "invalid_plan" | "invalid_status" | "invalid_date" | "sensitive_reference" };

const statusSet = new Set<string>(manualBillingStatuses);

function cleanOptional(value: string | null | undefined, maxLength: number) {
  const clean = value?.trim() ?? "";
  return clean ? clean.slice(0, maxLength) : null;
}

function looksLikeSensitivePaymentReference(value: string | null | undefined) {
  if (!value) return false;
  return /\d{13,19}/.test(value.replace(/[\s-]/g, ""));
}

export function normalizeManualBillingStatus(value: string | null | undefined): ManualBillingStatus | null {
  const normalized = value?.trim().toUpperCase().replace(/[-\s]/g, "_");
  if (!normalized) return null;
  if (normalized === "TRIAL") return "TRIALING";
  if (normalized === "CANCELLED" || normalized === "CANCELED") return "CANCELED";
  if (normalized === "EXPIRED") return "PAST_DUE";
  return statusSet.has(normalized) ? (normalized as ManualBillingStatus) : null;
}

export function manualBillingStatusLabel(status: ManualBillingStatus | string | null | undefined) {
  const normalized = normalizeManualBillingStatus(status);
  if (normalized === "TRIALING") return "Trial";
  if (normalized === "ACTIVE") return "Activo";
  if (normalized === "PAST_DUE") return "Vencido / past due";
  if (normalized === "SUSPENDED") return "Suspendido";
  if (normalized === "CANCELED") return "Cancelado";
  return "Sin estado";
}

function ownerBillingStatusFromStore(store: StoreLike): OwnerBillingStatus {
  const planState = getStorePlanState(store);
  const status = normalizeManualBillingStatus(store.planStatus) ?? (planState.planCode === "TRIAL" ? "TRIALING" : "ACTIVE");
  if (planState.planCode === "TRIAL" && planState.trialExpired) return "past_due";
  if (status === "TRIALING") return "trial";
  if (status === "PAST_DUE") return "past_due";
  if (status === "SUSPENDED") return "suspended";
  if (status === "CANCELED") return "cancelled";
  return "active";
}

export function ownerBillingStatusLabel(status: OwnerBillingStatus) {
  if (status === "trial") return "Trial";
  if (status === "active") return "Activo";
  if (status === "past_due") return "Vencido / requiere coordinacion";
  if (status === "suspended") return "Suspendido";
  return "Cancelado";
}

export function parseOptionalManualBillingDate(value: string | null | undefined) {
  const raw = value?.trim() ?? "";
  if (!raw) return { ok: true as const, date: null };
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return { ok: false as const };

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return { ok: false as const };
  }
  return { ok: true as const, date };
}

export function getOwnerManualBillingSnapshot(store: StoreLike, payments: StorePaymentLike[] = []) {
  const planState = getStorePlanState(store);
  const latestVisiblePayment = payments.find((payment) => (payment.amountCents ?? 0) > 0);

  return {
    planCode: planState.planCode,
    planName: planState.planName,
    billingMode: manualBillingOwnerCopy.mode,
    billingStatus: ownerBillingStatusFromStore(store),
    billingStatusLabel: ownerBillingStatusLabel(ownerBillingStatusFromStore(store)),
    trialEndsAt: planState.trialEndsAt,
    currentPeriodEndsAt: store.planRenewsAt ?? latestVisiblePayment?.periodEnd ?? null,
    manualPaymentReference: latestVisiblePayment?.externalReference ?? null,
    contactEmail: manualBillingContactEmail,
    contactHref: manualBillingContactHref,
    noCheckoutCopy: manualBillingOwnerCopy.noCheckout,
    instructions: manualBillingOwnerCopy.instructions,
  };
}

export function isManualBillingOpsRecord(payment: StorePaymentLike) {
  return payment.description === manualBillingOpsDescription && (payment.amountCents ?? 0) === 0;
}

export async function updateManualBillingStore(db: ManualBillingDb, actor: ActorLike, input: ManualBillingUpdateInput): Promise<ManualBillingUpdateResult> {
  if (actor.role !== "SUPER_ADMIN") return { ok: false, reason: "forbidden" };

  const plan = normalizeStorePlanCode(input.plan);
  if (!(["TRIAL", "BASIC", "PRO", "PREMIUM"] as StorePlanCode[]).includes(plan)) return { ok: false, reason: "invalid_plan" };

  const billingStatus = normalizeManualBillingStatus(input.billingStatus);
  if (!billingStatus) return { ok: false, reason: "invalid_status" };

  const trialEndsAt = parseOptionalManualBillingDate(input.trialEndsAt);
  const currentPeriodEndsAt = parseOptionalManualBillingDate(input.currentPeriodEndsAt);
  if (!trialEndsAt.ok || !currentPeriodEndsAt.ok) return { ok: false, reason: "invalid_date" };

  const manualPaymentReference = cleanOptional(input.manualPaymentReference, 160);
  const internalBillingNotes = cleanOptional(input.internalBillingNotes, 1200);
  if (looksLikeSensitivePaymentReference(manualPaymentReference)) return { ok: false, reason: "sensitive_reference" };

  const store = await db.store.findUnique({
    where: { id: input.storeId },
    select: { id: true, plan: true, planStartedAt: true, currency: true },
  });
  if (!store) return { ok: false, reason: "store_not_found" };

  const now = new Date();
  const planChanged = getNormalizedPlanCode(store.plan) !== plan;
  const updatedStore = await db.store.update({
    where: { id: store.id },
    data: {
      plan,
      planStatus: billingStatus,
      planStartedAt: store.planStartedAt ?? now,
      trialEndsAt: trialEndsAt.date,
      planRenewsAt: currentPeriodEndsAt.date,
      ...(planChanged ? { sellerAiPeriodStart: now, sellerAiConversationCount: 0 } : {}),
    },
  });

  if (manualPaymentReference || internalBillingNotes) {
    const existingOpsRecord = await db.storePayment.findFirst({
      where: {
        storeId: store.id,
        amountCents: 0,
        paymentType: "ADJUSTMENT",
        description: manualBillingOpsDescription,
      },
      orderBy: { createdAt: "desc" },
    });
    const opsData = {
      planKey: plan,
      paymentType: "ADJUSTMENT",
      amountCents: 0,
      currency: store.currency ?? "BOB",
      status: "PENDING",
      paymentMethod: "MANUAL_OTHER",
      externalReference: manualPaymentReference,
      notes: internalBillingNotes,
      description: manualBillingOpsDescription,
      periodEnd: currentPeriodEndsAt.date,
      createdByUserId: actor.id,
    };

    if (existingOpsRecord?.id) {
      await db.storePayment.update({ where: { id: existingOpsRecord.id }, data: opsData });
    } else {
      await db.storePayment.create({ data: { storeId: store.id, ...opsData } });
    }
  }

  return { ok: true, store: updatedStore };
}

export async function getAdminManualBillingRows(params: { q?: string }) {
  const q = params.q?.trim() ?? "";
  const stores = await getPrisma().store.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
            { plan: { contains: q, mode: "insensitive" } },
            { planStatus: { contains: q, mode: "insensitive" } },
            { owner: { email: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {},
    include: {
      owner: true,
      payments: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
    orderBy: { createdAt: "desc" },
    take: 250,
  });

  return stores.map((store) => {
    const snapshot = getOwnerManualBillingSnapshot(store, store.payments);
    const opsRecord = store.payments.find(isManualBillingOpsRecord) ?? null;
    return {
      store,
      snapshot,
      opsRecord,
      latestPayment: store.payments.find((payment) => (payment.amountCents ?? 0) > 0) ?? null,
    };
  });
}
