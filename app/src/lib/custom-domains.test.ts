import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildDnsInstructions,
  canOwnerRequestDomain,
  deriveDomainStatusLabel,
  isJakawiReservedDomain,
  normalizeDomainInput,
  redactDomainOwnerEmail,
  validateCustomDomain,
} from "./custom-domains";

test("normalizeDomainInput removes protocol and path and lowercases", () => {
  assert.equal(normalizeDomainInput("https://www.midominio.com/path"), "www.midominio.com");
});

test("validateCustomDomain rejects localhost and IPs", () => {
  assert.equal(validateCustomDomain("localhost").ok, false);
  assert.equal(validateCustomDomain("127.0.0.1").ok, false);
  assert.equal(validateCustomDomain("8.8.8.8").ok, false);
});

test("reserved JAKAWI domains are rejected", () => {
  for (const hostname of ["jakawi.com", "www.jakawi.com", "media.jakawi.com", "crm.jakawi.com", "minio.jakawi.com"]) {
    assert.equal(isJakawiReservedDomain(hostname), true);
    assert.equal(validateCustomDomain(hostname).ok, false);
  }
});

test("valid apex and www domains are accepted", () => {
  assert.equal(validateCustomDomain("tienda.com").ok, true);
  assert.equal(validateCustomDomain("www.tienda.com").ok, true);
});

test("owner can request only for a store they own", () => {
  assert.equal(canOwnerRequestDomain("owner-1", { ownerId: "owner-1" }), true);
  assert.equal(canOwnerRequestDomain("owner-1", { ownerId: "owner-2" }), false);
  assert.equal(canOwnerRequestDomain("owner-1", null), false);
});

test("status labels cover every manual beta state", () => {
  assert.equal(deriveDomainStatusLabel("PENDING"), "pending");
  assert.equal(deriveDomainStatusLabel("VERIFYING"), "verification_pending");
  assert.equal(deriveDomainStatusLabel("VERIFIED"), "verified");
  assert.equal(deriveDomainStatusLabel("ACTIVE"), "active");
  assert.equal(deriveDomainStatusLabel("FAILED"), "failed");
  assert.equal(deriveDomainStatusLabel("DISABLED"), "disabled");
});

test("DNS instructions contain only expected public DNS values", () => {
  const instructions = buildDnsInstructions({
    hostname: "www.tienda.com",
    cnameTarget: "custom-hostname.jakawi.com",
    verificationToken: "jakawi-domain-verification=www.tienda.com",
  });
  const serialized = JSON.stringify(instructions);

  assert.deepEqual(instructions, [
    { type: "CNAME", name: "www.tienda.com", value: "custom-hostname.jakawi.com" },
    { type: "TXT", name: "www.tienda.com", value: "jakawi-domain-verification=www.tienda.com" },
  ]);
  for (const forbidden of ["CLOUDFLARE_API_TOKEN", "DATABASE_URL", "SESSION_SECRET", "APP_ENCRYPTION_KEY", "accessTokenEncrypted"]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

test("admin status, primary, and refresh actions require superadmin", () => {
  const actionsSource = readFileSync(new URL("./actions.ts", import.meta.url), "utf8");
  for (const actionName of ["updateStoreDomainStatusAction", "setPrimaryStoreDomainAction", "refreshStoreDomainCloudflareStatusAction"]) {
    const start = actionsSource.indexOf(`export async function ${actionName}`);
    assert.notEqual(start, -1);
    assert.match(actionsSource.slice(start, start + 240), /await requireSuperAdmin\(\)/);
  }
});

test("owner verify action is scoped to domains from the owner store", () => {
  const actionsSource = readFileSync(new URL("./actions.ts", import.meta.url), "utf8");
  const start = actionsSource.indexOf("export async function verifyCustomDomainAction");
  assert.notEqual(start, -1);
  const snippet = actionsSource.slice(start, start + 700);

  assert.match(snippet, /await requireUser\(\)/);
  assert.match(snippet, /store: \{ ownerId: user\.id \}/);
  assert.equal(snippet.includes("setStoreDomainStatus"), false);
});

test("owner and admin pages do not expose Cloudflare API tokens or raw secrets", () => {
  const ownerPage = readFileSync(new URL("../app/(dashboard)/app/dominios/page.tsx", import.meta.url), "utf8");
  const adminPage = readFileSync(new URL("../app/(dashboard)/app/admin/domains/page.tsx", import.meta.url), "utf8");
  const uiSource = `${ownerPage}\n${adminPage}`;

  assert.equal(ownerPage.includes("cloudflareHostnameId"), false);
  assert.equal(uiSource.includes("CLOUDFLARE_API_TOKEN"), false);
  assert.equal(uiSource.includes("Authorization"), false);
  assert.equal(uiSource.includes("raw"), false);
});

test("owner email is redacted for admin display", () => {
  assert.equal(redactDomainOwnerEmail("owner@example.com"), "ow***@example.com");
  assert.equal(redactDomainOwnerEmail("invalid"), "oculto");
});
