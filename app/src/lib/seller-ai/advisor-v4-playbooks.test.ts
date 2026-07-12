import assert from "node:assert/strict";
import test from "node:test";
import { buildAssistantMessage } from "@/app/api/seller-ai/chat/route";
import { resolveAdvisorPlaybook } from "@/lib/seller-ai/context";
import { isInformationalSellerIntent, resolveSellerIntent } from "@/lib/seller-ai/intent-router";
import { computeLeadQualification, shouldExposeWhatsappHandoffForIntent } from "@/lib/seller-ai/lead-qualification";
import { resolveOfferType } from "@/lib/seller-ai/offer-type";

const boutiqueStore = {
  slug: "boutique-luna",
  name: "Boutique Luna",
  description: "Vestidos para dama.",
  commercialType: "PRODUCT_STORE",
  currency: "BOB",
  countryCode: "BO",
  locale: "es-BO",
};

const redDress = {
  id: "vestido-rojo-de-fiesta",
  name: "Vestido Rojo de Fiesta",
  slug: "vestido-rojo-de-fiesta",
  description: "Vestido rojo de fiesta para dama.\nTallas: M, L\nColor: rojo",
  priceCents: 26000,
  currency: "BOB",
  categoryId: "vestidos-fiesta",
  category: { name: "Vestidos de fiesta", slug: "vestidos-fiesta" },
};

const floralDress = {
  ...redDress,
  id: "vestido-floral-midi",
  name: "Vestido Floral Midi",
  slug: "vestido-floral-midi",
  description: "Vestido midi floral para dama.\nTallas: S, M, L\nColor: floral claro\nMaterial: tela ligera",
  priceCents: 18000,
};

const satinDress = {
  ...redDress,
  id: "vestido-largo-satinado",
  name: "Vestido Largo Satinado",
  slug: "vestido-largo-satinado",
  description: "Vestido largo satinado para dama.",
  priceCents: 32000,
};

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

const serviceStore = {
  slug: "spa-demo",
  name: "Spa Demo",
  description: "Servicios de bienestar con agenda.",
  commercialType: "SERVICES",
  currency: "BOB",
  countryCode: "BO",
  locale: "es-BO",
};

const serviceProduct = {
  id: "facial-demo",
  name: "Tratamiento facial",
  slug: "tratamiento-facial",
  description: "Incluye limpieza facial, mascarilla hidratante y asesoría básica de cuidado.",
  priceCents: 12000,
  currency: "BOB",
  categoryId: "servicios",
  category: { name: "Servicios", slug: "servicios" },
};

test("v4 bug: occasion question answers before closing for Vestido Rojo de Fiesta", () => {
  const intent = resolveSellerIntent({ text: "y para qué evento es más adecuado?", offerType: "PRODUCT" });
  const reply = buildAssistantMessage({
    mode: "PRODUCT_ADVISOR",
    userMessage: "y para qué evento es más adecuado?",
    product: redDress,
    store: boutiqueStore,
    recommendations: [],
    offerType: "PRODUCT",
    intent,
  });

  assert.ok(intent === "ASK_OCCASION" || intent === "ASK_SUITABILITY");
  assert.match(reply, /celebraciones de noche/i);
  assert.match(reply, /cumpleaños/i);
  assert.match(reply, /cenas/i);
  assert.match(reply, /fiestas/i);
  assert.doesNotMatch(reply, /ya tenemos el contexto/i);
  assert.doesNotMatch(reply, /deja tu número|dejar tu número|a qué número/i);
});

test("v4 fashion playbook resolves Boutique Luna dress profile", () => {
  const playbook = resolveAdvisorPlaybook(boutiqueStore, redDress);

  assert.equal(playbook.offerType, "PRODUCT");
  assert.equal(playbook.vertical, "fashion");
  assert.equal(playbook.category, "dress");
  assert.ok(playbook.supportedIntents.includes("ASK_OCCASION"));
  assert.ok(playbook.primaryFacts.includes("tallas"));
});

test("v4 fashion advice handles wedding and formal occasions coherently", () => {
  const floralIntent = resolveSellerIntent({ text: "¿Sirve para boda de día?", offerType: "PRODUCT" });
  const floralReply = buildAssistantMessage({ mode: "PRODUCT_ADVISOR", userMessage: "¿Sirve para boda de día?", product: floralDress, store: boutiqueStore, recommendations: [], offerType: "PRODUCT", intent: floralIntent });
  const satinIntent = resolveSellerIntent({ text: "¿Sirve para boda o evento formal?", offerType: "PRODUCT" });
  const satinReply = buildAssistantMessage({ mode: "PRODUCT_ADVISOR", userMessage: "¿Sirve para boda o evento formal?", product: satinDress, store: boutiqueStore, recommendations: [], offerType: "PRODUCT", intent: satinIntent });

  assert.equal(floralIntent, "ASK_OCCASION");
  assert.match(floralReply, /boda de día|evento campestre/i);
  assert.match(floralReply, /Vestido Largo Satinado/i);
  assert.ok(satinIntent === "ASK_OCCASION" || satinIntent === "ASK_SUITABILITY");
  assert.match(satinReply, /eventos formales/i);
  assert.match(satinReply, /bodas/i);
});

