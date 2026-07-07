import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const algorithm = "aes-256-gcm";
const version = "v1";

export class EncryptionConfigError extends Error {
  constructor(message = "APP_ENCRYPTION_KEY is required and must decode to 32 bytes.") {
    super(message);
    this.name = "EncryptionConfigError";
  }
}

function decodeKey(rawKey = process.env.APP_ENCRYPTION_KEY) {
  const value = rawKey?.trim();
  if (!value) throw new EncryptionConfigError();

  const key = /^[a-f0-9]{64}$/i.test(value) ? Buffer.from(value, "hex") : Buffer.from(value, "base64");
  if (key.length !== 32) throw new EncryptionConfigError();
  return key;
}

export function isEncryptionConfigured(rawKey = process.env.APP_ENCRYPTION_KEY) {
  try {
    decodeKey(rawKey);
    return true;
  } catch {
    return false;
  }
}

export function encryptSecret(plainText: string, rawKey = process.env.APP_ENCRYPTION_KEY) {
  const value = plainText.trim();
  if (!value) throw new Error("Secret value is required.");

  const key = decodeKey(rawKey);
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [version, iv.toString("base64url"), authTag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptSecret(cipherText: string, rawKey = process.env.APP_ENCRYPTION_KEY) {
  const [cipherVersion, ivValue, authTagValue, encryptedValue] = cipherText.split(".");
  if (cipherVersion !== version || !ivValue || !authTagValue || !encryptedValue) throw new Error("Invalid encrypted secret.");

  const key = decodeKey(rawKey);
  const decipher = createDecipheriv(algorithm, key, Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(authTagValue, "base64url"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64url")), decipher.final()]);
  return decrypted.toString("utf8");
}
