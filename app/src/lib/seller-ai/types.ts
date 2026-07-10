import { z } from "zod";

export type SellerAiReplyInput = {
  store: {
    id: string;
    slug: string;
    name: string;
    whatsappPresent: boolean;
  };
  storeContext: {
    name: string;
    description: string | null;
    commercialTagline: string | null;
  };
  salesStyle: {
    id: string;
    instruction: string;
  };
  currentProduct: SellerAiReplyProduct | null;
  candidateProducts: SellerAiReplyProduct[];
  commercialSignals: {
    detectedNeed?: string | null;
    budget?: string | null;
    urgency?: string | null;
    objections: string[];
    intentBoost: number;
    hasStrongIntent: boolean;
  };
  mode: string;
  journeySummary?: string | null;
  recentMessages: Array<{ role: "USER" | "ASSISTANT"; content: string }>;
  visitorMessage: string;
  whatsappHandoffAvailable: boolean;
  requirePhoneBeforeWhatsapp: boolean;
};

export type SellerAiReplyProduct = {
  id: string;
  slug: string;
  name: string;
  priceLabel: string;
  shortDescription?: string | null;
  categoryName?: string | null;
  url: string;
};

export type SellerAiObjectionType = "price" | "trust" | "delivery" | "availability" | "payment" | "other" | null;

export type SellerAiReplyOutput = {
  reply: string;
  quickReplies: string[];
  recommendedProductSlugs: string[];
  objectionType: SellerAiObjectionType;
  handoffReady: boolean;
  shouldAskPhone: boolean;
  whatsappCtaLabel: string | null;
  fallbackToRules: boolean;
};

export type SellerAiLlmReplyResult = {
  output: SellerAiReplyOutput;
  modelUsed?: string;
  tokensInput?: number;
  tokensOutput?: number;
};

const sellerAiReplyOutputSchema = z.object({
  reply: z.string().trim().min(1).max(1200),
  quickReplies: z.array(z.string().trim().min(1).max(80)).max(6),
  recommendedProductSlugs: z.array(z.string().trim().min(1).max(120)).max(5),
  objectionType: z.enum(["price", "trust", "delivery", "availability", "payment", "other"]).nullable(),
  handoffReady: z.boolean(),
  shouldAskPhone: z.boolean(),
  whatsappCtaLabel: z.string().trim().min(1).max(80).nullable(),
  fallbackToRules: z.boolean(),
});

export function validateSellerAiReplyOutput(value: unknown, candidateProducts: Array<{ slug: string }>): SellerAiReplyOutput | null {
  const parsed = sellerAiReplyOutputSchema.safeParse(value);
  if (!parsed.success) return null;

  const allowedSlugs = new Set(candidateProducts.map((product) => product.slug));
  return {
    ...parsed.data,
    quickReplies: parsed.data.quickReplies.slice(0, 4),
    recommendedProductSlugs: parsed.data.recommendedProductSlugs.filter((slug) => allowedSlugs.has(slug)),
  };
}

export const sellerAiReplyJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "quickReplies", "recommendedProductSlugs", "objectionType", "handoffReady", "shouldAskPhone", "whatsappCtaLabel", "fallbackToRules"],
  properties: {
    reply: { type: "string", description: "Respuesta breve en espanol para el visitante." },
    quickReplies: { type: "array", items: { type: "string" }, maxItems: 4 },
    recommendedProductSlugs: { type: "array", items: { type: "string" }, maxItems: 4 },
    objectionType: { type: ["string", "null"], enum: ["price", "trust", "delivery", "availability", "payment", "other", null] },
    handoffReady: { type: "boolean" },
    shouldAskPhone: { type: "boolean" },
    whatsappCtaLabel: { type: ["string", "null"] },
    fallbackToRules: { type: "boolean" },
  },
} as const;
