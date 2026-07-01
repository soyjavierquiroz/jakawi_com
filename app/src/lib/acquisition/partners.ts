import slugify from "slugify";
import { siteConfig } from "@/config/site";

export function normalizePartnerCode(input: string) {
  return slugify(input, { lower: true, strict: true, trim: true }).slice(0, 64);
}

export function normalizePartnerDestinationSlug(input: string) {
  return slugify(input, { lower: true, strict: true, trim: true }).slice(0, 64);
}

export function getStoreReferralLink(storeSlug: string) {
  return `${siteConfig.appUrl}/r/${storeSlug}`;
}

export function getPartnerReferralLink(code: string) {
  return `${siteConfig.appUrl}/partner/${code}`;
}

export function getPartnerDestinationReferralLink(code: string, destinationSlug: string) {
  return `${getPartnerReferralLink(code)}/${destinationSlug}`;
}

export function validatePartnerDestinationTargetUrl(value: string) {
  const targetUrl = value.trim();
  if (!targetUrl) throw new Error("El destino necesita una URL.");

  if (targetUrl.startsWith("/")) {
    if (targetUrl.startsWith("//")) throw new Error("El destino interno no puede empezar con //.");
    return targetUrl;
  }

  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    throw new Error("El destino externo debe ser una URL https valida.");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Los destinos externos deben usar https.");
  }

  return parsed.toString();
}
