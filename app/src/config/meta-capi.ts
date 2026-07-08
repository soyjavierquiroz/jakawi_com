export type MetaCapiConfig = {
  enabled: boolean;
  graphVersion: string;
  timeoutMs: number;
};

function parseEnabled(value?: string) {
  return value?.trim().toLowerCase() === "true";
}

function parseGraphVersion(value?: string) {
  const clean = value?.trim();
  return clean || "v20.0";
}

function parseTimeoutMs(value?: string) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 5000;
  return parsed;
}

export function getMetaCapiConfig(env: NodeJS.ProcessEnv = process.env): MetaCapiConfig {
  return {
    enabled: parseEnabled(env.META_CAPI_ENABLED),
    graphVersion: parseGraphVersion(env.META_CAPI_GRAPH_VERSION),
    timeoutMs: parseTimeoutMs(env.META_CAPI_TIMEOUT_MS),
  };
}
