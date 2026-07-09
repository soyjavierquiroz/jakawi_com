import net from "node:net";
import tls from "node:tls";

type AuthEmailKind = "password_reset" | "email_verify";
type EmailDeliveryMode = "disabled" | "log" | "smtp";

export type AuthEmailInput = {
  kind: AuthEmailKind;
  to: string;
  token: string;
};

export type AuthEmailResult = {
  sent: boolean;
  mode: EmailDeliveryMode;
  reason?: "disabled" | "log_mode" | "missing_config" | "send_failed";
  previewUrl?: string;
  error?: string;
};

type Logger = Pick<Console, "info" | "warn">;

type EmailMessage = {
  to: string;
  from: string;
  subject: string;
  text: string;
  html: string;
};

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  from: string;
  user?: string;
  password?: string;
  timeoutMs: number;
};

type SmtpSendResult =
  | { ok: true }
  | { ok: false; reason: "missing_config"; missing: string[] }
  | { ok: false; reason: "send_failed"; error: string };

type SmtpTransport = (message: EmailMessage, config: SmtpConfig) => Promise<SmtpSendResult>;

function normalizeDeliveryMode(value: string | undefined): EmailDeliveryMode {
  if (value === "log" || value === "smtp") return value;
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

function authEmailSubject(kind: AuthEmailKind) {
  return kind === "password_reset" ? "Recupera tu acceso a JAKAWI" : "Verifica tu email en JAKAWI";
}

function buildAuthEmailMessage(input: AuthEmailInput, from: string, baseUrl?: string): EmailMessage {
  const link = buildAuthEmailUrl(input, baseUrl);
  const subject = authEmailSubject(input.kind);
  const action =
    input.kind === "password_reset"
      ? "Usa este link para actualizar tu password."
      : "Usa este link para verificar tu email.";

  return {
    to: input.to,
    from,
    subject,
    text: [`Hola,`, "", action, link, "", "Si no pediste esto, puedes ignorar este mensaje."].join("\n"),
    html: [
      "<p>Hola,</p>",
      `<p>${escapeHtml(action)}</p>`,
      `<p><a href="${escapeHtml(link)}">Abrir link seguro</a></p>`,
      "<p>Si no pediste esto, puedes ignorar este mensaje.</p>",
    ].join(""),
  };
}

function safeRecipientLabel(email: string) {
  const domain = email.split("@")[1]?.toLowerCase() ?? "unknown";
  return `domain:${domain}`;
}

function parseTimeoutMs(value: string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5000;
}

function parseSmtpPort(value: string | undefined, secure: boolean) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : secure ? 465 : 587;
}

function parseBoolean(value: string | undefined) {
  return value?.toLowerCase() === "true";
}

