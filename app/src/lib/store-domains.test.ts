import test from "node:test";
import assert from "node:assert/strict";
import { createStoreDomainManual, provisionStoreDomainCloudflare, refreshStoreDomainCloudflareStatus, setPrimaryStoreDomain, setStoreDomainStatus } from "./store-domains";

type Store = {
  id: string;
  slug: string;
};

type Domain = {
  id: string;
  storeId: string;
  hostname: string;
  type: "CUSTOM_DOMAIN" | "JAKAWI_SUBDOMAIN";
  status: "PENDING" | "VERIFYING" | "ACTIVE" | "FAILED" | "DISABLED";
  isPrimary: boolean;
  verificationType: "NONE" | "DNS_TXT" | "DNS_CNAME" | "MANUAL";
  verificationValue: string | null;
  cloudflareHostnameId: string | null;
  sslStatus: string | null;
  lastCheckedAt: Date | null;
  store?: Store;
};

class FakeDomainDb {
  stores: Store[] = [{ id: "store-1", slug: "demo" }];
  domains: Domain[] = [];
  nextDomainId = 1;

  store = {
    findUnique: async (args: { where: { id: string } }) => {
      return this.stores.find((store) => store.id === args.where.id) ?? null;
    },
  };

  storeDomain = {
    findUnique: async (args: { where: { id?: string; hostname?: string } }) => {
      const domain = this.domains.find((row) => row.id === args.where.id || row.hostname === args.where.hostname);
      if (!domain) return null;
      return { ...domain, store: this.stores.find((store) => store.id === domain.storeId) };
    },
    updateMany: async (args: { where: { storeId: string; isPrimary?: boolean }; data: Partial<Domain> }) => {
      let count = 0;
      for (const domain of this.domains) {
        if (domain.storeId !== args.where.storeId) continue;
        if (typeof args.where.isPrimary === "boolean" && domain.isPrimary !== args.where.isPrimary) continue;
        Object.assign(domain, args.data);
        count += 1;
      }
      return { count };
    },
    create: async (args: { data: Omit<Domain, "id" | "lastCheckedAt"> & { lastCheckedAt?: Date } }) => {
      const domain: Domain = {
        ...args.data,
        id: `domain-${this.nextDomainId++}`,
        cloudflareHostnameId: args.data.cloudflareHostnameId ?? null,
        lastCheckedAt: args.data.lastCheckedAt ?? null,
      };
      this.domains.push(domain);
      return domain;
    },
    update: async (args: { where: { id: string }; data: Partial<Domain> }) => {
      const domain = this.domains.find((row) => row.id === args.where.id);
      if (!domain) throw new Error("domain not found");
      Object.assign(domain, args.data);
      return domain;
    },
  };

  $transaction = async <T>(queries: Array<T | Promise<T>>) => Promise.all(queries);
}

test("createStoreDomainManual normalizes valid hostname", async () => {
  const db = new FakeDomainDb();
  const result = await createStoreDomainManual(db as never, {
    storeId: "store-1",
    hostname: " HTTPS://Shop.Example.COM/path ",
    type: "CUSTOM_DOMAIN",
  });

  assert.equal(result.ok, true);
  assert.equal(db.domains[0].hostname, "shop.example.com");
  assert.equal(db.domains[0].verificationValue, "jakawi-domain-verification=shop.example.com");
});

test("createStoreDomainManual rejects reserved domain", async () => {
  const db = new FakeDomainDb();
  const result = await createStoreDomainManual(db as never, {
    storeId: "store-1",
    hostname: "jakawi.com",
    type: "CUSTOM_DOMAIN",
  });

  assert.equal(result.ok, false);
  assert.equal(db.domains.length, 0);
});

test("createStoreDomainManual rejects duplicate hostname", async () => {
  const db = new FakeDomainDb();
  await createStoreDomainManual(db as never, {
    storeId: "store-1",
    hostname: "shop.example.com",
    type: "CUSTOM_DOMAIN",
  });
  const duplicate = await createStoreDomainManual(db as never, {
    storeId: "store-1",
    hostname: "shop.example.com",
    type: "CUSTOM_DOMAIN",
  });

  assert.equal(duplicate.ok, false);
  assert.equal(db.domains.length, 1);
});

test("setPrimaryStoreDomain unsets previous primary for the store", async () => {
  const db = new FakeDomainDb();
  const first = await createStoreDomainManual(db as never, {
    storeId: "store-1",
    hostname: "a.example.com",
    type: "CUSTOM_DOMAIN",
    isPrimary: true,
  });
  const second = await createStoreDomainManual(db as never, {
    storeId: "store-1",
    hostname: "b.example.com",
    type: "CUSTOM_DOMAIN",
  });

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  if (!second.ok) throw new Error("second domain not created");
  await setPrimaryStoreDomain(db as never, second.domain.id);

  assert.equal(db.domains.find((domain) => domain.hostname === "a.example.com")?.isPrimary, false);
  assert.equal(db.domains.find((domain) => domain.hostname === "b.example.com")?.isPrimary, true);
});

test("setStoreDomainStatus marks ACTIVE and updates lastCheckedAt", async () => {
  const db = new FakeDomainDb();
  const created = await createStoreDomainManual(db as never, {
    storeId: "store-1",
    hostname: "status.example.com",
    type: "CUSTOM_DOMAIN",
  });
  if (!created.ok) throw new Error("domain not created");

  const result = await setStoreDomainStatus(db as never, created.domain.id, "ACTIVE");

  assert.equal(result.ok, true);
  assert.equal(db.domains[0].status, "ACTIVE");
  assert.ok(db.domains[0].lastCheckedAt instanceof Date);
});

test("provisionStoreDomainCloudflare requires CUSTOM_DOMAIN", async () => {
  const db = new FakeDomainDb();
  const created = await createStoreDomainManual(db as never, {
    storeId: "store-1",
    hostname: "tienda.jakawi.com",
    type: "JAKAWI_SUBDOMAIN",
  });
  if (!created.ok) throw new Error("domain not created");

  const result = await provisionStoreDomainCloudflare(db as never, created.domain.id, {
    createHostname: async () => {
      throw new Error("should not call Cloudflare for JAKAWI_SUBDOMAIN");
    },
  });

  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "custom_domain_required");
});

test("refreshStoreDomainCloudflareStatus updates sslStatus and status", async () => {
  const db = new FakeDomainDb();
  const created = await createStoreDomainManual(db as never, {
    storeId: "store-1",
    hostname: "refresh.example.com",
    type: "CUSTOM_DOMAIN",
  });
  if (!created.ok) throw new Error("domain not created");
  db.domains[0].cloudflareHostnameId = "cf-hostname-1";

  const result = await refreshStoreDomainCloudflareStatus(db as never, created.domain.id, {
    getHostname: async () => ({
      ok: true,
      hostname: { id: "cf-hostname-1", hostname: "refresh.example.com", ssl: { status: "active" } },
      mapped: { storeDomainStatus: "ACTIVE", sslStatus: "active" },
    }),
  });

  assert.equal(result.ok, true);
  assert.equal(db.domains[0].status, "ACTIVE");
  assert.equal(db.domains[0].sslStatus, "active");
  assert.ok(db.domains[0].lastCheckedAt instanceof Date);
});
