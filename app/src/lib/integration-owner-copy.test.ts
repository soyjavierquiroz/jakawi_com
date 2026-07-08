import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ownerEncryptionStatusLabel,
  ownerEncryptionStatusText,
  ownerIntegrationReasonLabel,
  ownerPrivateTokenLabel,
  ownerServerEventsLabel,
} from "@/lib/integration-owner-copy";

const forbiddenOwnerTerms = ["APP_ENCRYPTION_KEY", "DATABASE_URL", "SESSION_SECRET", "accessTokenEncrypted", "access token", "secret"] as const;

function assertOwnerSafeCopy(value: string) {
  for (const term of forbiddenOwnerTerms) {
    assert.equal(value.toLowerCase().includes(term.toLowerCase()), false, `${value} should not expose ${term}`);
  }
}

test("owner integration copy uses safe encryption and server event messages", () => {
  const copy = [
    ownerEncryptionStatusLabel(false),
    ownerEncryptionStatusLabel(true),
    ownerEncryptionStatusText(false),
    ownerEncryptionStatusText(true),
    ownerServerEventsLabel(),
    ownerPrivateTokenLabel(),
    ownerIntegrationReasonLabel("global META_CAPI_ENABLED false"),
    ownerIntegrationReasonLabel("access token missing"),
  ];

  for (const value of copy) assertOwnerSafeCopy(value);

  assert.equal(copy.includes("Cifrado del servidor pendiente"), true);
  assert.equal(copy.includes("Eventos del servidor apagados por seguridad."), true);
  assert.equal(copy.includes("Token privado de eventos"), true);
});

test("owner integration reason labels do not return raw internal reasons", () => {
  const labels = [
    ownerIntegrationReasonLabel("access token missing"),
    ownerIntegrationReasonLabel("global META_CAPI_ENABLED false"),
    ownerIntegrationReasonLabel("unknown internal reason"),
  ];

  for (const label of labels) {
    assertOwnerSafeCopy(label);
    assert.equal(label.includes("access token"), false);
    assert.equal(label.includes("META_CAPI_ENABLED"), false);
    assert.equal(label.includes("internal"), false);
  }
});
