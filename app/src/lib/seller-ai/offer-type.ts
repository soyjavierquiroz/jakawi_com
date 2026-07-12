export type SellerOfferType = "MENU" | "PRODUCT" | "SERVICE";

type StoreLike = {
  slug?: string | null;
  name?: string | null;
  description?: string | null;
  commercialType?: string | null;
};

type CategoryLike = { name?: string | null; slug?: string | null } | null;

type ProductLike = {
  name?: string | null;
  slug?: string | null;
  description?: string | null;
  category?: CategoryLike;
  tags?: string[] | null;
} | null;

function normalize(input?: string | null) {
  return (input ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function has(text: string, pattern: RegExp) {
  return pattern.test(text);
}

const menuPattern =
  /\b(menu|restaurant|restaurante|comida|almuerzo|cena|desayuno|plato|platos|ensalada|ensaladas|bebida|bebidas|sopa|sopas|pollo|carne|pasta|hamburguesa|pizza|sandwich|sandwiche|wrap|jugo|postre)\b/;
const servicePattern =
  /\b(servicio|servicios|cita|citas|agenda|agendar|tratamiento|tratamientos|clase|clases|curso|cursos|asesoria|asesoría|consulta|consultoria|consultoría|sesion|sesión|spa|salon|salón|terapia|mantenimiento|instalacion|instalación)\b/;
const productPattern =
  /\b(producto|productos|tienda|catalogo|catálogo|maleta|mochila|tenis|zapatilla|zapato|ropa|camisa|vestido|celular|telefono|teléfono|audifono|audífono|termo|bolso)\b/;

export function resolveOfferType(store?: StoreLike | null, product?: ProductLike): SellerOfferType {
  const commercialType = normalize(store?.commercialType);
  if (commercialType === "menu") return "MENU";
  if (["services", "service", "courses", "course", "appointments"].includes(commercialType)) return "SERVICE";
  if (["product_store", "live_catalog", "product", "catalog"].includes(commercialType)) {
    const storeText = normalize(`${store?.slug ?? ""} ${store?.name ?? ""} ${store?.description ?? ""}`);
    if (has(storeText, menuPattern)) return "MENU";
    if (has(storeText, servicePattern)) return "SERVICE";
    return "PRODUCT";
  }

  const storeText = normalize(`${store?.slug ?? ""} ${store?.name ?? ""} ${store?.description ?? ""}`);
  if (normalize(store?.slug) === "javier" || normalize(store?.name) === "exitosos") return "MENU";
  if (has(storeText, menuPattern)) return "MENU";
  if (has(storeText, servicePattern)) return "SERVICE";

  const categoryText = normalize(`${product?.category?.name ?? ""} ${product?.category?.slug ?? ""}`);
  const productText = normalize(`${product?.name ?? ""} ${product?.slug ?? ""} ${product?.description ?? ""} ${(product?.tags ?? []).join(" ")}`);
  if (has(categoryText, menuPattern) || has(productText, menuPattern)) return "MENU";
  if (has(categoryText, servicePattern) || has(productText, servicePattern)) return "SERVICE";
  if (has(categoryText, productPattern) || has(productText, productPattern)) return "PRODUCT";

  return "PRODUCT";
}
