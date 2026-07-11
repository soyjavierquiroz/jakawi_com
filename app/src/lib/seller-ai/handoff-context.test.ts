import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { POST } from "@/app/api/handoffs/resolve/route";
import {
  normalizeHandoffCode,
  normalizePhone,
  serializeHandoffContext,
  type HandoffSnapshot,
} from "@/lib/seller-ai/handoff-context";

type PrismaMock = {
  commercialSnapshot: {
    findUnique: (args: unknown) => Promise<HandoffSnapshot | null>;
  };
};

const globalForPrisma = globalThis as typeof globalThis & { prisma?: PrismaMock };

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
      customerPhone: "+573001234567",
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
      storeId: "store-1",
      customerPhone: "+573001234567",
      intentScore: 80,
      conversationSummary: "Resumen de lead",
      conversation: {
        id: "conversation-1",
        storeId: "store-1",
        messages: [
          { role: "USER", content: "Quiero comprar", createdAt: new Date("2026-07-10T10:01:00.000Z") },
          { role: "ASSISTANT", content: "Claro, te ayudo.", createdAt: new Date("2026-07-10T10:00:00.000Z") },
        ],
      },
    },
    ...overrides,
  };
}

function installPrismaMock(findUnique: PrismaMock["commercialSnapshot"]["findUnique"]) {
  globalForPrisma.prisma = { commercialSnapshot: { findUnique } };
}

