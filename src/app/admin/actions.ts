"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { count, eq, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { orders, reviews, services, users } from "@/db/schema";
import { requireAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { feeFor } from "@/lib/format";

const optInt = z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.number().int().min(0).nullable());
const optNum = z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.number().min(0).nullable());
const optStr = (max: number) => z.preprocess((v) => (v === "" ? null : v), z.string().trim().max(max).nullable());

/* ---------- Users ---------- */

const userSchema = z.object({
  username: z.string().trim().min(1).max(32),
  bio: optStr(1500),
  discordHandle: optStr(64),
  countryCode: optStr(2),
  globalRank: optInt,
  pp: optNum,
  rankedMapsets: z.coerce.number().int().min(0),
  lovedMapsets: z.coerce.number().int().min(0),
  role: z.enum(["user", "admin"]),
  isVerified: z.coerce.boolean(),
  isBanned: z.coerce.boolean(),
});

export async function adminUpdateUser(userId: string, formData: FormData) {
  const admin = await requireAdmin();
  const data = userSchema.parse({
    ...Object.fromEntries(formData),
    isVerified: formData.get("isVerified") === "on",
    isBanned: formData.get("isBanned") === "on",
  });
  if (userId === admin.id && (data.role !== "admin" || data.isBanned)) {
    throw new Error("You cannot remove your own admin role or ban yourself.");
  }
  const before = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!before) throw new Error("User not found.");

  await db.update(users).set(data).where(eq(users.id, userId));

  // Record only the fields that changed.
  const changes: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    const old = before[k as keyof typeof before];
    if (old !== v) changes[k] = { from: old, to: v };
  }
  if (data.isBanned && !before.isBanned) {
    // Pause the user's services so nobody can order from a banned account.
    await db.update(services).set({ status: "paused" }).where(eq(services.sellerId, userId));
  }
  await audit(admin.id, "user.update", "user", userId, changes);
  revalidatePath("/", "layout");
  redirect(`/admin/users/${userId}?saved=1`);
}

export async function adminDeleteUser(userId: string) {
  const admin = await requireAdmin();
  if (userId === admin.id) throw new Error("You cannot delete your own account here.");
  const [{ n }] = await db
    .select({ n: count() })
    .from(orders)
    .where(or(eq(orders.buyerId, userId), eq(orders.sellerId, userId)));
  if (n > 0) {
    redirect(`/admin/users/${userId}?error=has-orders`);
  }
  const before = await db.query.users.findFirst({ where: eq(users.id, userId) });
  await db.delete(users).where(eq(users.id, userId));
  await audit(admin.id, "user.delete", "user", userId, { username: before?.username });
  revalidatePath("/", "layout");
  redirect("/admin/users");
}

/* ---------- Services ---------- */

const adminServiceSchema = z.object({
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(4000),
  price: z.coerce.number().min(0).max(10000),
  deliveryDays: z.coerce.number().int().min(1).max(365),
  status: z.enum(["active", "paused", "removed"]),
});

export async function adminUpdateService(serviceId: string, formData: FormData) {
  const admin = await requireAdmin();
  const { price, ...rest } = adminServiceSchema.parse(Object.fromEntries(formData));
  await db
    .update(services)
    .set({ ...rest, priceCents: Math.round(price * 100), updatedAt: new Date() })
    .where(eq(services.id, serviceId));
  await audit(admin.id, "service.update", "service", serviceId, { ...rest, price });
  revalidatePath("/", "layout");
  redirect("/admin/services?saved=1");
}

export async function adminDeleteService(serviceId: string) {
  const admin = await requireAdmin();
  const [{ n }] = await db.select({ n: count() }).from(orders).where(eq(orders.serviceId, serviceId));
  if (n > 0) {
    // Orders keep a reference to the service, so it is hidden instead of deleted.
    await db.update(services).set({ status: "removed" }).where(eq(services.id, serviceId));
    await audit(admin.id, "service.remove", "service", serviceId, { reason: "has orders, soft-removed" });
  } else {
    await db.delete(services).where(eq(services.id, serviceId));
    await audit(admin.id, "service.delete", "service", serviceId);
  }
  revalidatePath("/", "layout");
  redirect("/admin/services");
}

/* ---------- Reviews ---------- */

const adminReviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().trim().min(1).max(2000),
});

export async function adminUpdateReview(reviewId: string, formData: FormData) {
  const admin = await requireAdmin();
  const data = adminReviewSchema.parse(Object.fromEntries(formData));
  await db.update(reviews).set(data).where(eq(reviews.id, reviewId));
  await audit(admin.id, "review.edit", "review", reviewId, data);
  revalidatePath("/", "layout");
}

export async function adminToggleReview(reviewId: string, hidden: boolean) {
  const admin = await requireAdmin();
  await db.update(reviews).set({ isHidden: hidden }).where(eq(reviews.id, reviewId));
  await audit(admin.id, hidden ? "review.hide" : "review.unhide", "review", reviewId);
  revalidatePath("/", "layout");
}

export async function adminDeleteReview(reviewId: string) {
  const admin = await requireAdmin();
  const before = await db.query.reviews.findFirst({ where: eq(reviews.id, reviewId) });
  await db.delete(reviews).where(eq(reviews.id, reviewId));
  await audit(admin.id, "review.delete", "review", reviewId, before ? { rating: before.rating, body: before.body } : {});
  revalidatePath("/", "layout");
}

/* ---------- Orders ---------- */

const adminOrderSchema = z.object({
  status: z.enum(["requested", "accepted", "in_progress", "delivered", "completed", "cancelled", "disputed"]),
  price: z.coerce.number().min(0).max(10000),
  note: z.string().trim().max(500).optional(),
});

/** Staff can set any status, e.g. to resolve a dispute. The reason is stored in the audit log. */
export async function adminUpdateOrder(orderId: string, formData: FormData) {
  const admin = await requireAdmin();
  const data = adminOrderSchema.parse(Object.fromEntries(formData));
  const before = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!before) throw new Error("Order not found.");
  const priceCents = Math.round(data.price * 100);
  await db
    .update(orders)
    .set({
      status: data.status,
      priceCents,
      feeCents: feeFor(priceCents),
      updatedAt: new Date(),
      completedAt: data.status === "completed" ? (before.completedAt ?? new Date()) : null,
    })
    .where(eq(orders.id, orderId));
  await audit(admin.id, "order.update", "order", orderId, {
    status: { from: before.status, to: data.status },
    priceCents: { from: before.priceCents, to: priceCents },
    note: data.note,
  });
  revalidatePath("/", "layout");
}
