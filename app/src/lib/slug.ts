import slugify from "slugify";
import { registrationConfig } from "@/config/registration";

export const reservedStoreSlugs = new Set<string>(registrationConfig.reservedSlugs);

export function slugifyStoreName(input: string) {
  return slugify(input, { lower: true, strict: true, trim: true }).slice(0, 40);
}

export function isReservedSlug(slug: string) {
  return reservedStoreSlugs.has(slug.toLowerCase());
}

export function isValidStoreSlug(slug: string) {
  return /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/.test(slug) && !isReservedSlug(slug);
}
