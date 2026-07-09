export type CloudflareCustomHostnamesConfig = {
  enabled: boolean;
  apiToken: string;
  zoneId: string;
  fallbackOrigin: string;
  sslMethod: string;
  minTlsVersion: string;
  timeoutMs: number;
};

const DEFAULT_FALLBACK_ORIGIN = "custom-hostname.jakawi.com";
const DEFAULT_SSL_METHOD = "http";
const DEFAULT_MIN_TLS_VERSION = "1.2";
const DEFAULT_TIMEOUT_MS = 8000;

function positiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getCloudflareCustomHostnamesConfig(env: Record<string, string | undefined> = process.env): CloudflareCustomHostnamesConfig {
  return {
    enabled: env.CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED === "true",
    apiToken: env.CLOUDFLARE_API_TOKEN?.trim() ?? "",
    zoneId: env.CLOUDFLARE_ZONE_ID?.trim() ?? "",
    fallbackOrigin: env.CUSTOM_DOMAIN_CNAME_TARGET?.trim() || env.CLOUDFLARE_CUSTOM_HOSTNAME_FALLBACK_ORIGIN?.trim() || DEFAULT_FALLBACK_ORIGIN,
    sslMethod: env.CLOUDFLARE_CUSTOM_HOSTNAME_SSL_METHOD?.trim() || DEFAULT_SSL_METHOD,
    minTlsVersion: env.CLOUDFLARE_CUSTOM_HOSTNAME_MIN_TLS_VERSION?.trim() || DEFAULT_MIN_TLS_VERSION,
    timeoutMs: positiveInt(env.CLOUDFLARE_API_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
  };
}

export function getCloudflareCustomHostnamesReadiness(config = getCloudflareCustomHostnamesConfig()) {
  if (!config.enabled) return { ok: false, reason: "disabled" } as const;
  if (!config.apiToken || !config.zoneId) return { ok: false, reason: "missing_config" } as const;
  return { ok: true } as const;
}
