import test from "node:test";
import assert from "node:assert/strict";
import {
  createCloudflareCustomHostname,
  getCloudflareCustomHostname,
  isCloudflareCustomHostnamesEnabled,
  mapCloudflareStatus,
} from "./cloudflare-custom-hostnames";

const enabledConfig = {
  enabled: true,
  apiToken: "cf-token-test-value",
  zoneId: "zone-1",
  fallbackOrigin: "custom-hostname.jakawi.com",
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

test("mapCloudflareStatus maps SSL states to StoreDomain statuses", () => {
  assert.equal(mapCloudflareStatus({ ssl: { status: "active" } }).storeDomainStatus, "ACTIVE");
  assert.equal(mapCloudflareStatus({ ssl: { status: "pending_validation" } }).storeDomainStatus, "VERIFYING");
  assert.equal(mapCloudflareStatus({ ssl: { status: "validation_timed_out" } }).storeDomainStatus, "FAILED");
  assert.equal(mapCloudflareStatus({ ssl: { status: "deleted" } }).storeDomainStatus, "DISABLED");
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
          result: { id: "cf-hostname-1", hostname: "shop.example.com", ssl: { status: "active" } },
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
