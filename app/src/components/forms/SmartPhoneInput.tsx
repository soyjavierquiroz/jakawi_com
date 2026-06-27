"use client";

import PhoneInput, { isValidPhoneNumber, type Country, type Value } from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import labels from "react-phone-number-input/locale/es.json";
import { getCountryCallingCode } from "libphonenumber-js/min";
import { useEffect, useId, useMemo, useState } from "react";
import { registrationConfig } from "@/config/registration";
import { useVisitor } from "@/context/VisitorContext";

type SmartPhoneInputProps = {
  name?: string;
  label?: string;
  value?: string;
  required?: boolean;
  describedBy?: string;
  onChange?: (value: string) => void;
  onValidityChange?: (isValid: boolean) => void;
  onCountryChange?: (country?: Country) => void;
};

const fallbackCountry = registrationConfig.defaultCountry as Country;
const priorityCountries = registrationConfig.priorityCountries as readonly Country[];

export function SmartPhoneInput({
  name,
  label = registrationConfig.fields.phone.label,
  value,
  required = false,
  describedBy,
  onChange,
  onValidityChange,
  onCountryChange,
}: SmartPhoneInputProps) {
  const inputId = useId();
  const messageId = `${inputId}-message`;
  const { visitorData, isLoading } = useVisitor();
  const [phoneValue, setPhoneValue] = useState<Value | undefined>((value || undefined) as Value | undefined);
  const [country, setCountry] = useState<Country>(fallbackCountry);
  const [countryTouched, setCountryTouched] = useState(false);
  const detectedCountry = visitorData.country_code?.toUpperCase() as Country | undefined;
  const activeCountry = countryTouched ? country : detectedCountry ?? fallbackCountry;
  const isValid = phoneValue ? isValidPhoneNumber(phoneValue) : !required;
  const countryCallingCode = useMemo(() => {
    try {
      return getCountryCallingCode(activeCountry);
    } catch {
      return getCountryCallingCode(fallbackCountry);
    }
  }, [activeCountry]);

  useEffect(() => {
    onValidityChange?.(isValid);
  }, [isValid, onValidityChange]);

  function handleChange(nextValue?: Value) {
    setPhoneValue(nextValue);
    onChange?.(nextValue ?? "");
  }

  function handleCountryChange(nextCountry?: Country) {
    setCountryTouched(true);
    if (nextCountry) setCountry(nextCountry);
    onCountryChange?.(nextCountry);
  }

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="text-sm font-bold text-neutral-900">
        {label}
      </label>
      <div className="smart-phone-input" data-invalid={!isValid}>
        <PhoneInput
          id={inputId}
          value={phoneValue}
          onChange={handleChange}
          defaultCountry={activeCountry}
          labels={labels}
          flags={flags}
          international
          countryCallingCodeEditable={false}
          countryOptionsOrder={[...priorityCountries, "|", "..."]}
          onCountryChange={handleCountryChange}
          aria-invalid={!isValid}
          aria-describedby={[describedBy, messageId].filter(Boolean).join(" ") || undefined}
          numberInputProps={{
            required,
            inputMode: "tel",
            autoComplete: "tel",
            className: "smart-phone-input__number",
          }}
          focusInputOnCountrySelection
          limitMaxLength
        />
      </div>
      <div id={messageId} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-neutral-500">
        {isLoading ? <span>Detectando país...</span> : null}
        <span>Codigo +{countryCallingCode}</span>
        {!isValid ? <span className="text-red-700">Ingresa un WhatsApp valido.</span> : null}
      </div>
      {name ? <input type="hidden" name={name} value={phoneValue ?? ""} /> : null}
    </div>
  );
}
