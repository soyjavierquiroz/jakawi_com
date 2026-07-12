import assert from "node:assert/strict";
import test from "node:test";
import { buildAssistantMessage } from "@/app/api/seller-ai/chat/route";
import { resolveSellerIntent } from "@/lib/seller-ai/intent-router";
import { buildQuickRepliesForMode } from "@/lib/seller-ai/modes";
import { resolveOfferType } from "@/lib/seller-ai/offer-type";
import { getInitialQuickReplyLabels, toSellerQuickReplies } from "@/lib/seller-ai/quick-replies";

const boutiqueStore = {
  slug: "boutique-luna",
  name: "Boutique Luna",
  description: "Vestidos para dama.",
  commercialType: "PRODUCT_STORE",
  currency: "BOB",
  countryCode: "BO",
  locale: "es-BO",
};

const floralDress = {
  id: "vestido-floral-midi",
  name: "Vestido Floral Midi",
  slug: "vestido-floral-midi",
  description:
    "Vestido midi floral para dama, fresco y cómodo, ideal para salidas de día, almuerzos o eventos casuales. Combina bien con sandalias, tacones bajos o accesorios delicados.\nTallas: S, M, L\nColor: floral claro\nMaterial: tela ligera\nOcasión: día, almuerzo, casual",
  priceCents: 18000,
  currency: "BOB",
  categoryId: "vestidos-casuales",
  category: { name: "Vestidos casuales", slug: "vestidos-casuales" },
};

const blackDress = {
  ...floralDress,
  id: "vestido-negro-elegante",
  name: "Vestido Negro Elegante",
  slug: "vestido-negro-elegante",
  description:
    "Vestido negro elegante para dama, ideal para cenas, reuniones y eventos donde quieres verte arreglada sin exagerar.\nTallas: S, M, L\nColor: negro\nOcasión: cena, noche, reunión",
  category: { name: "Vestidos elegantes", slug: "vestidos-elegantes" },
};

test("Boutique Luna resolves PRODUCT", () => {
  assert.equal(resolveOfferType(boutiqueStore, floralDress), "PRODUCT");
});

test("PRODUCT quick replies include product commerce chips and no food/generic occasion chips", () => {
  const labels = buildQuickRepliesForMode({
    mode: "PRODUCT_ADVISOR",
    store: boutiqueStore,
    product: floralDress,
    category: floralDress.category,
  });
  const replies = toSellerQuickReplies(getInitialQuickReplyLabels("PRODUCT"), "PRODUCT");

  assert.deepEqual(labels, ["Tallas", "Colores", "Precio", "Comprar"]);
  assert.deepEqual(replies.map((reply) => reply.label), labels);
  assert.doesNotMatch(labels.join(" "), /Ingredientes|Porción|Trabajo|Estudio|Viaje|Para regalar/i);
});

test("PRODUCT size question answers product sizes", () => {
  const intent = resolveSellerIntent({ text: "¿Qué tallas tienen?", offerType: "PRODUCT" });
  const reply = buildAssistantMessage({ mode: "PRODUCT_ADVISOR", userMessage: "¿Qué tallas tienen?", product: floralDress, store: boutiqueStore, recommendations: [], offerType: "PRODUCT", intent });

  assert.equal(intent, "ASK_SIZE");
  assert.match(reply, /S, M, L/i);
  assert.match(reply, /disponibilidad final/i);
});

test("PRODUCT color question answers product color", () => {
  const intent = resolveSellerIntent({ text: "¿Qué colores hay?", offerType: "PRODUCT" });
  const reply = buildAssistantMessage({ mode: "PRODUCT_ADVISOR", userMessage: "¿Qué colores hay?", product: floralDress, store: boutiqueStore, recommendations: [], offerType: "PRODUCT", intent });

  assert.equal(intent, "ASK_COLOR");
  assert.match(reply, /floral claro/i);
});

test("PRODUCT wedding advice recommends more formal dresses when needed", () => {
  const reply = buildAssistantMessage({ mode: "PRODUCT_ADVISOR", userMessage: "¿Sirve para una boda?", product: floralDress, store: boutiqueStore, recommendations: [], offerType: "PRODUCT", intent: "UNKNOWN" });

  assert.match(reply, /boda de día|evento casual elegante/i);
  assert.match(reply, /Vestido Largo Satinado|Vestido Rojo de Fiesta/i);
});

test("PRODUCT event advice uses product context without generic work gift copy", () => {
  const reply = buildAssistantMessage({ mode: "PRODUCT_ADVISOR", userMessage: "¿y este para evento?", product: blackDress, store: boutiqueStore, recommendations: [], offerType: "PRODUCT", intent: "UNKNOWN" });

  assert.match(reply, /Vestido Negro Elegante/i);
  assert.match(reply, /evento/i);
  assert.doesNotMatch(reply, /trabajo|regalo|uso diario/i);
});

test("PRODUCT buying copy asks for phone with store name", () => {
  const intent = resolveSellerIntent({ text: "Quiero comprarlo", offerType: "PRODUCT" });
  const reply = buildAssistantMessage({ mode: "CLOSING_PREP", userMessage: "Quiero comprarlo", product: floralDress, store: boutiqueStore, recommendations: [], offerType: "PRODUCT", intent, shouldAskPhone: true });

  assert.equal(intent, "START_ORDER");
  assert.equal(reply, "Perfecto. Te ayudo a comprar Vestido Floral Midi. ¿A qué número te escribe Boutique Luna?");
});
