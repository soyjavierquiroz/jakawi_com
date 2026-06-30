export const DEFAULT_COMMERCIAL_TEMPLATE = "SHOWCASE" as const;

export const COMMERCIAL_SPACE_TEMPLATES = {
  SHOWCASE: {
    id: "SHOWCASE",
    label: "Showcase",
    description: "Para destacar tus mejores productos.",
    bestFor: ["Pocos productos", "Productos premium", "Ofertas principales"],
    recommendedThemePresets: ["JAKAWI", "Premium", "Boutique"],
    previewType: "hero-product",
    isAvailable: true,
  },
  BOUTIQUE: {
    id: "BOUTIQUE",
    label: "Boutique",
    description: "Para moda, belleza, regalos y marcas visuales.",
    bestFor: ["Moda y belleza", "Regalos", "Marcas visuales"],
    recommendedThemePresets: ["Rosa", "Boutique", "Premium"],
    previewType: "editorial-grid",
    isAvailable: true,
  },
  APP_COMMERCE: {
    id: "APP_COMMERCE",
    label: "App moderna",
    description: "Para una experiencia tipo app móvil con portada visual, categorías y productos destacados.",
    bestFor: ["Comida y retail", "Productos visuales", "Look tipo app"],
    recommendedThemePresets: ["Rosa", "Premium", "JAKAWI"],
    previewType: "mobile-commerce",
    isAvailable: true,
  },
  COMPACT_CATALOG: {
    id: "COMPACT_CATALOG",
    label: "Compact Catalog",
    description: "Para mostrar más productos en menos espacio.",
    bestFor: ["Inventario amplio", "Productos técnicos", "Exploración rápida"],
    recommendedThemePresets: ["JAKAWI", "Minimal", "Natural"],
    previewType: "dense-grid",
    isAvailable: false,
  },
  SOCIAL_DROP: {
    id: "SOCIAL_DROP",
    label: "Social Drop",
    description: "Para campañas, lives y productos virales.",
    bestFor: ["Lanzamientos", "Promociones", "Live commerce"],
    recommendedThemePresets: ["Energia", "Rosa", "JAKAWI"],
    previewType: "campaign-feature",
    isAvailable: false,
  },
} as const;

export type CommercialTemplateId = keyof typeof COMMERCIAL_SPACE_TEMPLATES;

export function normalizeCommercialTemplate(value?: string | null): CommercialTemplateId {
  const normalized = value?.trim().toUpperCase();

  if (normalized && normalized in COMMERCIAL_SPACE_TEMPLATES) {
    return normalized as CommercialTemplateId;
  }

  return DEFAULT_COMMERCIAL_TEMPLATE;
}

export function getCommercialTemplateConfig(value?: string | null) {
  return COMMERCIAL_SPACE_TEMPLATES[normalizeCommercialTemplate(value)];
}

export const AVAILABLE_COMMERCIAL_SPACE_TEMPLATES = Object.values(COMMERCIAL_SPACE_TEMPLATES).filter((template) => template.isAvailable);
