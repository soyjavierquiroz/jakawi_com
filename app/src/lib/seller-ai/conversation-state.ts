import { sellerAiConfig } from "@/config/seller-ai";
import { getFoodRestaurantQuickReplies, resolveAdvisorPlaybook } from "@/lib/seller-ai/context";
import type { SellerAiMode } from "@/lib/seller-ai/modes";
import { resolveOfferType } from "@/lib/seller-ai/offer-type";
import { getInitialQuickReplyLabels } from "@/lib/seller-ai/quick-replies";

type MessageLike = { role?: string | null; content?: string | null };

type BuildNextQuickRepliesParams = {
  mode: SellerAiMode;
  commercialType?: string | null;
  product?: { name?: string | null; slug?: string | null; description?: string | null; category?: { name?: string | null; slug?: string | null } | null } | null;
  category?: { name?: string | null; slug?: string | null } | null;
  store?: { slug?: string | null; name?: string | null; description?: string | null; commercialType?: string | null } | null;
  detectedNeed?: string | null;
  objections?: string[] | string | null;
  recommendedProducts?: Array<{ name: string }>;
  usedReplies?: string[];
  lastUserMessage?: string | null;
};

export function normalizeQuickReply(text?: string | null) {
  return (text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿?¡!.,:;]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function toArray(value?: string[] | string | null) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function semanticKey(text?: string | null) {
  const normalized = normalizeQuickReply(text);
  if (!normalized) return "";
  if (/\b(precio|cuanto|cuesta|vale|costo)\b/.test(normalized)) return "precio";
  if (/\b(disponible|disponibilidad|stock|hay)\b/.test(normalized)) return "disponibilidad";
  if (/\b(envio|enviar|entrega|delivery)\b/.test(normalized)) return "envio";
  if (/\b(pedir|pedido)\b/.test(normalized)) return "pedido";
  if (/\b(whatsapp|consulta)\b/.test(normalized)) return "whatsapp";
  if (/\b(ingrediente|ingredientes|lleva|trae|contiene)\b/.test(normalized)) return "ingredientes";
  if (/\b(porcion|porcion|tamano|tamaño|tamano porcion|tamaño porcion)\b/.test(normalized)) return "porcion";
  if (/\b(pollo|chicken)\b/.test(normalized)) return "pollo";
  if (/\b(comprar|comprarlo|comprarla|quiero comprar|me interesa)\b/.test(normalized)) return "compra";
  if (/\b(regalo|regalar|para regalar)\b/.test(normalized)) return "regalo";
  if (/\b(estudio|estudiante|clases|universidad|colegio)\b/.test(normalized)) return "estudio";
  if (/\b(trabajo|oficina)\b/.test(normalized)) return "trabajo";
  if (/\b(viaje|viajar)\b/.test(normalized)) return "viaje";
  if (/\b(economico|barato|presupuesto)\b/.test(normalized)) return "economico";
  return normalized;
}

export function getUsedQuickReplies(messages: MessageLike[]) {
  return messages
    .filter((message) => message.role?.toLowerCase() === "user")
    .slice(-8)
    .map((message) => message.content ?? "");
}

function matchesDetectedNeed(reply: string, detectedNeed?: string | null) {
  const replyKey = semanticKey(reply);
  const needKey = semanticKey(detectedNeed);
  return Boolean(replyKey && needKey && replyKey === needKey);
}

export function filterRepeatedQuickReplies(
  replies: string[],
  context: {
    detectedNeed?: string | null;
    objections?: string[] | string | null;
    usedReplies?: string[];
    lastUserMessage?: string | null;
    max?: number;
  },
) {
  const usedKeys = new Set((context.usedReplies ?? []).map(semanticKey).filter(Boolean));
  const objectionKeys = new Set(toArray(context.objections).map(semanticKey).filter(Boolean));
  const lastKey = semanticKey(context.lastUserMessage);

  return unique(replies)
    .filter((reply) => {
      const key = semanticKey(reply);
      if (!key || key === lastKey || usedKeys.has(key)) return false;
      if (objectionKeys.has(key)) return false;
      return !matchesDetectedNeed(reply, context.detectedNeed);
    })
    .slice(0, context.max ?? 4);
}

export function buildConversationFocus({
  detectedNeed,
  objections,
  lastUserMessage,
}: {
  detectedNeed?: string | null;
  objections?: string[] | string | null;
  lastUserMessage?: string | null;
}) {
  const lastKey = semanticKey(lastUserMessage);
  const objectionKeys = toArray(objections).map(semanticKey).filter(Boolean);
  return {
    lastKey,
    needKey: semanticKey(detectedNeed),
    objectionKeys,
    hasPriceQuestion: lastKey === "precio" || objectionKeys.includes("precio"),
    hasAvailabilityQuestion: lastKey === "disponibilidad" || objectionKeys.includes("disponibilidad"),
    hasShippingQuestion: lastKey === "envio" || objectionKeys.includes("envio"),
    hasGiftNeed: semanticKey(detectedNeed) === "regalo" || lastKey === "regalo",
  };
}

export function buildNextQuickReplies({
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
}: BuildNextQuickRepliesParams) {
  const focus = buildConversationFocus({ detectedNeed, objections, lastUserMessage });
  const productReply = product?.name ? `Me interesa ${product.name}` : "Me interesa comprar";
  const recommended = recommendedProducts?.[0]?.name ? `Me interesa ${recommendedProducts[0].name}` : null;
  const contextStore = store ?? (commercialType ? { commercialType } : null);
  const offerType = resolveOfferType(contextStore, product ? { ...product, category } : null);
  const foodMode = offerType === "MENU";
  const playbook = offerType === "PRODUCT" ? resolveAdvisorPlaybook(contextStore, product ? { ...product, category } : null) : null;
  const isFashionBelt = playbook?.vertical === "fashion" && playbook.subcategory === "belt";
  const isFashionDress = playbook?.vertical === "fashion" && playbook.subcategory === "dress";

  let replies: string[];
  if (foodMode && focus.lastKey === "ingredientes") {
    replies = ["Confirmar disponibilidad", "Pedir por WhatsApp", "Ver precio", "Volver al producto"];
  } else if (foodMode && (focus.lastKey === "pedido" || mode === "CLOSING_PREP")) {
    replies = ["Ya te dejo mi número", "Ver precio", "Confirmar disponibilidad"];
  } else if (foodMode) {
    replies = getFoodRestaurantQuickReplies();
  } else if (offerType === "SERVICE" && mode === "CLOSING_PREP") {
    replies = ["Ya te dejo mi número", "Precio", "Volver al producto"];
  } else if (offerType === "SERVICE") {
    replies = getInitialQuickReplyLabels("SERVICE");
  } else if (mode === "CLOSING_PREP") {
    replies = ["Ya te dejo mi número", "Precio", "Disponibilidad"];
  } else if (focus.hasAvailabilityQuestion) {
    replies = ["Envío", "Comprar", "Precio", "Volver al producto"];
  } else if (focus.hasShippingQuestion) {
    replies = ["Disponibilidad", "Comprar", "Precio", "Volver al producto"];
  } else if (focus.hasPriceQuestion) {
    replies = ["Disponibilidad", "Envío", "Comprar", "Volver al producto"];
  } else if (focus.hasGiftNeed) {
    replies = ["Características", "Medidas", "Precio", "Comprar"];
  } else if (detectedNeed && mode === "PRODUCT_ADVISOR") {
    replies = ["Características", "Medidas", "Precio", "Comprar"];
  } else if (mode === "DECISION_SUPPORT") {
    replies = ["Características", "Disponibilidad", "Envío", "Comprar"];
  } else if (isFashionBelt && mode === "PRODUCT_ADVISOR") {
    replies = ["Combina con", "Medida / ajuste", "Precio", "Envío", "Comprar"];
  } else if (isFashionDress && mode === "PRODUCT_ADVISOR") {
    replies = ["Tallas", "Colores", "Evento", "Precio", "Comprar"];
  } else if (mode === "PRODUCT_ADVISOR") {
    replies = getInitialQuickReplyLabels("PRODUCT");
  } else if (mode === "DISCOVERY") {
    const commercialKey = (commercialType ?? "PRODUCT_STORE") as keyof typeof sellerAiConfig.commercialTypes;
    replies = offerType === "PRODUCT" ? getInitialQuickReplyLabels("PRODUCT") : (sellerAiConfig.commercialTypes[commercialKey]?.quickReplies ?? sellerAiConfig.commercialTypes.PRODUCT_STORE.quickReplies);
  } else {
    replies = [recommended ?? productReply, "Hablemos por WhatsApp"];
  }

  return filterRepeatedQuickReplies(replies, {
    detectedNeed,
    objections,
    usedReplies,
    lastUserMessage,
    max: isFashionBelt || isFashionDress ? 5 : 4,
  });
}
