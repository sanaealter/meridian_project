/**
 * Development seed: a few fake mappers, services, orders and reviews so pages aren't empty.
 * Run with `npm run db:seed`. Refuses to run when NODE_ENV=production.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/db/schema";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to seed a production database.");
  process.exit(1);
}

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client, { schema });
const { users, services, orders, reviews } = schema;

async function main() {
  const existing = await db.query.users.findFirst();
  if (existing) {
    console.log("Database already has users, skipping seed.");
    return;
  }

  const [ayla, kenji, mira, buyer] = await db
    .insert(users)
    .values([
      { username: "ayla_maps", name: "ayla_maps", osuId: 900001, countryCode: "EE", playmode: "osu", rankedMapsets: 14, lovedMapsets: 2, globalRank: 18234, pp: 7120, isVerified: true, bio: "Ranked mapper since 2019. Mostly J-pop and anisong, clean and readable patterns." },
      { username: "kenji_taiko", name: "kenji_taiko", osuId: 900002, countryCode: "JP", playmode: "taiko", rankedMapsets: 22, lovedMapsets: 0, globalRank: 4120, pp: 6040, isVerified: true, bio: "Taiko spreads from Kantan to Inner Oni." },
      { username: "mira_mania", name: "mira_mania", osuId: 900003, countryCode: "DE", playmode: "mania", rankedMapsets: 3, lovedMapsets: 1, globalRank: 52011, pp: 3900, bio: "4K and 7K, focused on rice and LN sets." },
      { username: "test_buyer", name: "test_buyer", osuId: 900004, countryCode: "US", playmode: "osu", rankedMapsets: 0, globalRank: 120440, pp: 2100 },
    ])
    .returning();

  const [s1, s2, s3] = await db
    .insert(services)
    .values([
      { sellerId: ayla.id, title: "Full ranked-quality osu! mapset", description: "A full spread from Normal to Extra, mapped to the Ranking Criteria. Includes hitsounds and two rounds of revisions.", mode: "osu", priceCents: 1500, pricingUnit: "per_minute", deliveryDays: 21 },
      { sellerId: kenji.id, title: "Taiko difficulty for your set", description: "One taiko difficulty for an existing mapset, any star rating up to Inner Oni. One round of revisions.", mode: "taiko", priceCents: 2500, pricingUnit: "per_difficulty", deliveryDays: 10 },
      { sellerId: mira.id, title: "4K mania chart", description: "A 4K chart of your song, rice or hybrid. Tell me the target star rating.", mode: "mania", priceCents: 3000, pricingUnit: "fixed", deliveryDays: 14 },
    ])
    .returning();

  const [o1, o2] = await db
    .insert(orders)
    .values([
      { serviceId: s1.id, buyerId: buyer.id, sellerId: ayla.id, status: "completed", brief: "Map a 2:30 TV size anime opening, Normal to Insane.", priceCents: 3750, feeCents: 188, completedAt: new Date() },
      { serviceId: s2.id, buyerId: buyer.id, sellerId: kenji.id, status: "completed", brief: "Oni difficulty for my set, around 5 stars.", priceCents: 2500, feeCents: 125, completedAt: new Date() },
      { serviceId: s3.id, buyerId: buyer.id, sellerId: mira.id, status: "in_progress", brief: "4K hybrid chart, target 4.5 stars.", priceCents: 3000, feeCents: 150 },
    ])
    .returning();

  await db.insert(reviews).values([
    { orderId: o1.id, serviceId: s1.id, sellerId: ayla.id, authorId: buyer.id, rating: 5, body: "Delivered a week early and fixed everything I asked for." },
    { orderId: o2.id, serviceId: s2.id, sellerId: kenji.id, authorId: buyer.id, rating: 4, body: "Great patterns, a bit slow to reply on Discord." },
  ]);

  console.log("Seeded 4 users, 3 services, 3 orders and 2 reviews.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => client.end());
