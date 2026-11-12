import { redirect } from "next/navigation";
import { connection } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

/** Current user row, or null. Always read from the DB so bans and role changes apply immediately. */
export async function getCurrentUser() {
  // Who is signed in depends on the request, so never evaluate this at build time.
  await connection();
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await db.query.users.findFirst({ where: eq(users.id, session.user.id) });
  if (!user || user.isBanned) return null;
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  return user;
}
