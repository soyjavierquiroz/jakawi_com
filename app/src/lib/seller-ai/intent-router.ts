import type { SellerOfferType } from "@/lib/seller-ai/offer-type";

export const sellerIntentValues = [
  "ASK_INGREDIENTS",
  "ASK_PORTION",
  "ASK_PRICE",
  "ASK_AVAILABILITY",
  "ASK_OCCASION",
  "ASK_SUITABILITY",
  "ASK_STYLE_ADVICE",
  "ASK_FEATURES",
  "ASK_SIZE",
  "ASK_COLOR",
  "ASK_MATERIAL",
  "ASK_FIT",
  "ASK_COMPATIBILITY",
  "ASK_SHIPPING",
  "ASK_SERVICE_INCLUDED",
  "ASK_DURATION",
  "START_ORDER",
  "START_BOOKING",
  "BACK_TO_PRODUCT",
  "UNKNOWN",
] as const;

export type SellerIntent = (typeof sellerIntentValues)[number];

export type SellerIntentInput = {
  action?: string | null;
  quickReplyAction?: string | null;
  quickReplyLabel?: string | null;
  text?: string | null;
  ctaAction?: string | null;
  offerType?: SellerOfferType;
};

const actionAliases: Record<string, SellerIntent> = {
  ASK_INGREDIENTS: "ASK_INGREDIENTS",
  ASK_PORTION: "ASK_PORTION",
  ASK_PRICE: "ASK_PRICE",
  ASK_AVAILABILITY: "ASK_AVAILABILITY",
  ASK_OCCASION: "ASK_OCCASION",
  ASK_SUITABILITY: "ASK_SUITABILITY",
  ASK_STYLE_ADVICE: "ASK_STYLE_ADVICE",
  ASK_FEATURES: "ASK_FEATURES",
  ASK_SIZE: "ASK_SIZE",
  ASK_COLOR: "ASK_COLOR",
  ASK_MATERIAL: "ASK_MATERIAL",
  ASK_FIT: "ASK_FIT",
  ASK_COMPATIBILITY: "ASK_COMPATIBILITY",
  ASK_SHIPPING: "ASK_SHIPPING",
  ASK_SERVICE_INCLUDED: "ASK_SERVICE_INCLUDED",
  ASK_DURATION: "ASK_DURATION",
  START_ORDER: "START_ORDER",
  START_BOOKING: "START_BOOKING",
  BACK_TO_PRODUCT: "BACK_TO_PRODUCT",
  CONTINUE_WHATSAPP: "START_ORDER",
  BUY: "START_ORDER",
  ORDER: "START_ORDER",
  BOOK: "START_BOOKING",
  USER_PROVIDED_PHONE: "START_ORDER",
  CLICKED_WHATSAPP_CTA: "START_ORDER",
};

