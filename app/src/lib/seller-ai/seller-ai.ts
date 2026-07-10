export type SellerAiSalesStyleId = "CONSULTATIVE" | "DIRECT" | "TRUST_PREMIUM" | "FAST_CLOSE" | "EXPERT";

export type SellerAiSalesStylePreset = {
  id: SellerAiSalesStyleId;
  instruction: string;
};

export const SELLER_AI_SALES_STYLE_PRESETS: Record<SellerAiSalesStyleId, SellerAiSalesStylePreset> = {
  CONSULTATIVE: {
    id: "CONSULTATIVE",
    instruction: "Haz una recomendacion consultiva y breve. Pregunta maximo una cosa util. Usa solo datos provistos.",
  },
  DIRECT: {
    id: "DIRECT",
    instruction: "Responde directo y corto. Ayuda a decidir sin rodeos. Usa solo datos provistos.",
  },
  TRUST_PREMIUM: {
    id: "TRUST_PREMIUM",
    instruction: "Refuerza confianza con datos disponibles. No prometas garantia, stock ni envio si no estan provistos.",
  },
  FAST_CLOSE: {
    id: "FAST_CLOSE",
    instruction: "Cuando haya intencion clara, prepara el cierre por WhatsApp rapido. Usa solo datos provistos.",
  },
  EXPERT: {
    id: "EXPERT",
    instruction: "Da criterio experto y comparaciones simples usando solo datos de productos provistos.",
  },
};

export const DEFAULT_SELLER_AI_SALES_STYLE_ID: SellerAiSalesStyleId = "CONSULTATIVE";

export function getSellerAiSalesStylePreset(styleId?: string | null) {
  const key = (styleId ?? DEFAULT_SELLER_AI_SALES_STYLE_ID).trim().toUpperCase() as SellerAiSalesStyleId;
  return SELLER_AI_SALES_STYLE_PRESETS[key] ?? SELLER_AI_SALES_STYLE_PRESETS[DEFAULT_SELLER_AI_SALES_STYLE_ID];
}