async function postResolve(body: unknown) {
  const response = await POST(
    new Request("http://localhost/api/handoffs/resolve", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
  return { status: response.status, body: await response.json() };
}

test("normaliza código y teléfono de handoff", () => {
  assert.equal(normalizeHandoffCode(" kj-8f42 "), "KJ-8F42");
  assert.equal(normalizePhone("+57 300-123-4567"), "+573001234567");
});

test("POST /api/handoffs/resolve devuelve 400 si falta code", async () => {
  installPrismaMock(async () => assert.fail("database should not be called"));

  const result = await postResolve({ phone: "+57 300 123 4567" });

  assert.equal(result.status, 400);
  assert.deepEqual(result.body, { ok: false, error: "Missing code" });
});

test("POST /api/handoffs/resolve devuelve 400 si falta phone", async () => {
  installPrismaMock(async () => assert.fail("database should not be called"));

  const result = await postResolve({ code: "KJ-8F42" });

  assert.equal(result.status, 400);
  assert.deepEqual(result.body, { ok: false, error: "Missing phone" });
});

test("POST /api/handoffs/resolve devuelve 400 si code es inválido", async () => {
  installPrismaMock(async () => assert.fail("database should not be called"));

  const result = await postResolve({ code: "SNP-1234", phone: "+57 300 123 4567" });

  assert.equal(result.status, 400);
  assert.deepEqual(result.body, { ok: false, error: "Invalid code" });
});

test("POST /api/handoffs/resolve devuelve 404 si code no existe", async () => {
  installPrismaMock(async (args) => {
    assert.deepEqual((args as { where: { snapshotCode: string } }).where, { snapshotCode: "KJ-NONE" });
    return null;
  });

  const result = await postResolve({ code: "KJ-NONE", phone: "+57 300 123 4567" });

  assert.equal(result.status, 404);
  assert.deepEqual(result.body, { ok: false, error: "Handoff not found" });
});

test("POST /api/handoffs/resolve devuelve 404 si phone no coincide", async () => {
  installPrismaMock(async () => snapshotFixture());

  const result = await postResolve({ code: "KJ-8F42", phone: "+57 300 000 0000" });

  assert.equal(result.status, 404);
  assert.deepEqual(result.body, { ok: false, error: "Handoff not found" });
});

test("POST /api/handoffs/resolve devuelve 200 si code y phone coinciden", async () => {
  installPrismaMock(async (args) => {
    const select = (args as { select: { lead: { select: { conversation: { select: { messages: { take: number } } } } } } }).select;
    assert.equal(select.lead.select.conversation.select.messages.take, 6);
    assert.deepEqual(Object.keys(select).sort(), ["currentItem", "customerPhone", "customerSummary", "intentScore", "journey", "lead", "snapshotCode"].sort());
    return snapshotFixture();
  });

  const result = await postResolve({ code: " kj-8f42 ", phone: "+57 300 123 4567" });

  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
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
  assert.deepEqual(result.body.recentMessages, [
    { role: "ASSISTANT", content: "Claro, te ayudo.", createdAt: "2026-07-10T10:00:00.000Z" },
    { role: "USER", content: "Quiero comprar", createdAt: "2026-07-10T10:01:00.000Z" },
  ]);
  assert.equal(result.body.summary, "Resumen comercial");
});

test("la respuesta queda capada y no expone secretos ni objetos completos", () => {
  const context = serializeHandoffContext(
    snapshotFixture({
      customerSummary: "s".repeat(1100),
      currentItem: [{ id: "catalog-secret" }],
    }),
  );
  const serialized = JSON.stringify(context);

  assert.equal(context.summary.length, 1000);
  assert.doesNotMatch(serialized, /573001234567|catalog-secret|sessionId|visitorId|customerPhone|apiKey|secret|tokens|costEstimate|modelUsed/i);
});

test("recentMessages incluye máximo 6 mensajes recientes", () => {
  const messages = Array.from({ length: 10 }, (_, index) => ({
    role: index % 2 ? "USER" : "ASSISTANT",
    content: `${index}`.repeat(600),
    createdAt: new Date(`2026-07-10T10:${String(9 - index).padStart(2, "0")}:00.000Z`),
  }));
  const context = serializeHandoffContext(
    snapshotFixture({
      lead: {
        ...snapshotFixture().lead!,
        conversation: { id: "conversation-1", storeId: "store-1", messages },
      },
    }),
  );

  assert.equal(context.recentMessages.length, 6);
  assert.ok(context.recentMessages.every((message) => message.content.length === 500));
  assert.equal(context.recentMessages[0]?.createdAt, "2026-07-10T10:04:00.000Z");
  assert.equal(context.recentMessages.at(-1)?.createdAt, "2026-07-10T10:09:00.000Z");
});

test("no filtra conversación o resumen de otro store/lead", () => {
  const context = serializeHandoffContext(
    snapshotFixture({
      customerSummary: null,
      lead: {
        id: "lead-foreign",
        storeId: "store-foreign",
        customerPhone: "+573001234567",
        intentScore: 99,
        conversationSummary: "secret foreign lead summary",
        conversation: {
          id: "conversation-foreign",
          storeId: "store-foreign",
          messages: [{ role: "USER", content: "secret foreign message", createdAt: new Date("2026-07-10T10:02:00.000Z") }],
        },
      },
    }),
  );
  const serialized = JSON.stringify(context);

  assert.equal(context.handoff.conversationId, null);
  assert.equal(context.summary, "Resumen de journey");
  assert.deepEqual(context.recentMessages, []);
  assert.doesNotMatch(serialized, /foreign|secret/);
});

test("no filtra producto relacional de otro store", () => {
  const context = serializeHandoffContext(
    snapshotFixture({
      currentItem: null,
      journey: {
        ...snapshotFixture().journey,
        currentProduct: { id: "product-foreign", storeId: "store-foreign", name: "Producto secreto", priceCents: 99900, currency: "COP" },
      },
    }),
  );

  assert.equal(context.handoff.currentProductId, null);
  assert.equal(context.currentProduct, null);
  assert.doesNotMatch(JSON.stringify(context), /foreign|secreto/i);
});

test("el resolver no contiene integraciones externas ni escrituras", () => {
  const routeSource = readFileSync(new URL("../../app/api/handoffs/resolve/route.ts", import.meta.url), "utf8");
  const helperSource = readFileSync(new URL("./handoff-context.ts", import.meta.url), "utf8");
  const source = `${routeSource}\n${helperSource}`;

  assert.doesNotMatch(source, /fetch\(|openai|n8n|meta|tiktok|buildWhatsappUrl|process\.env/i);
  assert.doesNotMatch(routeSource, /customerPhone.*update|\.update\(|\.create\(|\.delete\(|\.upsert\(/i);
});
