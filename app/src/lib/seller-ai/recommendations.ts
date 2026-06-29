import { Prisma } from "@prisma/client";
import { sellerAiConfig } from "@/config/seller-ai";
import { formatMoney } from "@/lib/money";
import { getPrisma } from "@/lib/prisma";

export type SellerAiRecommendedProduct = {
  id: string;
  name: string;
  slug: string;
  priceLabel: string;
  imageUrl?: string | null;
  shortReason: string;
};

type ProductWithCategory = Prisma.ProductGetPayload<{ include: { category: true } }>;

function normalize(input?: string | null) {
  return (input ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function productText(product: ProductWithCategory) {
  return normalize(`${product.name} ${product.description ?? ""} ${product.category?.name ?? ""}`);
}

function uniqueProducts(products: ProductWithCategory[]) {
  const seen = new Set<string>();
  return products.filter((product) => {
    if (seen.has(product.id)) return false;
    seen.add(product.id);
    return true;
  });
}

function hasStrongTextRelation(product: ProductWithCategory, currentProduct?: ProductWithCategory | null, detectedNeed?: string | null) {
  const need = normalize(detectedNeed);
  if (need && productText(product).includes(need)) return true;
  if (!currentProduct) return true;

  const currentTokens = new Set(productText(currentProduct).split(/\s+/).filter((token) => token.length >= 5));
  return productText(product)
    .split(/\s+/)
    .some((token) => token.length >= 5 && currentTokens.has(token));
}

function reasonForProduct(product: ProductWithCategory, params: { currentProductId?: string | null; categoryId?: string | null; detectedNeed?: string | null }) {
  if (params.currentProductId && product.categoryId) return "Similar al producto que viste";
  if (params.categoryId && product.categoryId === params.categoryId) return "Opción recomendada de esta categoría";
  if (params.detectedNeed && productText(product).includes(normalize(params.detectedNeed))) return "Puede encajar con lo que buscas";
  return "Buena opción para comparar";
}

export async function getSellerAiRecommendations({
  storeId,
  currentProductId,
  categoryId,
  detectedNeed,
  budget,
  limit = sellerAiConfig.maxRecommendedProducts,
}: {
  storeId: string;
  currentProductId?: string | null;
  categoryId?: string | null;
  detectedNeed?: string | null;
  budget?: string | null;
  limit?: number;
}): Promise<SellerAiRecommendedProduct[]> {
  const take = Math.min(Math.max(limit, 1), 3);
  const store = await getPrisma().store.findUnique({ where: { id: storeId }, select: { currency: true, countryCode: true, locale: true } });
  const currentProduct = currentProductId
    ? await getPrisma().product.findFirst({ where: { id: currentProductId, storeId, isVisible: true }, include: { category: true } })
    : null;
  const resolvedCategoryId = categoryId ?? currentProduct?.categoryId ?? undefined;
  const need = normalize(detectedNeed);

  const byCurrentCategory =
    currentProduct?.categoryId
      ? await getPrisma().product.findMany({
          where: { storeId, isVisible: true, categoryId: currentProduct.categoryId, id: { not: currentProduct.id } },
          include: { category: true },
          orderBy: { createdAt: "desc" },
          take: 10,
        })
      : [];
  const byCategory =
    resolvedCategoryId && byCurrentCategory.length < take
      ? await getPrisma().product.findMany({
          where: { storeId, isVisible: true, categoryId: resolvedCategoryId, id: { not: currentProductId ?? undefined } },
          include: { category: true },
          orderBy: { createdAt: "desc" },
          take: 10,
        })
      : [];
  const shouldUseFallback = !currentProduct && !resolvedCategoryId;
  const fallback = shouldUseFallback
    ? await getPrisma().product.findMany({
        where: { storeId, isVisible: true, id: currentProductId ? { not: currentProductId } : undefined },
        include: { category: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
    : [];
  const relatedByNeed =
    currentProduct && need
      ? await getPrisma().product.findMany({
          where: { storeId, isVisible: true, id: { not: currentProduct.id } },
          include: { category: true },
          orderBy: { createdAt: "desc" },
          take: 20,
        })
      : [];

  const needMatches = relatedByNeed.filter((product) => productText(product).includes(need));
  const candidates = uniqueProducts([...byCurrentCategory, ...byCategory, ...needMatches, ...fallback]);
  const relevantCandidates = currentProduct ? candidates.filter((product) => hasStrongTextRelation(product, currentProduct, detectedNeed)) : candidates;
  const sorted = [...relevantCandidates].sort((first, second) => {
    const firstNeedMatch = need && productText(first).includes(need) ? 1 : 0;
    const secondNeedMatch = need && productText(second).includes(need) ? 1 : 0;
    if (firstNeedMatch !== secondNeedMatch) return secondNeedMatch - firstNeedMatch;
    if (budget === "económico" && first.priceCents !== second.priceCents) return first.priceCents - second.priceCents;
    return second.createdAt.getTime() - first.createdAt.getTime();
  });

  return sorted.slice(0, take).map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    priceLabel: formatMoney({
      amountCents: product.priceCents,
      currency: store?.currency ?? product.currency,
      countryCode: store?.countryCode ?? "BO",
      locale: store?.locale,
    }),
    imageUrl: product.imageUrl,
    shortReason: reasonForProduct(product, { currentProductId, categoryId: resolvedCategoryId, detectedNeed }),
  }));
}
