import { registrationConfig } from "@/config/registration";

const reservedStoreSlugs = new Set<string>(registrationConfig.reservedSlugs);
const platformPageSlugs = new Set([
  "contacto",
  "cookies",
  "forgot-password",
  "p",
  "pago-manual",
  "precios",
  "reset-password",
  "verify-email",
]);

export function shouldShowPrivacyFloatingButton(pathname: string) {
  const segments = pathname.split(/[?#]/, 1)[0]?.split("/").filter(Boolean) ?? [];
  if (segments.length !== 1) return false;

  const [storeSlug] = segments;
  if (!storeSlug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(storeSlug)) return false;

  return !reservedStoreSlugs.has(storeSlug) && !platformPageSlugs.has(storeSlug);
}
