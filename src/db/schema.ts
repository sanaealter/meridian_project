import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  index,
  uuid,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

/* ---------- Enums ---------- */

export const roleEnum = pgEnum("role", ["user", "admin"]);
export const gameModeEnum = pgEnum("game_mode", ["osu", "taiko", "fruits", "mania"]);
export const pricingUnitEnum = pgEnum("pricing_unit", ["per_minute", "per_difficulty", "fixed"]);
export const serviceStatusEnum = pgEnum("service_status", ["active", "paused", "removed"]);
export const orderStatusEnum = pgEnum("order_status", [
  "requested", // buyer sent a request, seller has not answered
  "accepted", // seller accepted, waiting for payment (payments not wired yet)
  "in_progress", // paid / held in escrow, seller is mapping
  "delivered", // seller delivered, buyer reviews the work
  "completed", // buyer approved, funds released
  "cancelled",
  "disputed", // escalated to Meridian staff
]);

/* ---------- Auth.js tables (shape required by @auth/drizzle-adapter) ---------- */

export const users = pgTable(
  "user",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name"),
    email: text("email").unique(),
    emailVerified: timestamp("emailVerified", { mode: "date" }),
    image: text("image"),

    // osu! data, refreshed on every sign-in
    osuId: integer("osu_id").unique(),
    username: text("username").unique(),
    countryCode: text("country_code"),
    playmode: gameModeEnum("playmode"),
    globalRank: integer("global_rank"),
    pp: real("pp"),
    rankedMapsets: integer("ranked_mapsets").default(0).notNull(),
    lovedMapsets: integer("loved_mapsets").default(0).notNull(),
    osuSyncedAt: timestamp("osu_synced_at", { mode: "date" }),

    // Meridian profile
    bio: text("bio"),
    discordHandle: text("discord_handle"),
    role: roleEnum("role").default("user").notNull(),
    isVerified: boolean("is_verified").default(false).notNull(), // "Meridian Member" badge
    isBanned: boolean("is_banned").default(false).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
);

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

/* ---------- Marketplace ---------- */

export const services = pgTable(
  "service",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sellerId: text("seller_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    mode: gameModeEnum("mode").notNull(),
    priceCents: integer("price_cents").notNull(),
    pricingUnit: pricingUnitEnum("pricing_unit").notNull(),
    deliveryDays: integer("delivery_days").notNull(),
    status: serviceStatusEnum("status").default("active").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [index("service_seller_idx").on(t.sellerId), index("service_status_idx").on(t.status)],
);

export const orders = pgTable(
  "order",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "restrict" }),
    buyerId: text("buyer_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    sellerId: text("seller_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: orderStatusEnum("status").default("requested").notNull(),
    brief: text("brief").notNull(),
    songUrl: text("song_url"),
    // Agreed total for the job; the platform fee is stored at the moment it is agreed.
    priceCents: integer("price_cents").notNull(),
    feeCents: integer("fee_cents").notNull(),
    deliveryUrl: text("delivery_url"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { mode: "date" }),
  },
  (t) => [
    index("order_buyer_idx").on(t.buyerId),
    index("order_seller_idx").on(t.sellerId),
    index("order_status_idx").on(t.status),
  ],
);

export const reviews = pgTable(
  "review",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    sellerId: text("seller_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(), // 1–5
    body: text("body").notNull(),
    isHidden: boolean("is_hidden").default(false).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("review_order_unique").on(t.orderId), index("review_seller_idx").on(t.sellerId)],
);

/* Every admin action is recorded so moderation stays transparent. */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    details: jsonb("details").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [index("audit_created_idx").on(t.createdAt)],
);

export type User = typeof users.$inferSelect;
export type Service = typeof services.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type GameMode = (typeof gameModeEnum.enumValues)[number];
export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];
export type PricingUnit = (typeof pricingUnitEnum.enumValues)[number];
