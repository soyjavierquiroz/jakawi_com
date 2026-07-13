import { sellerAiConfig } from "@/config/seller-ai";
import { getPrisma } from "@/lib/prisma";
import type { SellerIntent } from "@/lib/seller-ai/intent-router";
import { resolveOfferType, type SellerOfferType } from "@/lib/seller-ai/offer-type";

type StoreLike = { id: string; name: string; city?: string | null };
type CategoryLike = { id?: string | null; name?: string | null; slug?: string | null } | null;
type ProductLike = { id?: string; name?: string | null; slug?: string | null; description?: string | null; categoryId?: string | null; category?: CategoryLike };
type ProductWithId = ProductLike & { id: string; name: string };
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

export type AdvisorVertical = "food" | "fashion" | "luggage" | "footwear" | "service" | "generic";
export type FashionSubcategory = "dress" | "accessory" | "belt" | "footwear" | "bag" | "generic";

export type FashionProductProfile = {
  vertical: "fashion";
  category: "dress" | "accessory" | "generic";
  subcategory: FashionSubcategory;
  occasionSuitability: string[];
  styleNotes?: string[];
  weddingAdvice?: string;
  sizes?: string[];
  color?: string;
  material?: string | null;
  usage?: string[];
  effect?: string;
  compatibleWith?: string[];
  recommendedColors?: string[];
  avoid?: string[];
  exactMeasure?: string | null;
};

