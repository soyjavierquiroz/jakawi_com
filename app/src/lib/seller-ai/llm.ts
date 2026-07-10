import { getSellerAiLlmConfig, isSellerAiLlmStoreAllowed } from "@/config/seller-ai";
import { buildSellerAiReplyInput } from "@/lib/seller-ai/llm-context";
import type { CommercialSignals, SellerAiMode } from "@/lib/seller-ai/modes";
import { getOpenAISellerReply } from "@/lib/seller-ai/providers/openai";
import type { SellerAiLlmReplyResult } from "@/lib/seller-ai/types";
import type { ConversationMessage, Product, Store } from "@prisma/client";

type ProductWithCategory = Product & { category?: { name: string; slug: string } | null };
type StoreForLlm = Pick<Store, "id" | "slug" | "name" | "whatsapp" | "currency" | "countryCode" | "locale" | "plan">;

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

export function shouldUseSellerAiLlm({
  visitorMessage,
  commercialSignals,
  mode,
}: {
  visitorMessage: string;
  commercialSignals: CommercialSignals;
  mode: SellerAiMode;
}) {
  const text = normalizeText(visitorMessage);
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
  if (!shouldUseSellerAiLlm({ visitorMessage, commercialSignals, mode })) return null;

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
