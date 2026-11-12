import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";

/**
 * Development only: sign in as any existing user without osu!, to test both sides of an order.
 * Works only when NODE_ENV is "development" AND DEV_LOGIN=true. Never enable in production.
 * Usage: /api/dev-login?user=test_buyer
 */
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== "development" || process.env.DEV_LOGIN !== "true") {
    return new NextResponse("Not found", { status: 404 });
  }
  const username = req.nextUrl.searchParams.get("user");
  if (!username) return new NextResponse("Add ?user=<username>", { status: 400 });

  const user = await db.query.users.findFirst({ where: eq(users.username, username) });
  if (!user) return new NextResponse(`No user named ${username}`, { status: 404 });

  const sessionToken = crypto.randomUUID();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ sessionToken, userId: user.id, expires });

  const res = NextResponse.redirect(new URL("/dashboard", req.url));
  res.cookies.set("authjs.session-token", sessionToken, { httpOnly: true, sameSite: "lax", path: "/", expires });
  return res;
}