export type AdvisorPlaybook = {
  offerType: SellerOfferType;
  vertical: AdvisorVertical;
  category: string;
  subcategory?: FashionSubcategory;
  tone: string;
  primaryFacts: string[];
  supportedIntents: SellerIntent[];
  fashionProfile?: FashionProductProfile;
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

const boutiqueLunaFashionProfiles: Record<string, FashionProductProfile> = {
  "vestido-rojo-de-fiesta": {
    vertical: "fashion",
    category: "dress",
    subcategory: "dress",
    occasionSuitability: ["fiestas", "celebraciones", "cumpleaños", "cenas", "eventos de noche", "ocasiones especiales"],
    styleNotes: ["look llamativo", "femenino", "ideal para destacar"],
    weddingAdvice:
      "También puede funcionar para una boda si el código de vestimenta permite rojo o colores fuertes. Para algo más formal, el Vestido Largo Satinado puede ser mejor opción.",
    sizes: ["M", "L"],
    color: "rojo",
    material: null,
  },
  "vestido-floral-midi": {
    vertical: "fashion",
    category: "dress",
    subcategory: "dress",
    occasionSuitability: ["salidas de día", "almuerzos", "eventos casuales", "brunch", "reuniones informales"],
    weddingAdvice:
      "Puede servir para una boda de día o evento campestre si el código es casual/elegante. Para boda formal, mejor Vestido Largo Satinado.",
    material: "tela ligera",
  },
  "vestido-negro-elegante": {
    vertical: "fashion",
    category: "dress",
    subcategory: "dress",
    occasionSuitability: ["cenas", "reuniones", "eventos semi formales", "noche"],
    color: "negro",
  },
  "vestido-largo-satinado": {
    vertical: "fashion",
    category: "dress",
    subcategory: "dress",
    occasionSuitability: ["eventos formales", "cenas elegantes", "bodas", "celebraciones especiales"],
  },
  "vestido-blanco-casual": {
    vertical: "fashion",
    category: "dress",
    subcategory: "dress",
    occasionSuitability: ["día a día", "salida informal", "fin de semana", "clima cálido"],
    color: "blanco",
  },
  "vestido-verde-cruzado": {
    vertical: "fashion",
    category: "dress",
    subcategory: "dress",
    occasionSuitability: ["reuniones de día", "salidas casuales", "almuerzos", "look fresco"],
    color: "verde",
  },
  "cinturon-delgado-dorado": {
    vertical: "fashion",
    category: "accessory",
    subcategory: "belt",
    occasionSuitability: ["casual", "elegante", "cena", "fiesta", "salida", "eventos de noche"],
    styleNotes: ["complementa vestidos", "marca la cintura de forma sutil", "da un toque más arreglado a looks sencillos"],
    usage: ["complementar vestidos", "marcar cintura de forma sutil"],
    effect: "marcar cintura de forma sutil",
    compatibleWith: ["vestidos", "faldas", "pantalones de tiro alto", "blazers", "chamarras simples"],
    recommendedColors: ["negro", "blanco", "beige", "verde oscuro", "denim", "tonos neutros"],
    avoid: ["looks con demasiados accesorios metálicos compitiendo"],
    color: "dorado",
    material: null,
    exactMeasure: null,
  },
};

const baseSupportedIntents: Record<AdvisorVertical, SellerIntent[]> = {
  food: ["ASK_INGREDIENTS", "ASK_PORTION", "ASK_PRICE", "ASK_AVAILABILITY", "START_ORDER"],
  fashion: ["ASK_SIZE", "ASK_COLOR", "ASK_MATERIAL", "ASK_OCCASION", "ASK_SUITABILITY", "ASK_STYLE_ADVICE", "ASK_COMPATIBILITY", "ASK_FIT", "ASK_SHIPPING", "ASK_AVAILABILITY", "ASK_PRICE", "START_ORDER"],
  luggage: ["ASK_SIZE", "ASK_COMPATIBILITY", "ASK_MATERIAL", "ASK_SUITABILITY", "ASK_AVAILABILITY", "ASK_PRICE", "START_ORDER"],
  footwear: ["ASK_SIZE", "ASK_COLOR", "ASK_MATERIAL", "ASK_OCCASION", "ASK_SUITABILITY", "ASK_FIT", "ASK_AVAILABILITY", "ASK_PRICE", "START_ORDER"],
  service: ["ASK_SERVICE_INCLUDED", "ASK_DURATION", "ASK_PRICE", "ASK_AVAILABILITY", "START_BOOKING", "START_ORDER"],
  generic: ["ASK_FEATURES", "ASK_PRICE", "ASK_AVAILABILITY", "START_ORDER"],
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

function textForPlaybook(store?: FoodStoreLike | null, product?: ProductLike | null, category?: CategoryLike) {
  return normalize(`${store?.slug ?? ""} ${store?.name ?? ""} ${store?.description ?? ""} ${product?.slug ?? ""} ${product?.name ?? ""} ${product?.description ?? ""} ${category?.name ?? product?.category?.name ?? ""} ${category?.slug ?? product?.category?.slug ?? ""}`);
}

function getBoutiqueLunaProfile(store?: FoodStoreLike | null, product?: ProductLike | null) {
  if (normalize(store?.slug) !== "boutique-luna" && normalize(store?.name) !== "boutique luna") return null;
  const slug = normalize(product?.slug);
  if (slug && boutiqueLunaFashionProfiles[slug]) return boutiqueLunaFashionProfiles[slug];
  const name = normalize(product?.name).replace(/\s+/g, "-");
  return boutiqueLunaFashionProfiles[name] ?? null;
}

function inferFashionSubcategory(text: string): FashionSubcategory {
  if (/\b(vestido|dress)\b/.test(text)) return "dress";
  if (/\b(cinturon|cinturón|belt)\b/.test(text)) return "belt";
  if (/\b(zapato|zapatilla|tenis|calzado|sandalia|botin|botín)\b/.test(text)) return "footwear";
  if (/\b(bolso|cartera|bag)\b/.test(text)) return "bag";
  if (/\b(accesorio|collar|arete|pulsera)\b/.test(text)) return "accessory";
  return "generic";
}

function inferAdvisorVertical(store?: FoodStoreLike | null, product?: ProductLike | null, category?: CategoryLike): { vertical: AdvisorVertical; category: string; subcategory?: FashionSubcategory; profile?: FashionProductProfile } {
  const boutiqueProfile = getBoutiqueLunaProfile(store, product);
  if (boutiqueProfile) return { vertical: "fashion", category: boutiqueProfile.category, subcategory: boutiqueProfile.subcategory, profile: boutiqueProfile };

  const text = textForPlaybook(store, product, category);
  if (isFoodRestaurantContext({ store, product, category })) return { vertical: "food", category: "food" };
  if (/\b(vestido|ropa|moda|blusa|camisa|falda|pantalon|pantalón|cinturon|cinturón|accesorio|boutique)\b/.test(text)) {
    const subcategory = inferFashionSubcategory(text);
    return { vertical: "fashion", category: subcategory === "dress" ? "dress" : subcategory === "belt" || subcategory === "bag" || subcategory === "accessory" ? "accessory" : "generic", subcategory };
  }
  if (/\b(maleta|equipaje|carry on|carry-on|mochila|valija)\b/.test(text)) return { vertical: "luggage", category: "luggage" };
  if (/\b(zapato|zapatilla|tenis|calzado|sandalia|botin|botín)\b/.test(text)) return { vertical: "footwear", category: "footwear" };
  return { vertical: "generic", category: "generic" };
}

function playbookFacts(vertical: AdvisorVertical, subcategory?: FashionSubcategory) {
  if (vertical === "food") return ["ingredientes", "porción", "precio", "disponibilidad", "pedir"];
  if (vertical === "fashion" && subcategory === "belt") return ["combinación", "medida", "ajuste", "color", "ocasión", "envío", "comprar"];
  if (vertical === "fashion" && subcategory === "dress") return ["tallas", "colores", "material", "ocasión", "estilo", "disponibilidad", "comprar"];
  if (vertical === "fashion") return ["tallas", "colores", "material", "ocasión", "estilo", "disponibilidad", "comprar"];
  if (vertical === "luggage") return ["medidas", "capacidad", "material", "viaje", "garantía", "comprar"];
  if (vertical === "footwear") return ["tallas", "color", "material", "ocasión/uso", "comodidad", "comprar"];
  if (vertical === "service") return ["qué incluye", "duración", "precio", "agenda", "requisitos", "WhatsApp"];
  return ["características", "precio", "disponibilidad", "comprar"];
}

export function resolveAdvisorPlaybook(store?: FoodStoreLike | null, product?: ProductLike | null): AdvisorPlaybook {
  const offerType = resolveOfferType(store, product);
  if (offerType === "MENU") {
    return {
      offerType,
      vertical: "food",
      category: "food",
      tone: "asesor comercial cercano",
      primaryFacts: playbookFacts("food"),
      supportedIntents: baseSupportedIntents.food,
    };
  }
  if (offerType === "SERVICE") {
    return {
      offerType,
      vertical: "service",
      category: "service",
      tone: "asesor comercial cercano",
      primaryFacts: playbookFacts("service"),
      supportedIntents: baseSupportedIntents.service,
    };
  }

  const inferred = inferAdvisorVertical(store, product, product?.category);
  return {
    offerType,
    vertical: inferred.vertical,
    category: inferred.category,
    subcategory: inferred.subcategory,
    tone: "asesor comercial cercano",
    primaryFacts: playbookFacts(inferred.vertical, inferred.subcategory),
    supportedIntents: baseSupportedIntents[inferred.vertical],
    fashionProfile: inferred.profile,
  };
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
  if (/vestido|ropa|moda|camisa|polera|pantal/.test(raw)) return "ropa";
  if (/zapato|zapatilla|tenis|calzado/.test(raw)) return "zapatos";
  if (/maquillaje|belleza|labial|crema|cosmetic/.test(raw)) return "maquillaje";
  if (/regalo|detalle|sorpresa/.test(raw)) return "regalos";
  if (isFoodRestaurantContext({ product, category })) return "food";
  if (/celular|iphone|samsung|telefono|teléfono|smartphone|tecnolog/.test(raw)) return "celular";
  return "default";
}

export async function getRelatedProducts(storeId: string, product: ProductWithId) {
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

export function buildSellerContext(store: StoreLike, currentProduct: ProductWithId, relatedProducts: ProductWithId[], lead: unknown, messages: unknown[]) {
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
