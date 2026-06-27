"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CountryCurrencyFields } from "@/components/commerce/CountryCurrencyFields";
import { normalizeCountryCode } from "@/config/countries";
import { registerAction } from "@/lib/actions";
import { slugifyStoreName, isReservedSlug, isValidStoreSlug } from "@/lib/slug";
import { SmartPhoneInput } from "@/components/forms/SmartPhoneInput";
import { registrationConfig } from "@/config/registration";
import { useVisitor } from "@/context/VisitorContext";

type RegistrationFormProps = {
  error?: string;
  initialCountryCode?: string;
  selectedPlan?: string;
};

const inputClass =
  "h-[52px] w-full rounded-md border border-brand-border bg-white px-4 text-base text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-brand focus:ring-4 focus:ring-brand/10";

export function RegistrationForm({ error, initialCountryCode, selectedPlan }: RegistrationFormProps) {
  const { visitorData } = useVisitor();
  const [storeName, setStoreName] = useState("");
  const [manualSlug, setManualSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [phoneIsValid, setPhoneIsValid] = useState(false);
  const [storeCountryCode, setStoreCountryCode] = useState(() => normalizeCountryCode(initialCountryCode));
  const [storeCountryTouched, setStoreCountryTouched] = useState(Boolean(initialCountryCode));
  const [cityInput, setCityInput] = useState("");
  const [cityTouched, setCityTouched] = useState(false);
  const storeSlug = slugTouched ? manualSlug : slugifyStoreName(storeName);
  const city = cityTouched ? cityInput : visitorData.city ?? "";
  const region = visitorData.region ?? "";

  useEffect(() => {
    if (!storeCountryTouched && visitorData.country_code) {
      setStoreCountryCode(normalizeCountryCode(visitorData.country_code));
    }
  }, [storeCountryTouched, visitorData.country_code]);

  const slugError = useMemo(() => {
    if (!storeSlug) return null;
    if (storeSlug.length < 3) return "Usa al menos 3 caracteres.";
    if (storeSlug.length > 40) return "Usa maximo 40 caracteres.";
    if (isReservedSlug(storeSlug)) return "Ese link esta reservado.";
    if (!isValidStoreSlug(storeSlug)) return "Usa solo letras minusculas, numeros y guiones.";
    return null;
  }, [storeSlug]);

  function handleSlugChange(value: string) {
    setSlugTouched(true);
    setManualSlug(slugifyStoreName(value));
  }

  return (
    <form action={registerAction} className="mt-8 space-y-8">
      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p> : null}

      <section className="space-y-4">
        <h2 className="text-lg font-black text-brand-dark">{registrationConfig.sections.personal}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-bold">{registrationConfig.fields.firstName.label}</span>
            <input name="firstName" required minLength={2} placeholder={registrationConfig.fields.firstName.placeholder} className={inputClass} />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-bold">{registrationConfig.fields.lastName.label}</span>
            <input name="lastName" required minLength={2} placeholder={registrationConfig.fields.lastName.placeholder} className={inputClass} />
          </label>
        </div>

        <SmartPhoneInput name="phone" required onValidityChange={setPhoneIsValid} />

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-bold">{registrationConfig.fields.email.label}</span>
            <input name="email" type="email" required placeholder={registrationConfig.fields.email.placeholder} className={inputClass} />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-bold">{registrationConfig.fields.password.label}</span>
            <input name="password" type="password" required minLength={8} placeholder={registrationConfig.fields.password.placeholder} className={inputClass} />
          </label>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-black text-brand-dark">{registrationConfig.sections.store}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-bold">{registrationConfig.fields.storeName.label}</span>
            <input
              name="storeName"
              required
              minLength={2}
              value={storeName}
              onChange={(event) => setStoreName(event.target.value)}
              placeholder={registrationConfig.fields.storeName.placeholder}
              className={inputClass}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-bold">{registrationConfig.fields.storeSlug.label}</span>
            <div className="flex min-h-[52px] w-full overflow-hidden rounded-md border border-brand-border bg-white transition focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10">
              <span className="flex shrink-0 items-center border-r border-brand-border bg-brand-muted px-3 text-sm font-black text-brand-dark sm:px-4">
                {registrationConfig.fields.storeSlug.prefix}
              </span>
              <input
                name="storeSlug"
                required
                minLength={3}
                maxLength={40}
                value={storeSlug}
                onChange={(event) => handleSlugChange(event.target.value)}
                placeholder={registrationConfig.fields.storeSlug.placeholder}
                aria-invalid={Boolean(slugError)}
                aria-describedby="store-slug-help"
                className="min-w-0 flex-1 bg-white px-3 text-base text-neutral-950 outline-none placeholder:text-neutral-400 sm:px-4"
              />
            </div>
            <p id="store-slug-help" className={`text-xs font-semibold ${slugError ? "text-red-700" : "text-neutral-500"}`}>
              {slugError ?? registrationConfig.fields.storeSlug.helper}
            </p>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-bold">{registrationConfig.fields.city.label}</span>
            <input
              name="city"
              value={city}
              onChange={(event) => {
                setCityTouched(true);
                setCityInput(event.target.value);
              }}
              placeholder={registrationConfig.fields.city.placeholder}
              className={inputClass}
            />
          </label>
          <div className="md:col-span-2">
            <CountryCurrencyFields
              key={storeCountryCode}
              initialCountryCode={storeCountryCode}
              compact
              onCountryChange={(nextCountry) => {
                setStoreCountryTouched(true);
                setStoreCountryCode(nextCountry);
              }}
            />
          </div>
        </div>
      </section>

      <input type="hidden" name="region" value={region} />
      <input type="hidden" name="plan" value={selectedPlan ?? "TRIAL"} />

      <button
        disabled={!phoneIsValid || Boolean(slugError)}
        className="h-[52px] w-full rounded-md bg-brand text-base font-black text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-600"
      >
        {registrationConfig.actions.submit}
      </button>

      <p className="text-center text-sm font-semibold text-neutral-600">
        {registrationConfig.actions.loginPrompt}{" "}
        <Link href="/login" className="font-black text-brand-dark">
          {registrationConfig.actions.login}
        </Link>
      </p>
    </form>
  );
}
