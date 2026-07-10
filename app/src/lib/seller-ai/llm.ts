import { getSellerAiLlmConfig, isSellerAiLlmStoreAllowed } from "@/config/seller-ai";
import { buildSellerAiReplyInput } from "@/lib/seller-ai/llm-context";
import type { CommercialSignals, SellerAiMode } from "@/lib/seller-ai/modes";
import { getOpenAISellerReply } from "@/lib/seller-ai/providers/openai";
import type { SellerAiLlmReplyResult } from "@/lib/seller-ai/types";
import type { ConversationMessage, Product, Store } from "@prisma/client";

type ProductWithCategory = Product & { category?: { name: string; slug: string } | null };
type StoreForLlm = Pick<Store, "id" | "slug" | "name" | "whatsapp" | "currency" | "countryCode" | "locale" | "plan">;

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
