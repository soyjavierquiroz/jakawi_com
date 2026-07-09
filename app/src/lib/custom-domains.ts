import { normalizeHostname, validateStoreDomainHostname } from "@/lib/domains";

export const customDomainStatuses = ["PENDING", "VERIFYING", "VERIFIED", "ACTIVE", "FAILED", "DISABLED"] as const;

export type CustomDomainStatus = (typeof customDomainStatuses)[number];

export type DnsInstruction = {
  type: "CNAME" | "TXT";
  name: string;
  value: string;
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

export function isJakawiReservedDomain(input: string | null | undefined) {
  return RESERVED_JAKAWI_HOSTNAMES.has(normalizeDomainInput(input));
}

export function validateCustomDomain(input: string | null | undefined) {
  return validateStoreDomainHostname(input, {
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

export function canOwnerRequestDomain(actorUserId: string, store: { ownerId: string } | null | undefined) {
  return Boolean(actorUserId && store && store.ownerId === actorUserId);
}

export function deriveDomainStatusLabel(status: string) {
  if (status === "PENDING") return "pending";
  if (status === "VERIFYING") return "verification_pending";
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
