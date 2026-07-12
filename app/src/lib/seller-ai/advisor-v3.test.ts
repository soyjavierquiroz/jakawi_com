import assert from "node:assert/strict";
import test from "node:test";
import { buildAssistantMessage } from "@/app/api/seller-ai/chat/route";
import { calculateIntentScore } from "@/lib/seller-ai/intent";
import { resolveSellerIntent } from "@/lib/seller-ai/intent-router";
import { computeLeadQualification } from "@/lib/seller-ai/lead-qualification";
import { resolveOfferType } from "@/lib/seller-ai/offer-type";
import { getInitialQuickReplyLabels, toSellerQuickReplies } from "@/lib/seller-ai/quick-replies";

const exitososStore = {
  slug: "javier",
  name: "Exitosos",
  description: "Tienda de comida con platos preparados.",
  commercialType: "PRODUCT_STORE",
  currency: "BOB",
  countryCode: "BO",
  locale: "es-BO",
};

const caesarProduct = {
  id: "product-caesar",
  name: "Caesar with Chicken",
  slug: "caesar-with-chicken",
  description: "Ensalada César con pollo, fresca y práctica.",
  priceCents: 2500,
  currency: "BOB",
  categoryId: "cat-ensaladas",
  category: { name: "Ensaladas", slug: "ensaladas" },
};

test("resolveOfferType supports MENU, PRODUCT and SERVICE", () => {
  assert.equal(resolveOfferType(exitososStore, caesarProduct), "MENU");
  assert.equal(resolveOfferType({ slug: "maletas-demo", name: "Maletas Demo", commercialType: "PRODUCT_STORE" }, { name: "Maleta carry on", category: { name: "Maletas", slug: "maletas" } }), "PRODUCT");
  assert.equal(resolveOfferType({ slug: "spa-demo", name: "Spa Demo", commercialType: "SERVICES" }, { name: "Tratamiento facial", category: { name: "Tratamientos", slug: "tratamientos" } }), "SERVICE");
});

test("quick reply action wins over label and text", () => {
  assert.equal(
    resolveSellerIntent({
      quickReplyAction: "ASK_INGREDIENTS",
      quickReplyLabel: "Ingredientes",
      text: "quiero pedir",
      offerType: "MENU",
    }),
    "ASK_INGREDIENTS",
  );
});

test("Ingredientes quick reply answers ingredients and never starts order", () => {
  const intent = resolveSellerIntent({ quickReplyAction: "ASK_INGREDIENTS", quickReplyLabel: "Ingredientes", offerType: "MENU" });
  const reply = buildAssistantMessage({
    mode: "PRODUCT_ADVISOR",
    userMessage: "Ingredientes",
    product: caesarProduct,
    store: exitososStore,
    recommendations: [],
    offerType: "MENU",
    intent,
  });

  assert.match(reply, /lechuga fresca/i);
  assert.match(reply, /crutones/i);
  assert.doesNotMatch(reply, /Te dejo el pedido/i);
  assert.doesNotMatch(reply, /A qué número|WhatsApp válido|te escribe/i);
});

test("ASK_INGREDIENTS stays informational even with high prior intent", () => {
  const score = calculateIntentScore({
    events: [
      { eventType: "CHAT_OPENED" },
      { eventType: "PRODUCT_VIEW", productId: "a" },
      { eventType: "PRODUCT_VIEW", productId: "b" },
    ],
    messages: [
      { role: "USER", content: "precio" },
      { role: "USER", content: "disponible" },
      { role: "USER", content: "quiero comprar" },
    ],
  });
  const intent = resolveSellerIntent({ quickReplyAction: "ASK_INGREDIENTS", quickReplyLabel: "Ingredientes", offerType: "MENU" });
  const reply = buildAssistantMessage({
    mode: score >= 70 ? "PRODUCT_ADVISOR" : "PRODUCT_ADVISOR",
    userMessage: "Ingredientes",
    product: caesarProduct,
    store: exitososStore,
    recommendations: [],
    offerType: "MENU",
    intent,
  });

  assert.equal(score >= 70, true);
  assert.doesNotMatch(reply, /A qué número|Te dejo el pedido/i);
});

test("offer type quick replies expose explicit actions", () => {
  assert.deepEqual(toSellerQuickReplies(getInitialQuickReplyLabels("MENU"), "MENU"), [
    { label: "Ingredientes", action: "ASK_INGREDIENTS" },
    { label: "Porción", action: "ASK_PORTION" },
    { label: "Precio", action: "ASK_PRICE" },
    { label: "Pedir", action: "START_ORDER" },
  ]);
  assert.deepEqual(toSellerQuickReplies(getInitialQuickReplyLabels("PRODUCT"), "PRODUCT"), [
    { label: "Características", action: "ASK_FEATURES" },
    { label: "Medidas", action: "ASK_SIZE" },
    { label: "Precio", action: "ASK_PRICE" },
    { label: "Comprar", action: "START_ORDER" },
  ]);
  assert.deepEqual(toSellerQuickReplies(getInitialQuickReplyLabels("SERVICE"), "SERVICE"), [
    { label: "Qué incluye", action: "ASK_SERVICE_INCLUDED" },
    { label: "Duración", action: "ASK_DURATION" },
    { label: "Precio", action: "ASK_PRICE" },
    { label: "Agendar", action: "START_BOOKING" },
  ]);
});

test("lead score considers multiple viewed products", () => {
  const score = calculateIntentScore({
    events: [
      { eventType: "CHAT_OPENED" },
      { eventType: "PRODUCT_VIEW", productId: "product-a" },
      { eventType: "PRODUCT_VIEW", productId: "product-b" },
    ],
    messages: [{ role: "USER", content: "Pedir" }],
  });

  assert.equal(score >= 50, true);
});

test("short Pedir chip qualifies for WhatsApp handoff", () => {
  const qualification = computeLeadQualification({ messages: ["Pedir"], whatsappNumber: "+59170000000" });

  assert.equal(qualification.stage, "READY_FOR_WHATSAPP");
  assert.equal(qualification.readyForWhatsapp, true);
});
