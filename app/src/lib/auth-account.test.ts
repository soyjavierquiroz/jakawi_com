import test from "node:test";
import assert from "node:assert/strict";
import { authTokenTypes, consumeAuthToken, createAuthToken, hashAuthToken } from "./auth-tokens";
import {
  requestEmailVerificationForUser,
  requestPasswordReset,
  resetPasswordWithToken,
  verifyEmailWithToken,
  passwordResetRequestedMessage,
} from "./auth-account";
import { sendAuthEmail } from "./email/email-service";

type UserRecord = {
  id: string;
  email: string;
  emailVerifiedAt: Date | null;
  passwordHash: string;
};

type TokenRecord = {
  id: string;
  userId: string;
  type: "PASSWORD_RESET" | "EMAIL_VERIFY";
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
  user?: UserRecord;
};

class FakeDb {
  users: UserRecord[] = [];
  tokens: TokenRecord[] = [];
  sessions: Array<{ id: string; userId: string }> = [];
  private nextTokenId = 1;

  user = {
    findUnique: async (args: { where: { id?: string; email?: string } }) => {
      return this.users.find((user) => user.id === args.where.id || user.email === args.where.email) ?? null;
    },
    update: async (args: { where: { id: string }; data: Partial<UserRecord> }) => {
      const user = this.users.find((row) => row.id === args.where.id);
      if (!user) throw new Error("user not found");
      Object.assign(user, args.data);
      return user;
    },
  };

  authToken = {
    create: async (args: { data: Omit<TokenRecord, "id" | "createdAt" | "usedAt"> & { usedAt?: Date | null } }) => {
      const token: TokenRecord = {
        ...args.data,
        id: `token-${this.nextTokenId++}`,
        usedAt: args.data.usedAt ?? null,
        createdAt: new Date("2026-07-03T00:00:00.000Z"),
      };
      this.tokens.push(token);
      return token;
    },
    findUnique: async (args: { where: { tokenHash: string } }) => {
      const token = this.tokens.find((row) => row.tokenHash === args.where.tokenHash);
      if (!token) return null;
      return { ...token, user: this.users.find((user) => user.id === token.userId) };
    },
    updateMany: async (args: {
      where: Partial<TokenRecord> & { expiresAt?: { gt: Date } };
      data: Partial<TokenRecord>;
    }) => {
      let count = 0;
      for (const token of this.tokens) {
        if (args.where.id && token.id !== args.where.id) continue;
        if (args.where.userId && token.userId !== args.where.userId) continue;
        if (args.where.type && token.type !== args.where.type) continue;
        if (args.where.tokenHash && token.tokenHash !== args.where.tokenHash) continue;
        if ("usedAt" in args.where && token.usedAt !== args.where.usedAt) continue;
        if (args.where.expiresAt?.gt && token.expiresAt <= args.where.expiresAt.gt) continue;
        Object.assign(token, args.data);
        count += 1;
      }
      return { count };
    },
  };

  session = {
    deleteMany: async (args: { where: { userId: string } }) => {
      const before = this.sessions.length;
      this.sessions = this.sessions.filter((session) => session.userId !== args.where.userId);
      return { count: before - this.sessions.length };
    },
  };
}

function fakeDb() {
  const db = new FakeDb();
  db.users.push({
    id: "user-1",
    email: "owner@example.com",
    emailVerifiedAt: null,
    passwordHash: "old-hash",
  });
  db.sessions.push({ id: "session-1", userId: "user-1" });
  return db;
}

test("auth token stores hash, not plaintext", async () => {
  const db = fakeDb();
  await createAuthToken("user-1", authTokenTypes.PASSWORD_RESET, { db: db as never, token: "plain-token" });

  assert.equal(db.tokens[0].tokenHash, hashAuthToken("plain-token"));
  assert.notEqual(db.tokens[0].tokenHash, "plain-token");
});

