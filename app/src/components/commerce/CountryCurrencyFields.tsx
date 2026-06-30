"use client";

import { useMemo, useState } from "react";
import {
  type SupportedCountryCode,
  type SupportedCurrency,
  getCountryCommerceConfig,
  getEnabledCountries,
  normalizeCountryCode,
  normalizeCurrency,
} from "@/config/countries";

const selectClass =
  "h-12 w-full max-w-full rounded-md border border-brand-border bg-white px-3 text-base text-neutral-950 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10";

type CountryCurrencyFieldsProps = {
  initialCountryCode?: string | null;
  initialCurrency?: string | null;
  includeCountryName?: boolean;
  compact?: boolean;
  onCountryChange?: (countryCode: SupportedCountryCode) => void;
};

const currencies: SupportedCurrency[] = ["BOB", "PEN", "COP", "USD", "ARS", "CLP", "MXN"];

export function CountryCurrencyFields({
  initialCountryCode,
  initialCurrency,
  includeCountryName = true,
  compact = false,
  onCountryChange,
}: CountryCurrencyFieldsProps) {
  const initialCountry = normalizeCountryCode(initialCountryCode);
  const [countryCode, setCountryCode] = useState<SupportedCountryCode>(initialCountry);
  const [currency, setCurrency] = useState<SupportedCurrency>(normalizeCurrency(initialCurrency, initialCountry));

  const countryConfig = useMemo(() => getCountryCommerceConfig(countryCode), [countryCode]);
  const countries = getEnabledCountries();

  function handleCountryChange(value: string) {
    const nextCountry = normalizeCountryCode(value);
    setCountryCode(nextCountry);
    setCurrency(getCountryCommerceConfig(nextCountry).defaultCurrency);
    onCountryChange?.(nextCountry);
  }

  return (
    <div className={compact ? "grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2" : "space-y-4"}>
      <label className="block min-w-0 space-y-2">
        <span className="text-sm font-bold">País del negocio</span>
        <select name="countryCode" value={countryCode} onChange={(event) => handleCountryChange(event.target.value)} className={selectClass}>
          {countries.map((country) => (
            <option key={country.countryCode} value={country.countryCode}>
              {country.countryName}
            </option>
          ))}
        </select>
        <span className="block text-xs font-semibold text-neutral-500">Esto nos ayuda a configurar WhatsApp, moneda y formato comercial.</span>
      </label>

      <label className="block min-w-0 space-y-2">
        <span className="text-sm font-bold">Moneda de tus precios</span>
        <select name="currency" value={currency} onChange={(event) => setCurrency(normalizeCurrency(event.target.value, countryCode))} className={selectClass}>
          {currencies.map((currencyOption) => (
            <option key={currencyOption} value={currencyOption}>
              {currencyOption}
            </option>
          ))}
        </select>
        <span className="block text-xs font-semibold text-neutral-500">Usaremos esta moneda para mostrar precios en tu espacio comercial.</span>
      </label>

      {includeCountryName ? <input type="hidden" name="countryName" value={countryConfig.countryName} /> : null}
      <input type="hidden" name="locale" value={countryConfig.locale} />
      <input type="hidden" name="timezone" value={countryConfig.timezone} />
    </div>
  );
}
