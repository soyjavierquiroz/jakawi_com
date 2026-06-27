import { type SupportedCountryCode, type SupportedCurrency, normalizeCountryCode } from "@/config/countries";
import type { PaymentProvider } from "@/config/payment-routing";
import { type StorePlanCode, storePlans } from "@/config/plans";

type BillablePlanCode = Exclude<StorePlanCode, "TRIAL">;

export type RegionalPlanPrice = {
  amountCents: number;
  currency: SupportedCurrency;
  priceLabel: string;
  provider: PaymentProvider;
  checkoutUrl: string | null;
};

export type RegionalPricingConfig = Record<BillablePlanCode, RegionalPlanPrice>;

export const regionalPlanPricing = {
  BO: {
    BASIC: {
      amountCents: 35000,
      currency: "BOB",
      priceLabel: "Bs 350/año",
      provider: "MANUAL_BOLIVIA",
      checkoutUrl: null,
    },
    PRO: {
      amountCents: 99700,
      currency: "BOB",
      priceLabel: "Bs 997/año",
      provider: "MANUAL_BOLIVIA",
      checkoutUrl: null,
    },
    PREMIUM: {
      amountCents: 199700,
      currency: "BOB",
      priceLabel: "Bs 1.997/año",
      provider: "MANUAL_BOLIVIA",
      checkoutUrl: null,
    },
  },
  DEFAULT_INTERNATIONAL: {
    BASIC: {
      amountCents: 9900,
      currency: "USD",
      priceLabel: "USD 99/año",
      provider: "HOTMART",
      checkoutUrl: null,
    },
    PRO: {
      amountCents: 19900,
      currency: "USD",
      priceLabel: "USD 199/año",
      provider: "HOTMART",
      checkoutUrl: null,
    },
    PREMIUM: {
      amountCents: 39900,
      currency: "USD",
      priceLabel: "USD 399/año",
      provider: "HOTMART",
      checkoutUrl: null,
    },
  },
} as const satisfies Record<"BO" | "DEFAULT_INTERNATIONAL", RegionalPricingConfig>;

export function getPricingCountryFromVisitor(countryCode?: string | null): SupportedCountryCode {
  const normalized = normalizeCountryCode(countryCode);
  return normalized === "BO" ? "BO" : "OTHER";
}

export function getRegionalPricing(countryCode?: string | null): RegionalPricingConfig {
  return getPricingCountryFromVisitor(countryCode) === "BO"
    ? regionalPlanPricing.BO
    : regionalPlanPricing.DEFAULT_INTERNATIONAL;
}

export function getPlanPriceForCountry(planCode: StorePlanCode, countryCode?: string | null) {
  if (planCode === "TRIAL") {
    return {
      amountCents: 0,
      currency: getPricingCountryFromVisitor(countryCode) === "BO" ? "BOB" : "USD",
      priceLabel: storePlans.TRIAL.priceLabel,
      provider: getPricingCountryFromVisitor(countryCode) === "BO" ? "MANUAL_BOLIVIA" : "HOTMART",
      checkoutUrl: null,
    } satisfies RegionalPlanPrice;
  }

  return getRegionalPricing(countryCode)[planCode];
}
