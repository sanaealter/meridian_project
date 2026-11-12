"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { orders, reviews, services, users, type OrderStatus } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { feeFor } from "@/lib/format";

/* ---------- Profile ---------- */

const profileSchema = z.object({
  bio: z.string().trim().max(1500),
  discordHandle: z.string().trim().max(64),
});

export async function updateProfile(formData: FormData) {
  const user = await requireUser();
  const data = profileSchema.parse(Object.fromEntries(formData));
  await db
    .update(users)
    .set({ bio: data.bio || null, discordHandle: data.discordHandle || null })
    .where(eq(users.id, user.id));
  revalidatePath(`/u/${user.username}`);
  redirect(`/u/${user.username}`);
}

/* ---------- Services ---------- */

const serviceSchema = z.object({
  title: z.string().trim().min(4).max(100),
  description: z.string().trim().min(20).max(4000),
  mode: z.enum(["osu", "taiko", "fruits", "mania"]),
  price: z.coerce.number().min(1).max(5000),
  pricingUnit: z.enum(["per_minute", "per_difficulty", "fixed"]),
  deliveryDays: z.coerce.number().int().min(1).max(180),
  status: z.enum(["active", "paused"]).default("active"),
});

function parseService(formData: FormData) {
  const d = serviceSchema.parse(Object.fromEntries(formData));
  const { price, ...rest } = d;
  return { ...rest, priceCents: Math.round(price * 100) };
}

export async function createService(formData: FormData) {
  const user = await requireUser();
  const values = parseService(formData);
  const [s] = await db.insert(services).values({ ...values, sellerId: user.id }).returning({ id: services.id });
  revalidatePath("/sellers");
  redirect(`/services/${s.id}`);
}

export async function updateService(serviceId: string, formData: FormData) {
  const user = await requireUser();
  const values = parseService(formData);
  await db
    .update(services)
    .set({ ...values, updatedAt: new Date() })
    .where(and(eq(services.id, serviceId), eq(services.sellerId, user.id)));
  revalidatePath("/sellers");
  redirect(`/services/${serviceId}`);
}

/* ---------- Orders ---------- */

const orderSchema = z.object({
  brief: z.string().trim().min(20).max(4000),
  songUrl: z.union([z.literal(""), z.string().trim().url().max(500)]),
});

export async function createOrder(serviceId: string, formData: FormData) {
  const user = await requireUser();
  const service = await db.query.services.findFirst({ where: eq(services.id, serviceId) });
  if (!service || service.status !== "active") throw new Error("This service is not taking orders.");
  if (service.sellerId === user.id) throw new Error("You cannot order your own service.");

  const data = orderSchema.parse(Object.fromEntries(formData));
  // Starting price is the listed price; the seller confirms the final price when accepting.
  const [o] = await db
    .insert(orders)
    .values({
      serviceId,
      buyerId: user.id,
      sellerId: service.sellerId,
      brief: data.brief,
      songUrl: data.songUrl || null,
      priceCents: service.priceCents,
      feeCents: feeFor(service.priceCents),
    })
    .returning({ id: orders.id });
  redirect(`/orders/${o.id}`);
}

type Actor = "buyer" | "seller";

/** Allowed status changes: [from, to, who may do it]. Anything else is rejected. */
const transitions: [OrderStatus, OrderStatus, Actor][] = [
  ["requested", "accepted", "seller"],
  ["requested", "cancelled", "seller"],
  ["requested", "cancelled", "buyer"],
  ["accepted", "cancelled", "buyer"],
  ["accepted", "cancelled", "seller"],
  ["accepted", "in_progress", "buyer"], // payment step (stubbed: no real money moves yet)
  ["in_progress", "delivered", "seller"],
  ["in_progress", "disputed", "buyer"],
  ["delivered", "completed", "buyer"],
  ["delivered", "in_progress", "buyer"], // request revisions
  ["delivered", "disputed", "buyer"],
];

const transitionSchema = z.object({
  to: z.enum(["accepted", "cancelled", "in_progress", "delivered", "completed", "disputed"]),
  price: z.coerce.number().min(1).max(10000).optional(),
  deliveryUrl: z.string().trim().url().max(500).optional(),
});

export async function changeOrderStatus(orderId: string, formData: FormData) {
  const user = await requireUser();
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order) throw new Error("Order not found.");

  const actor: Actor | null = order.buyerId === user.id ? "buyer" : order.sellerId === user.id ? "seller" : null;
  if (!actor) throw new Error("You are not part of this order.");

  const input = transitionSchema.parse({
    to: formData.get("to"),
    price: formData.get("price") || undefined,
    deliveryUrl: formData.get("deliveryUrl") || undefined,
  });
  const allowed = transitions.some(([from, to, who]) => from === order.status && to === input.to && who === actor);
  if (!allowed) throw new Error(`Cannot move an order from ${order.status} to ${input.to}.`);

  const patch: Partial<typeof orders.$inferInsert> = { status: input.to, updatedAt: new Date() };
  if (input.to === "accepted" && input.price) {
    patch.priceCents = Math.round(input.price * 100);
    patch.feeCents = feeFor(patch.priceCents);
  }
  if (input.to === "delivered") {
    if (!input.deliveryUrl) throw new Error("Add a link to the delivered map.");
    patch.deliveryUrl = input.deliveryUrl;
  }
  if (input.to === "completed") patch.completedAt = new Date();

  await db.update(orders).set(patch).where(eq(orders.id, orderId));
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/dashboard");
}

/* ---------- Reviews ---------- */

const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().trim().min(10).max(2000),
});

export async function createReview(orderId: string, formData: FormData) {
  const user = await requireUser();
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order || order.buyerId !== user.id) throw new Error("Only the buyer can review this order.");
  if (order.status !== "completed") throw new Error("You can review an order once it is completed.");

  const data = reviewSchema.parse(Object.fromEntries(formData));
  await db
    .insert(reviews)
    .values({
      orderId,
      serviceId: order.serviceId,
      sellerId: order.sellerId,
      authorId: user.id,
      rating: data.rating,
      body: data.body,
    })
    .onConflictDoNothing();
  revalidatePath(`/orders/${orderId}`);
}
