import { type DirectWhatsappPlanMode, type StorePlanCode, type StorePlanConfig, storePlans } from "@/config/plans";

export type SellerAiMode = "disabled" | "assistive" | "guided" | "premium";
export type DirectWhatsappMode = DirectWhatsappPlanMode;

export type StorefrontFlow = {
  planCode: StorePlanCode;
  planName: string;
  planPriceLabel: string;
  planBillingLabel: string | null;
  trialDays: number | null;
  sellerAiEnabled: boolean;
  sellerAiMode: SellerAiMode;
  directWhatsappEnabled: DirectWhatsappMode;
  whatsappMode: "direct" | "lead_context" | "bot_followup";
  requirePhoneBeforeWhatsapp: boolean;
  productCardCta: string;
  productPagePrimaryCta: string;
  productPageSecondaryCta: string | null;
  showProductCardWhatsappButton: boolean;
  showProductPageDirectWhatsappButton: boolean;
  productLimit: number;
  sellerAiMonthlyConversations: number | null;
};

export function normalizeStorePlanCode(planCode: string | null | undefined): StorePlanCode {
  const normalized = planCode?.trim().toUpperCase();

  if (!normalized) return "TRIAL";
  if (normalized === "LAUNCH") return "TRIAL";
  if (normalized === "SELLER_AI") return "PRO";
  if (normalized === "SCALE") return "PREMIUM";
  if (normalized === "TRIAL" || normalized === "BASIC" || normalized === "PRO" || normalized === "PREMIUM") return normalized;

  return "TRIAL";
}

export function getStorefrontFlow(planCode: string | null | undefined): StorefrontFlow {
  const code = normalizeStorePlanCode(planCode);
  const plan: StorePlanConfig = storePlans[code];

  if (code === "PREMIUM") {
    return {
      planCode: code,
      planName: plan.name,
      planPriceLabel: plan.priceLabel,
      planBillingLabel: plan.billingLabel ?? null,
      trialDays: plan.trialDays ?? null,
      sellerAiEnabled: plan.sellerAiEnabled,
      sellerAiMode: "premium",
      directWhatsappEnabled: plan.directWhatsappEnabled,
      whatsappMode: "bot_followup",
      requirePhoneBeforeWhatsapp: plan.requirePhoneBeforeWhatsapp,
      productCardCta: "Ver producto",
      productPagePrimaryCta: "Armar mi pedido",
      productPageSecondaryCta: null,
      showProductCardWhatsappButton: false,
      showProductPageDirectWhatsappButton: false,
      productLimit: plan.productLimit,
      sellerAiMonthlyConversations: plan.sellerAiMonthlyConversations,
    };
  }

  if (code === "PRO") {
    return {
      planCode: code,
      planName: plan.name,
      planPriceLabel: plan.priceLabel,
      planBillingLabel: plan.billingLabel ?? null,
      trialDays: plan.trialDays ?? null,
      sellerAiEnabled: plan.sellerAiEnabled,
      sellerAiMode: "assistive",
      directWhatsappEnabled: plan.directWhatsappEnabled,
      whatsappMode: "lead_context",
      requirePhoneBeforeWhatsapp: plan.requirePhoneBeforeWhatsapp,
      productCardCta: "Ver producto",
      productPagePrimaryCta: "Te ayudo a elegir",
      productPageSecondaryCta: "Consultar directo",
      showProductCardWhatsappButton: false,
      showProductPageDirectWhatsappButton: true,
      productLimit: plan.productLimit,
      sellerAiMonthlyConversations: plan.sellerAiMonthlyConversations,
    };
  }

  return {
    planCode: code,
    planName: plan.name,
    planPriceLabel: plan.priceLabel,
    planBillingLabel: plan.billingLabel ?? null,
    trialDays: plan.trialDays ?? null,
    sellerAiEnabled: false,
    sellerAiMode: "disabled",
    directWhatsappEnabled: plan.directWhatsappEnabled,
    whatsappMode: "direct",
    requirePhoneBeforeWhatsapp: false,
    productCardCta: "Quiero este producto",
    productPagePrimaryCta: "Consultar por WhatsApp",
    productPageSecondaryCta: null,
    showProductCardWhatsappButton: true,
    showProductPageDirectWhatsappButton: true,
    productLimit: plan.productLimit,
    sellerAiMonthlyConversations: plan.sellerAiMonthlyConversations,
  };
}
