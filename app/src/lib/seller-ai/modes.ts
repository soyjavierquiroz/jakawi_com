import { sellerAiConfig } from "@/config/seller-ai";
import { buildNextQuickReplies } from "@/lib/seller-ai/conversation-state";

export type SellerAiMode = "DISCOVERY" | "PRODUCT_ADVISOR" | "DECISION_SUPPORT" | "CLOSING_PREP";

export type CommercialSignals = {
  detectedNeed?: string;
  budget?: string;
  urgency?: string;
  objections: string[];
  intentBoost: number;
  hasStrongIntent: boolean;
};

type CommercialType = keyof typeof sellerAiConfig.commercialTypes;

const strongIntentPattern = /\b(quiero|comprar|comprarlo|comprarla|me interesa|como compro|cómo compro|lo quiero|reservar|reserva|pedir|pedido|pagar|lo llevo|consultar por whatsapp|hablemos por whatsapp|enviar consulta|dejar consulta|pasame info|pásame info)\b/i;
const closingIntentPattern = /\b(quiero comprar|me interesa comprar|quiero pedir|quiero pagar|quiero reservar|lo compro|lo quiero|lo quiero comprar|comprarlo|comprarla|como compro|cómo compro|pásame para comprar|pasame para comprar|quiero continuar por whatsapp|continuar por whatsapp|consultar por whatsapp|hablemos por whatsapp|enviar consulta por whatsapp|dejar consulta por whatsapp|reservar|pagar|lo llevo)\b/i;
const objectionPatterns: Array<[RegExp, string]> = [
  [/\b(precio|cuanto|cuánto|cuesta|vale|costo)\b/i, "precio"],
  [/\b(disponible|disponibilidad|stock)\b/i, "disponibilidad"],
  [/\b(envio|envío|enviar|entrega|delivery)\b/i, "envío"],
  [/\b(garantia|garantía)\b/i, "garantía"],
  [/\b(talla|medida|tamano|tamaño)\b/i, "talla"],
  [/\b(color|colores)\b/i, "color"],
  [/\b(rebaja|descuento|promo|promocion|promoción)\b/i, "descuento"],
  [/\b(forma de pago|formas de pago|pago|cuotas|qr|tarjeta|transferencia)\b/i, "forma de pago"],
];
const needPatterns: Array<[RegExp, string]> = [
  [/\b(para regalar|regalo|regalar)\b/i, "regalo"],
  [/\b(para mi|para mí|uso personal)\b/i, "uso personal"],
  [/\b(fotos|foto|camara|cámara)\b/i, "fotos"],
  [/\b(trabajo|oficina|negocio)\b/i, "trabajo"],
  [/\b(estudio|clases|universidad|colegio)\b/i, "estudio"],
  [/\b(viaje|viajar|viajes)\b/i, "viaje"],
  [/\b(redes|instagram|tiktok|facebook)\b/i, "redes"],
  [/\b(juegos|gaming|jugar)\b/i, "juegos"],
  [/\b(compartir|familia|grupo)\b/i, "para compartir"],
  [/\b(rapido|rápido|algo rapido|algo rápido)\b/i, "algo rápido"],
  [/\b(cotizar|cotizacion|cotización)\b/i, "cotizar"],
  [/\b(agendar|cita|reserva)\b/i, "agendar"],
];

