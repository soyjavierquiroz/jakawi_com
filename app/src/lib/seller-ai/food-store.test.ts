import assert from "node:assert/strict";
import test from "node:test";
import { buildAssistantMessage } from "@/app/api/seller-ai/chat/route";
import { buildQuickRepliesForMode } from "@/lib/seller-ai/modes";
import { computeLeadQualification, shouldShowWhatsappHandoff } from "@/lib/seller-ai/lead-qualification";

const forbiddenFoodReplies = /\b(Trabajo|Estudio|Viaje|Para regalar|Uso diario)\b/i;

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
  description: "Ensalada César con pollo, fresca y práctica, ideal para una comida ligera con proteína.",
  priceCents: 2500,
  currency: "BOB",
  categoryId: "cat-ensaladas",
  category: { name: "Ensaladas", slug: "ensaladas" },
};

test("Exitosos food products do not show generic occasion chips", () => {
  const replies = buildQuickRepliesForMode({
    mode: "PRODUCT_ADVISOR",
    commercialType: "PRODUCT_STORE",
    store: exitososStore,
    product: caesarProduct,
    category: caesarProduct.category,
  });

  assert.deepEqual(replies, ["Ingredientes", "Porción", "Precio", "Pedir"]);
  assert.doesNotMatch(replies.join(" "), forbiddenFoodReplies);
});

test("Caesar with Chicken shows food quick replies", () => {
  const replies = buildQuickRepliesForMode({
    mode: "PRODUCT_ADVISOR",
    store: exitososStore,
    product: caesarProduct,
    category: caesarProduct.category,
  });

  assert.ok(replies.includes("Ingredientes"));
  assert.ok(replies.includes("Porción"));
  assert.ok(replies.includes("Precio"));
  assert.ok(replies.includes("Pedir"));
});

test("ingredient question for food does not answer with work gift or daily-use copy", () => {
  const reply = buildAssistantMessage({
    mode: "PRODUCT_ADVISOR",
    userMessage: "cuales son los ingredientes?",
    product: caesarProduct,
    store: exitososStore,
    recommendations: [],
  });

  assert.doesNotMatch(reply, /trabajo|regalo|estudio|viaje|uso diario/i);
  assert.match(reply, /No tengo la lista exacta de ingredientes/i);
  assert.match(reply, /ensalada tipo César con pollo/i);
  assert.match(reply, /WhatsApp/i);
});

test("explicit ingredient descriptions are used when present", () => {
  const reply = buildAssistantMessage({
    mode: "PRODUCT_ADVISOR",
    userMessage: "¿Cuáles son los ingredientes?",
    product: {
      ...caesarProduct,
      description: "Ingredientes: lechuga, pollo, crutones y aderezo César.",
    },
    store: exitososStore,
    recommendations: [],
  });

  assert.match(reply, /lechuga, pollo, crutones y aderezo César/i);
});

test("food mode preserves WhatsApp handoff for qualified leads", () => {
  const qualification = computeLeadQualification({ messages: ["Quiero pedir por WhatsApp"] });

  assert.equal(qualification.readyForWhatsapp, true);
  assert.equal(shouldShowWhatsappHandoff(qualification, "+59170000000"), true);
});

test("non-food ecommerce products can keep occasion chips", () => {
  const replies = buildQuickRepliesForMode({
    mode: "PRODUCT_ADVISOR",
    commercialType: "PRODUCT_STORE",
    store: { slug: "megalon", name: "Megalon", commercialType: "PRODUCT_STORE" },
    product: { name: "Celular demo" },
    category: { name: "Celulares" },
  });

  assert.ok(replies.includes("Trabajo"));
  assert.ok(replies.includes("Fotos"));
});

test("lead scoring still qualifies explicit purchase intent", () => {
  const qualification = computeLeadQualification({ messages: ["¿Cuál es el precio?", "Quiero comprar"] });

  assert.equal(qualification.stage, "READY_FOR_WHATSAPP");
  assert.equal(qualification.score >= 70, true);
});
