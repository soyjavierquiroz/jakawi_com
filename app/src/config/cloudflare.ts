export type CloudflareCustomHostnamesConfig = {
  enabled: boolean;
  apiToken: string;
  zoneId: string;
  fallbackOrigin: string;
};

const DEFAULT_FALLBACK_ORIGIN = "custom-hostname.jakawi.com";

export function getCloudflareCustomHostnamesConfig(env: Record<string, string | undefined> = process.env): CloudflareCustomHostnamesConfig {
  return {
    enabled: env.CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED === "true",
    apiToken: env.CLOUDFLARE_API_TOKEN?.trim() ?? "",
    zoneId: env.CLOUDFLARE_ZONE_ID?.trim() ?? "",
    fallbackOrigin: env.CLOUDFLARE_CUSTOM_HOSTNAME_FALLBACK_ORIGIN?.trim() || DEFAULT_FALLBACK_ORIGIN,
  };
}

export function getCloudflareCustomHostnamesReadiness(config = getCloudflareCustomHostnamesConfig()) {
  if (!config.enabled) return { ok: false, reason: "disabled" } as const;
  if (!config.apiToken || !config.zoneId) return { ok: false, reason: "missing_config" } as const;
  return { ok: true } as const;
}
