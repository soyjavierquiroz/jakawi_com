import {
  createCloudflareCustomHostname,
  extractCloudflareDnsInstructions,
  getCloudflareCustomHostname,
  type CloudflareOperationResult,
} from "@/lib/cloudflare-custom-hostnames";
import { normalizeHostname, validateStoreDomainHostname, type StoreDomainKind } from "@/lib/domains";

export const storeDomainTypes = ["CUSTOM_DOMAIN", "JAKAWI_SUBDOMAIN"] as const;
export const storeDomainStatuses = ["PENDING", "VERIFYING", "VERIFIED", "ACTIVE", "FAILED", "DISABLED"] as const;
export const storeDomainVerificationTypes = ["NONE", "DNS_TXT", "DNS_CNAME", "MANUAL"] as const;

export type ManualStoreDomainType = (typeof storeDomainTypes)[number];
export type ManualStoreDomainStatus = (typeof storeDomainStatuses)[number];
export type ManualStoreDomainVerificationType = (typeof storeDomainVerificationTypes)[number];

type StoreDomainStore = {
  id: string;
  slug: string;
  isPublished?: boolean;
};

type StoreDomainRecord = {
  id: string;
  storeId: string;
  hostname: string;
  type: ManualStoreDomainType;
  status: ManualStoreDomainStatus;
  isPrimary: boolean;
  verificationType: ManualStoreDomainVerificationType;
  verificationValue: string | null;
  cloudflareHostnameId: string | null;
  sslStatus: string | null;
  lastCheckedAt: Date | null;
  store?: StoreDomainStore;
};

type StoreDomainDb = {
  store: {
    findUnique: (args: unknown) => Promise<StoreDomainStore | null>;
  };
  storeDomain: {
    findUnique: (args: unknown) => Promise<StoreDomainRecord | null>;
    findFirst?: (args: unknown) => Promise<StoreDomainRecord | null>;
    updateMany: (args: unknown) => Promise<unknown>;
    create: (args: { data: unknown }) => Promise<StoreDomainRecord>;
    update: (args: { where: { id: string }; data: unknown }) => Promise<StoreDomainRecord>;
  };
  $transaction: <T>(queries: T[]) => Promise<T[]>;
};

export type CreateStoreDomainInput = {
  storeId: string;
  hostname: string;
  type: ManualStoreDomainType;
  status?: ManualStoreDomainStatus;
  isPrimary?: boolean;
  verificationType?: ManualStoreDomainVerificationType;
  verificationValue?: string | null;
  cloudflareHostnameId?: string | null;
  sslStatus?: string | null;
};

export type StoreDomainOperationResult<T = StoreDomainRecord> =
  | { ok: true; domain: T; store?: StoreDomainStore }
  | { ok: false; reason: string; hostname?: string };

function cloudflareVerificationValue(result: CloudflareOperationResult) {
  if (!result.ok) return null;
  return (
    result.hostname.ownership_verification?.value ??
    result.hostname.ownership_verification_http?.http_url ??
    result.hostname.ssl?.validation_records?.[0]?.txt_value ??
    result.hostname.ssl?.validation_records?.[0]?.http_url ??
    null
  );
}

function cloudflareVerificationType(result: CloudflareOperationResult): ManualStoreDomainVerificationType {
  if (!result.ok) return "DNS_CNAME";
  const instructions = extractCloudflareDnsInstructions(result.hostname.hostname, result.hostname);
  if (instructions.some((instruction) => instruction.type === "TXT")) return "DNS_TXT";
  if (instructions.some((instruction) => instruction.type === "CNAME")) return "DNS_CNAME";
  return "MANUAL";
}

function statusFromCloudflareResult(result: CloudflareOperationResult, expectedHostname: string, store?: StoreDomainStore | null): ManualStoreDomainStatus {
  if (!result.ok) return "FAILED";
  const hostnameMatches = normalizeHostname(result.hostname.hostname) === normalizeHostname(expectedHostname);
  if (result.mapped.canActivate && hostnameMatches && store?.isPublished !== false) return "ACTIVE";
  if (result.mapped.storeDomainStatus === "FAILED" || result.mapped.storeDomainStatus === "DISABLED") return result.mapped.storeDomainStatus;
  return "VERIFYING";
}

