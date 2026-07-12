import type { SellerIntent } from "@/lib/seller-ai/intent-router";
import type { SellerOfferType } from "@/lib/seller-ai/offer-type";

export type SellerQuickReply = {
  label: string;
  action: SellerIntent;
};

const menuActions: Record<string, SellerIntent> = {
  Ingredientes: "ASK_INGREDIENTS",
  "Porción": "ASK_PORTION",
  Precio: "ASK_PRICE",
  Pedir: "START_ORDER",
  "Confirmar disponibilidad": "ASK_AVAILABILITY",
  "Ver precio": "ASK_PRICE",
  "Pedir por WhatsApp": "START_ORDER",
  "Volver al producto": "BACK_TO_PRODUCT",
  Volver: "BACK_TO_PRODUCT",
  "Ya te dejo mi número": "START_ORDER",
  "¿Cuánto tarda?": "ASK_AVAILABILITY",
};

const productActions: Record<string, SellerIntent> = {
  Características: "ASK_FEATURES",
  Caracteristicas: "ASK_FEATURES",
  Medidas: "ASK_SIZE",
  Tallas: "ASK_SIZE",
  Colores: "ASK_COLOR",
  Precio: "ASK_PRICE",
  Disponibilidad: "ASK_AVAILABILITY",
  Envío: "ASK_SHIPPING",
  Envio: "ASK_SHIPPING",
  Comprar: "START_ORDER",
  "¿Está disponible?": "ASK_AVAILABILITY",
  "¿Cuál es el precio?": "ASK_PRICE",
  "¿Hacen envío?": "ASK_SHIPPING",
  "Me interesa comprar": "START_ORDER",
  "Quiero comprarlo": "START_ORDER",
  "Enviar consulta por WhatsApp": "START_ORDER",
  "Hablemos por WhatsApp": "START_ORDER",
  "También quiero saber envío": "ASK_SHIPPING",
  "También quiero saber disponibilidad": "ASK_AVAILABILITY",
  "Volver al producto": "BACK_TO_PRODUCT",
};

const serviceActions: Record<string, SellerIntent> = {
  "Qué incluye": "ASK_SERVICE_INCLUDED",
  "Que incluye": "ASK_SERVICE_INCLUDED",
  Duración: "ASK_DURATION",
  Duracion: "ASK_DURATION",
  Precio: "ASK_PRICE",
  Agendar: "START_BOOKING",
  "Hablar por WhatsApp": "START_ORDER",
  Cotizar: "ASK_PRICE",
  "Preguntar disponibilidad": "ASK_AVAILABILITY",
};

function normalize(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿?¡!.,:;]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findAction(label: string, mapping: Record<string, SellerIntent>) {
  const direct = mapping[label];
  if (direct) return direct;
  const labelKey = normalize(label);
  const entry = Object.entries(mapping).find(([key]) => normalize(key) === labelKey);
  return entry?.[1] ?? null;
}

export function quickReplyActionForLabel(label: string, offerType: SellerOfferType): SellerIntent {
  const action =
    offerType === "MENU"
      ? findAction(label, menuActions) ?? findAction(label, productActions)
      : offerType === "SERVICE"
        ? findAction(label, serviceActions) ?? findAction(label, productActions)
        : findAction(label, productActions);
  if (action) return action;
  if (/precio|cuanto|cuesta|vale|costo/i.test(label)) return "ASK_PRICE";
  if (/disponible|disponibilidad|stock|hay/i.test(label)) return "ASK_AVAILABILITY";
  if (/whatsapp|comprar|compra|pedir|pedido|interesa/i.test(label)) return "START_ORDER";
  return "UNKNOWN";
}

export function toSellerQuickReplies(labels: string[], offerType: SellerOfferType): SellerQuickReply[] {
  return labels.slice(0, 4).map((label) => ({
    label,
    action: quickReplyActionForLabel(label, offerType),
  }));
}

export function getInitialQuickReplyLabels(offerType: SellerOfferType) {
  if (offerType === "MENU") return ["Ingredientes", "Porción", "Precio", "Pedir"];
  if (offerType === "SERVICE") return ["Qué incluye", "Duración", "Precio", "Agendar"];
  return ["Tallas", "Colores", "Precio", "Comprar"];
}
