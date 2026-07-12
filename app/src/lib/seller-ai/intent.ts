import { sellerAiConfig } from "@/config/seller-ai";

type EventLike = { eventType: string; productId?: string | null; metadata?: unknown };
type MessageLike = { role: string; content: string };

function has(pattern: RegExp, messages: MessageLike[]) {
  return messages.some((message) => message.role === "USER" && pattern.test(message.content.toLowerCase()));
}

export function calculateIntentScore({
  events,
  messages,
  whatsappClicked,
}: {
  events: EventLike[];
  messages: MessageLike[];
  whatsappClicked?: boolean;
}) {
  const rules = sellerAiConfig.intentScoreRules;
  let score = rules.base;

  if (events.some((event) => event.eventType === "CHAT_OPENED")) score += rules.chatOpened;
  score += messages.filter((message) => message.role === "USER").length * rules.customerMessageSent;
  if (has(/precio|cu[aá]nto|cuanto|vale|costo|cuesta/, messages)) score += rules.priceQuestion;
  if (has(/talla|color|stock|disponible|disponibilidad|hay|variante/, messages)) score += rules.variantQuestion;
  if (has(/quiero|me interesa|comprar|como compro|cómo compro|pedir|pedido|lo llevo/, messages)) score += rules.buyIntent;
  if (whatsappClicked || events.some((event) => event.eventType === "WHATSAPP_CLICKED")) score += rules.whatsappClicked;

  const productViews = events.filter((event) => event.eventType === "PRODUCT_VIEW" && event.productId);
  const viewedIds = productViews.map((event) => event.productId);
  if (new Set(viewedIds).size < viewedIds.length) score += rules.sameProductReturn;
  if (productViews.length >= 2) score += rules.sameCategoryProducts;

  return Math.min(rules.max, score);
}

export function classifyIntent(score: number): "Baja" | "Media" | "Alta" {
  if (score >= 70) return "Alta";
  if (score >= 40) return "Media";
  return "Baja";
}
