import type { AuthTokenType } from "@prisma/client";
import { z } from "zod";
import { authTokenTypes, consumeAuthToken, createAuthToken, verifyAuthToken, type AuthTokenDb } from "@/lib/auth-tokens";
import { hashPassword } from "@/lib/auth";
import { sendEmailVerificationEmail, sendPasswordResetEmail } from "@/lib/email/email-service";
import { getPrisma } from "@/lib/prisma";

const emailSchema = z.string().email().transform((value) => value.toLowerCase().trim());
const passwordSchema = z.string().min(8);

export const passwordResetRequestedMessage = "Si el email esta registrado, enviaremos instrucciones para recuperar el acceso.";

type AccountUser = {
  id: string;
  email: string;
  emailVerifiedAt: Date | null;
};

type AccountDb = AuthTokenDb & {
  user: {
    findUnique(args: unknown): Promise<AccountUser | null>;
    update(args: unknown): Promise<AccountUser>;
  };
  session: {
    deleteMany(args: unknown): Promise<{ count: number }>;
  };
};

function accountDb(db?: AccountDb) {
  return db ?? (getPrisma() as unknown as AccountDb);
}

function safeEmailParse(email: string) {
  const parsed = emailSchema.safeParse(email);
  return parsed.success ? parsed.data : null;
}

function tokenError(status: string) {
  if (status === "expired") return "El link expiro. Solicita uno nuevo.";
  return "El link no es valido o ya fue usado.";
}

async function issueAccountToken(
  user: AccountUser,
  type: AuthTokenType,
  options: {
    db: AccountDb;
    now?: Date;
    token?: string;
  },
) {
  const token = await createAuthToken(user.id, type, { db: options.db, now: options.now, token: options.token });

  if (type === authTokenTypes.PASSWORD_RESET) {
    await sendPasswordResetEmail(user.email, token.token);
  } else {
    await sendEmailVerificationEmail(user.email, token.token);
  }

  return token;
}

export async function requestPasswordReset(
  email: string,
  options: {
    db?: AccountDb;
    now?: Date;
    token?: string;
  } = {},
) {
  const normalizedEmail = safeEmailParse(email);
  if (!normalizedEmail) return { ok: true as const, message: passwordResetRequestedMessage };

  const db = accountDb(options.db);
  const user = await db.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, email: true, emailVerifiedAt: true },
  });

  if (user) {
    await issueAccountToken(user, authTokenTypes.PASSWORD_RESET, { db, now: options.now, token: options.token });
  }

  return { ok: true as const, message: passwordResetRequestedMessage };
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string,
  options: {
    db?: AccountDb;
    now?: Date;
    hashPasswordFn?: typeof hashPassword;
  } = {},
) {
  const password = passwordSchema.safeParse(newPassword);
  if (!password.success) return { ok: false as const, error: "Usa un password de al menos 8 caracteres." };

  const db = accountDb(options.db);
  const consumed = await consumeAuthToken(token, authTokenTypes.PASSWORD_RESET, { db, now: options.now });
  if (!consumed.ok || !consumed.authToken?.user) return { ok: false as const, error: tokenError(consumed.status) };

  const passwordHash = await (options.hashPasswordFn ?? hashPassword)(password.data);
  await db.user.update({
    where: { id: consumed.authToken.userId },
    data: { passwordHash },
  });
  await db.session.deleteMany({ where: { userId: consumed.authToken.userId } });
  await db.authToken.updateMany({
    where: { userId: consumed.authToken.userId, type: authTokenTypes.PASSWORD_RESET, usedAt: null },
    data: { usedAt: options.now ?? new Date() },
  });

  return { ok: true as const };
}

export async function requestEmailVerificationForUser(
  userId: string,
  options: {
    db?: AccountDb;
    now?: Date;
    token?: string;
  } = {},
) {
  const db = accountDb(options.db);
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, emailVerifiedAt: true },
  });

  if (!user) return { ok: false as const, error: "Usuario no encontrado." };
  if (user.emailVerifiedAt) return { ok: true as const, status: "already_verified" as const };

  await issueAccountToken(user, authTokenTypes.EMAIL_VERIFY, { db, now: options.now, token: options.token });
  return { ok: true as const, status: "sent" as const };
}

export async function requestEmailVerificationByEmail(
  email: string,
  options: {
    db?: AccountDb;
    now?: Date;
    token?: string;
  } = {},
) {
  const normalizedEmail = safeEmailParse(email);
  if (!normalizedEmail) return { ok: true as const, status: "accepted" as const };

  const db = accountDb(options.db);
  const user = await db.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, email: true, emailVerifiedAt: true },
  });

  if (user && !user.emailVerifiedAt) {
    await issueAccountToken(user, authTokenTypes.EMAIL_VERIFY, { db, now: options.now, token: options.token });
  }

  return { ok: true as const, status: "accepted" as const };
}

export async function verifyEmailWithToken(
  token: string,
  options: {
    db?: AccountDb;
    now?: Date;
  } = {},
) {
  const db = accountDb(options.db);
  const inspected = await verifyAuthToken(token, authTokenTypes.EMAIL_VERIFY, { db, now: options.now });

  if (!inspected.ok) {
    if (inspected.authToken?.user?.emailVerifiedAt) {
      return { ok: true as const, status: "already_verified" as const };
    }
    return { ok: false as const, error: tokenError(inspected.status) };
  }

  if (inspected.authToken.user?.emailVerifiedAt) {
    await consumeAuthToken(token, authTokenTypes.EMAIL_VERIFY, { db, now: options.now });
    return { ok: true as const, status: "already_verified" as const };
  }

  const consumed = await consumeAuthToken(token, authTokenTypes.EMAIL_VERIFY, { db, now: options.now });
  if (!consumed.ok || !consumed.authToken?.user) return { ok: false as const, error: tokenError(consumed.status) };

  await db.user.update({
    where: { id: consumed.authToken.userId },
    data: { emailVerifiedAt: options.now ?? new Date() },
  });

  return { ok: true as const, status: "verified" as const };
}
