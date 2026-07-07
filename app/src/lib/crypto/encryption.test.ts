import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import { decryptSecret, encryptSecret, EncryptionConfigError, isEncryptionConfigured } from "@/lib/crypto/encryption";

function testKey() {
  return randomBytes(32).toString("base64");
}

test("encryptSecret and decryptSecret round-trip with a 32 byte base64 key", () => {
  const key = testKey();
  const plainText = "meta-access-token-example";
  const encrypted = encryptSecret(plainText, key);

  assert.notEqual(encrypted, plainText);
  assert.equal(encrypted.includes(plainText), false);
  assert.equal(decryptSecret(encrypted, key), plainText);
});

test("encryption helper rejects missing or invalid APP_ENCRYPTION_KEY", () => {
  assert.equal(isEncryptionConfigured(""), false);
  assert.equal(isEncryptionConfigured("not-a-32-byte-key"), false);
  assert.throws(() => encryptSecret("token", ""), EncryptionConfigError);
});
