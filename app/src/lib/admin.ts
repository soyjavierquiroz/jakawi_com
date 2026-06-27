import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";

type UserWithRole = {
  role?: string | null;
};

export function isSuperAdmin(user: UserWithRole | null | undefined) {
  return user?.role === "SUPER_ADMIN";
}

export async function requireSuperAdmin() {
  const user = await requireUser();
  if (!isSuperAdmin(user)) notFound();
  return user;
}
