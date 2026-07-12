import { sellerAiConfig } from "@/config/seller-ai";
import { getPrisma } from "@/lib/prisma";

type StoreLike = { id: string; name: string; city?: string | null };
type CategoryLike = { id?: string; name: string; slug?: string } | null;
type ProductLike = { id: string; name: string; categoryId?: string | null; category?: CategoryLike };
type FoodCategoryLike = { id?: string | null; name?: string | null; slug?: string | null } | null;
type FoodStoreLike = { slug?: string | null; name?: string | null; description?: string | null; commercialType?: string | null };
type FoodProductLike = { name?: string | null; description?: string | null; category?: FoodCategoryLike };

function normalize(input?: string | null) {
  return (input ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const foodPattern =
  /\b(menu|men[uú]|restaurant|restaurante|comida|almuerzo|cena|desayuno|plato|platos|ensalada|ensaladas|bebida|bebidas|sopa|sopas|pollo|beef|carne|pasta|alfredo|stroganoff|salmon|salm[oó]n|duck|pato|tandoori|tomato|tomate|caesar|c[eé]sar|wrap|jugo|jugos|hamburguesa|pizza|sandwich|s[aá]ndwich)\b/;
const foodCategoryPattern = /\b(ensalada|ensaladas|plato|platos|comida|bebida|bebidas|sopa|sopas|menu|men[uú]|almuerzo|cena|desayuno|postre|postres)\b/;

export function isFoodRestaurantContext({
  store,
  product,
  category,
}: {
  store?: FoodStoreLike | null;
  product?: FoodProductLike | null;
  category?: FoodCategoryLike;
}) {
  if (store?.commercialType === "MENU") return true;
  if (normalize(store?.slug) === "javier" || normalize(store?.name) === "exitosos") return true;

  const categoryText = normalize(`${category?.name ?? product?.category?.name ?? ""} ${category?.slug ?? product?.category?.slug ?? ""}`);
  if (foodCategoryPattern.test(categoryText)) return true;

  const productText = normalize(`${product?.name ?? ""} ${product?.description ?? ""}`);
  if (foodPattern.test(productText)) return true;

  const storeText = normalize(`${store?.name ?? ""} ${store?.description ?? ""}`);
  return foodPattern.test(storeText);
}

export function getFoodRestaurantQuickReplies() {
  return ["Ingredientes", "Porción", "Precio", "Pedir"];
}

export function describeFoodProductFromName(productName?: string | null) {
  const text = normalize(productName);
  if (/caesar|cesar|c[eé]sar/.test(text) && /chicken|pollo/.test(text)) return "una ensalada tipo César con pollo";
  if (/ensalada|salad/.test(text)) return "una ensalada";
  if (/sopa|soup/.test(text)) return "una sopa";
  if (/pasta|alfredo/.test(text)) return "un plato de pasta";
  if (/salmon|salm[oó]n/.test(text)) return "un plato con salmón";
  if (/duck|pato/.test(text)) return "un plato con pato";
  if (/beef|carne|stroganoff/.test(text)) return "un plato con carne";
  if (/chicken|pollo|tandoori/.test(text)) return "un plato con pollo";
  return "un plato de comida";
}

export function getProductCategoryKind(product?: ProductLike | null, category?: CategoryLike) {
  const raw = `${category?.name ?? product?.category?.name ?? ""} ${category?.slug ?? product?.category?.slug ?? ""} ${product?.name ?? ""}`.toLowerCase();
  if (isFoodRestaurantContext({ product, category })) return "food";
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
