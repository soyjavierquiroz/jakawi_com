type AuthEmailKind = "password_reset" | "email_verify";
type EmailDeliveryMode = "disabled" | "log" | "smtp" | "provider";

export type AuthEmailInput = {
  kind: AuthEmailKind;
  to: string;
  token: string;
};

export type AuthEmailResult = {
  sent: boolean;
  mode: EmailDeliveryMode;
  reason?: "disabled" | "unsupported_mode";
  previewUrl?: string;
};

type Logger = Pick<Console, "info" | "warn">;

function normalizeDeliveryMode(value: string | undefined): EmailDeliveryMode {
  if (value === "log" || value === "smtp" || value === "provider") return value;
  return "disabled";
}

function appBaseUrl() {
  return (process.env.APP_BASE_URL ?? process.env.PUBLIC_APP_URL ?? process.env.APP_URL ?? "https://jakawi.com").replace(/\/+$/, "");
}

function authEmailPath(kind: AuthEmailKind) {
  return kind === "password_reset" ? "/reset-password" : "/verify-email";
}

export function buildAuthEmailUrl(input: AuthEmailInput, baseUrl = appBaseUrl()) {
  const url = new URL(authEmailPath(input.kind), baseUrl);
  url.searchParams.set("token", input.token);
  return url.toString();
}

function safeRecipientLabel(email: string) {
  const domain = email.split("@")[1]?.toLowerCase() ?? "unknown";
  return `domain:${domain}`;
}

function canLogFullToken() {
  return process.env.NODE_ENV !== "production" && process.env.EMAIL_QA_LOG_TOKENS === "true";
}

export async function sendAuthEmail(
  input: AuthEmailInput,
  options: {
    mode?: EmailDeliveryMode;
    logger?: Logger;
    baseUrl?: string;
  } = {},
): Promise<AuthEmailResult> {
  const mode = options.mode ?? normalizeDeliveryMode(process.env.EMAIL_DELIVERY_MODE);
  const logger = options.logger ?? console;
  const previewUrl = buildAuthEmailUrl(input, options.baseUrl);
  const event = {
    event: "auth_email.prepared",
    kind: input.kind,
    deliveryMode: mode,
    recipient: safeRecipientLabel(input.to),
  };

  if (mode === "disabled") {
    logger.info({ ...event, sent: false, reason: "disabled" });
    return { sent: false, mode, reason: "disabled" };
  }

  if (mode === "log") {
    logger.info({
      ...event,
      sent: false,
      reason: "log_mode",
      previewUrl: canLogFullToken() ? previewUrl : undefined,
      tokenAvailable: canLogFullToken(),
    });
    return { sent: false, mode, previewUrl: canLogFullToken() ? previewUrl : undefined };
  }

  logger.warn({ ...event, sent: false, reason: "unsupported_mode" });
  return { sent: false, mode, reason: "unsupported_mode" };
}

export function sendPasswordResetEmail(to: string, token: string, options?: Parameters<typeof sendAuthEmail>[1]) {
  return sendAuthEmail({ kind: "password_reset", to, token }, options);
}

export function sendEmailVerificationEmail(to: string, token: string, options?: Parameters<typeof sendAuthEmail>[1]) {
  return sendAuthEmail({ kind: "email_verify", to, token }, options);
}