test("expired auth token is rejected", async () => {
  const db = fakeDb();
  await createAuthToken("user-1", authTokenTypes.PASSWORD_RESET, {
    db: db as never,
    token: "expired-token",
    expiresAt: new Date("2026-07-03T00:00:00.000Z"),
  });

  const result = await consumeAuthToken("expired-token", authTokenTypes.PASSWORD_RESET, {
    db: db as never,
    now: new Date("2026-07-03T00:01:00.000Z"),
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, "expired");
});

test("consumed auth token cannot be reused", async () => {
  const db = fakeDb();
  await createAuthToken("user-1", authTokenTypes.PASSWORD_RESET, { db: db as never, token: "single-use-token" });

  const first = await consumeAuthToken("single-use-token", authTokenTypes.PASSWORD_RESET, { db: db as never });
  const second = await consumeAuthToken("single-use-token", authTokenTypes.PASSWORD_RESET, { db: db as never });

  assert.equal(first.ok, true);
  assert.equal(second.ok, false);
  assert.equal(second.status, "used");
});

test("password reset request does not reveal missing email", async () => {
  const db = fakeDb();
  const result = await requestPasswordReset("missing@example.com", { db: db as never });

  assert.equal(result.ok, true);
  assert.equal(result.message, passwordResetRequestedMessage);
  assert.equal(db.tokens.length, 0);
});

test("password reset request uses email service without revealing user existence", async () => {
  const db = fakeDb();
  const sent: Array<{ to: string; token: string }> = [];
  const emailSender = {
    sendPasswordResetEmail: async (to: string, token: string) => {
      sent.push({ to, token });
      return { sent: false, mode: "disabled" as const };
    },
  };

  const existing = await requestPasswordReset("owner@example.com", { db: db as never, emailSender, token: "reset-token" });
  const missing = await requestPasswordReset("missing@example.com", { db: db as never, emailSender, token: "missing-token" });

  assert.equal(existing.ok, true);
  assert.equal(existing.message, passwordResetRequestedMessage);
  assert.equal(missing.ok, true);
  assert.equal(missing.message, passwordResetRequestedMessage);
  assert.deepEqual(sent, [{ to: "owner@example.com", token: "reset-token" }]);
});

test("password reset changes hash and invalidates sessions", async () => {
  const db = fakeDb();
  await createAuthToken("user-1", authTokenTypes.PASSWORD_RESET, { db: db as never, token: "reset-token" });

  const result = await resetPasswordWithToken("reset-token", "NewPassword2026!", {
    db: db as never,
    hashPasswordFn: async () => "new-hash",
  });

  assert.equal(result.ok, true);
  assert.equal(db.users[0].passwordHash, "new-hash");
  assert.equal(db.sessions.length, 0);
});

test("email verification marks emailVerifiedAt", async () => {
  const db = fakeDb();
  const now = new Date("2026-07-03T01:00:00.000Z");
  await createAuthToken("user-1", authTokenTypes.EMAIL_VERIFY, { db: db as never, token: "verify-token" });

  const result = await verifyEmailWithToken("verify-token", { db: db as never, now });

  assert.equal(result.ok, true);
  assert.equal(db.users[0].emailVerifiedAt?.toISOString(), now.toISOString());
});

test("email verification request uses email service", async () => {
  const db = fakeDb();
  const sent: Array<{ to: string; token: string }> = [];
  const result = await requestEmailVerificationForUser("user-1", {
    db: db as never,
    token: "verify-token",
    emailSender: {
      sendEmailVerificationEmail: async (to: string, token: string) => {
        sent.push({ to, token });
        return { sent: false, mode: "disabled" as const };
      },
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "sent");
  assert.deepEqual(sent, [{ to: "owner@example.com", token: "verify-token" }]);
});

test("disabled auth email adapter does not send or log full token", async () => {
  const entries: unknown[] = [];
  const result = await sendAuthEmail(
    { kind: "password_reset", to: "owner@example.com", token: "secret-token" },
    { mode: "disabled", logger: { info: (...args: unknown[]) => entries.push(args), warn: (...args: unknown[]) => entries.push(args) } },
  );

  assert.equal(result.sent, false);
  assert.equal(result.reason, "disabled");
  assert.equal(JSON.stringify(entries).includes("secret-token"), false);
});
