import { MessageRole, type ConversationMessage, type Product, type Store } from "@prisma/client";
import { getSellerAiLlmConfig } from "@/config/seller-ai";
import { formatMoney } from "@/lib/money";
import { getPrisma } from "@/lib/prisma";
import type { CommercialSignals, SellerAiMode } from "@/lib/seller-ai/modes";
import { getSellerAiSalesStylePreset } from "@/lib/seller-ai/seller-ai";
import type { SellerAiReplyInput, SellerAiReplyProduct } from "@/lib/seller-ai/types";
import { getStorefrontFlow } from "@/lib/storefront-flow";

type ProductWithCategory = Product & { category?: { name: string; slug: string } | null };
type StoreForContext = Pick<Store, "id" | "slug" | "name" | "description" | "commercialTagline" | "whatsapp" | "currency" | "countryCode" | "locale" | "plan" | "sellerAiSalesStyle">;
type SellerAiContextDb = Pick<ReturnType<typeof getPrisma>, "product">;

function cappedText(value: string | null | undefined, maxLength: number) {
  const clean = (value ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return null;
  return clean.length > maxLength ? `${clean.slice(0, Math.max(0, maxLength - 3))}...` : clean;
}

function productUrl(storeSlug: string, productSlug: string) {
  return `/${storeSlug}/p/${productSlug}`;
}

function shortDescription(description?: string | null) {
  const clean = (description ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return null;
  return clean.length > 220 ? `${clean.slice(0, 217)}...` : clean;
}

function toReplyProduct(store: StoreForContext, product: ProductWithCategory): SellerAiReplyProduct {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    priceLabel: formatMoney({
      amountCents: product.priceCents,
      currency: store.currency ?? product.currency,
      countryCode: store.countryCode ?? "BO",
      locale: store.locale,
    }),
    shortDescription: shortDescription(product.description),
    categoryName: product.category?.name ?? null,
    url: productUrl(store.slug, product.slug),
  };
}

function uniqueById(products: ProductWithCategory[]) {
  const seen = new Set<string>();
  return products.filter((product) => {
    if (seen.has(product.id)) return false;
    seen.add(product.id);
    return true;
  });
}

export function pickRecentSellerAiMessages(messages: ConversationMessage[], maxRecentMessages = getSellerAiLlmConfig().maxRecentMessages) {
  return messages
    .filter((message) => message.role === MessageRole.USER || message.role === MessageRole.ASSISTANT)
    .slice(-maxRecentMessages)
    .map((message) => ({ role: message.role as "USER" | "ASSISTANT", content: message.content.slice(0, 1000) }));
}

export async function getSellerAiLlmCandidateProducts({
  store,
  currentProduct,
  maxContextProducts = getSellerAiLlmConfig().maxContextProducts,
  db = getPrisma(),
}: {
  store: StoreForContext;
  currentProduct?: ProductWithCategory | null;
  maxContextProducts?: number;
  db?: SellerAiContextDb;
}) {
  const take = Math.min(Math.max(maxContextProducts, 1), 5);
  const relatedTake = currentProduct ? take - 1 : take;
  const related =
    relatedTake > 0
      ? await db.product.findMany({
          where: {
            storeId: store.id,
            isVisible: true,
            id: currentProduct ? { not: currentProduct.id } : undefined,
            categoryId: currentProduct?.categoryId ?? undefined,
          },
          include: { category: true },
          orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { updatedAt: "desc" }, { name: "asc" }],
          take: relatedTake,
        })
      : [];

  const fallbackTake = take - (currentProduct ? 1 : 0) - related.length;
  const fallback =
    fallbackTake > 0
      ? await db.product.findMany({
          where: {
            storeId: store.id,
            isVisible: true,
            id: { notIn: [currentProduct?.id, ...related.map((product) => product.id)].filter(Boolean) as string[] },
          },
          include: { category: true },
          orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { updatedAt: "desc" }, { name: "asc" }],
          take: fallbackTake,
        })
      : [];

  return uniqueById([...(currentProduct ? [currentProduct] : []), ...related, ...fallback]).slice(0, take).map((product) => toReplyProduct(store, product));
}

export async function buildSellerAiReplyInput({
  store,
  currentProduct,
  commercialSignals,
  mode,
  journeySummary,
  recentMessages,
  visitorMessage,
  db,
}: {
  store: StoreForContext;
  currentProduct?: ProductWithCategory | null;
  commercialSignals: CommercialSignals;
  mode: SellerAiMode;
  journeySummary?: string | null;
  recentMessages: ConversationMessage[];
  visitorMessage: string;
  db?: SellerAiContextDb;
}): Promise<SellerAiReplyInput> {
  const flow = getStorefrontFlow(store.plan);
  const candidateProducts = await getSellerAiLlmCandidateProducts({ store, currentProduct, db });
  const salesStyle = getSellerAiSalesStylePreset(store.sellerAiSalesStyle);

  return {
    store: {
      id: store.id,
      slug: store.slug,
      name: store.name,
      whatsappPresent: Boolean(store.whatsapp),
    },
    storeContext: {
      name: store.name,
      description: cappedText(store.description, 500),
      commercialTagline: cappedText(store.commercialTagline, 200),
    },
    salesStyle: {
      id: salesStyle.id,
      instruction: salesStyle.instruction,
    },
    currentProduct: currentProduct ? toReplyProduct(store, currentProduct) : null,
    candidateProducts,
    commercialSignals,
    mode,
    journeySummary,
    recentMessages: pickRecentSellerAiMessages(recentMessages),
    visitorMessage: visitorMessage.slice(0, 1000),
    whatsappHandoffAvailable: Boolean(store.whatsapp),
    requirePhoneBeforeWhatsapp: flow.requirePhoneBeforeWhatsapp,
  };
}
