import type { AuthTokenType } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
import { getPrisma } from "@/lib/prisma";

export const authTokenTypes = {
  PASSWORD_RESET: "PASSWORD_RESET",
  EMAIL_VERIFY: "EMAIL_VERIFY",
} as const satisfies Record<AuthTokenType, AuthTokenType>;

const tokenTtlMs: Record<AuthTokenType, number> = {
  PASSWORD_RESET: 30 * 60 * 1000,
  EMAIL_VERIFY: 24 * 60 * 60 * 1000,
};

export type AuthTokenUser = {
  id: string;
  email: string;
  emailVerifiedAt: Date | null;
  passwordHash?: string;
};

export type AuthTokenRecord = {
  id: string;
  userId: string;
  type: AuthTokenType;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt?: Date;
  user?: AuthTokenUser;
};

type AuthTokenModel = {
  create(args: unknown): Promise<AuthTokenRecord>;
  findUnique(args: unknown): Promise<AuthTokenRecord | null>;
  updateMany(args: unknown): Promise<{ count: number }>;
};

export type AuthTokenDb = {
  authToken: AuthTokenModel;
};

function authTokenDb(db?: AuthTokenDb) {
  return db ?? (getPrisma() as unknown as AuthTokenDb);
}

export function hashAuthToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createPlainAuthToken() {
  return randomBytes(32).toString("base64url");
}

export async function createAuthToken(
  userId: string,
  type: AuthTokenType,
  options: {
    db?: AuthTokenDb;
    now?: Date;
    token?: string;
    expiresAt?: Date;
  } = {},
) {
  const db = authTokenDb(options.db);
  const now = options.now ?? new Date();
  const token = options.token ?? createPlainAuthToken();
  const tokenHash = hashAuthToken(token);
  const expiresAt = options.expiresAt ?? new Date(now.getTime() + tokenTtlMs[type]);

  await db.authToken.updateMany({
    where: { userId, type, usedAt: null },
    data: { usedAt: now },
  });

  await db.authToken.create({
    data: { userId, type, tokenHash, expiresAt },
  });

  return { token, tokenHash, expiresAt };
}

export async function verifyAuthToken(
  token: string,
  type: AuthTokenType,
  options: {
    db?: AuthTokenDb;
    now?: Date;
  } = {},
) {
  const db = authTokenDb(options.db);
  const now = options.now ?? new Date();
  const tokenHash = hashAuthToken(token);
  const authToken = await db.authToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, email: true, emailVerifiedAt: true, passwordHash: true } } },
  });

  if (!authToken || authToken.type !== type) return { ok: false as const, status: "invalid" as const, authToken: null };
  if (authToken.usedAt) return { ok: false as const, status: "used" as const, authToken };
  if (authToken.expiresAt <= now) return { ok: false as const, status: "expired" as const, authToken };
  return { ok: true as const, status: "valid" as const, authToken };
}

export async function consumeAuthToken(
  token: string,
  type: AuthTokenType,
  options: {
    db?: AuthTokenDb;
    now?: Date;
  } = {},
) {
  const db = authTokenDb(options.db);
  const now = options.now ?? new Date();
  const verification = await verifyAuthToken(token, type, { db, now });

  if (!verification.ok) return verification;

  const consumed = await db.authToken.updateMany({
    where: {
      id: verification.authToken.id,
      type,
      tokenHash: verification.authToken.tokenHash,
      usedAt: null,
      expiresAt: { gt: now },
    },
    data: { usedAt: now },
  });

  if (consumed.count !== 1) {
    return { ok: false as const, status: "used" as const, authToken: verification.authToken };
  }

  return { ok: true as const, status: "consumed" as const, authToken: { ...verification.authToken, usedAt: now } };
}
