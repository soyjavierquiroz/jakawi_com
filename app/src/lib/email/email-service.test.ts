import test from "node:test";
import assert from "node:assert/strict";
import { redactAuthEmailContent, sendAuthEmail } from "./email-service";

function loggerEntries() {
  const entries: unknown[] = [];
  return {
    entries,
    logger: {
      info: (...args: unknown[]) => entries.push(args),
      warn: (...args: unknown[]) => entries.push(args),
    },
  };
}

function withEnv(values: Record<string, string | undefined>, run: () => Promise<void>) {
  return async () => {
    const previous = new Map<string, string | undefined>();
    for (const key of Object.keys(values)) {
      previous.set(key, process.env[key]);
      if (values[key] === undefined) delete process.env[key];
      else process.env[key] = values[key];
    }

    try {
      await run();
    } finally {
      for (const [key, value] of previous.entries()) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  };
}

test("EMAIL_DELIVERY_MODE defaults to disabled", withEnv({ EMAIL_DELIVERY_MODE: undefined }, async () => {
  let smtpCalls = 0;
  const { logger } = loggerEntries();
  const result = await sendAuthEmail(
    { kind: "password_reset", to: "owner@example.com", token: "default-disabled-token" },
    {
      logger,
      smtpTransport: async () => {
        smtpCalls += 1;
        return { ok: true };
      },
    },
  );

  assert.equal(result.sent, false);
  assert.equal(result.mode, "disabled");
  assert.equal(result.reason, "disabled");
  assert.equal(smtpCalls, 0);
}));

test("disabled email delivery does not send", async () => {
  let smtpCalls = 0;
  const { logger } = loggerEntries();
  const result = await sendAuthEmail(
    { kind: "password_reset", to: "owner@example.com", token: "disabled-token" },
    {
      mode: "disabled",
      logger,
      smtpTransport: async () => {
        smtpCalls += 1;
        return { ok: true };
      },
    },
  );

  assert.equal(result.sent, false);
  assert.equal(result.reason, "disabled");
  assert.equal(smtpCalls, 0);
});

test("log email delivery does not call external provider and redacts full token", async () => {
  let smtpCalls = 0;
  const token = "super-secret-reset-token-2026";
  const { entries, logger } = loggerEntries();
  const result = await sendAuthEmail(
    { kind: "password_reset", to: "owner@example.com", token },
    {
      mode: "log",
      logger,
      baseUrl: "https://jakawi.test",
      smtpTransport: async () => {
        smtpCalls += 1;
        return { ok: true };
      },
    },
  );

  const serializedLogs = JSON.stringify(entries);
  assert.equal(result.sent, false);
  assert.equal(result.reason, "log_mode");
  assert.equal(smtpCalls, 0);
  assert.equal(serializedLogs.includes(token), false);
  assert.equal(result.previewUrl?.includes(token), false);
  assert.match(serializedLogs, /token=\[redacted\]/);
});

test("auth email redaction removes token query values and repeated token text", () => {
  const token = "verify-token-full-value";
  const redacted = redactAuthEmailContent(`https://jakawi.test/verify-email?token=${token}\n${token}`, [token]);

  assert.equal(redacted.includes(token), false);
  assert.match(redacted, /token=\[redacted\]/);
});

test("smtp email delivery fails controlled when required env vars are missing", withEnv(
  {
    EMAIL_DELIVERY_MODE: "smtp",
    SMTP_HOST: undefined,
    SMTP_FROM: undefined,
    SMTP_USER: undefined,
    SMTP_PASSWORD: undefined,
  },
  async () => {
    const { entries, logger } = loggerEntries();
    const result = await sendAuthEmail(
      { kind: "email_verify", to: "owner@example.com", token: "missing-smtp-config-token" },
      { logger },
    );

    const serializedLogs = JSON.stringify(entries);
    assert.equal(result.sent, false);
    assert.equal(result.reason, "missing_config");
    assert.match(serializedLogs, /SMTP_HOST/);
    assert.match(serializedLogs, /SMTP_FROM/);
    assert.equal(serializedLogs.includes("missing-smtp-config-token"), false);
  },
));

test("smtp email delivery returns controlled failure from transport", withEnv(
  {
    SMTP_HOST: "smtp.example.com",
    SMTP_PORT: "587",
    SMTP_FROM: "JAKAWI <no-reply@example.com>",
    SMTP_SECURE: "false",
    SMTP_USER: undefined,
    SMTP_PASSWORD: undefined,
    EMAIL_SEND_TIMEOUT_MS: "1000",
  },
  async () => {
    const { entries, logger } = loggerEntries();
    const result = await sendAuthEmail(
      { kind: "password_reset", to: "owner@example.com", token: "transport-fail-token" },
      {
        mode: "smtp",
        logger,
        smtpTransport: async () => ({ ok: false, reason: "send_failed", error: "smtp_timeout" }),
      },
    );

    const serializedLogs = JSON.stringify(entries);
    assert.equal(result.sent, false);
    assert.equal(result.reason, "send_failed");
    assert.equal(result.error, "smtp_timeout");
    assert.equal(serializedLogs.includes("transport-fail-token"), false);
  },
));
