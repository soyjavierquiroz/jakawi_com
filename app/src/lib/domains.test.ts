import test from "node:test";
import assert from "node:assert/strict";
import { normalizeHostname, resolveStorefrontRequest, validateStoreDomainHostname } from "./domains";

const baseEnv = {
  CUSTOM_DOMAINS_ENABLED: "true",
  JAKAWI_PRIMARY_DOMAIN: "jakawi.com",
};

type FakeStoreDomainType = "CUSTOM_DOMAIN" | "JAKAWI_SUBDOMAIN";
type FakeStoreDomainStatus = "PENDING" | "VERIFYING" | "VERIFIED" | "ACTIVE" | "FAILED" | "DISABLED";
type FakeDomain = {
  hostname: string;
  type: FakeStoreDomainType;
  status: FakeStoreDomainStatus;
  store: { id: string; slug: string; isPublished: boolean } | null;
};

function domainDb(rows: FakeDomain[] = [activeCustomDomain("shop.example.com")]) {
  let calls = 0;
  return {
    get calls() {
      return calls;
    },
    storeDomain: {
      findFirst: async (args: unknown) => {
        calls += 1;
        const where = (args as { where?: { hostname?: string; status?: string; type?: string } }).where ?? {};
        const row = rows.find((item) => item.hostname === where.hostname && item.status === where.status && item.type === where.type);
        if (!row || row.type !== "CUSTOM_DOMAIN") return null;
        return { hostname: row.hostname, type: row.type, store: row.store };
      },
    },
  };
}

function activeCustomDomain(hostname: string, slug = "demo"): FakeDomain {
  return {
    hostname,
    type: "CUSTOM_DOMAIN",
    status: "ACTIVE",
    store: { id: "store-1", slug, isPublished: true },
  };
}

function customDomainWithStatus(status: Exclude<FakeStoreDomainStatus, "ACTIVE">): FakeDomain {
  return {
    ...activeCustomDomain(`${status.toLowerCase()}.example.com`),
    status,
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

test("CUSTOM_DOMAINS_ENABLED=true + CUSTOM_DOMAIN ACTIVE exact match resolves storefront", async () => {
  const db = domainDb([activeCustomDomain("shop.example.com")]);
  const result = await resolveStorefrontRequest("shop.example.com", "/", {
    env: baseEnv,
    db,
  });

  assert.equal(result.mode, "CUSTOM_DOMAIN");
  assert.equal(result.storeSlug, "demo");
  assert.equal(db.calls, 1);
});

test("hostname matching is case-insensitive and normalized before lookup", async () => {
  const result = await resolveStorefrontRequest("HTTPS://Shop.Example.COM/path", "/", {
    env: baseEnv,
    db: domainDb([activeCustomDomain("shop.example.com")]),
  });

  assert.equal(result.mode, "CUSTOM_DOMAIN");
  assert.equal(result.storeSlug, "demo");
});

test("hostname with port is normalized before lookup", async () => {
  const result = await resolveStorefrontRequest("shop.example.com:443", "/", {
    env: baseEnv,
    db: domainDb([activeCustomDomain("shop.example.com")]),
  });

  assert.equal(result.mode, "CUSTOM_DOMAIN");
  assert.equal(result.storeSlug, "demo");
});

test("resolveStorefrontRequest maps custom /p/demo to product", async () => {
  const result = await resolveStorefrontRequest("shop.example.com", "/p/demo", {
    env: baseEnv,
    db: domainDb([activeCustomDomain("shop.example.com")]),
  });

  assert.equal(result.mode, "CUSTOM_DOMAIN");
  assert.equal(result.storeSlug, "demo");
  assert.equal(result.productSlug, "demo");
});

test("resolveStorefrontRequest maps platform /slug to platform storefront", async () => {
  const db = domainDb([activeCustomDomain("jakawi.com")]);
  const result = await resolveStorefrontRequest("jakawi.com", "/slug", {
    env: baseEnv,
    db,
  });

  assert.equal(result.mode, "PLATFORM_SLUG");
  assert.equal(result.storeSlug, "slug");
  assert.equal(db.calls, 0);
});

test("jakawi.com reserved host does not resolve via StoreDomain lookup", async () => {
  const db = domainDb([activeCustomDomain("jakawi.com")]);
  const result = await resolveStorefrontRequest("jakawi.com", "/", {
    env: baseEnv,
    db,
  });

  assert.equal(result.mode, "NOT_STOREFRONT");
  assert.equal(db.calls, 0);
});

test("localhost and IP hosts do not resolve via StoreDomain lookup", async () => {
  const db = domainDb([activeCustomDomain("localhost"), activeCustomDomain("127.0.0.1")]);
  const localhostResult = await resolveStorefrontRequest("localhost", "/", { env: baseEnv, db });
  const ipResult = await resolveStorefrontRequest("127.0.0.1", "/", { env: baseEnv, db });

  assert.equal(localhostResult.mode, "NOT_STOREFRONT");
  assert.equal(ipResult.mode, "NOT_STOREFRONT");
  assert.equal(db.calls, 0);
});

for (const status of ["PENDING", "VERIFYING", "VERIFIED", "FAILED", "DISABLED"] as const) {
  test(`CUSTOM_DOMAINS_ENABLED=true + CUSTOM_DOMAIN ${status} does not resolve`, async () => {
    const result = await resolveStorefrontRequest(`${status.toLowerCase()}.example.com`, "/", {
      env: baseEnv,
      db: domainDb([customDomainWithStatus(status)]),
    });

    assert.equal(result.mode, "NOT_STOREFRONT");
  });
}

test("CUSTOM_DOMAINS_ENABLED=true + JAKAWI_SUBDOMAIN ACTIVE does not resolve", async () => {
  const result = await resolveStorefrontRequest("tienda.jakawi.com", "/", {
    env: baseEnv,
    db: domainDb([
      {
        hostname: "tienda.jakawi.com",
        type: "JAKAWI_SUBDOMAIN",
        status: "ACTIVE",
        store: { id: "store-1", slug: "demo", isPublished: true },
      },
    ]),
  });

  assert.equal(result.mode, "NOT_STOREFRONT");
});
