import { isIP } from "node:net";
import { domainToASCII } from "node:url";
import { getPrisma } from "@/lib/prisma";
import { reservedSlugs } from "@/lib/format";

export type StorefrontRequestMode = "PLATFORM_SLUG" | "CUSTOM_DOMAIN" | "JAKAWI_SUBDOMAIN" | "NOT_STOREFRONT";
export type StoreDomainKind = "JAKAWI_SLUG" | "JAKAWI_SUBDOMAIN" | "CUSTOM_DOMAIN";
export type StoreDomainValidationResult =
  | { ok: true; hostname: string; type: StoreDomainKind }
  | { ok: false; hostname: string; reason: string };

type DomainLookupStore = {
  id: string;
  slug: string;
  isPublished: boolean;
};

type DomainLookupRow = {
  hostname: string;
  type: "CUSTOM_DOMAIN";
  store: DomainLookupStore | null;
};

type DomainLookupDb = {
  storeDomain: {
    findFirst: (args: unknown) => Promise<DomainLookupRow | null>;
  };
};

type DomainEnv = Record<string, string | undefined>;

const DEFAULT_PLATFORM_DOMAIN = "jakawi.com";
const RESERVED_PLATFORM_SUBDOMAINS = new Set(["crm", "media", "minio"]);

function getPrimaryDomain(env: DomainEnv = process.env) {
  return normalizeHostname(env.JAKAWI_PRIMARY_DOMAIN || DEFAULT_PLATFORM_DOMAIN) || DEFAULT_PLATFORM_DOMAIN;
}

function customDomainsEnabled(env: DomainEnv = process.env) {
  return env.CUSTOM_DOMAINS_ENABLED === "true";
}

export function getStoreCanonicalBaseUrl(
  store: { slug: string },
  requestHost?: string | null,
  options: { env?: DomainEnv; activeHostnames?: string[] } = {},
) {
  const env = options.env ?? process.env;
  const hostname = normalizeHostname(requestHost);
  const activeHostnames = new Set((options.activeHostnames ?? []).map((item) => normalizeHostname(item)));

  if (hostname && activeHostnames.has(hostname) && !isJakawiPlatformHost(hostname, env)) {
    return `https://${hostname}`;
  }

  return `https://${getPrimaryDomain(env)}/${store.slug}`;
}