function normalize(input?: string | null) {
  return (input ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿?¡!.,:;]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeAction(input?: string | null) {
  return (input ?? "").trim().toUpperCase();
}

function resolveAction(input?: string | null): SellerIntent | null {
  const normalized = normalizeAction(input);
  return actionAliases[normalized] ?? null;
}

function resolveLabel(label?: string | null, offerType: SellerOfferType = "PRODUCT"): SellerIntent | null {
  const text = normalize(label);
  if (!text) return null;

  if (offerType === "MENU") {
    if (/\b(ingrediente|ingredientes|que trae|que lleva|contiene)\b/.test(text)) return "ASK_INGREDIENTS";
    if (/\b(porcion|tamano|tamaño|cantidad)\b/.test(text)) return "ASK_PORTION";
    if (/\b(pedir|pedido|pedir por whatsapp)\b/.test(text)) return "START_ORDER";
  }

  if (offerType === "PRODUCT") {
    if (/\b(ocasion|ocasiones|evento|eventos|boda|fiesta|cena|graduacion)\b/.test(text)) return "ASK_OCCASION";
    if (/\b(sirve|queda bien|adecuado|adecuada|conviene)\b/.test(text)) return "ASK_SUITABILITY";
    if (/\b(combina|zapatos|accesorios|estilo|look)\b/.test(text)) return "ASK_STYLE_ADVICE";
    if (/\b(material|tela|de que esta hecho|de que esta hecha)\b/.test(text)) return "ASK_MATERIAL";
    if (/\b(comodo|comoda|ajuste|entalla|me queda|fit)\b/.test(text)) return "ASK_FIT";
    if (/\b(compatible|sirve con|funciona con)\b/.test(text)) return "ASK_COMPATIBILITY";
    if (/\b(caracteristicas|caracteristica|detalles|uso)\b/.test(text)) return "ASK_FEATURES";
    if (/\b(medidas|medida|talla|tallas|tamano|tamaño)\b/.test(text)) return "ASK_SIZE";
    if (/\b(color|colores)\b/.test(text)) return "ASK_COLOR";
    if (/\b(envio|envío|entrega|delivery)\b/.test(text)) return "ASK_SHIPPING";
    if (/\b(comprar|compra|comprarlo|comprarla|apartar|apartarlo|apartarla|reservar|lo quiero|la quiero|lo llevo|hablar por whatsapp|hablemos por whatsapp)\b/.test(text)) return "START_ORDER";
  }

  if (offerType === "SERVICE") {
    if (/\b(que incluye|incluye|incluido|incluida)\b/.test(text)) return "ASK_SERVICE_INCLUDED";
    if (/\b(duracion|duración|cuanto dura|cuánto dura)\b/.test(text)) return "ASK_DURATION";
    if (/\b(agendar|agenda|cita|reservar|reserva)\b/.test(text)) return "START_BOOKING";
    if (/\b(whatsapp|hablar)\b/.test(text)) return "START_ORDER";
  }

  if (/\b(precio|cuanto vale|cuánto vale|cuanto cuesta|cuánto cuesta|cuesta|vale|costo|ver precio)\b/.test(text)) return "ASK_PRICE";
  if (/\b(disponible|disponibilidad|hay|stock|confirmar disponibilidad)\b/.test(text)) return "ASK_AVAILABILITY";
  if (/\b(volver|volver al producto)\b/.test(text)) return "BACK_TO_PRODUCT";
  if (/\b(ya te dejo mi numero|ya te dejo mi número|mi numero|mi número)\b/.test(text)) return "START_ORDER";

  return null;
}

function resolveFreeText(text?: string | null, offerType: SellerOfferType = "PRODUCT"): SellerIntent {
  const normalized = normalize(text);
  if (!normalized) return "UNKNOWN";

  if (offerType === "MENU" && /\b(ingrediente|ingredientes|que trae|que lleva|contiene|con que viene|de que esta hecho|de que esta hecha)\b/.test(normalized)) return "ASK_INGREDIENTS";
  if (offerType === "MENU" && /\b(porcion|tamano|tamaño|cantidad|para cuantas personas)\b/.test(normalized)) return "ASK_PORTION";

  if (offerType === "PRODUCT" && /\b(para que evento|para que ocasion|en que ocasion|que ocasion|ocasion|ocasiones|evento|eventos|fiesta|fiestas|cena|cenas|graduacion|cumpleanos|cumpleaños|noche|dia|día)\b/.test(normalized)) return "ASK_OCCASION";
  if (offerType === "PRODUCT" && /\b(sirve para boda|sirve para fiesta|sirve para una cena|sirve para graduacion|sirve para evento|mas adecuado|más adecuado|adecuado|adecuada|queda bien para|conviene para)\b/.test(normalized)) return "ASK_SUITABILITY";
  if (offerType === "PRODUCT" && /\b(combina con|que zapatos|qué zapatos|zapatos|accesorios|con que accesorios|con qué accesorios|estilo|look|como lo uso|cómo lo uso)\b/.test(normalized)) return "ASK_STYLE_ADVICE";
  if (offerType === "PRODUCT" && /\b(de que tela|de qué tela|tela|material|de que material|de qué material|de que esta hecho|de que esta hecha)\b/.test(normalized)) return "ASK_MATERIAL";
  if (offerType === "PRODUCT" && /\b(me queda|queda ajustado|queda suelto|ajuste|fit|entalla|comodidad|comodo|cómodo|comoda|cómoda)\b/.test(normalized)) return "ASK_FIT";
  if (offerType === "PRODUCT" && /\b(compatible|sirve con|funciona con|se puede usar con)\b/.test(normalized)) return "ASK_COMPATIBILITY";
  if (offerType === "PRODUCT" && /\b(caracteristicas|caracteristica|detalles|uso|para que sirve)\b/.test(normalized)) return "ASK_FEATURES";
  if (offerType === "PRODUCT" && /\b(medidas|medida|talla|tallas|tamano|tamaño)\b/.test(normalized)) return "ASK_SIZE";
  if (offerType === "PRODUCT" && /\b(color|colores|tono|tonos)\b/.test(normalized)) return "ASK_COLOR";
  if (offerType === "PRODUCT" && /\b(envio|envío|entrega|delivery|mandan|envian|envían)\b/.test(normalized)) return "ASK_SHIPPING";

  if (offerType === "SERVICE" && /\b(que incluye|incluye|incluido|incluida|que trae)\b/.test(normalized)) return "ASK_SERVICE_INCLUDED";
  if (offerType === "SERVICE" && /\b(duracion|duración|cuanto dura|cuánto dura|tiempo)\b/.test(normalized)) return "ASK_DURATION";
  if (offerType === "SERVICE" && /\b(agendar|agenda|cita|reservar|reserva|coordinar)\b/.test(normalized)) return "START_BOOKING";

  if (/\b(precio|cuanto vale|cuánto vale|cuanto cuesta|cuánto cuesta|cuesta|vale|costo)\b/.test(normalized)) return "ASK_PRICE";
  if (/\b(disponible|disponibilidad|hay|stock)\b/.test(normalized)) return "ASK_AVAILABILITY";
  if (/\b(agendar|agenda|cita|reservar cita)\b/.test(normalized)) return "START_BOOKING";
  if (/\b(pedir|pedido|comprar|comprarlo|comprarla|apartar|apartarlo|apartarla|reservar|quiero este|quiero esta|lo quiero|la quiero|lo llevo|hablar por whatsapp|hablemos por whatsapp|continuar por whatsapp)\b/.test(normalized)) return "START_ORDER";

  return "UNKNOWN";
}

export function resolveSellerIntent(input: SellerIntentInput): SellerIntent {
  return (
    resolveAction(input.quickReplyAction) ??
    resolveAction(input.action) ??
    resolveAction(input.ctaAction) ??
    resolveLabel(input.quickReplyLabel, input.offerType) ??
    resolveFreeText(input.text ?? input.quickReplyLabel, input.offerType)
  );
}

export function isInformationalSellerIntent(intent: SellerIntent) {
  return [
    "ASK_INGREDIENTS",
    "ASK_PORTION",
    "ASK_PRICE",
    "ASK_AVAILABILITY",
    "ASK_OCCASION",
    "ASK_SUITABILITY",
    "ASK_STYLE_ADVICE",
    "ASK_FEATURES",
    "ASK_SIZE",
    "ASK_COLOR",
    "ASK_MATERIAL",
    "ASK_FIT",
    "ASK_COMPATIBILITY",
    "ASK_SHIPPING",
    "ASK_SERVICE_INCLUDED",
    "ASK_DURATION",
    "BACK_TO_PRODUCT",
  ].includes(intent);
}
