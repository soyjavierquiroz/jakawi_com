import slugify from "slugify";
import { siteConfig } from "@/config/site";

export function normalizePartnerCode(input: string) {
  return slugify(input, { lower: true, strict: true, trim: true }).slice(0, 64);
}

export function getStoreReferralLink(storeSlug: string) {
  return `${siteConfig.appUrl}/r/${storeSlug}`;
}

export function getPartnerReferralLink(code: string) {
  return `${siteConfig.appUrl}/partner/${code}`;
}
