import test from "node:test";
import assert from "node:assert/strict";
import {
  createCloudflareCustomHostname,
  getCloudflareCustomHostname,
  isCloudflareCustomHostnamesEnabled,
  mapCloudflareStatus,
  extractCloudflareDnsInstructions,
  redactCloudflareHostnameId,
} from "./cloudflare-custom-hostnames";

const enabledConfig = {
  enabled: true,
  apiToken: "cf-token-test-value",
  zoneId: "zone-1",
  fallbackOrigin: "custom-hostname.jakawi.com",
  sslMethod: "http",
  minTlsVersion: "1.2",
  timeoutMs: 8000,
};

test("isCloudflareCustomHostnamesEnabled is false when disabled", () => {
  assert.equal(
    isCloudflareCustomHostnamesEnabled({
      ...enabledConfig,
      enabled: false,
    }),
    false,
  );
});

test("createCloudflareCustomHostname blocks when disabled before fetch", async () => {
  let calls = 0;
  const result = await createCloudflareCustomHostname("shop.example.com", {
    config: { ...enabledConfig, enabled: false },
    fetch: async () => {
      calls += 1;
      throw new Error("fetch should not be called");
    },
  });

  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "disabled");
  assert.equal(calls, 0);
});

test("createCloudflareCustomHostname blocks when token or zone is missing", async () => {
  const result = await createCloudflareCustomHostname("shop.example.com", {
    config: { ...enabledConfig, apiToken: "", zoneId: "" },
    fetch: async () => {
      throw new Error("fetch should not be called");
    },
  });

  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "missing_config");
});

test("createCloudflareCustomHostname builds the expected request", async () => {
  const result = await createCloudflareCustomHostname("shop.example.com", {
    config: enabledConfig,
    fetch: async (input, init) => {
      assert.equal(input, "https://api.cloudflare.com/client/v4/zones/zone-1/custom_hostnames");
      assert.equal(init.method, "POST");
      assert.equal(init.headers.Authorization, `Bearer ${enabledConfig.apiToken}`);
      const body = JSON.parse(init.body ?? "{}");
      assert.equal(body.hostname, "shop.example.com");
      assert.equal(body.wildcard, true);
      assert.equal(body.ssl.method, "http");
      assert.equal(body.ssl.type, "dv");
      assert.equal(body.ssl.settings.min_tls_version, "1.2");
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          result: { id: "cf-hostname-1", hostname: "shop.example.com", status: "pending", ssl: { status: "pending_validation" } },
        }),
      };
    },
  });

  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.mapped.storeDomainStatus, "VERIFYING");
});

test("createCloudflareCustomHostname can explicitly disable wildcard fallback", async () => {
  const result = await createCloudflareCustomHostname("shop.example.com", {
    config: enabledConfig,
    wildcard: false,
    fetch: async (_input, init) => {
      const body = JSON.parse(init.body ?? "{}");
      assert.equal(body.wildcard, false);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          result: { id: "cf-hostname-1", hostname: "shop.example.com", status: "pending", ssl: { status: "pending_validation" } },
        }),
      };
    },
  });

  assert.equal(result.ok, true);
});

test("mapCloudflareStatus requires hostname active and SSL active before activation", () => {
  assert.equal(mapCloudflareStatus({ status: "active", ssl: { status: "active" } }).storeDomainStatus, "ACTIVE");
  assert.equal(mapCloudflareStatus({ status: "active", ssl: { status: "pending_validation" } }).storeDomainStatus, "VERIFYING");
  assert.equal(mapCloudflareStatus({ status: "pending", ssl: { status: "active" } }).storeDomainStatus, "VERIFYING");
  assert.equal(mapCloudflareStatus({ status: "active", ssl: { status: "validation_timed_out" } }).storeDomainStatus, "FAILED");
  assert.equal(mapCloudflareStatus({ status: "deleted", ssl: { status: "active" } }).storeDomainStatus, "DISABLED");
});

test("getCloudflareCustomHostname maps mock fetch response", async () => {
  let requestedUrl = "";
  const result = await getCloudflareCustomHostname("cf-hostname-1", {
    config: enabledConfig,
    fetch: async (input, init) => {
      requestedUrl = input;
      assert.equal(init.method, "GET");
      assert.equal(init.headers.Authorization, `Bearer ${enabledConfig.apiToken}`);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          result: { id: "cf-hostname-1", hostname: "shop.example.com", status: "active", ssl: { status: "active" } },
        }),
      };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(requestedUrl.endsWith("/zones/zone-1/custom_hostnames/cf-hostname-1"), true);
  if (result.ok) assert.equal(result.mapped.storeDomainStatus, "ACTIVE");
});

test("Cloudflare API errors do not expose token text", async () => {
  const result = await createCloudflareCustomHostname("shop.example.com", {
    config: enabledConfig,
    fetch: async () => ({
      ok: false,
      status: 403,
      json: async () => ({
        success: false,
        errors: [{ code: 10000, message: `bad token ${enabledConfig.apiToken}` }],
      }),
    }),
  });

  assert.equal(result.ok, false);
  assert.equal(JSON.stringify(result).includes(enabledConfig.apiToken), false);
  if (!result.ok) assert.equal(result.reason, "cloudflare_error_10000");
});

test("Cloudflare timeout returns owner-safe error", async () => {
  const result = await getCloudflareCustomHostname("cf-hostname-1", {
    config: { ...enabledConfig, timeoutMs: 1 },
    fetch: async (_input, init) =>
      new Promise((resolve, reject) => {
        init.signal?.addEventListener("abort", () => {
          const error = new Error("aborted");
          error.name = "AbortError";
          reject(error);
        });
        setTimeout(() => resolve({ ok: true, status: 200, json: async () => ({ success: true, result: { id: "x", hostname: "shop.example.com" } }) }), 50);
      }),
  });

  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "cloudflare_timeout");
});

test("extractCloudflareDnsInstructions returns public CNAME and TXT values without secrets", () => {
  const instructions = extractCloudflareDnsInstructions(
    "www.tienda.com",
    {
      id: "cf-hostname-1",
      hostname: "www.tienda.com",
      ownership_verification: { type: "txt", name: "_cf-custom-hostname.www.tienda.com", value: "verify-me" },
      ssl: { validation_records: [{ txt_name: "_acme-challenge.www.tienda.com", txt_value: "acme-token" }] },
    },
    "jakawi.com",
  );
  const serialized = JSON.stringify(instructions);

  assert.deepEqual(instructions, [
    { type: "CNAME", name: "www.tienda.com", value: "jakawi.com" },
    { type: "TXT", name: "_cf-custom-hostname.www.tienda.com", value: "verify-me" },
    { type: "TXT", name: "_acme-challenge.www.tienda.com", value: "acme-token" },
  ]);
  assert.equal(serialized.includes(enabledConfig.apiToken), false);
});

test("redactCloudflareHostnameId shows only a partial id", () => {
  assert.equal(redactCloudflareHostnameId("abcdef123456"), "abcdef…3456");
  assert.equal(redactCloudflareHostnameId(null), null);
});
