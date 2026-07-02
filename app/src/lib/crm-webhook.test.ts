import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCrmWebhookHeaders,
  buildQaCrmWebhookTestPayload,
  sendCrmEvent,
  signCrmWebhookPayload,
  type CrmWebhookPayload,
} from "./crm-webhook";
import { DEFAULT_CRM_WEBHOOK_URL } from "../config/crm-webhook";

const basePayload: CrmWebhookPayload = {
  event: "qa.crm_webhook.test",
  event_id: "event-1",
  email: "qa-crm-webhook-test@example.com",
  attribution_type: "QA",
  qa: true,
};

function enabledConfig(overrides = {}) {
  return {
    enabled: true,
    url: DEFAULT_CRM_WEBHOOK_URL,
    secret: "super-secret-test-value",
    timeoutMs: 5000,
    qaOnly: true,
    ...overrides,
  };
}

function logger() {
  const entries: unknown[] = [];
  return {
    entries,
    info: (...args: unknown[]) => entries.push(["info", ...args]),
    warn: (...args: unknown[]) => entries.push(["warn", ...args]),
  };
}

test("CRM_WEBHOOK_ENABLED=false does not send", async () => {
  let calls = 0;
  const result = await sendCrmEvent(basePayload, {
    config: enabledConfig({ enabled: false }),
    fetch: async () => {
      calls += 1;
      return { ok: true, status: 200, text: async () => "{}" };
    },
  });

  assert.equal(calls, 0);
  assert.equal(result.sent, false);
  assert.equal(result.reason, "disabled");
});

test("missing CRM_WEBHOOK_SECRET does not send", async () => {
  let calls = 0;
  const result = await sendCrmEvent(basePayload, {
    config: enabledConfig({ secret: "" }),
    fetch: async () => {
      calls += 1;
      return { ok: true, status: 200, text: async () => "{}" };
    },
    logger: logger(),
  });

  assert.equal(calls, 0);
  assert.equal(result.sent, false);
  assert.equal(result.reason, "missing_secret");
});

test("CRM_WEBHOOK_QA_ONLY=true blocks non-QA events", async () => {
  let calls = 0;
  const result = await sendCrmEvent(
    {
      event: "owner.registered",
      event_id: "owner-1",
      email: "owner@example.com",
    },
    {
      config: enabledConfig(),
      fetch: async () => {
        calls += 1;
        return { ok: true, status: 200, text: async () => "{}" };
      },
      logger: logger(),
    },
  );

  assert.equal(calls, 0);
  assert.equal(result.sent, false);
  assert.equal(result.reason, "qa_only_blocked");
});

test("QA event sends when enabled and signed", async () => {
  let requestBody = "";
  let requestHeaders: Record<string, string> = {};
  const result = await sendCrmEvent(basePayload, {
    config: enabledConfig(),
    fetch: async (_input, init) => {
      requestBody = init.body;
      requestHeaders = init.headers;
      return { ok: true, status: 200, text: async () => "{\"ok\":true}" };
    },
    logger: logger(),
    now: () => new Date(1710000000000),
  });

  assert.equal(result.sent, true);
  assert.equal(result.ok, true);
  assert.equal(requestHeaders["X-JAKAWI-Event-Id"], "event-1");
  assert.equal(requestHeaders["X-JAKAWI-Timestamp"], "1710000000");
  assert.equal(
    requestHeaders["X-JAKAWI-Signature"],
    `sha256=${signCrmWebhookPayload({ rawBody: requestBody, secret: "super-secret-test-value", timestamp: 1710000000 })}`,
  );
});

test("signature is stable over exact raw body", () => {
  const rawBody = "{\"event\":\"qa.crm_webhook.test\",\"event_id\":\"event-1\"}";
  const signature = signCrmWebhookPayload({ rawBody, secret: "topsecret", timestamp: 1710000000 });
  const headers = buildCrmWebhookHeaders({ eventId: "event-1", rawBody, secret: "topsecret", timestamp: 1710000000 });

  assert.equal(signature, "16d6677eb6b60b774cf0eb8db6129c6ef3de0aaf49ce17eb4bccaa3cd151be29");
  assert.equal(headers["X-JAKAWI-Signature"], `sha256=${signature}`);
});

test("results and logs do not include the CRM webhook secret", async () => {
  const capturedLogger = logger();
  const secret = "super-secret-test-value";
  const result = await sendCrmEvent(buildQaCrmWebhookTestPayload("qa-event-1"), {
    config: enabledConfig({ secret }),
    fetch: async () => {
      throw new Error(`network failure with ${secret}`);
    },
    logger: capturedLogger,
  });

  assert.equal(JSON.stringify(result).includes(secret), false);
  assert.equal(JSON.stringify(capturedLogger.entries).includes(secret), false);
});
