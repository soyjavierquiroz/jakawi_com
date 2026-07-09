import test from "node:test";
import assert from "node:assert/strict";
import { createStoreDomainManual, provisionStoreDomainCloudflare, refreshStoreDomainCloudflareStatus, setPrimaryStoreDomain, setStoreDomainStatus } from "./store-domains";

type Store = {
  id: string;
  slug: string;
  isPublished?: boolean;
};

type Domain = {
  id: string;
  storeId: string;
  hostname: string;
  type: "CUSTOM_DOMAIN" | "JAKAWI_SUBDOMAIN";
  status: "PENDING" | "VERIFYING" | "VERIFIED" | "ACTIVE" | "FAILED" | "DISABLED";
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
    findFirst: async (args: { where: { storeId?: string; type?: string; isPrimary?: boolean; status?: string; id?: { not?: string } } }) => {
      const domain = this.domains.find((row) => {
        if (args.where.storeId && row.storeId !== args.where.storeId) return false;
        if (args.where.type && row.type !== args.where.type) return false;
        if (typeof args.where.isPrimary === "boolean" && row.isPrimary !== args.where.isPrimary) return false;
        if (args.where.status && row.status !== args.where.status) return false;
        if (args.where.id?.not && row.id === args.where.id.not) return false;
        return true;
      });
      if (!domain) return null;
      return { ...domain, store: this.stores.find((store) => store.id === domain.storeId) };
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

test("provisionStoreDomainCloudflare stores Cloudflare id and starts VERIFYING", async () => {
  const db = new FakeDomainDb();
  const created = await createStoreDomainManual(db as never, {
    storeId: "store-1",
    hostname: "provision.example.com",
    type: "CUSTOM_DOMAIN",
  });
  if (!created.ok) throw new Error("domain not created");

  const result = await provisionStoreDomainCloudflare(db as never, created.domain.id, {
    createHostname: async () => ({
      ok: true,
      hostname: {
        id: "cf-hostname-1",
        hostname: "provision.example.com",
        status: "pending",
        ownership_verification: { type: "txt", name: "_cf.provision.example.com", value: "verify-provision" },
        ssl: { status: "pending_validation" },
      },
      mapped: { storeDomainStatus: "VERIFYING", sslStatus: "pending_validation", cloudflareStatus: "pending", canActivate: false },
    }),
  });

  assert.equal(result.ok, true);
  assert.equal(db.domains[0].cloudflareHostnameId, "cf-hostname-1");
  assert.equal(db.domains[0].status, "VERIFYING");
  assert.equal(db.domains[0].verificationType, "DNS_TXT");
  assert.equal(db.domains[0].verificationValue, "verify-provision");
});

test("refreshStoreDomainCloudflareStatus activates only when hostname and SSL are active", async () => {
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
      hostname: { id: "cf-hostname-1", hostname: "refresh.example.com", status: "active", ssl: { status: "active" } },
      mapped: { storeDomainStatus: "ACTIVE", sslStatus: "active", cloudflareStatus: "active", canActivate: true },
    }),
  });

  assert.equal(result.ok, true);
  assert.equal(db.domains[0].status, "ACTIVE");
  assert.equal(db.domains[0].isPrimary, true);
  assert.equal(db.domains[0].sslStatus, "active");
  assert.ok(db.domains[0].lastCheckedAt instanceof Date);
});

test("refreshStoreDomainCloudflareStatus keeps pending SSL in VERIFYING", async () => {
  const db = new FakeDomainDb();
  const created = await createStoreDomainManual(db as never, {
    storeId: "store-1",
    hostname: "pending-ssl.example.com",
    type: "CUSTOM_DOMAIN",
  });
  if (!created.ok) throw new Error("domain not created");
  db.domains[0].cloudflareHostnameId = "cf-hostname-1";

  const result = await refreshStoreDomainCloudflareStatus(db as never, created.domain.id, {
    getHostname: async () => ({
      ok: true,
      hostname: { id: "cf-hostname-1", hostname: "pending-ssl.example.com", status: "active", ssl: { status: "pending_validation" } },
      mapped: { storeDomainStatus: "VERIFYING", sslStatus: "pending_validation", cloudflareStatus: "active", canActivate: false },
    }),
  });

  assert.equal(result.ok, true);
  assert.equal(db.domains[0].status, "VERIFYING");
  assert.equal(db.domains[0].isPrimary, false);
});

test("refreshStoreDomainCloudflareStatus maps Cloudflare failed status safely", async () => {
  const db = new FakeDomainDb();
  const created = await createStoreDomainManual(db as never, {
    storeId: "store-1",
    hostname: "failed.example.com",
    type: "CUSTOM_DOMAIN",
  });
  if (!created.ok) throw new Error("domain not created");
  db.domains[0].cloudflareHostnameId = "cf-hostname-1";

  const result = await refreshStoreDomainCloudflareStatus(db as never, created.domain.id, {
    getHostname: async () => ({
      ok: true,
      hostname: { id: "cf-hostname-1", hostname: "failed.example.com", status: "failed", ssl: { status: "pending_validation" } },
      mapped: { storeDomainStatus: "FAILED", sslStatus: "pending_validation", cloudflareStatus: "failed", canActivate: false },
    }),
  });

  assert.equal(result.ok, true);
  assert.equal(db.domains[0].status, "FAILED");
});

test("refreshStoreDomainCloudflareStatus returns owner-safe Cloudflare errors without mutating status", async () => {
  const db = new FakeDomainDb();
  const created = await createStoreDomainManual(db as never, {
    storeId: "store-1",
    hostname: "error.example.com",
    type: "CUSTOM_DOMAIN",
  });
  if (!created.ok) throw new Error("domain not created");
  db.domains[0].cloudflareHostnameId = "cf-hostname-1";

  const result = await refreshStoreDomainCloudflareStatus(db as never, created.domain.id, {
    getHostname: async () => ({ ok: false, reason: "cloudflare_error_10000" }),
  });

  assert.equal(result.ok, false);
  assert.equal(JSON.stringify(result).includes("secret-token"), false);
  assert.equal(db.domains[0].status, "PENDING");
});
