import assert from "node:assert/strict";
import test from "node:test";
import { buildAssistantMessage } from "@/app/api/seller-ai/chat/route";
import { resolveAdvisorPlaybook } from "@/lib/seller-ai/context";
import { resolveSellerIntent } from "@/lib/seller-ai/intent-router";
import { buildQuickRepliesForMode } from "@/lib/seller-ai/modes";
import { toSellerQuickReplies } from "@/lib/seller-ai/quick-replies";

const boutiqueStore = {
  slug: "boutique-luna",
  name: "Boutique Luna",
  description: "Vestidos y accesorios para dama.",
  commercialType: "PRODUCT_STORE",
  currency: "BOB",
  countryCode: "BO",
  locale: "es-BO",
};

const belt = {
  id: "cinturon-delgado-dorado",
  name: "Cinturón Delgado Dorado",
  slug: "cinturon-delgado-dorado",
  description: "Cinturón dorado delgado para complementar vestidos.",
  priceCents: 7000,
  currency: "BOB",
  categoryId: "accesorios",
  category: { name: "Accesorios", slug: "accesorios" },
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

const satinDress = {
  ...redDress,
  id: "vestido-largo-satinado",
  name: "Vestido Largo Satinado",
  slug: "vestido-largo-satinado",
  description: "Vestido largo satinado para dama.",
  priceCents: 32000,
};

test("v5 resolves Cinturón Delgado Dorado as fashion belt and shows belt quick replies", () => {
  const playbook = resolveAdvisorPlaybook(boutiqueStore, belt);
  const labels = buildQuickRepliesForMode({
    mode: "PRODUCT_ADVISOR",
    store: boutiqueStore,
    product: belt,
    category: belt.category,
  });
  const replies = toSellerQuickReplies(labels, "PRODUCT");

  assert.equal(playbook.offerType, "PRODUCT");
  assert.equal(playbook.vertical, "fashion");
  assert.equal(playbook.category, "accessory");
  assert.equal(playbook.subcategory, "belt");
  assert.deepEqual(labels, ["Combina con", "Medida / ajuste", "Precio", "Envío", "Comprar"]);
  assert.deepEqual(replies.map((reply) => reply.action), ["ASK_STYLE_ADVICE", "ASK_SIZE", "ASK_PRICE", "ASK_SHIPPING", "START_ORDER"]);
  assert.doesNotMatch(labels.join(" "), /Ingredientes|Porción/i);
});

test("v5 belt occasion advice is natural and does not close", () => {
  const intent = resolveSellerIntent({ text: "¿Para qué evento sirve?", offerType: "PRODUCT" });
  const reply = buildAssistantMessage({ mode: "PRODUCT_ADVISOR", userMessage: "¿Para qué evento sirve?", product: belt, store: boutiqueStore, recommendations: [], offerType: "PRODUCT", intent });

  assert.equal(intent, "ASK_OCCASION");
  assert.match(reply, /looks casuales o elegantes/i);
  assert.match(reply, /cenas|salidas|eventos de noche/i);
  assert.match(reply, /marcar la cintura/i);
  assert.match(reply, /color de vestido/i);
  assert.doesNotMatch(reply, /a qué número|deja tu número|ya tenemos el contexto/i);
});

test("v5 belt compatibility answers chamarra specifically", () => {
  const intent = resolveSellerIntent({ text: "Y combina con una chamarra?", offerType: "PRODUCT" });
  const reply = buildAssistantMessage({ mode: "PRODUCT_ADVISOR", userMessage: "Y combina con una chamarra?", product: belt, store: boutiqueStore, recommendations: [], offerType: "PRODUCT", intent });

  assert.equal(intent, "ASK_STYLE_ADVICE");
  assert.match(reply, /chamarra/i);
  assert.match(reply, /negra|beige|blanca|denim|verde oscuro/i);
  assert.match(reply, /look se mantiene limpio|no cargar demasiado/i);
  assert.match(reply, /casual o más elegante/i);
  assert.doesNotMatch(reply, /^Cinturón Delgado Dorado: Combina mejor con accesorios que no compitan/i);
  assert.doesNotMatch(reply, /elegir talla/i);
});

test("v5 belt shipping and size use city/zone and measure wording", () => {
  const shippingIntent = resolveSellerIntent({ text: "Envío", offerType: "PRODUCT" });
  const shippingReply = buildAssistantMessage({ mode: "PRODUCT_ADVISOR", userMessage: "Envío", product: belt, store: boutiqueStore, recommendations: [], offerType: "PRODUCT", intent: shippingIntent });
  const sizeIntent = resolveSellerIntent({ text: "Talla del cinturón", offerType: "PRODUCT" });
  const sizeReply = buildAssistantMessage({ mode: "PRODUCT_ADVISOR", userMessage: "Talla del cinturón", product: belt, store: boutiqueStore, recommendations: [], offerType: "PRODUCT", intent: sizeIntent });

  assert.equal(shippingIntent, "ASK_SHIPPING");
  assert.match(shippingReply, /ciudad o zona/i);
  assert.match(shippingReply, /consulta lista por WhatsApp/i);
  assert.equal(sizeIntent, "ASK_SIZE");
  assert.match(sizeReply, /medida o ajuste/i);
  assert.match(sizeReply, /largo exacto/i);
  assert.doesNotMatch(sizeReply, /elegir talla|tallas M|tallas S/i);
});

test("v5 belt explicit purchase asks phone with measure and availability", () => {
  const intent = resolveSellerIntent({ text: "quiero comprarlo", offerType: "PRODUCT" });
  const reply = buildAssistantMessage({ mode: "CLOSING_PREP", userMessage: "quiero comprarlo", product: belt, store: boutiqueStore, recommendations: [], offerType: "PRODUCT", intent, shouldAskPhone: true });

  assert.equal(intent, "START_ORDER");
  assert.match(reply, /a qué número/i);
  assert.match(reply, /medida, ajuste y disponibilidad/i);
});

test("v5 dress regression keeps occasion and formal advice", () => {
  const redIntent = resolveSellerIntent({ text: "y para qué evento es más adecuado?", offerType: "PRODUCT" });
  const redReply = buildAssistantMessage({ mode: "PRODUCT_ADVISOR", userMessage: "y para qué evento es más adecuado?", product: redDress, store: boutiqueStore, recommendations: [], offerType: "PRODUCT", intent: redIntent });
  const satinIntent = resolveSellerIntent({ text: "¿Sirve para boda o evento formal?", offerType: "PRODUCT" });
  const satinReply = buildAssistantMessage({ mode: "PRODUCT_ADVISOR", userMessage: "¿Sirve para boda o evento formal?", product: satinDress, store: boutiqueStore, recommendations: [], offerType: "PRODUCT", intent: satinIntent });

  assert.equal(redIntent, "ASK_OCCASION");
  assert.match(redReply, /celebraciones de noche|cumpleaños|cenas|fiestas/i);
  assert.match(satinReply, /eventos formales/i);
  assert.match(satinReply, /bodas/i);
});
