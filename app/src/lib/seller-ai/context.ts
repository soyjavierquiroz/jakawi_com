import { sellerAiConfig } from "@/config/seller-ai";
import { getPrisma } from "@/lib/prisma";

type StoreLike = { id: string; name: string; city?: string | null };
type CategoryLike = { id?: string; name: string; slug?: string } | null;
type ProductLike = { id: string; name: string; categoryId?: string | null; category?: CategoryLike };
type FoodCategoryLike = { id?: string | null; name?: string | null; slug?: string | null } | null;
type FoodStoreLike = { slug?: string | null; name?: string | null; description?: string | null; commercialType?: string | null };
type FoodProductLike = { slug?: string | null; name?: string | null; description?: string | null; category?: FoodCategoryLike };

export type MenuProductProfile = {
  menuType: "food";
  ingredients: string[];
  portionNote: string;
  servingSuggestion: string;
  orderQuestions: string[];
  ownerVerified: boolean;
  tags: string[];
};

function normalize(input?: string | null) {
  return (input ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const foodPattern =
  /\b(menu|men[uú]|restaurant|restaurante|comida|almuerzo|cena|desayuno|plato|platos|ensalada|ensaladas|bebida|bebidas|sopa|sopas|pollo|beef|carne|pasta|alfredo|stroganoff|salmon|salm[oó]n|duck|pato|tandoori|tomato|tomate|caesar|c[eé]sar|wrap|jugo|jugos|hamburguesa|pizza|sandwich|s[aá]ndwich)\b/;
const foodCategoryPattern = /\b(ensalada|ensaladas|plato|platos|comida|bebida|bebidas|sopa|sopas|menu|men[uú]|almuerzo|cena|desayuno|postre|postres)\b/;

const exitososMenuProfiles: Record<string, MenuProductProfile> = {
  "caesar-with-chicken": {
    menuType: "food",
    ingredients: ["lechuga fresca", "pollo", "aderezo César", "queso parmesano", "crutones"],
    portionNote: "Porción individual.",
    servingSuggestion: "Ideal para almuerzo ligero o cena fresca.",
    orderQuestions: ["¿Está disponible ahora?", "¿Qué tamaño tiene la porción?", "¿Cómo hago el pedido?"],
    ownerVerified: false,
    tags: ["ensalada", "pollo", "fresco", "proteína"],
  },
  "beef-stroganoff": {
    menuType: "food",
    ingredients: ["carne", "salsa cremosa estilo stroganoff"],
    portionNote: "Porción individual.",
    servingSuggestion: "Buena opción para una comida caliente y contundente.",
    orderQuestions: ["¿Está disponible ahora?", "¿Con qué viene acompañado?", "¿Cómo hago el pedido?"],
    ownerVerified: false,
    tags: ["plato", "carne", "cremoso"],
  },
  "creamy-chicken-alfredo": {
    menuType: "food",
    ingredients: ["pasta", "pollo", "salsa Alfredo cremosa"],
    portionNote: "Porción individual.",
    servingSuggestion: "Ideal para una comida caliente y fácil de pedir.",
    orderQuestions: ["¿Está disponible ahora?", "¿Qué tamaño tiene la porción?", "¿Cómo hago el pedido?"],
    ownerVerified: false,
    tags: ["pasta", "pollo", "cremoso"],
  },
  "pan-seared-duck": {
    menuType: "food",
    ingredients: ["pato", "preparación sellada a la sartén"],
    portionNote: "Porción individual.",
    servingSuggestion: "Opción para una comida especial con sabor marcado.",
    orderQuestions: ["¿Está disponible ahora?", "¿Con qué viene acompañado?", "¿Cómo hago el pedido?"],
    ownerVerified: false,
    tags: ["plato", "pato", "sartén"],
  },
  "pan-seared-salmon": {
    menuType: "food",
    ingredients: ["salmón", "preparación sellada a la sartén"],
    portionNote: "Porción individual.",
    servingSuggestion: "Ideal para pedir algo distinto y fresco.",
    orderQuestions: ["¿Está disponible ahora?", "¿Con qué viene acompañado?", "¿Cómo hago el pedido?"],
    ownerVerified: false,
    tags: ["plato", "salmón", "sartén"],
  },
  "roasted-tomato-soup": {
    menuType: "food",
    ingredients: ["tomate rostizado", "base de sopa"],
    portionNote: "Porción individual.",
    servingSuggestion: "Buena opción para algo caliente y reconfortante.",
    orderQuestions: ["¿Está disponible ahora?", "¿Qué tamaño tiene la porción?", "¿Cómo hago el pedido?"],
    ownerVerified: false,
    tags: ["sopa", "tomate", "caliente"],
  },
  "tandoori-chicken": {
    menuType: "food",
    ingredients: ["pollo", "preparación estilo tandoori"],
    portionNote: "Porción individual.",
    servingSuggestion: "Buena alternativa si buscas un plato con sabor marcado.",
    orderQuestions: ["¿Está disponible ahora?", "¿Con qué viene acompañado?", "¿Cómo hago el pedido?"],
    ownerVerified: false,
    tags: ["plato", "pollo", "tandoori"],
  },
};

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

export function getMenuProductProfile({
  store,
  product,
}: {
  store?: FoodStoreLike | null;
  product?: FoodProductLike | null;
}): MenuProductProfile | null {
  const storeKey = normalize(store?.slug);
  if (storeKey !== "javier" && normalize(store?.name) !== "exitosos") return null;
  const slug = normalize(product?.slug);
  if (!slug) return null;
  return exitososMenuProfiles[slug] ?? null;
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
