import { z } from "zod";
import { formatMoney } from "@/lib/money";
import { isReasonableCustomerPhone, normalizeCustomerPhone } from "@/lib/seller-ai/whatsapp";

const handoffResolveSchema = z.object({
  code: z.string().trim().min(1).max(32),
  phone: z.string().trim().min(1).max(32),
});

type HandoffProduct = {
  id: string;
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
    intentScore: number;
    conversationSummary: string | null;
    conversation: {
      id: string;
      messages: { role: string; content: string; createdAt: Date }[];
    } | null;
  } | null;
  journey: {
    id: string;
    intentScore: number;
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
  recentMessages: { role: "customer" | "assistant" | "system"; text: string; createdAt: string }[];
  summary: string;
};

export type HandoffResolveResult =
  | { status: 200; body: ResolvedHandoffContext }
  | { status: 404; body: { ok: false; error: "Handoff not found" } };

export function parseHandoffResolvePayload(input: unknown) {
  const parsed = handoffResolveSchema.safeParse(input);
  if (!parsed.success || !isReasonableCustomerPhone(parsed.data.phone)) return null;

  return {
    code: parsed.data.code.toUpperCase(),
    phone: normalizeCustomerPhone(parsed.data.phone),
  };
}

function capText(value: string | null | undefined, maxLength: number) {
  return (value ?? "").slice(0, maxLength);
}

function roleForHandoff(role: string): "customer" | "assistant" | "system" {
  if (role === "USER") return "customer";
  if (role === "ASSISTANT") return "assistant";
  return "system";
}

function currentItemFromSnapshot(value: unknown): HandoffProduct | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  if (typeof item.id !== "string" || typeof item.name !== "string" || typeof item.priceCents !== "number") return null;
  return {
    id: item.id,
    name: item.name,
    priceCents: item.priceCents,
    currency: typeof item.currency === "string" ? item.currency : "BOB",
  };
}

function buildCurrentProduct(snapshot: HandoffSnapshot) {
  const product = snapshot.journey.currentProduct ?? currentItemFromSnapshot(snapshot.currentItem);
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
  return !snapshot.customerPhone || normalizeCustomerPhone(snapshot.customerPhone) === phone;
}

export function buildResolvedHandoffContext(snapshot: HandoffSnapshot): ResolvedHandoffContext {
  const currentProduct = buildCurrentProduct(snapshot);
  const conversation = snapshot.lead?.conversation ?? null;
  const summary = snapshot.customerSummary ?? snapshot.lead?.conversationSummary ?? snapshot.journey.conversationSummary;

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
      .slice(0, 8)
      .reverse()
      .map((message) => ({
        role: roleForHandoff(message.role),
        text: capText(message.content, 500),
        createdAt: message.createdAt.toISOString(),
      })),
    summary: capText(summary, 1000),
  };
}

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

  return { status: 200, body: buildResolvedHandoffContext(snapshot) };
}
