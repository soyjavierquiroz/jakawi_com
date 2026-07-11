import { formatMoney } from "@/lib/money";
import { isReasonableCustomerPhone, normalizeCustomerPhone } from "@/lib/seller-ai/whatsapp";

const handoffCodePattern = /^KJ-[A-Z0-9]{4}$/;
const phoneInputPattern = /^\+?[\d\s-]+$/;
const maxRecentMessages = 6;

type HandoffProduct = {
  id: string;
  storeId?: string;
  name: string;
  priceCents: number;
  currency: string;
};

export type HandoffSnapshot = {
  snapshotCode: string;
  intentScore: number;
  customerPhone: string | null;
  customerSummary: string | null;
  currentItem: unknown;
  lead: {
    id: string;
    storeId: string;
    customerPhone: string | null;
    intentScore: number;
    conversationSummary: string | null;
    conversation: {
      id: string;
      storeId: string;
      messages: { role: string; content: string; createdAt: Date }[];
    } | null;
  } | null;
  journey: {
    id: string;
    intentScore: number;
    customerPhone: string | null;
    conversationSummary: string | null;
    store: {
      id: string;
      name: string;
      whatsapp: string;
      currency: string | null;
      countryCode: string | null;
      locale: string | null;
    };
    currentProduct: HandoffProduct | null;
  };
};

export type ResolvedHandoffContext = {
  ok: true;
  handoff: {
    code: string;
    leadScore: number;
    leadStage: "READY_FOR_WHATSAPP";
    conversationId: string | null;
    storeId: string;
    currentProductId: string | null;
  };
  store: { name: string; whatsapp: string };
  currentProduct: { id: string; name: string; price: string; currency: string } | null;
  recentMessages: { role: "USER" | "ASSISTANT" | "SYSTEM"; content: string; createdAt: string }[];
  summary: string;
};

export type HandoffResolveResult =
  | { status: 200; body: ResolvedHandoffContext }
  | { status: 404; body: { ok: false; error: "Handoff not found" } };

export type ParsedHandoffResolvePayload =
  | { ok: true; value: { code: string; phone: string } }
  | { ok: false; error: "Missing code" | "Missing phone" | "Invalid code" | "Invalid phone" };

export function normalizeHandoffCode(input: unknown) {
  if (typeof input !== "string") return null;
  const code = input.trim().toUpperCase();
  return handoffCodePattern.test(code) ? code : null;
}

export function normalizePhone(input: unknown) {
  if (typeof input !== "string") return null;
  const phone = input.trim();
  if (!phone || phone.length > 32 || !phoneInputPattern.test(phone)) return null;
  if (!isReasonableCustomerPhone(phone)) return null;
  return normalizeCustomerPhone(phone);
}

export function parseHandoffResolvePayload(input: unknown): ParsedHandoffResolvePayload {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Missing code" };
  }

  const payload = input as Record<string, unknown>;
  if (typeof payload.code !== "string" || !payload.code.trim()) return { ok: false, error: "Missing code" };
  if (typeof payload.phone !== "string" || !payload.phone.trim()) return { ok: false, error: "Missing phone" };

  const code = normalizeHandoffCode(payload.code);
  if (!code) return { ok: false, error: "Invalid code" };

  const phone = normalizePhone(payload.phone);
  if (!phone) return { ok: false, error: "Invalid phone" };

  return { ok: true, value: { code, phone } };
}

function capText(value: string | null | undefined, maxLength: number) {
  return (value ?? "").slice(0, maxLength);
}

function roleForHandoff(role: string): "USER" | "ASSISTANT" | "SYSTEM" {
  if (role === "USER" || role === "ASSISTANT") return role;
  return "SYSTEM";
}

function currentItemFromSnapshot(value: unknown): HandoffProduct | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  if (typeof item.id !== "string" || typeof item.name !== "string" || typeof item.priceCents !== "number") return null;
  return {
    id: item.id,
    storeId: typeof item.storeId === "string" ? item.storeId : undefined,
    name: item.name,
    priceCents: item.priceCents,
    currency: typeof item.currency === "string" ? item.currency : "BOB",
  };
}

function buildCurrentProduct(snapshot: HandoffSnapshot) {
  const storeId = snapshot.journey.store.id;
  const relationProduct =
    snapshot.journey.currentProduct && (!snapshot.journey.currentProduct.storeId || snapshot.journey.currentProduct.storeId === storeId)
      ? snapshot.journey.currentProduct
      : null;
  const snapshotProduct = currentItemFromSnapshot(snapshot.currentItem);
  const product = relationProduct ?? (snapshotProduct && (!snapshotProduct.storeId || snapshotProduct.storeId === storeId) ? snapshotProduct : null);
  if (!product) return null;

  const currency = snapshot.journey.store.currency ?? product.currency;
  return {
    id: product.id,
    name: product.name,
    price: formatMoney({
      amountCents: product.priceCents,
      currency,
      countryCode: snapshot.journey.store.countryCode,
      locale: snapshot.journey.store.locale,
    }),
    currency,
  };
}

export function isMatchingHandoffPhone(snapshot: HandoffSnapshot, phone: string) {
  const lead = snapshot.lead?.storeId === snapshot.journey.store.id ? snapshot.lead : null;
  const candidatePhone = snapshot.customerPhone ?? lead?.customerPhone ?? snapshot.journey.customerPhone;
  return candidatePhone ? normalizeCustomerPhone(candidatePhone) === phone : false;
}

export function serializeHandoffContext(snapshot: HandoffSnapshot): ResolvedHandoffContext {
  const currentProduct = buildCurrentProduct(snapshot);
  const lead = snapshot.lead?.storeId === snapshot.journey.store.id ? snapshot.lead : null;
  const conversation = lead?.conversation?.storeId === snapshot.journey.store.id ? lead.conversation : null;
  const summary = snapshot.customerSummary ?? lead?.conversationSummary ?? snapshot.journey.conversationSummary;

  return {
    ok: true,
    handoff: {
      code: snapshot.snapshotCode,
      leadScore: snapshot.intentScore,
      leadStage: "READY_FOR_WHATSAPP",
      conversationId: conversation?.id ?? null,
      storeId: snapshot.journey.store.id,
      currentProductId: currentProduct?.id ?? null,
    },
    store: {
      name: snapshot.journey.store.name,
      whatsapp: snapshot.journey.store.whatsapp,
    },
    currentProduct,
    recentMessages: (conversation?.messages ?? [])
      .slice(0, maxRecentMessages)
      .reverse()
      .map((message) => ({
        role: roleForHandoff(message.role),
        content: capText(message.content, 500),
        createdAt: message.createdAt.toISOString(),
      })),
    summary: capText(summary, 1000),
  };
}

export const buildResolvedHandoffContext = serializeHandoffContext;

export async function resolveHandoffContext({
  code,
  phone,
  findSnapshot,
}: {
  code: string;
  phone: string;
  findSnapshot: (code: string) => Promise<HandoffSnapshot | null>;
}): Promise<HandoffResolveResult> {
  const snapshot = await findSnapshot(code);
  if (!snapshot || !isMatchingHandoffPhone(snapshot, phone)) {
    return { status: 404, body: { ok: false, error: "Handoff not found" } };
  }

  return { status: 200, body: serializeHandoffContext(snapshot) };
}
