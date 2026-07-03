import { getCloudflareCustomHostnamesConfig, getCloudflareCustomHostnamesReadiness, type CloudflareCustomHostnamesConfig } from "@/config/cloudflare";

type CloudflareApiEnvelope<T> = {
  success: boolean;
  errors?: Array<{ code?: number; message?: string }>;
  messages?: Array<{ code?: number; message?: string } | string>;
  result?: T;
};

export type CloudflareCustomHostname = {
  id: string;
  hostname: string;
  status?: string;
  ssl?: {
    id?: string;
    status?: string;
    method?: string;
    validation_records?: Array<{
      txt_name?: string;
      txt_value?: string;
      http_url?: string;
      http_body?: string;
      cname?: string;
      cname_target?: string;
    }>;
  };
  ownership_verification?: {
    name?: string;
    type?: string;
    value?: string;
  };
  ownership_verification_http?: {
    http_url?: string;
    http_body?: string;
  };
};

export type CloudflareMappedStatus = {
  storeDomainStatus: "PENDING" | "VERIFYING" | "ACTIVE" | "FAILED" | "DISABLED";
  sslStatus: string;
};

export type CloudflareOperationResult<T = CloudflareCustomHostname> =
  | { ok: true; hostname: T; mapped: CloudflareMappedStatus }
  | { ok: false; reason: string; status?: number };

type FetchLike = (input: string, init: { method: string; headers: Record<string, string>; body?: string }) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

function cloudflareApiUrl(config: CloudflareCustomHostnamesConfig, path = "") {
  return `https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(config.zoneId)}/custom_hostnames${path}`;
}

function sanitizeCloudflareError(body: unknown) {
  const envelope = body as CloudflareApiEnvelope<unknown>;
  const firstError = envelope.errors?.[0];
  if (firstError?.code) return `cloudflare_error_${firstError.code}`;
  return "cloudflare_error";
}

function authHeaders(config: CloudflareCustomHostnamesConfig) {
  return {
    Authorization: `Bearer ${config.apiToken}`,
    "Content-Type": "application/json",
  };
}

function ensureEnabled(config: CloudflareCustomHostnamesConfig) {
  const readiness = getCloudflareCustomHostnamesReadiness(config);
  if (!readiness.ok) return { ok: false, reason: readiness.reason } as const;
  return { ok: true } as const;
}

export function isCloudflareCustomHostnamesEnabled(config = getCloudflareCustomHostnamesConfig()) {
  return getCloudflareCustomHostnamesReadiness(config).ok;
}

export function mapCloudflareStatus(response: Pick<CloudflareCustomHostname, "status" | "ssl">): CloudflareMappedStatus {
  const sslStatus = response.ssl?.status ?? response.status ?? "unknown";
  const status = sslStatus.toLowerCase();
  if (status === "active" || status === "staging_active") return { storeDomainStatus: "ACTIVE", sslStatus };
  if (status === "inactive" || status === "deleted" || status === "deactivating" || status.includes("deletion")) {
    return { storeDomainStatus: "DISABLED", sslStatus };
  }
  if (status.includes("timed_out") || status === "expired") return { storeDomainStatus: "FAILED", sslStatus };
  return { storeDomainStatus: "VERIFYING", sslStatus };
}

async function parseCloudflareResponse<T>(response: Awaited<ReturnType<FetchLike>>): Promise<CloudflareOperationResult<T>> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  const envelope = body as CloudflareApiEnvelope<T>;
  if (!response.ok || !envelope.success || !envelope.result) {
    return { ok: false, reason: sanitizeCloudflareError(body), status: response.status };
  }

  return { ok: true, hostname: envelope.result, mapped: mapCloudflareStatus(envelope.result as unknown as CloudflareCustomHostname) };
}

export async function createCloudflareCustomHostname(
  hostname: string,
  options: { config?: CloudflareCustomHostnamesConfig; fetch?: FetchLike } = {},
): Promise<CloudflareOperationResult> {
  const config = options.config ?? getCloudflareCustomHostnamesConfig();
  const enabled = ensureEnabled(config);
  if (!enabled.ok) return enabled;

  const fetchFn = options.fetch ?? (fetch as unknown as FetchLike);
  const response = await fetchFn(cloudflareApiUrl(config), {
    method: "POST",
    headers: authHeaders(config),
    body: JSON.stringify({
      hostname,
      ssl: {
        method: "http",
        type: "dv",
      },
    }),
  });

  return parseCloudflareResponse<CloudflareCustomHostname>(response);
}

export async function getCloudflareCustomHostname(
  cloudflareHostnameId: string,
  options: { config?: CloudflareCustomHostnamesConfig; fetch?: FetchLike } = {},
): Promise<CloudflareOperationResult> {
  const config = options.config ?? getCloudflareCustomHostnamesConfig();
  const enabled = ensureEnabled(config);
  if (!enabled.ok) return enabled;

  const fetchFn = options.fetch ?? (fetch as unknown as FetchLike);
  const response = await fetchFn(cloudflareApiUrl(config, `/${encodeURIComponent(cloudflareHostnameId)}`), {
    method: "GET",
    headers: authHeaders(config),
  });

  return parseCloudflareResponse<CloudflareCustomHostname>(response);
}

export async function deleteCloudflareCustomHostname(
  cloudflareHostnameId: string,
  options: { config?: CloudflareCustomHostnamesConfig; fetch?: FetchLike } = {},
): Promise<{ ok: true } | { ok: false; reason: string; status?: number }> {
  const config = options.config ?? getCloudflareCustomHostnamesConfig();
  const enabled = ensureEnabled(config);
  if (!enabled.ok) return enabled;

  const fetchFn = options.fetch ?? (fetch as unknown as FetchLike);
  const response = await fetchFn(cloudflareApiUrl(config, `/${encodeURIComponent(cloudflareHostnameId)}`), {
    method: "DELETE",
    headers: authHeaders(config),
  });

  if (response.ok) return { ok: true };
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { ok: false, reason: sanitizeCloudflareError(body), status: response.status };
}
