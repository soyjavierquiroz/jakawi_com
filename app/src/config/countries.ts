import type { PaymentProvider } from "@/config/payment-routing";

export type SupportedCountryCode =
  | "BO"
  | "PE"
  | "CO"
  | "EC"
  | "AR"
  | "CL"
  | "MX"
  | "US"
  | "OTHER";

export type SupportedCurrency =
  | "BOB"
  | "PEN"
  | "COP"
  | "USD"
  | "ARS"
  | "CLP"
  | "MXN";

export type CurrencyDisplayMode = "symbol" | "code_when_ambiguous";

export type CountryCommerceConfig = {
  countryCode: SupportedCountryCode;
  countryName: string;
  defaultCurrency: SupportedCurrency;
  locale: string;
  timezone: string;
  phoneCountry: string;
  currencySymbol: string;
  currencyDisplay: CurrencyDisplayMode;
  decimals: number;
  defaultPaymentProvider: PaymentProvider;
  enabled: boolean;
};

export const countryCommerceConfig = {
  BO: {
    countryCode: "BO",
    countryName: "Bolivia",
    defaultCurrency: "BOB",
    locale: "es-BO",
    timezone: "America/La_Paz",
    phoneCountry: "BO",
    currencySymbol: "Bs.",
    currencyDisplay: "symbol",
    decimals: 2,
    defaultPaymentProvider: "MANUAL_BOLIVIA",
    enabled: true,
  },
  PE: {
    countryCode: "PE",
    countryName: "Perú",
    defaultCurrency: "PEN",
    locale: "es-PE",
    timezone: "America/Lima",
    phoneCountry: "PE",
    currencySymbol: "S/",
    currencyDisplay: "symbol",
    decimals: 2,
    defaultPaymentProvider: "HOTMART",
    enabled: true,
  },
  CO: {
    countryCode: "CO",
    countryName: "Colombia",
    defaultCurrency: "COP",
    locale: "es-CO",
    timezone: "America/Bogota",
    phoneCountry: "CO",
    currencySymbol: "$",
    currencyDisplay: "code_when_ambiguous",
    decimals: 0,
    defaultPaymentProvider: "HOTMART",
    enabled: true,
  },
  EC: {
    countryCode: "EC",
    countryName: "Ecuador",
    defaultCurrency: "USD",
    locale: "es-EC",
    timezone: "America/Guayaquil",
    phoneCountry: "EC",
    currencySymbol: "$",
    currencyDisplay: "symbol",
    decimals: 2,
    defaultPaymentProvider: "HOTMART",
    enabled: true,
  },
  AR: {
    countryCode: "AR",
    countryName: "Argentina",
    defaultCurrency: "ARS",
    locale: "es-AR",
    timezone: "America/Argentina/Buenos_Aires",
    phoneCountry: "AR",
    currencySymbol: "$",
    currencyDisplay: "code_when_ambiguous",
    decimals: 0,
    defaultPaymentProvider: "HOTMART",
    enabled: true,
  },
  CL: {
    countryCode: "CL",
    countryName: "Chile",
    defaultCurrency: "CLP",
    locale: "es-CL",
    timezone: "America/Santiago",
    phoneCountry: "CL",
    currencySymbol: "$",
    currencyDisplay: "code_when_ambiguous",
    decimals: 0,
    defaultPaymentProvider: "HOTMART",
    enabled: true,
  },
  MX: {
    countryCode: "MX",
    countryName: "México",
    defaultCurrency: "MXN",
    locale: "es-MX",
    timezone: "America/Mexico_City",
    phoneCountry: "MX",
    currencySymbol: "$",
    currencyDisplay: "code_when_ambiguous",
    decimals: 2,
    defaultPaymentProvider: "HOTMART",
    enabled: true,
  },
  US: {
    countryCode: "US",
    countryName: "Internacional",
    defaultCurrency: "USD",
    locale: "es-US",
    timezone: "America/New_York",
    phoneCountry: "US",
    currencySymbol: "$",
    currencyDisplay: "symbol",
    decimals: 2,
    defaultPaymentProvider: "STRIPE",
    enabled: true,
  },
  OTHER: {
    countryCode: "OTHER",
    countryName: "Internacional",
    defaultCurrency: "USD",
    locale: "es",
    timezone: "UTC",
    phoneCountry: "US",
    currencySymbol: "$",
    currencyDisplay: "symbol",
    decimals: 2,
    defaultPaymentProvider: "HOTMART",
    enabled: true,
  },
} as const satisfies Record<SupportedCountryCode, CountryCommerceConfig>;

export function normalizeCountryCode(input?: string | null): SupportedCountryCode {
  const normalized = input?.trim().toUpperCase();
  if (!normalized) return "BO";
  if (normalized in countryCommerceConfig) return normalized as SupportedCountryCode;
  return "OTHER";
}

export function getCountryCommerceConfig(countryCode?: string | null): CountryCommerceConfig {
  return countryCommerceConfig[normalizeCountryCode(countryCode)];
}

export function getEnabledCountries() {
  return Object.values(countryCommerceConfig).filter((country) => country.enabled);
}

export function getDefaultCurrencyForCountry(countryCode?: string | null): SupportedCurrency {
  return getCountryCommerceConfig(countryCode).defaultCurrency;
}

export function normalizeCurrency(input?: string | null, countryCode?: string | null): SupportedCurrency {
  const normalized = input?.trim().toUpperCase();
  const supportedCurrencies: SupportedCurrency[] = ["BOB", "PEN", "COP", "USD", "ARS", "CLP", "MXN"];
  if (supportedCurrencies.includes(normalized as SupportedCurrency)) return normalized as SupportedCurrency;
  return getDefaultCurrencyForCountry(countryCode);
}
