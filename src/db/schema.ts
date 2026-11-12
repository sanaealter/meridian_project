import {
  boolean,
  double,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import type { AdapterAccountType } from "next-auth/adapters";

/* ---------- Shared value lists ---------- */
// MySQL enums are defined per column, so the allowed values live in these arrays.

export const GAME_MODES = ["osu", "taiko", "fruits", "mania"] as const;
export const PRICING_UNITS = ["per_minute", "per_difficulty", "fixed"] as const;
export const SERVICE_STATUSES = ["active", "paused", "removed"] as const;
export const ORDER_STATUSES = [
  "requested", // buyer sent a request, seller has not answered
  "accepted", // seller accepted, waiting for payment (payments not wired yet)
  "in_progress", // paid / held in escrow, seller is mapping
  "delivered", // seller delivered, buyer reviews the work
  "completed", // buyer approved, funds released
  "cancelled",
  "disputed", // escalated to Meridian staff
] as const;

const id = () =>
  varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const ref = (name: string) => varchar(name, { length: 36 });
const createdAt = () => timestamp("created_at", { mode: "date" }).defaultNow().notNull();

/* ---------- Auth.js tables (shape required by @auth/drizzle-adapter) ---------- */

export const users = mysqlTable("user", {
  id: id(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).unique(),
  emailVerified: timestamp("emailVerified", { mode: "date", fsp: 3 }),
  image: varchar("image", { length: 512 }),

  // osu! data, refreshed on every sign-in
  osuId: int("osu_id").unique(),
  username: varchar("username", { length: 64 }).unique(),
  countryCode: varchar("country_code", { length: 2 }),
  playmode: mysqlEnum("playmode", GAME_MODES),
  globalRank: int("global_rank"),
  pp: double("pp"),
  rankedMapsets: int("ranked_mapsets").default(0).notNull(),
  lovedMapsets: int("loved_mapsets").default(0).notNull(),
  osuSyncedAt: timestamp("osu_synced_at", { mode: "date" }),

  // Meridian profile
  bio: text("bio"),
  discordHandle: varchar("discord_handle", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  isVerified: boolean("is_verified").default(false).notNull(), // "Meridian Member" badge
  isBanned: boolean("is_banned").default(false).notNull(),
  createdAt: createdAt(),
});

export const accounts = mysqlTable(
  "account",
  {
    userId: ref("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 255 }).$type<AdapterAccountType>().notNull(),
    provider: varchar("provider", { length: 255 }).notNull(),
    providerAccountId: varchar("providerAccountId", { length: 255 }).notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: int("expires_at"),
    token_type: varchar("token_type", { length: 255 }),
    scope: varchar("scope", { length: 255 }),
    id_token: text("id_token"),
    session_state: varchar("session_state", { length: 255 }),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = mysqlTable("session", {
  sessionToken: varchar("sessionToken", { length: 255 }).primaryKey(),
  userId: ref("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = mysqlTable(
  "verificationToken",
  {
    identifier: varchar("identifier", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

/* ---------- Marketplace ---------- */

export const services = mysqlTable(
  "service",
  {
    id: id(),
    sellerId: ref("seller_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 100 }).notNull(),
    description: text("description").notNull(),
    mode: mysqlEnum("mode", GAME_MODES).notNull(),
    priceCents: int("price_cents").notNull(),
    pricingUnit: mysqlEnum("pricing_unit", PRICING_UNITS).notNull(),
    deliveryDays: int("delivery_days").notNull(),
    status: mysqlEnum("status", SERVICE_STATUSES).default("active").notNull(),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [index("service_seller_idx").on(t.sellerId), index("service_status_idx").on(t.status)],
);

export const orders = mysqlTable(
  "order",
  {
    id: id(),
    serviceId: ref("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "restrict" }),
    buyerId: ref("buyer_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    sellerId: ref("seller_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: mysqlEnum("status", ORDER_STATUSES).default("requested").notNull(),
    brief: text("brief").notNull(),
    songUrl: varchar("song_url", { length: 500 }),
    // Agreed total for the job; the platform fee is stored at the moment it is agreed.
    priceCents: int("price_cents").notNull(),
    feeCents: int("fee_cents").notNull(),
    deliveryUrl: varchar("delivery_url", { length: 500 }),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { mode: "date" }),
  },
  (t) => [
    index("order_buyer_idx").on(t.buyerId),
    index("order_seller_idx").on(t.sellerId),
    index("order_status_idx").on(t.status),
  ],
);

export const reviews = mysqlTable(
  "review",
  {
    id: id(),
    orderId: ref("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    serviceId: ref("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    sellerId: ref("seller_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    authorId: ref("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: int("rating").notNull(), // 1–5
    body: text("body").notNull(),
    isHidden: boolean("is_hidden").default(false).notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("review_order_unique").on(t.orderId), index("review_seller_idx").on(t.sellerId)],
);

/* Every admin action is recorded so moderation stays transparent. */
export const auditLog = mysqlTable(
  "audit_log",
  {
    id: id(),
    actorId: ref("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 64 }).notNull(),
    targetType: varchar("target_type", { length: 32 }).notNull(),
    targetId: varchar("target_id", { length: 64 }).notNull(),
    details: json("details").$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [index("audit_created_idx").on(t.createdAt)],
);

export type User = typeof users.$inferSelect;
export type Service = typeof services.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type GameMode = (typeof GAME_MODES)[number];
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type PricingUnit = (typeof PRICING_UNITS)[number];
