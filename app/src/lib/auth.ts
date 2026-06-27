import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { compare, hash } from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { getPrisma } from "@/lib/prisma";

const sessionDays = 30;

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string) {
  return hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000);

  await getPrisma().session.create({
    data: { userId, tokenHash, expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(process.env.SESSION_COOKIE_NAME ?? "jakawi_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const cookieName = process.env.SESSION_COOKIE_NAME ?? "jakawi_session";
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;

  if (token) {
    await getPrisma().session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }

  cookieStore.delete(cookieName);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(process.env.SESSION_COOKIE_NAME ?? "jakawi_session")?.value;
  if (!token) return null;

  const session = await getPrisma().session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { include: { stores: { orderBy: { createdAt: "asc" }, take: 1 } } } },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) await getPrisma().session.delete({ where: { id: session.id } });
    return null;
  }

  return session.user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireStore() {
  const user = await requireUser();
  const store = await getPrisma().store.findFirst({
    where: { ownerId: user.id },
    include: { categories: { orderBy: { name: "asc" } } },
  });

  if (!store) redirect("/app/tienda");
  return { user, store };
}