function smtpConfigFromEnv(): { config?: SmtpConfig; missing: string[] } {
  const secure = parseBoolean(process.env.SMTP_SECURE);
  const host = process.env.SMTP_HOST?.trim() ?? "";
  const from = process.env.SMTP_FROM?.trim() ?? "";
  const user = process.env.SMTP_USER?.trim() || undefined;
  const password = process.env.SMTP_PASSWORD || undefined;
  const missing = [
    host ? null : "SMTP_HOST",
    from ? null : "SMTP_FROM",
    process.env.SMTP_USER && !password ? "SMTP_PASSWORD" : null,
    password && !user ? "SMTP_USER" : null,
  ].filter((value): value is string => Boolean(value));

  if (missing.length > 0) return { missing };

  return {
    config: {
      host,
      from,
      user,
      password,
      secure,
      port: parseSmtpPort(process.env.SMTP_PORT, secure),
      timeoutMs: parseTimeoutMs(process.env.EMAIL_SEND_TIMEOUT_MS),
    },
    missing,
  };
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function escapeHeader(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function normalizeLineEndings(value: string) {
  return value.replace(/\r?\n/g, "\r\n");
}

function smtpDate(date = new Date()) {
  return date.toUTCString();
}

function formatEmailMessage(message: EmailMessage) {
  const boundary = `jakawi-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const headers = [
    `From: ${escapeHeader(message.from)}`,
    `To: ${escapeHeader(message.to)}`,
    `Subject: ${escapeHeader(message.subject)}`,
    `Date: ${smtpDate()}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];

  const body = [
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    normalizeLineEndings(message.text),
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    normalizeLineEndings(message.html),
    `--${boundary}--`,
    "",
  ];

  return [...headers, "", ...body].join("\r\n");
}

function redactTokenValue(value: string) {
  return value.length ? `[redacted:${value.length}]` : "[redacted]";
}

export function redactAuthEmailContent(content: string, tokens: string[] = []) {
  let redacted = content.replace(/([?&]token=)[^&\s"'<>]+/gi, `$1[redacted]`);

  for (const token of tokens) {
    if (token.length < 6) continue;
    redacted = redacted.split(token).join(redactTokenValue(token));
  }

  return redacted;
}

function sanitizedError(error: unknown) {
  if (error instanceof Error) return error.message.replace(/password=[^\s]+/gi, "password=[redacted]");
  return "unknown_error";
}

function readChunk(socket: net.Socket | tls.TLSSocket, timeoutMs: number) {
  return new Promise<string>((resolve, reject) => {
    const onData = (chunk: Buffer) => {
      cleanup();
      resolve(chunk.toString("utf8"));
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("smtp_timeout"));
    }, timeoutMs);
    const cleanup = () => {
      clearTimeout(timer);
      socket.off("data", onData);
      socket.off("error", onError);
    };

    socket.once("data", onData);
    socket.once("error", onError);
  });
}

async function writeCommand(socket: net.Socket | tls.TLSSocket, command: string, timeoutMs: number) {
  await new Promise<void>((resolve, reject) => {
    socket.write(`${command}\r\n`, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });

  return readChunk(socket, timeoutMs);
}

function smtpOk(response: string, codes: string[]) {
  return codes.some((code) => response.startsWith(code));
}

async function sendViaSmtp(message: EmailMessage, config: SmtpConfig): Promise<SmtpSendResult> {
  const socket = config.secure
    ? tls.connect({ host: config.host, port: config.port, timeout: config.timeoutMs })
    : net.connect({ host: config.host, port: config.port, timeout: config.timeoutMs });

  try {
    socket.setTimeout(config.timeoutMs);
    socket.on("timeout", () => socket.destroy(new Error("smtp_timeout")));

    const greeting = await readChunk(socket, config.timeoutMs);
    if (!smtpOk(greeting, ["220"])) throw new Error("smtp_greeting_failed");

    const ehlo = await writeCommand(socket, "EHLO jakawi.com", config.timeoutMs);
    if (!smtpOk(ehlo, ["250"])) throw new Error("smtp_ehlo_failed");

    if (config.user && config.password) {
      const auth = Buffer.from(`\0${config.user}\0${config.password}`).toString("base64");
      const authResponse = await writeCommand(socket, `AUTH PLAIN ${auth}`, config.timeoutMs);
      if (!smtpOk(authResponse, ["235"])) throw new Error("smtp_auth_failed");
    }

    const mailFrom = await writeCommand(socket, `MAIL FROM:<${config.from}>`, config.timeoutMs);
    if (!smtpOk(mailFrom, ["250"])) throw new Error("smtp_mail_from_failed");

    const rcptTo = await writeCommand(socket, `RCPT TO:<${message.to}>`, config.timeoutMs);
    if (!smtpOk(rcptTo, ["250", "251"])) throw new Error("smtp_rcpt_to_failed");

    const data = await writeCommand(socket, "DATA", config.timeoutMs);
    if (!smtpOk(data, ["354"])) throw new Error("smtp_data_failed");

    const payload = formatEmailMessage(message).replace(/^\./gm, "..");
    const accepted = await writeCommand(socket, `${payload}\r\n.`, config.timeoutMs);
    if (!smtpOk(accepted, ["250"])) throw new Error("smtp_message_rejected");

    await writeCommand(socket, "QUIT", config.timeoutMs).catch(() => undefined);
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: "send_failed", error: sanitizedError(error) };
  } finally {
    socket.destroy();
  }
}

export async function sendAuthEmail(
  input: AuthEmailInput,
  options: {
    mode?: EmailDeliveryMode;
    logger?: Logger;
    baseUrl?: string;
    smtpTransport?: SmtpTransport;
  } = {},
): Promise<AuthEmailResult> {
  const mode = options.mode ?? normalizeDeliveryMode(process.env.EMAIL_DELIVERY_MODE);
  const logger = options.logger ?? console;
  const previewUrl = buildAuthEmailUrl(input, options.baseUrl);
  const redactedPreviewUrl = redactAuthEmailContent(previewUrl, [input.token]);
  const from = process.env.SMTP_FROM || "JAKAWI <no-reply@jakawi.com>";
  const message = buildAuthEmailMessage(input, from, options.baseUrl);
  const redactedTextPreview = redactAuthEmailContent(message.text, [input.token]);
  const event = {
    event: "auth_email.prepared",
    kind: input.kind,
    deliveryMode: mode,
    recipient: safeRecipientLabel(input.to),
    subject: message.subject,
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
      previewUrl: redactedPreviewUrl,
      textPreview: redactedTextPreview,
    });
    return { sent: false, mode, reason: "log_mode", previewUrl: redactedPreviewUrl };
  }

  const { config, missing } = smtpConfigFromEnv();
  if (!config) {
    logger.warn({ ...event, sent: false, reason: "missing_config", missing });
    return { sent: false, mode, reason: "missing_config" };
  }

  const result = await (options.smtpTransport ?? sendViaSmtp)(message, config);
  if (result.ok) {
    logger.info({ ...event, sent: true });
    return { sent: true, mode };
  }

  if (result.reason === "missing_config") {
    logger.warn({ ...event, sent: false, reason: "missing_config", missing: result.missing });
    return { sent: false, mode, reason: "missing_config" };
  }

  logger.warn({ ...event, sent: false, reason: "send_failed", error: result.error });
  return { sent: false, mode, reason: "send_failed", error: result.error };
}

export function sendPasswordResetEmail(to: string, token: string, options?: Parameters<typeof sendAuthEmail>[1]) {
  return sendAuthEmail({ kind: "password_reset", to, token }, options);
}

export function sendEmailVerificationEmail(to: string, token: string, options?: Parameters<typeof sendAuthEmail>[1]) {
  return sendAuthEmail({ kind: "email_verify", to, token }, options);
}
