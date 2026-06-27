export const routesConfig = {
  home: "/",
  login: "/login",
  register: "/registro",
  app: "/app",
  demo: "/megalon",
  products: "/app/productos",
  newProduct: "/app/productos/nuevo",
  storeSettings: "/app/tienda",
  categories: "/app/categorias",
  whatsapp: "/app/whatsapp",
  agent: "/app/agente",
  leads: "/app/leads",
};

export const siteConfig = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL || process.env.PUBLIC_APP_URL || "https://jakawi.com",
  demoStoreSlug: "megalon",
  routes: routesConfig,
};

export function getPublicStoreUrl(slug: string) {
  return `${siteConfig.appUrl}/${slug}`;
}
