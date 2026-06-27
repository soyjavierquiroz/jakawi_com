import slugify from "slugify";
import { registrationConfig } from "@/config/registration";

export const reservedSlugs = new Set<string>(registrationConfig.reservedSlugs);

export function makeSlug(input: string) {
  return slugify(input, { lower: true, strict: true, trim: true }).slice(0, 64);
}

export function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 8) return `591${digits}`;
  return digits;
}

export function formatMoney(cents: number, currency = "BOB") {
  const amount = cents / 100;
  if (currency === "BOB") return `Bs. ${amount.toFixed(2)}`;
  return `${currency} ${amount.toFixed(2)}`;
}

export function priceToCents(value: FormDataEntryValue | null) {
  const raw = String(value ?? "0").replace(",", ".").trim();
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100);
}

export function centsToInput(cents: number) {
  return (cents / 100).toFixed(2);
}
