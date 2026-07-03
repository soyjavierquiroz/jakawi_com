import test from "node:test";
import assert from "node:assert/strict";
import { normalizeHostname, resolveStorefrontRequest, validateStoreDomainHostname } from "./domains";

const baseEnv = {
  CUSTOM_DOMAINS_ENABLED: "true",
  JAKAWI_PRIMARY_DOMAIN: "jakawi.com",
};

function domainDb(type: "CUSTOM_DOMAIN" | "JAKAWI_SUBDOMAIN" = "CUSTOM_DOMAIN") {
  let calls = 0;
  return {
    get calls() {
      return calls;
    },
    storeDomain: {
      findFirst: async () => {
        calls += 1;
        return {
          hostname: type === "CUSTOM_DOMAIN" ? "shop.example.com" : "tienda.jakawi.com",
          type,
          store: { id: "store-1", slug: "demo", isPublished: true },
        };
      },
    },
  };
}

test("normalizeHostname lowercases and removes protocol, path, port, and trailing dot", () => {
  assert.equal(normalizeHostname(" HTTPS://Shop.Example.COM:443/path?x=1#top "), "shop.example.com");
  assert.equal(normalizeHostname("www.Example.com."), "www.example.com");
});

test("validateStoreDomainHostname accepts a valid custom domain", () => {
  const result = validateStoreDomainHostname("shop.example.com", { env: baseEnv });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.hostname, "shop.example.com");
});

test("validateStoreDomainHostname rejects jakawi.com and www.jakawi.com", () => {
  assert.equal(validateStoreDomainHostname("jakawi.com", { env: baseEnv }).ok, false);
  assert.equal(validateStoreDomainHostname("www.jakawi.com", { env: baseEnv }).ok, false);
});

test("validateStoreDomainHostname rejects reserved platform service hostnames", () => {
  assert.equal(validateStoreDomainHostname("crm.jakawi.com", { env: baseEnv }).ok, false);
  assert.equal(validateStoreDomainHostname("media.jakawi.com", { env: baseEnv }).ok, false);
  assert.equal(validateStoreDomainHostname("minio.jakawi.com", { env: baseEnv }).ok, false);
});

test("validateStoreDomainHostname rejects localhost and IP hostnames", () => {
  assert.equal(validateStoreDomainHostname("localhost", { env: baseEnv }).ok, false);
  assert.equal(validateStoreDomainHostname("127.0.0.1", { env: baseEnv }).ok, false);
  assert.equal(validateStoreDomainHostname("192.168.1.20", { env: baseEnv }).ok, false);
  assert.equal(validateStoreDomainHostname("8.8.8.8", { env: baseEnv }).ok, false);
});

test("CUSTOM_DOMAINS_ENABLED=false blocks custom host resolution before DB lookup", async () => {
  const db = domainDb();
  const result = await resolveStorefrontRequest("shop.example.com", "/", {
    env: { ...baseEnv, CUSTOM_DOMAINS_ENABLED: "false" },
    db,
  });

  assert.equal(result.mode, "NOT_STOREFRONT");
  assert.equal(db.calls, 0);
});

test("resolveStorefrontRequest maps custom root to storefront", async () => {
  const result = await resolveStorefrontRequest("shop.example.com", "/", {
    env: baseEnv,
    db: domainDb(),
  });

  assert.equal(result.mode, "CUSTOM_DOMAIN");
  assert.equal(result.storeSlug, "demo");
});

test("resolveStorefrontRequest maps custom /p/demo to product", async () => {
  const result = await resolveStorefrontRequest("shop.example.com", "/p/demo", {
    env: baseEnv,
    db: domainDb(),
  });

  assert.equal(result.mode, "CUSTOM_DOMAIN");
  assert.equal(result.storeSlug, "demo");
  assert.equal(result.productSlug, "demo");
});

test("resolveStorefrontRequest maps platform /slug to platform storefront", async () => {
  const result = await resolveStorefrontRequest("jakawi.com", "/slug", {
    env: baseEnv,
    db: domainDb(),
  });

  assert.equal(result.mode, "PLATFORM_SLUG");
  assert.equal(result.storeSlug, "slug");
});

test("ACTIVE status allows custom domain resolution", async () => {
  const result = await resolveStorefrontRequest("shop.example.com", "/", {
    env: baseEnv,
    db: {
      storeDomain: {
        findFirst: async () => ({
          hostname: "shop.example.com",
          type: "CUSTOM_DOMAIN",
          store: { id: "store-1", slug: "demo", isPublished: true },
        }),
      },
    },
  });

  assert.equal(result.mode, "CUSTOM_DOMAIN");
  assert.equal(result.storeSlug, "demo");
});

test("PENDING status does not resolve custom domain", async () => {
  const result = await resolveStorefrontRequest("pending.example.com", "/", {
    env: baseEnv,
    db: {
      storeDomain: {
        findFirst: async () => null,
      },
    },
  });

  assert.equal(result.mode, "NOT_STOREFRONT");
});