export function normalizeStoreDomainType(value: string): ManualStoreDomainType | null {
  const normalized = value.trim().toUpperCase();
  return storeDomainTypes.find((item) => item === normalized) ?? null;
}

export function normalizeStoreDomainStatus(value: string): ManualStoreDomainStatus | null {
  const normalized = value.trim().toUpperCase();
  return storeDomainStatuses.find((item) => item === normalized) ?? null;
}

export function normalizeStoreDomainVerificationType(value: string): ManualStoreDomainVerificationType | null {
  const normalized = value.trim().toUpperCase();
  return storeDomainVerificationTypes.find((item) => item === normalized) ?? null;
}

function cleanOptional(value?: string | null) {
  const cleanValue = value?.trim() ?? "";
  return cleanValue.length ? cleanValue : null;
}

function defaultVerificationValue(params: { hostname: string; verificationType: ManualStoreDomainVerificationType; provided?: string | null }) {
  const provided = cleanOptional(params.provided);
  if (provided) return provided;
  if (params.verificationType === "DNS_TXT") return `jakawi-domain-verification=${params.hostname}`;
  if (params.verificationType === "DNS_CNAME") return "custom-hostname.jakawi.com";
  return null;
}

export async function createStoreDomainManual(
  db: StoreDomainDb,
  input: CreateStoreDomainInput,
): Promise<StoreDomainOperationResult> {
  const validation = validateStoreDomainHostname(input.hostname, { type: input.type as StoreDomainKind });
  if (!validation.ok) return { ok: false, reason: validation.reason, hostname: validation.hostname };

  const [store, duplicate] = await Promise.all([
    db.store.findUnique({ where: { id: input.storeId }, select: { id: true, slug: true } }),
    db.storeDomain.findUnique({ where: { hostname: validation.hostname } }),
  ]);

  if (!store) return { ok: false, reason: "store_not_found", hostname: validation.hostname };
  if (duplicate) return { ok: false, reason: "duplicate_hostname", hostname: validation.hostname };

  const status = input.status ?? "PENDING";
  const verificationType = input.verificationType ?? "DNS_TXT";
  const data = {
    storeId: store.id,
    hostname: normalizeHostname(validation.hostname),
    type: input.type,
    status,
    isPrimary: Boolean(input.isPrimary),
    verificationType,
    verificationValue: defaultVerificationValue({
      hostname: validation.hostname,
      verificationType,
      provided: input.verificationValue,
    }),
    cloudflareHostnameId: cleanOptional(input.cloudflareHostnameId),
    sslStatus: cleanOptional(input.sslStatus),
    lastCheckedAt: status === "ACTIVE" ? new Date() : undefined,
  };

  if (data.isPrimary) {
    const [, domain] = (await db.$transaction([
      db.storeDomain.updateMany({ where: { storeId: store.id, isPrimary: true }, data: { isPrimary: false } }),
      db.storeDomain.create({ data }),
    ])) as unknown as [unknown, StoreDomainRecord];
    return { ok: true, domain, store };
  }

  const domain = await db.storeDomain.create({ data });
  return { ok: true, domain, store };
}

export async function setStoreDomainStatus(
  db: Pick<StoreDomainDb, "storeDomain">,
  domainId: string,
  status: ManualStoreDomainStatus,
): Promise<StoreDomainOperationResult> {
  const domain = await db.storeDomain.findUnique({ where: { id: domainId }, include: { store: { select: { id: true, slug: true } } } });
  if (!domain) return { ok: false, reason: "domain_not_found" };

  const updated = await db.storeDomain.update({
    where: { id: domain.id },
    data: {
      status,
      lastCheckedAt: status === "ACTIVE" ? new Date() : domain.lastCheckedAt,
    },
  });
  return { ok: true, domain: updated, store: domain.store };
}