export function normalizeHostname(input: string | null | undefined) {
  let value = String(input ?? "").trim().toLowerCase();
  if (!value) return "";

  value = value.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
  value = value.split(/[/?#]/, 1)[0]?.trim() ?? "";

  if (value.startsWith("[")) {
    const closeBracket = value.indexOf("]");
    value = closeBracket >= 0 ? value.slice(1, closeBracket) : value.slice(1);
  } else {
    const colonCount = (value.match(/:/g) ?? []).length;
    if (colonCount === 1) {
      value = value.split(":", 1)[0] ?? "";
    }
  }

  value = value.replace(/\.+$/g, "");
  if (!value || isIP(value)) return value;

  return domainToASCII(value) || value;
}

export function isPrivateOrLocalHostname(input: string | null | undefined) {
  const hostname = normalizeHostname(input);
  if (!hostname) return false;
  if (hostname === "localhost" || hostname.endsWith(".localhost")) return true;

  const ipVersion = isIP(hostname);
  if (ipVersion === 4) {
    const [a = 0, b = 0] = hostname.split(".").map((part) => Number(part));
    if (a === 10 || a === 127 || a === 0 || a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
  }

  if (ipVersion === 6) {
    return hostname === "::1" || hostname.startsWith("fc") || hostname.startsWith("fd") || hostname.startsWith("fe80:");
  }

  return false;
}

export function isJakawiPlatformHost(input: string | null | undefined, env: DomainEnv = process.env) {
  const hostname = normalizeHostname(input);
  const primaryDomain = getPrimaryDomain(env);
  return hostname === primaryDomain || hostname === `www.${primaryDomain}` || isPrivateOrLocalHostname(hostname);
}

export function isReservedHostname(input: string | null | undefined, env: DomainEnv = process.env) {
  const hostname = normalizeHostname(input);
  const primaryDomain = getPrimaryDomain(env);
  if (hostname === primaryDomain || hostname === `www.${primaryDomain}`) return true;

  const suffix = `.${primaryDomain}`;
  if (!hostname.endsWith(suffix)) return false;

  const label = hostname.slice(0, -suffix.length).split(".").pop() ?? "";
  return RESERVED_PLATFORM_SUBDOMAINS.has(label);
}

function isValidDnsHostname(hostname: string) {
  if (hostname.length < 4 || hostname.length > 253) return false;
  if (!hostname.includes(".")) return false;
  if (!/^[a-z0-9.-]+$/.test(hostname)) return false;
  return hostname.split(".").every((label) => label.length >= 1 && label.length <= 63 && !label.startsWith("-") && !label.endsWith("-"));
}

export function validateStoreDomainHostname(input: string | null | undefined, options: { type?: StoreDomainKind; env?: DomainEnv } = {}): StoreDomainValidationResult {
  const hostname = normalizeHostname(input);
  const type = options.type ?? "CUSTOM_DOMAIN";
  const env = options.env ?? process.env;
  const primaryDomain = getPrimaryDomain(env);

  if (!hostname) return { ok: false, hostname, reason: "empty_hostname" };
  if (isPrivateOrLocalHostname(hostname)) return { ok: false, hostname, reason: "local_hostname_not_allowed" };
  if (isIP(hostname)) return { ok: false, hostname, reason: "ip_hostname_not_supported" };
  if (!isValidDnsHostname(hostname)) return { ok: false, hostname, reason: "invalid_hostname" };
  if (isReservedHostname(hostname, env)) return { ok: false, hostname, reason: "reserved_hostname" };

  const isJakawiSubdomain = hostname.endsWith(`.${primaryDomain}`);
  if (type === "CUSTOM_DOMAIN" && isJakawiSubdomain) {
    return { ok: false, hostname, reason: "jakawi_subdomain_requires_jakawi_subdomain_type" };
  }
  if (type === "JAKAWI_SUBDOMAIN" && !isJakawiSubdomain) {
    return { ok: false, hostname, reason: "jakawi_subdomain_type_requires_platform_subdomain" };
  }
  if (type === "JAKAWI_SLUG") {
    return { ok: false, hostname, reason: "jakawi_slug_domains_are_platform_routes" };
  }

  return { ok: true, hostname, type };
}

export async function resolveStoreFromHost(input: string | null | undefined, options: { env?: DomainEnv; db?: DomainLookupDb } = {}) {
  const env = options.env ?? process.env;
  const hostname = normalizeHostname(input);
  if (!hostname || !customDomainsEnabled(env)) return null;
  if (isJakawiPlatformHost(hostname, env) || isReservedHostname(hostname, env) || isPrivateOrLocalHostname(hostname) || isIP(hostname)) return null;

  const db = options.db ?? (getPrisma() as unknown as DomainLookupDb);
  const domain = await db.storeDomain.findFirst({
    where: {
      hostname,
      status: "ACTIVE",
      type: "CUSTOM_DOMAIN",
    },
    select: {
      hostname: true,
      type: true,
      store: { select: { id: true, slug: true, isPublished: true } },
    },
  });

  if (!domain?.store?.isPublished) return null;
  return {
    hostname: domain.hostname,
    type: domain.type,
    store: domain.store,
  };
}

function pathSegments(pathname: string) {
  return pathname.split(/[?#]/, 1)[0]?.split("/").filter(Boolean) ?? [];
}

export async function resolveStorefrontRequest(
  hostnameInput: string | null | undefined,
  pathname: string,
  options: { env?: DomainEnv; db?: DomainLookupDb } = {},
): Promise<{ mode: StorefrontRequestMode; storeSlug?: string; productSlug?: string; shouldRedirectCanonical?: boolean }> {
  const env = options.env ?? process.env;
  const hostname = normalizeHostname(hostnameInput);
  const segments = pathSegments(pathname);

  if (isJakawiPlatformHost(hostname, env)) {
    const [storeSlug, segment, productSlug] = segments;
    if (storeSlug && !reservedSlugs.has(storeSlug) && !segment) {
      return { mode: "PLATFORM_SLUG", storeSlug };
    }
    if (storeSlug && segment === "p" && productSlug && !reservedSlugs.has(storeSlug)) {
      return { mode: "PLATFORM_SLUG", storeSlug, productSlug };
    }
    return { mode: "NOT_STOREFRONT" };
  }

  const domain = await resolveStoreFromHost(hostname, options);
  if (!domain) return { mode: "NOT_STOREFRONT" };

  if (segments.length === 0) return { mode: "CUSTOM_DOMAIN", storeSlug: domain.store.slug };
  if (segments[0] === "p" && segments[1] && segments.length === 2) {
    return { mode: "CUSTOM_DOMAIN", storeSlug: domain.store.slug, productSlug: segments[1] };
  }

  return { mode: "NOT_STOREFRONT" };
}
