import assert from "node:assert/strict";
import test from "node:test";
import { buildAssistantMessage } from "@/app/api/seller-ai/chat/route";
import { getMenuProductProfile } from "@/lib/seller-ai/context";
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

const exitososProducts = [
  { slug: "beef-stroganoff", name: "Beef Stroganoff", category: { name: "Platos", slug: "platos" }, description: "Plato de Beef Stroganoff, cremoso y contundente." },
  caesarProduct,
  { slug: "creamy-chicken-alfredo", name: "Creamy Chicken Alfredo", category: { name: "Pastas", slug: "pastas" }, description: "Pasta Alfredo cremosa con pollo." },
  { slug: "pan-seared-duck", name: "Pan-Seared Duck", category: { name: "Platos", slug: "platos" }, description: "Plato de pato sellado a la sartén." },
  { slug: "pan-seared-salmon", name: "Pan-Seared Salmon", category: { name: "Platos", slug: "platos" }, description: "Salmón sellado a la sartén." },
  { slug: "roasted-tomato-soup", name: "Roasted Tomato Soup", category: { name: "Sopas", slug: "sopas" }, description: "Sopa de tomate rostizado." },
  { slug: "tandoori-chicken", name: "Tandoori Chicken", category: { name: "Platos", slug: "platos" }, description: "Pollo estilo tandoori." },
];

test("Exitosos menu profile has Caesar ingredients and category", () => {
  const profile = getMenuProductProfile({ store: exitososStore, product: caesarProduct });

  assert.equal(caesarProduct.category.name, "Ensaladas");
  assert.deepEqual(profile?.ingredients, ["lechuga fresca", "pollo", "aderezo César", "queso parmesano", "crutones"]);
  assert.equal(profile?.portionNote, "Porción individual.");
  assert.equal(profile?.ownerVerified, false);
});

test("all 7 Exitosos products have coherent menu descriptions and profiles", () => {
  assert.equal(exitososProducts.length, 7);
  for (const product of exitososProducts) {
    const profile = getMenuProductProfile({ store: exitososStore, product });
    assert.ok(product.description.length > 20);
    assert.ok(product.category.name.length > 0);
    assert.ok(profile);
    assert.equal(profile.menuType, "food");
    assert.ok(profile.ingredients.length > 0);
  }
});

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
  assert.doesNotMatch(reply, /parece/i);
  assert.match(reply, /lechuga fresca/i);
  assert.match(reply, /pollo/i);
  assert.match(reply, /aderezo César/i);
  assert.match(reply, /queso parmesano/i);
  assert.match(reply, /crutones/i);
  assert.match(reply, /confirmar disponibilidad|WhatsApp/i);
});

test("food ingredient fallback is honest without saying parece", () => {
  const reply = buildAssistantMessage({
    mode: "PRODUCT_ADVISOR",
    userMessage: "ingredientes",
    product: { ...caesarProduct, slug: "unknown-dish", name: "Plato nuevo" },
    store: exitososStore,
    recommendations: [],
  });

  assert.match(reply, /Aún no tengo ingredientes detallados/i);
  assert.doesNotMatch(reply, /parece/i);
  assert.match(reply, /WhatsApp/i);
});

test("curated menu profile ingredients are used when present", () => {
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

  assert.match(reply, /lechuga fresca, pollo, aderezo César, queso parmesano, crutones/i);
});

test("food mode preserves WhatsApp handoff for qualified leads", () => {
  const qualification = computeLeadQualification({ messages: ["Quiero pedir por WhatsApp"] });

  assert.equal(qualification.readyForWhatsapp, true);
  assert.equal(shouldShowWhatsappHandoff(qualification, "+59170000000"), true);
});

test("food order copy is short and asks for phone when needed", () => {
  const reply = buildAssistantMessage({
    mode: "CLOSING_PREP",
    userMessage: "Pedir por WhatsApp",
    product: caesarProduct,
    store: exitososStore,
    recommendations: [],
    shouldAskPhone: true,
  });

  assert.match(reply, /Te dejo el pedido de Caesar with Chicken listo para WhatsApp/i);
  assert.match(reply, /A qué número/i);
  assert.match(reply, /confirme disponibilidad/i);
  assert.doesNotMatch(reply, /te conectaré con nuestro WhatsApp/i);
  assert.ok(reply.length < 180);
});

test("food quick replies are contextual after ingredients and order", () => {
  const afterIngredients = buildQuickRepliesForMode({
    mode: "PRODUCT_ADVISOR",
    store: exitososStore,
    product: caesarProduct,
    category: caesarProduct.category,
    lastUserMessage: "Ingredientes",
  });
  const afterOrder = buildQuickRepliesForMode({
    mode: "CLOSING_PREP",
    store: exitososStore,
    product: caesarProduct,
    category: caesarProduct.category,
    lastUserMessage: "Pedir por WhatsApp",
  });

  assert.deepEqual(afterIngredients, ["Confirmar disponibilidad", "Pedir por WhatsApp", "Ver precio", "Volver al producto"]);
  assert.deepEqual(afterOrder, ["Ya te dejo mi número", "Ver precio", "Confirmar disponibilidad"]);
  assert.doesNotMatch([...afterIngredients, ...afterOrder].join(" "), forbiddenFoodReplies);
});

test("non-food ecommerce products use product advisor chips", () => {
  const replies = buildQuickRepliesForMode({
    mode: "PRODUCT_ADVISOR",
    commercialType: "PRODUCT_STORE",
    store: { slug: "megalon", name: "Megalon", commercialType: "PRODUCT_STORE" },
    product: { name: "Celular demo" },
    category: { name: "Celulares" },
  });

  assert.deepEqual(replies, ["Tallas", "Colores", "Precio", "Comprar"]);
});

test("lead scoring still qualifies explicit purchase intent", () => {
  const qualification = computeLeadQualification({ messages: ["¿Cuál es el precio?", "Quiero comprar"] });

  assert.equal(qualification.stage, "READY_FOR_WHATSAPP");
  assert.equal(qualification.score >= 70, true);
});
