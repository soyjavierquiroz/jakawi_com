import { getCloudflareCustomHostnamesConfig, getCloudflareCustomHostnamesReadiness, type CloudflareCustomHostnamesConfig } from "@/config/cloudflare";
import { normalizeHostname } from "@/lib/domains";

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
  cloudflareStatus: string;
  canActivate: boolean;
};

export type CloudflareOperationResult<T = CloudflareCustomHostname> =
  | { ok: true; hostname: T; mapped: CloudflareMappedStatus }
  | { ok: false; reason: string; status?: number };

type FetchLike = (input: string, init: { method: string; headers: Record<string, string>; body?: string; signal?: AbortSignal }) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

function cloudflareApiUrl(config: CloudflareCustomHostnamesConfig, path = "") {
  return `https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(config.zoneId)}/custom_hostnames${path}`;
}

export type CloudflareDnsInstruction = {
  type: "CNAME" | "TXT" | "HTTP";
  name: string;
  value: string;
};

function safeStatus(value: string | undefined, fallback = "unknown") {
  return value?.trim().toLowerCase() || fallback;
}

export function redactCloudflareError(body: unknown) {
  const envelope = body as CloudflareApiEnvelope<unknown>;
  const firstError = envelope.errors?.[0];
  if (firstError?.code) return `cloudflare_error_${firstError.code}`;
  return "cloudflare_error";
}

export function redactCloudflareHostnameId(value: string | null | undefined) {
  const cleanValue = value?.trim() ?? "";
  if (!cleanValue) return null;
  if (cleanValue.length <= 8) return `${cleanValue.slice(0, 2)}…`;
  return `${cleanValue.slice(0, 6)}…${cleanValue.slice(-4)}`;
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

export function mapCloudflareCustomHostnameToDomainStatus(response: Pick<CloudflareCustomHostname, "status" | "ssl">): CloudflareMappedStatus {
  const cloudflareStatus = safeStatus(response.status);
  const sslStatus = safeStatus(response.ssl?.status);
  const canActivate = cloudflareStatus === "active" && sslStatus === "active";

  if (canActivate) return { storeDomainStatus: "ACTIVE", sslStatus, cloudflareStatus, canActivate };
  if (cloudflareStatus === "deleted" || cloudflareStatus === "inactive" || cloudflareStatus === "deactivating" || cloudflareStatus.includes("deletion")) {
    return { storeDomainStatus: "DISABLED", sslStatus, cloudflareStatus, canActivate };
  }
  if (cloudflareStatus === "failed" || sslStatus === "failed" || sslStatus.includes("timed_out") || sslStatus === "expired") {
    return { storeDomainStatus: "FAILED", sslStatus, cloudflareStatus, canActivate };
  }
  return { storeDomainStatus: "VERIFYING", sslStatus, cloudflareStatus, canActivate };
}

export const mapCloudflareStatus = mapCloudflareCustomHostnameToDomainStatus;

export function extractCloudflareDnsInstructions(hostname: string, result: CloudflareCustomHostname, cnameTarget?: string | null) {
  const normalizedHostname = normalizeHostname(hostname);
  const instructions: CloudflareDnsInstruction[] = [
    {
      type: "CNAME",
      name: normalizedHostname,
      value: normalizeHostname(cnameTarget) || "jakawi.com",
    },
  ];

  const ownership = result.ownership_verification;
  if (ownership?.value) {
    instructions.push({
      type: ownership.type?.toUpperCase() === "CNAME" ? "CNAME" : "TXT",
      name: normalizeHostname(ownership.name) || normalizedHostname,
      value: ownership.value,
    });
  }

  for (const record of result.ssl?.validation_records ?? []) {
    if (record.txt_value) {
      instructions.push({
        type: "TXT",
        name: normalizeHostname(record.txt_name) || normalizedHostname,
        value: record.txt_value,
      });
    }
    if (record.cname_target) {
      instructions.push({
        type: "CNAME",
        name: normalizeHostname(record.cname) || normalizedHostname,
        value: record.cname_target,
      });
    }
    if (record.http_url && record.http_body) {
      instructions.push({
        type: "HTTP",
        name: record.http_url,
        value: record.http_body,
      });
    }
  }

  return instructions;
}

async function fetchCloudflare<T>(
  fetchFn: FetchLike,
  input: string,
  init: { method: string; headers: Record<string, string>; body?: string },
  timeoutMs: number,
): Promise<CloudflareOperationResult<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchFn(input, { ...init, signal: controller.signal });
    return parseCloudflareResponse<T>(response);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return { ok: false, reason: "cloudflare_timeout" };
    if (error instanceof Error && error.name === "AbortError") return { ok: false, reason: "cloudflare_timeout" };
    return { ok: false, reason: "cloudflare_error" };
  } finally {
    clearTimeout(timeout);
  }
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
    return { ok: false, reason: redactCloudflareError(body), status: response.status };
  }

  return { ok: true, hostname: envelope.result, mapped: mapCloudflareCustomHostnameToDomainStatus(envelope.result as unknown as CloudflareCustomHostname) };
}

export async function createCloudflareCustomHostname(
  hostname: string,
  options: { config?: CloudflareCustomHostnamesConfig; fetch?: FetchLike } = {},
): Promise<CloudflareOperationResult> {
  const config = options.config ?? getCloudflareCustomHostnamesConfig();
  const enabled = ensureEnabled(config);
  if (!enabled.ok) return enabled;

  const fetchFn = options.fetch ?? (fetch as unknown as FetchLike);
  return fetchCloudflare<CloudflareCustomHostname>(fetchFn, cloudflareApiUrl(config), {
    method: "POST",
    headers: authHeaders(config),
    body: JSON.stringify({
      hostname,
      ssl: {
        method: config.sslMethod,
        type: "dv",
        settings: {
          min_tls_version: config.minTlsVersion,
        },
      },
    }),
  }, config.timeoutMs);
}

export async function getCloudflareCustomHostname(
  cloudflareHostnameId: string,
  options: { config?: CloudflareCustomHostnamesConfig; fetch?: FetchLike } = {},
): Promise<CloudflareOperationResult> {
  const config = options.config ?? getCloudflareCustomHostnamesConfig();
  const enabled = ensureEnabled(config);
  if (!enabled.ok) return enabled;

  const fetchFn = options.fetch ?? (fetch as unknown as FetchLike);
  return fetchCloudflare<CloudflareCustomHostname>(fetchFn, cloudflareApiUrl(config, `/${encodeURIComponent(cloudflareHostnameId)}`), {
    method: "GET",
    headers: authHeaders(config),
  }, config.timeoutMs);
}

export const refreshCloudflareCustomHostname = getCloudflareCustomHostname;

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
  return { ok: false, reason: redactCloudflareError(body), status: response.status };
}
