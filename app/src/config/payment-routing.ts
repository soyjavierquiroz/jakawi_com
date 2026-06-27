import type { SupportedCountryCode } from "@/config/countries";
import type { StorePlanCode } from "@/config/plans";

export type PaymentProvider =
  | "MANUAL_BOLIVIA"
  | "HOTMART"
  | "STRIPE"
  | "MANUAL";

export type CheckoutAction = {
  provider: PaymentProvider;
  href: string;
  isExternal: boolean;
  label: string;
};

export const paymentProviderLabels = {
  MANUAL_BOLIVIA: "Pago local Bolivia",
  HOTMART: "Hotmart",
  STRIPE: "Stripe",
  MANUAL: "Pago manual",
} as const satisfies Record<PaymentProvider, string>;

export function getPaymentProviderForCountry(countryCode: SupportedCountryCode | string | null | undefined, planCode: StorePlanCode): PaymentProvider {
  if (countryCode === "BO") return "MANUAL_BOLIVIA";
  if (countryCode === "US" && planCode !== "TRIAL") return "STRIPE";
  return "HOTMART";
}

export function getCheckoutAction({
  countryCode,
  planCode,
  checkoutUrl,
}: {
  countryCode?: SupportedCountryCode | string | null;
  planCode: StorePlanCode;
  checkoutUrl?: string | null;
}): CheckoutAction {
  const provider = getPaymentProviderForCountry(countryCode, planCode);
  if ((provider === "HOTMART" || provider === "STRIPE") && checkoutUrl) {
    return {
      provider,
      href: checkoutUrl,
      isExternal: true,
      label: paymentProviderLabels[provider],
    };
  }

  const normalizedCountry = countryCode?.trim().toUpperCase() || "BO";
  return {
    provider,
    href: `/registro?plan=${encodeURIComponent(planCode)}&country=${encodeURIComponent(normalizedCountry)}`,
    isExternal: false,
    label: paymentProviderLabels[provider],
  };
}
