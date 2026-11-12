import { and, avg, count, desc, eq, sql, sum } from "drizzle-orm";
import { db } from "@/db";
import { orders, reviews, services, users } from "@/db/schema";

/** Public marketplace numbers for one seller. Derived from real orders and reviews only. */
export async function sellerStats(sellerId: string) {
  const [r] = await db
    .select({ avg: avg(reviews.rating), n: count() })
    .from(reviews)
    .where(and(eq(reviews.sellerId, sellerId), eq(reviews.isHidden, false)));
  const [o] = await db
    .select({
      completed: sql<number>`count(*) filter (where ${orders.status} = 'completed')`.mapWith(Number),
      cancelled: sql<number>`count(*) filter (where ${orders.status} = 'cancelled')`.mapWith(Number),
      active: sql<number>`count(*) filter (where ${orders.status} in ('accepted','in_progress','delivered'))`.mapWith(Number),
    })
    .from(orders)
    .where(eq(orders.sellerId, sellerId));
  return {
    avgRating: r.avg == null ? null : Number(r.avg),
    reviewCount: r.n,
    completed: o.completed,
    cancelled: o.cancelled,
    active: o.active,
  };
}

/** Platform-wide statistics shown on /stats and the landing page. */
export async function platformStats() {
  const [s] = await db
    .select({
      sellers: sql<number>`count(distinct ${services.sellerId})`.mapWith(Number),
      services: count(),
    })
    .from(services)
    .where(eq(services.status, "active"));
  const [o] = await db
    .select({
      completed: sql<number>`count(*) filter (where ${orders.status} = 'completed')`.mapWith(Number),
      disputed: sql<number>`count(*) filter (where ${orders.status} = 'disputed')`.mapWith(Number),
      total: count(),
      volume: sum(sql`case when ${orders.status} = 'completed' then ${orders.priceCents} else 0 end`).mapWith(Number),
      fees: sum(sql`case when ${orders.status} = 'completed' then ${orders.feeCents} else 0 end`).mapWith(Number),
    })
    .from(orders);
  const [r] = await db
    .select({ avg: avg(reviews.rating), n: count() })
    .from(reviews)
    .where(eq(reviews.isHidden, false));
  const [u] = await db.select({ n: count() }).from(users);
  return {
    sellers: s.sellers,
    services: s.services,
    users: u.n,
    ordersTotal: o.total,
    ordersCompleted: o.completed,
    ordersDisputed: o.disputed,
    volumeCents: o.volume ?? 0,
    feesCents: o.fees ?? 0,
    avgRating: r.avg == null ? null : Number(r.avg),
    reviews: r.n,
  };
}

/** Active services with seller info and rating, for the catalog. */
export async function listServices(opts: { mode?: string; verifiedOnly?: boolean; limit?: number } = {}) {
  const ratings = db
    .select({
      serviceId: reviews.serviceId,
      avg: avg(reviews.rating).as("avg"),
      n: count().as("n"),
    })
    .from(reviews)
    .where(eq(reviews.isHidden, false))
    .groupBy(reviews.serviceId)
    .as("ratings");

  const conditions = [eq(services.status, "active"), eq(users.isBanned, false)];
  if (opts.mode && ["osu", "taiko", "fruits", "mania"].includes(opts.mode)) {
    conditions.push(eq(services.mode, opts.mode as "osu"));
  }
  if (opts.verifiedOnly) conditions.push(eq(users.isVerified, true));

  const rows = await db
    .select({
      service: services,
      seller: {
        id: users.id,
        username: users.username,
        image: users.image,
        countryCode: users.countryCode,
        isVerified: users.isVerified,
        rankedMapsets: users.rankedMapsets,
      },
      avgRating: ratings.avg,
      reviewCount: ratings.n,
    })
    .from(services)
    .innerJoin(users, eq(services.sellerId, users.id))
    .leftJoin(ratings, eq(ratings.serviceId, services.id))
    .where(and(...conditions))
    .orderBy(desc(users.isVerified), desc(services.createdAt))
    .limit(opts.limit ?? 100);

  return rows.map((r) => ({
    ...r,
    avgRating: r.avgRating == null ? null : Number(r.avgRating),
    reviewCount: Number(r.reviewCount ?? 0),
  }));
}
