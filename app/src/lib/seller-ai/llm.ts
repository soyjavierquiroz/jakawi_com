import { getSellerAiLlmConfig, isSellerAiLlmStoreAllowed } from "@/config/seller-ai";
import { buildSellerAiReplyInput } from "@/lib/seller-ai/llm-context";
import type { CommercialSignals, SellerAiMode } from "@/lib/seller-ai/modes";
import { getOpenAISellerReply } from "@/lib/seller-ai/providers/openai";
import type { SellerAiLlmReplyResult } from "@/lib/seller-ai/types";
import type { ConversationMessage, Product, Store } from "@prisma/client";

type ProductWithCategory = Product & { category?: { name: string; slug: string } | null };
type StoreForLlm = Pick<Store, "id" | "slug" | "name" | "description" | "commercialTagline" | "whatsapp" | "currency" | "countryCode" | "locale" | "plan">;

function normalizeText(input?: string | null) {
  return (input ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function hasAnyPattern(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

const comparisonPatterns = [
  /\b(comparar|compara|comparame|comparacion|diferencia|vs|versus)\b/,
  /\b(otra opcion|otras opciones|alternativa|alternativas|algo similar|algo parecido)\b/,
  /\b(mas barato|mas economico|economico|barato|menor precio)\b/,
  /\b(cual conviene|cual me conviene|cual recomiendas|cual elijo|mejor opcion)\b/,
];

const indecisionPatterns = [
  /\b(no se|no estoy seguro|tengo duda|tengo dudas|dudo|indeciso|indecisa)\b/,
  /\b(no me convence|me conviene|vale la pena|por que me conviene|porque me conviene)\b/,
  /\b(ayudame a decidir|ayudame a elegir|que hago|que opinas)\b/,
];

const realObjectionPatterns = [
  /\b(caro|carisimo|costoso|muy caro|se me hace caro|esta caro)\b/,
  /\b(rebaja|descuento|promo|promocion|negociable|ultimo precio)\b/,
  /\b(no confio|confiable|seguro comprar|es original|garantia real)\b/,
  /\b(llega hoy|llega manana|demora|tarda|envio seguro|delivery seguro)\b/,
  /\b(no hay stock|sin stock|agotado|hay disponible para hoy)\b/,
  /\b(no tengo efectivo|puedo pagar|cuotas|tarjeta|qr|transferencia)\b/,
];

const complexClosingPatterns = [
  /\b(quiero pedir por whatsapp|quiero continuar por whatsapp|continuar por whatsapp)\b/,
  /\b(quiero comprar.*(hoy|ahora|whatsapp|envio|entrega|pagar|qr|transferencia))\b/,
  /\b(lo quiero.*(hoy|ahora|whatsapp|envio|entrega|pagar|qr|transferencia))\b/,
  /\b(reservar.*(hoy|ahora|whatsapp)|pedir.*(hoy|ahora|whatsapp))\b/,
];

const ambiguousReferencePatterns = [
  /\b(el otro|la otra|los otros|las otras)\b/,
  /\b(ese|esa|esos|esas)\b/,
  /\b(cual de esos|cual de esas|cual era|cual me dijiste)\b/,
  /\b(lo que me dijiste|lo que dijiste|el anterior|la anterior)\b/,
  /\b(comparado con|comparada con)\b/,
  /\b(y ese|y esa|y el otro|y la otra)\b/,
];

const recentRecommendationPatterns = [
  /\b(recomiendo|recomendaria|opcion|opciones|alternativa|alternativas|comparar|compararia)\b/,
  /\b(tambien tenemos|tambien podrias|miraria tambien|me interesa)\b/,
  /\b(producto recomendado|similar al producto|buena opcion)\b/,
];

type RecentMessageLike = Pick<ConversationMessage, "role" | "content">;

export function hasAmbiguousReference(message: string) {
  const text = normalizeText(message);
  return text.length <= 120 && hasAnyPattern(text, ambiguousReferencePatterns);
}

export function recentHistoryHasProductComparisonOrRecommendations(messages: RecentMessageLike[] = []) {
  return messages
    .slice(-6)
    .some((message) => {
      if (!message.content) return false;
      const text = normalizeText(message.content);
      return hasAnyPattern(text, recentRecommendationPatterns) || (/,\s*\w+/.test(text) && /\b(opcion|alternativa|comparar)\b/.test(text));
    });
}

export function shouldUseSellerAiLlm({
  visitorMessage,
  commercialSignals,
  mode,
  recentMessages,
}: {
  visitorMessage: string;
  commercialSignals: CommercialSignals;
  mode: SellerAiMode;
  recentMessages?: RecentMessageLike[];
}) {
  const text = normalizeText(visitorMessage);
  if (hasAmbiguousReference(visitorMessage) && recentHistoryHasProductComparisonOrRecommendations(recentMessages)) return true;
  if (hasAnyPattern(text, comparisonPatterns)) return true;
  if (hasAnyPattern(text, indecisionPatterns)) return true;
  if (hasAnyPattern(text, realObjectionPatterns)) return true;
  if (hasAnyPattern(text, complexClosingPatterns)) return true;
  if (mode === "CLOSING_PREP" && commercialSignals.hasStrongIntent && text.length > 80) return true;
  return false;
}

export async function tryGetSellerAiLlmReply({
  store,
  currentProduct,
  commercialSignals,
  mode,
  journeySummary,
  recentMessages,
  visitorMessage,
}: {
  store: StoreForLlm;
  currentProduct?: ProductWithCategory | null;
  commercialSignals: CommercialSignals;
  mode: SellerAiMode;
  journeySummary?: string | null;
  recentMessages: ConversationMessage[];
  visitorMessage: string;
}): Promise<SellerAiLlmReplyResult | null> {
  const config = getSellerAiLlmConfig();
  if (!config.enabled || config.provider !== "openai" || !config.openAiApiKeyPresent) return null;
  if (!isSellerAiLlmStoreAllowed(store.slug)) return null;
  if (!shouldUseSellerAiLlm({ visitorMessage, commercialSignals, mode, recentMessages })) return null;

  const input = await buildSellerAiReplyInput({
    store,
    currentProduct,
    commercialSignals,
    mode,
    journeySummary,
    recentMessages,
    visitorMessage,
  });
  const result = await getOpenAISellerReply(input);
  if (!result || result.output.fallbackToRules) return null;
  return result;
}