export async function setPrimaryStoreDomain(
  db: Pick<StoreDomainDb, "storeDomain" | "$transaction">,
  domainId: string,
): Promise<StoreDomainOperationResult> {
  const domain = await db.storeDomain.findUnique({ where: { id: domainId }, include: { store: { select: { id: true, slug: true } } } });
  if (!domain) return { ok: false, reason: "domain_not_found" };

  const [, updated] = (await db.$transaction([
    db.storeDomain.updateMany({ where: { storeId: domain.storeId, isPrimary: true }, data: { isPrimary: false } }),
    db.storeDomain.update({ where: { id: domain.id }, data: { isPrimary: true } }),
  ])) as unknown as [unknown, StoreDomainRecord];

  return { ok: true, domain: updated, store: domain.store };
}

export async function provisionStoreDomainCloudflare(
  db: Pick<StoreDomainDb, "storeDomain">,
  domainId: string,
  options: { createHostname?: typeof createCloudflareCustomHostname } = {},
): Promise<StoreDomainOperationResult> {
  const domain = await db.storeDomain.findUnique({ where: { id: domainId }, include: { store: { select: { id: true, slug: true, isPublished: true } } } });
  if (!domain) return { ok: false, reason: "domain_not_found" };
  if (domain.type !== "CUSTOM_DOMAIN") return { ok: false, reason: "custom_domain_required", hostname: domain.hostname };

  const createHostname = options.createHostname ?? createCloudflareCustomHostname;
  const result = await createHostname(domain.hostname);
  if (!result.ok) return { ok: false, reason: result.reason, hostname: domain.hostname };

  const status = statusFromCloudflareResult(result, domain.hostname, domain.store);
  const updated = await db.storeDomain.update({
    where: { id: domain.id },
    data: {
      cloudflareHostnameId: result.hostname.id,
      status,
      sslStatus: result.mapped.sslStatus,
      verificationType: cloudflareVerificationType(result),
      verificationValue: cloudflareVerificationValue(result),
      lastCheckedAt: new Date(),
    },
  });

  return { ok: true, domain: updated, store: domain.store };
}

export async function refreshStoreDomainCloudflareStatus(
  db: Pick<StoreDomainDb, "storeDomain" | "$transaction">,
  domainId: string,
  options: { getHostname?: typeof getCloudflareCustomHostname } = {},
): Promise<StoreDomainOperationResult> {
  const domain = await db.storeDomain.findUnique({ where: { id: domainId }, include: { store: { select: { id: true, slug: true, isPublished: true } } } });
  if (!domain) return { ok: false, reason: "domain_not_found" };
  if (!domain.cloudflareHostnameId) return { ok: false, reason: "missing_cloudflare_hostname_id", hostname: domain.hostname };

  const getHostname = options.getHostname ?? getCloudflareCustomHostname;
  const result = await getHostname(domain.cloudflareHostnameId);
  if (!result.ok) return { ok: false, reason: result.reason, hostname: domain.hostname };

  const status = statusFromCloudflareResult(result, domain.hostname, domain.store);
  const data = {
    status,
    sslStatus: result.mapped.sslStatus,
    verificationType: cloudflareVerificationType(result),
    verificationValue: cloudflareVerificationValue(result) ?? domain.verificationValue,
    lastCheckedAt: new Date(),
  };

  let updated: StoreDomainRecord;
  const canSetPrimary = status === "ACTIVE" && !domain.isPrimary && db.storeDomain.findFirst
    ? !(await db.storeDomain.findFirst({
        where: {
          storeId: domain.storeId,
          type: "CUSTOM_DOMAIN",
          isPrimary: true,
          status: "ACTIVE",
          id: { not: domain.id },
        },
      }))
    : false;

  if (canSetPrimary) {
    const [, primaryDomain] = (await db.$transaction([
      db.storeDomain.updateMany({ where: { storeId: domain.storeId, isPrimary: true, type: "CUSTOM_DOMAIN" }, data: { isPrimary: false } }),
      db.storeDomain.update({ where: { id: domain.id }, data: { ...data, isPrimary: true } }),
    ])) as unknown as [unknown, StoreDomainRecord];
    updated = primaryDomain;
  } else {
    updated = await db.storeDomain.update({
      where: { id: domain.id },
      data,
    });
  }

  return { ok: true, domain: updated, store: domain.store };
}
