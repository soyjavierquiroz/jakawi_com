import { normalizeHostname, validateStoreDomainHostname } from "@/lib/domains";

export const customDomainStatuses = ["PENDING", "VERIFYING", "VERIFIED", "ACTIVE", "FAILED", "DISABLED"] as const;

export type CustomDomainStatus = (typeof customDomainStatuses)[number];

export type DnsInstruction = {
  type: "CNAME" | "TXT";
  name: string;
  value: string;
};

export type CanonicalCustomDomainFlow = {
  inputHost: string;
  canonicalHost: string;
  redirectAlias: string;
};

const RESERVED_JAKAWI_HOSTNAMES = new Set([
  "jakawi.com",
  "www.jakawi.com",
  "media.jakawi.com",
  "crm.jakawi.com",
  "minio.jakawi.com",
]);

export function normalizeDomainInput(input: string | null | undefined) {
  return normalizeHostname(input);
}

export function normalizeCanonicalCustomDomainInput(input: string | null | undefined): CanonicalCustomDomainFlow {
  const inputHost = normalizeDomainInput(input);
  const canonicalHost = inputHost.startsWith("www.") ? inputHost.slice(4) : inputHost;
  return {
    inputHost,
    canonicalHost,
    redirectAlias: canonicalHost ? `www.${canonicalHost}` : "",
  };
}

export function isJakawiReservedDomain(input: string | null | undefined) {
  return RESERVED_JAKAWI_HOSTNAMES.has(normalizeDomainInput(input));
}

export function validateCustomDomain(input: string | null | undefined) {
  const { canonicalHost } = normalizeCanonicalCustomDomainInput(input);
  return validateStoreDomainHostname(canonicalHost || input, {
    type: "CUSTOM_DOMAIN",
    env: {
      JAKAWI_PRIMARY_DOMAIN: "jakawi.com",
    },
  });
}

export function buildDnsInstructions(params: {
  hostname: string;
  cnameTarget?: string | null;
  verificationToken?: string | null;
}) {
  const hostname = normalizeDomainInput(params.hostname);
  const cnameTarget = normalizeDomainInput(params.cnameTarget) || "jakawi.com";
  const instructions: DnsInstruction[] = [
    {
      type: "CNAME",
      name: hostname,
      value: cnameTarget,
    },
  ];

  const verificationToken = params.verificationToken?.trim();
  if (verificationToken) {
    instructions.push({
      type: "TXT",
      name: hostname,
      value: verificationToken,
    });
  }

  return instructions;
}

export function buildCanonicalDomainDnsInstructions(params: {
  hostname: string;
  cnameTarget?: string | null;
  verificationToken?: string | null;
}) {
  const { canonicalHost, redirectAlias } = normalizeCanonicalCustomDomainInput(params.hostname);
  const cnameTarget = normalizeDomainInput(params.cnameTarget) || "proxy-fallback.jakawi.com";
  const instructions: DnsInstruction[] = [
    {
      type: "CNAME",
      name: "@",
      value: cnameTarget,
    },
    {
      type: "CNAME",
      name: redirectAlias === `www.${canonicalHost}` ? "www" : redirectAlias,
      value: cnameTarget,
    },
  ];

  const verificationToken = params.verificationToken?.trim();
  if (verificationToken) {
    instructions.push({
      type: "TXT",
      name: canonicalHost,
      value: verificationToken,
    });
  }

  return instructions;
}

export function canOwnerRequestDomain(actorUserId: string, store: { ownerId: string } | null | undefined) {
  return Boolean(actorUserId && store && store.ownerId === actorUserId);
}

export function deriveDomainStatusLabel(status: string) {
  if (status === "PENDING") return "PENDING_DNS";
  if (status === "VERIFYING") return "VERIFYING_SSL";
  if (status === "VERIFIED") return "verified";
  if (status === "ACTIVE") return "active";
  if (status === "FAILED") return "failed";
  if (status === "DISABLED") return "disabled";
  return "pending";
}

export function redactDomainOwnerEmail(email: string) {
  const [local = "", domain = ""] = email.trim().toLowerCase().split("@");
  if (!local || !domain) return "oculto";
  return `${local.slice(0, 2)}***@${domain}`;
}