function normalize(input?: string | null) {
  return (input ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

export function getCommercialTypeCopy(commercialType?: string | null) {
  const key = (commercialType ?? "PRODUCT_STORE") as CommercialType;
  return sellerAiConfig.commercialTypes[key] ?? sellerAiConfig.commercialTypes.PRODUCT_STORE;
}

export function extractCommercialSignals(message?: string | null): CommercialSignals {
  const text = message ?? "";
  const normalized = normalize(text);
  const objections = objectionPatterns.filter(([pattern]) => pattern.test(text) || pattern.test(normalized)).map(([, label]) => label);
  const detectedNeed = needPatterns.find(([pattern]) => pattern.test(text) || pattern.test(normalized))?.[1];
  const budget = /\b(barato|economico|económico|bajo presupuesto|no tan caro|accesible)\b/i.test(text) ? "económico" : undefined;
  const urgency = /\b(hoy|ahora|urgente|ya|lo necesito pronto|esta tarde|mañana)\b/i.test(text) ? "alta" : undefined;
  const hasStrongIntent = strongIntentPattern.test(text) || strongIntentPattern.test(normalized);

  let intentBoost = 0;
  if (detectedNeed) intentBoost += 10;
  if (budget) intentBoost += 8;
  if (urgency) intentBoost += 10;
  if (objections.length > 0) intentBoost += 12;
  if (hasStrongIntent) intentBoost += 35;

  return {
    detectedNeed,
    budget,
    urgency,
    objections: unique(objections),
    intentBoost,
    hasStrongIntent,
  };
}

export function inferSellerAiMode({
  currentStage,
  hasProductContext,
  message,
  intentScore,
  objections,
  productId,
}: {
  currentStage?: SellerAiMode | null;
  hasProductContext?: boolean;
  message?: string | null;
  intentScore?: number | null;
  detectedNeed?: string | null;
  objections?: string[] | string | null;
  productId?: string | null;
  categoryId?: string | null;
  journeyStatus?: string | null;
}): { mode: SellerAiMode; stage: SellerAiMode; reason: string } {
  const signals = extractCommercialSignals(message);
  const text = normalize(message);
  const objectionList = Array.isArray(objections) ? objections : typeof objections === "string" && objections ? objections.split(",").map((item) => item.trim()) : [];
  const hasExplicitClosingIntent = closingIntentPattern.test(text);
  const hasCurrentObjection = signals.objections.length > 0 || objectionList.length > 0;
  const hasContextSignal = Boolean(signals.detectedNeed || signals.budget);

  if (hasCurrentObjection && !hasExplicitClosingIntent) {
    return { mode: "DECISION_SUPPORT", stage: "DECISION_SUPPORT", reason: "commercial objection or buying doubt detected" };
  }
  if (hasExplicitClosingIntent) {
    return { mode: "CLOSING_PREP", stage: "CLOSING_PREP", reason: "explicit closing intent" };
  }
  if ((intentScore ?? 0) >= 70 && !hasCurrentObjection && !hasContextSignal) {
    return { mode: "CLOSING_PREP", stage: "CLOSING_PREP", reason: "high intent score" };
  }
  if (productId || hasProductContext) {
    return { mode: "PRODUCT_ADVISOR", stage: "PRODUCT_ADVISOR", reason: "product context is present" };
  }
  if (currentStage === "CLOSING_PREP" && (intentScore ?? 0) >= 55) {
    return { mode: "CLOSING_PREP", stage: "CLOSING_PREP", reason: "journey was already close to handoff" };
  }
  return { mode: "DISCOVERY", stage: "DISCOVERY", reason: "no product context or decisive intent" };
}

export function buildQuickRepliesForMode({
  mode,
  commercialType,
  product,
  category,
  store,
  detectedNeed,
  recommendedProducts,
  usedReplies,
  lastUserMessage,
  objections,
}: {
  mode: SellerAiMode;
  commercialType?: string | null;
  product?: { name?: string | null } | null;
  category?: { name?: string | null } | null;
  store?: { slug?: string | null; name?: string | null; description?: string | null; commercialType?: string | null } | null;
  detectedNeed?: string | null;
  objections?: string[] | string | null;
  recommendedProducts?: Array<{ name: string }>;
  usedReplies?: string[];
  lastUserMessage?: string | null;
}) {
  return buildNextQuickReplies({
    mode,
    commercialType,
    product,
    category,
    store,
    detectedNeed,
    objections,
    recommendedProducts,
    usedReplies,
    lastUserMessage,
  });
}