test("v4 fashion answers size, color, material, price, and explicit order correctly", () => {
  const sizeReply = buildAssistantMessage({ mode: "PRODUCT_ADVISOR", userMessage: "tallas", product: redDress, store: boutiqueStore, recommendations: [], offerType: "PRODUCT", intent: "ASK_SIZE" });
  const colorReply = buildAssistantMessage({ mode: "PRODUCT_ADVISOR", userMessage: "color", product: redDress, store: boutiqueStore, recommendations: [], offerType: "PRODUCT", intent: "ASK_COLOR" });
  const materialReply = buildAssistantMessage({ mode: "PRODUCT_ADVISOR", userMessage: "de qué tela es?", product: redDress, store: boutiqueStore, recommendations: [], offerType: "PRODUCT", intent: "ASK_MATERIAL" });
  const priceReply = buildAssistantMessage({ mode: "PRODUCT_ADVISOR", userMessage: "precio", product: redDress, store: boutiqueStore, recommendations: [], offerType: "PRODUCT", intent: "ASK_PRICE" });
  const orderReply = buildAssistantMessage({ mode: "CLOSING_PREP", userMessage: "quiero comprarlo", product: redDress, store: boutiqueStore, recommendations: [], offerType: "PRODUCT", intent: "START_ORDER", shouldAskPhone: true });

  assert.equal(sizeReply, "Este vestido está registrado en tallas M y L. La disponibilidad final de cada talla la confirma Boutique Luna por WhatsApp.");
  assert.match(colorReply, /color rojo/i);
  assert.match(materialReply, /no está especificado/i);
  assert.doesNotMatch(materialReply, /sat[íi]n|algod[oó]n|seda|poli[eé]ster/i);
  assert.equal(priceReply, "Vestido Rojo de Fiesta está publicado en Bs. 260.00.");
  assert.equal(orderReply, "Perfecto. Te ayudo a comprar Vestido Rojo de Fiesta. ¿A qué número te escribe Boutique Luna para confirmar talla y disponibilidad?");
});

test("v4 explicit closing phrases map to closing intents", () => {
  assert.equal(resolveSellerIntent({ text: "lo quiero apartar", offerType: "PRODUCT" }), "START_ORDER");
  assert.equal(resolveSellerIntent({ text: "quiero hablar por WhatsApp", offerType: "PRODUCT" }), "START_ORDER");
  assert.equal(resolveSellerIntent({ text: "quiero agendar", offerType: "SERVICE" }), "START_BOOKING");
});

test("v4 lead score does not expose handoff for informational product questions", () => {
  const intent = resolveSellerIntent({ text: "y para qué evento es más adecuado?", offerType: "PRODUCT" });
  const qualification = computeLeadQualification({ score: 90, messages: ["precio", "disponible", "y para qué evento es más adecuado?"] });

  assert.equal(isInformationalSellerIntent(intent), true);
  assert.equal(qualification.readyForWhatsapp, true);
  assert.equal(shouldExposeWhatsappHandoffForIntent({ qualification, whatsappNumber: "59170000000", informationalIntent: true }), false);
});

test("v4 menu regression keeps Exitosos food playbook, not fashion", () => {
  const offerType = resolveOfferType(exitososStore, caesarProduct);
  const ingredients = buildAssistantMessage({ mode: "PRODUCT_ADVISOR", userMessage: "ingredientes", product: caesarProduct, store: exitososStore, recommendations: [], offerType, intent: "ASK_INGREDIENTS" });
  const portion = buildAssistantMessage({ mode: "PRODUCT_ADVISOR", userMessage: "porción", product: caesarProduct, store: exitososStore, recommendations: [], offerType, intent: "ASK_PORTION" });
  const price = buildAssistantMessage({ mode: "PRODUCT_ADVISOR", userMessage: "precio", product: caesarProduct, store: exitososStore, recommendations: [], offerType, intent: "ASK_PRICE" });
  const playbook = resolveAdvisorPlaybook(exitososStore, caesarProduct);

  assert.equal(offerType, "MENU");
  assert.equal(playbook.vertical, "food");
  assert.match(ingredients, /lechuga fresca/i);
  assert.match(portion, /Porción individual/i);
  assert.match(price, /Bs\. 25\.00/i);
  assert.doesNotMatch([ingredients, portion, price].join(" "), /tallas|vestido|look llamativo/i);
});

test("v4 service playbook uses service facts and not product/menu facts", () => {
  const offerType = resolveOfferType(serviceStore, serviceProduct);
  const included = buildAssistantMessage({ mode: "PRODUCT_ADVISOR", userMessage: "qué incluye?", product: serviceProduct, store: serviceStore, recommendations: [], offerType, intent: "ASK_SERVICE_INCLUDED" });
  const duration = buildAssistantMessage({ mode: "PRODUCT_ADVISOR", userMessage: "cuánto dura?", product: serviceProduct, store: serviceStore, recommendations: [], offerType, intent: "ASK_DURATION" });
  const booking = buildAssistantMessage({ mode: "CLOSING_PREP", userMessage: "quiero agendar", product: serviceProduct, store: serviceStore, recommendations: [], offerType, intent: "START_BOOKING" });

  assert.equal(offerType, "SERVICE");
  assert.match(included, /limpieza facial/i);
  assert.match(duration, /duración/i);
  assert.match(booking, /agendar/i);
  assert.doesNotMatch([included, duration, booking].join(" "), /tallas|ingredientes/i);
});

test("v4 context contracts keep current product and visitor store history inputs explicit", () => {
  const firstProductIntent = resolveSellerIntent({ text: "qué tallas hay?", offerType: "PRODUCT" });
  const secondProductIntent = resolveSellerIntent({ text: "y para qué evento?", offerType: "PRODUCT" });

  assert.equal(firstProductIntent, "ASK_SIZE");
  assert.equal(secondProductIntent, "ASK_OCCASION");
  assert.equal(resolveOfferType(boutiqueStore, redDress), "PRODUCT");
  assert.equal(resolveOfferType(exitososStore, caesarProduct), "MENU");
});
