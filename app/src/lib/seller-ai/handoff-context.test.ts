import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildResolvedHandoffContext,
  parseHandoffResolvePayload,
  resolveHandoffContext,
  type HandoffSnapshot,
} from "@/lib/seller-ai/handoff-context";

function snapshotFixture(overrides: Partial<HandoffSnapshot> = {}): HandoffSnapshot {
  return {
    snapshotCode: "KJ-8F42",
    intentScore: 82,
    customerPhone: "+573001234567",
    customerSummary: "Resumen comercial",
    currentItem: null,
    journey: {
      id: "journey-1",
      intentScore: 70,
      conversationSummary: "Resumen de journey",
      store: {
        id: "store-1",
        name: "Tienda demo",
        whatsapp: "+573009998888",
        currency: "COP",
        countryCode: "CO",
        locale: "es-CO",
      },
      currentProduct: { id: "product-1", name: "Producto demo", priceCents: 125000, currency: "COP" },
    },
    lead: {
      id: "lead-1",
      intentScore: 80,
      conversationSummary: "Resumen de lead",
      conversation: {
        id: "conversation-1",
        messages: [
          { role: "ASSISTANT", content: "¿Cómo puedo ayudarte?", createdAt: new Date("2026-07-10T10:00:00.000Z") },
          { role: "USER", content: "Quiero comprar", createdAt: new Date("2026-07-10T10:01:00.000Z") },
        ],
      },
    },
    ...overrides,
  };
}

test("resolve acepta código normalizado y devuelve sólo el contexto capado", async () => {
  const payload = parseHandoffResolvePayload({ code: " kj-8f42 ", phone: "+57 300 123 4567" });
  assert.deepEqual(payload, { code: "KJ-8F42", phone: "+573001234567" });

  const result = await resolveHandoffContext({
    code: payload!.code,
    phone: payload!.phone,
    findSnapshot: async (code) => {
      assert.equal(code, "KJ-8F42");
      return snapshotFixture();
    },
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
  if (!result.body.ok) return assert.fail("expected handoff context");
  assert.deepEqual(result.body.handoff, {
    code: "KJ-8F42",
    leadScore: 82,
    leadStage: "READY_FOR_WHATSAPP",
    conversationId: "conversation-1",
    storeId: "store-1",
    currentProductId: "product-1",
  });
  assert.deepEqual(result.body.store, { name: "Tienda demo", whatsapp: "+573009998888" });
  assert.deepEqual(result.body.currentProduct, { id: "product-1", name: "Producto demo", price: "$1.250 COP", currency: "COP" });
  assert.deepEqual(result.body.recentMessages.map((message) => message.role), ["customer", "assistant"]);
  assert.equal(result.body.summary, "Resumen comercial");
  assert.doesNotMatch(JSON.stringify(result.body), /573001234567/);
});

test("un código inexistente o un teléfono que no coincide devuelve 404 sin contexto", async () => {
  const missing = await resolveHandoffContext({
    code: "KJ-NONE",
    phone: "+573001234567",
    findSnapshot: async () => null,
  });
  const mismatch = await resolveHandoffContext({
    code: "KJ-8F42",
    phone: "+573001111111",
    findSnapshot: async () => snapshotFixture(),
  });

  assert.deepEqual(missing, { status: 404, body: { ok: false, error: "Handoff not found" } });
  assert.deepEqual(mismatch, { status: 404, body: { ok: false, error: "Handoff not found" } });
});

test("mensajes, resumen y campos expuestos quedan limitados", () => {
  const messages = Array.from({ length: 10 }, (_, index) => ({
    role: index % 2 ? "USER" : "ASSISTANT",
    content: `${index}`.repeat(600),
    createdAt: new Date(`2026-07-10T10:${String(index).padStart(2, "0")}:00.000Z`),
  }));
  const context = buildResolvedHandoffContext(
    snapshotFixture({
      customerSummary: "s".repeat(1100),
      currentItem: [{ id: "catalog-secret" }],
      lead: {
        ...snapshotFixture().lead!,
        conversation: { id: "conversation-1", messages },
      },
    }),
  );

  assert.equal(context.recentMessages.length, 8);
  assert.ok(context.recentMessages.every((message) => message.text.length === 500));
  assert.equal(context.summary.length, 1000);
  assert.equal(context.recentMessages[0]?.createdAt, "2026-07-10T10:07:00.000Z");
  assert.equal(context.currentProduct?.id, "product-1");
  assert.doesNotMatch(JSON.stringify(context), /catalog-secret|sessionId|visitorId|customerPhone|apiKey|secret/i);
});

test("el resolver no contiene integraciones externas ni llamadas a OpenAI", () => {
  const source = readFileSync(new URL("../../app/api/handoffs/resolve/route.ts", import.meta.url), "utf8");

  assert.doesNotMatch(source, /fetch\(|openai|whatsapp api|meta|tiktok|n8n/i);
  assert.doesNotMatch(source, /process\.env|customerPhone.*update|\.update\(/i);
});
