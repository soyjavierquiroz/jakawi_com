export const SELLER_AI_SALES_STYLE_IDS = ["CONSULTATIVE", "DIRECT", "PREMIUM_TRUST", "FAST_CLOSE", "EXPERT"] as const;

export type SellerAiSalesStyle = (typeof SELLER_AI_SALES_STYLE_IDS)[number];
export type SellerAiSalesStyleId = SellerAiSalesStyle;

export type SellerAiSalesStylePreset = {
  id: SellerAiSalesStyleId;
  label: string;
  description: string;
  instruction: string;
};

export const SELLER_AI_SALES_STYLE_PRESETS: Record<SellerAiSalesStyleId, SellerAiSalesStylePreset> = {
  CONSULTATIVE: {
    id: "CONSULTATIVE",
    label: "Consultivo",
    description: "Hace preguntas, asesora y recomienda con calma.",
    instruction: "Haz una recomendacion consultiva y breve. Pregunta maximo una cosa util. Usa solo datos provistos.",
  },
  DIRECT: {
    id: "DIRECT",
    label: "Directo vendedor",
    description: "Responde rápido, recomienda y lleva a la acción.",
    instruction: "Responde directo y corto. Recomienda y lleva a la accion sin rodeos. Usa solo datos provistos.",
  },
  PREMIUM_TRUST: {
    id: "PREMIUM_TRUST",
    label: "Premium / confianza",
    description: "Refuerza calidad, confianza y seguridad.",
    instruction: "Refuerza calidad, confianza y seguridad solo con datos disponibles. No prometas garantia, stock ni envio si no estan provistos.",
  },
  FAST_CLOSE: {
    id: "FAST_CLOSE",
    label: "Cierre rápido",
    description: "Busca decisión rápida y WhatsApp.",
    instruction: "Cuando haya intencion clara, prepara el cierre por WhatsApp rapido. Usa solo datos provistos.",
  },
  EXPERT: {
    id: "EXPERT",
    label: "Experto",
    description: "Explica diferencias y ayuda a elegir con más detalle.",
    instruction: "Da criterio experto y comparaciones simples usando solo datos de productos provistos.",
  },
};

export const DEFAULT_SELLER_AI_SALES_STYLE_ID: SellerAiSalesStyleId = "CONSULTATIVE";

export function isSellerAiSalesStyle(value?: string | null): value is SellerAiSalesStyle {
  return SELLER_AI_SALES_STYLE_IDS.some((style) => style === value);
}

export function getSellerAiSalesStylePreset(styleId?: string | null) {
  const key = (styleId ?? "").trim().toUpperCase();
  return isSellerAiSalesStyle(key) ? SELLER_AI_SALES_STYLE_PRESETS[key] : SELLER_AI_SALES_STYLE_PRESETS[DEFAULT_SELLER_AI_SALES_STYLE_ID];
}
