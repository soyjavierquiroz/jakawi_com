import {
  type SupportedCountryCode,
  type SupportedCurrency,
  countryCommerceConfig,
  getCountryCommerceConfig,
  normalizeCountryCode,
  normalizeCurrency,
} from "@/config/countries";

export type FormatMoneyInput = {
  amountCents: number;
  currency?: SupportedCurrency | string | null;
  countryCode?: SupportedCountryCode | string | null;
  locale?: string | null;
  showCurrencyCodeWhenAmbiguous?: boolean;
};

export function getCurrencyDecimals(currency?: SupportedCurrency | string | null) {
  const normalized = normalizeCurrency(currency, "OTHER");
  const country = Object.values(countryCommerceConfig).find((config) => config.defaultCurrency === normalized);
  return country?.decimals ?? 2;
}

function shouldShowCode(currency: SupportedCurrency, countryCode: SupportedCountryCode, explicit?: boolean) {
  if (explicit === false) return false;
  if (explicit === true) return true;
  return getCountryCommerceConfig(countryCode).currencyDisplay === "code_when_ambiguous";
}

function formatNumber(amount: number, decimals: number) {
  const fixed = amount.toFixed(decimals);
  const [integerPart, decimalPart] = fixed.split(".");
  const thousandsSeparator = decimals === 0 ? "." : ",";
  const integer = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
  return decimalPart ? `${integer}.${decimalPart}` : integer;
}

export function formatMoney({
  amountCents,
  currency,
  countryCode,
  showCurrencyCodeWhenAmbiguous,
}: FormatMoneyInput) {
  const normalizedCountry = normalizeCountryCode(countryCode);
  const normalizedCurrency = normalizeCurrency(currency, normalizedCountry);
  const decimals = getCurrencyDecimals(normalizedCurrency);
  const amount = amountCents / 100;
  const formattedAmount = formatNumber(amount, decimals);
  const codeSuffix = shouldShowCode(normalizedCurrency, normalizedCountry, showCurrencyCodeWhenAmbiguous)
    ? ` ${normalizedCurrency}`
    : "";

  if (normalizedCurrency === "BOB") return `Bs. ${formattedAmount}`;
  if (normalizedCurrency === "PEN") return `S/ ${formattedAmount}`;
  return `$${formattedAmount}${codeSuffix}`;
}
