export const DEFAULT_CRM_WEBHOOK_URL = "https://crm.jakawi.com/index.php/wp-json/jakawi-crm/v1/events";
export const DEFAULT_CRM_WEBHOOK_TIMEOUT_MS = 5000;

export type CrmWebhookConfig = {
  enabled: boolean;
  url: string;
  secret: string;
  timeoutMs: number;
  qaOnly: boolean;
};

function envBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined || value === "") return fallback;
  return value.trim().toLowerCase() === "true";
}

function envTimeout(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_CRM_WEBHOOK_TIMEOUT_MS;
  return Math.min(parsed, 30000);
}

export function getCrmWebhookConfig(env: NodeJS.ProcessEnv = process.env): CrmWebhookConfig {
  return {
    enabled: envBoolean(env.CRM_WEBHOOK_ENABLED, false),
    url: env.CRM_WEBHOOK_URL?.trim() || DEFAULT_CRM_WEBHOOK_URL,
    secret: env.CRM_WEBHOOK_SECRET?.trim() ?? "",
    timeoutMs: envTimeout(env.CRM_WEBHOOK_TIMEOUT_MS),
    qaOnly: envBoolean(env.CRM_WEBHOOK_QA_ONLY, true),
  };
}
