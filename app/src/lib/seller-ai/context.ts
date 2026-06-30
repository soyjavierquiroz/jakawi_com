import { sellerAiConfig } from "@/config/seller-ai";
import { getPrisma } from "@/lib/prisma";

type StoreLike = { id: string; name: string; city?: string | null };
type CategoryLike = { id?: string; name: string; slug?: string } | null;
type ProductLike = { id: string; name: string; categoryId?: string | null; category?: CategoryLike };

export function getProductCategoryKind(product?: ProductLike | null, category?: CategoryLike) {
  const raw = `${category?.name ?? product?.category?.name ?? ""} ${category?.slug ?? product?.category?.slug ?? ""} ${product?.name ?? ""}`.toLowerCase();
  if (/celular|iphone|samsung|telefono|teléfono|smartphone|tecnolog/.test(raw)) return "celular";
  if (/vestido|ropa|moda|camisa|polera|pantal/.test(raw)) return "ropa";
  if (/zapato|zapatilla|tenis|calzado/.test(raw)) return "zapatos";
  if (/maquillaje|belleza|labial|crema|cosmetic/.test(raw)) return "maquillaje";
  if (/regalo|detalle|sorpresa/.test(raw)) return "regalos";
  return "default";
}

export async function getRelatedProducts(storeId: string, product: ProductLike) {
  const categoryMatches = product.categoryId
    ? await getPrisma().product.findMany({
        where: { storeId, isVisible: true, categoryId: product.categoryId, id: { not: product.id } },
        include: { category: true },
        orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { updatedAt: "desc" }, { name: "asc" }],
        take: sellerAiConfig.maxRecommendedProducts,
      })
    : [];

  if (categoryMatches.length >= sellerAiConfig.maxRecommendedProducts) return categoryMatches;

  const fallback = await getPrisma().product.findMany({
    where: { storeId, isVisible: true, id: { notIn: [product.id, ...categoryMatches.map((item) => item.id)] } },
    include: { category: true },
    orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { updatedAt: "desc" }, { name: "asc" }],
    take: sellerAiConfig.maxRecommendedProducts - categoryMatches.length,
  });

  return [...categoryMatches, ...fallback];
}

export function buildSellerContext(store: StoreLike, currentProduct: ProductLike, relatedProducts: ProductLike[], lead: unknown, messages: unknown[]) {
  return {
    store: { id: store.id, name: store.name, city: store.city },
    currentProduct: { id: currentProduct.id, name: currentProduct.name, category: currentProduct.category?.name },
    relatedProducts: relatedProducts.slice(0, sellerAiConfig.maxRecommendedProducts).map((product) => ({
      id: product.id,
      name: product.name,
      category: product.category?.name,
    })),
    lead,
    recentMessages: messages,
  };
}
