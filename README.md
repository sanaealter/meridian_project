# Meridian

A commission marketplace for osu! beatmaps. Buyers order maps from mappers who sign in with their osu! account; payment is held until the buyer approves the delivered map.

**Status:** foundation. Accounts, profiles, listings, the order flow, reviews, public statistics and the admin panel work. Real payments, chat and Discord integration are not built yet (see [Roadmap](#roadmap)).

## Stack

- [Next.js 16](https://nextjs.org) (App Router, Server Actions, Cache Components)
- PostgreSQL with [Drizzle ORM](https://orm.drizzle.team)
- [Auth.js](https://authjs.dev) with the osu! OAuth provider
- Tailwind CSS 4

## Getting started

Requirements: Node.js 20+, PostgreSQL 14+.

```bash
npm install
cp .env.example .env      # then fill in the values, see below
npm run db:migrate        # create tables
npm run db:seed           # optional: fake mappers, orders and reviews for development
npm run dev               # http://localhost:3000
```

### Environment variables

| Variable | What it is |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `AUTH_SECRET` | Random secret for sessions. Generate with `npx auth secret` |
| `AUTH_URL` | Public URL of the site, e.g. `https://meridian.example`. Needed when self-hosting |
| `AUTH_OSU_ID` / `AUTH_OSU_SECRET` | From an OAuth application at osu.ppy.sh → Settings → OAuth. Callback URL: `<AUTH_URL>/api/auth/callback/osu` |
| `ADMIN_OSU_IDS` | Comma-separated osu! user IDs that get the admin role when they sign in |
| `PLATFORM_FEE_BPS` | Meridian's fee in basis points. `500` = 5% |

To make yourself admin: put your osu! user ID (the number in your osu! profile URL) in `ADMIN_OSU_IDS` and sign in.

### Testing as other users (development only)

With `DEV_LOGIN=true` in `.env` and the app running via `npm run dev`, open
`http://localhost:3000/api/dev-login?user=test_buyer` to sign in as a seeded user without osu!.
Use a private browser window so you can be the buyer in one window and the seller in another.
The route returns 404 in production builds regardless of the setting.

## What's in the box

| Area | Routes | Notes |
|---|---|---|
| Landing | `/` | Live platform numbers, how ordering works, verified mappers |
| Mapper list | `/sellers` | Filter by game mode and verified status |
| Service page | `/services/[id]` | Description, reviews, request form |
| Profiles | `/u/[username]` | osu! stats (synced on each sign-in) and marketplace stats (calculated from orders) |
| Dashboard | `/dashboard`, `/dashboard/profile`, `/dashboard/services/*` | Your orders as buyer and seller, create/edit services, edit bio |
| Orders | `/orders/[id]` | Status flow with actions for each side, review after completion |
| Open statistics | `/stats` | Platform-wide numbers, calculated live |
| Admin | `/admin/*` | Edit/delete users, services, reviews; change any order's status; audit log |

### Order flow

```
requested ──seller accepts + sets price──▶ accepted ──buyer pays──▶ in_progress
    │                                         │                       │  ▲
    └────────── either side cancels ──────────┘          seller delivers  buyer asks for revisions
                                                                      ▼  │
                         disputed ◀──buyer opens dispute── delivered ─┘
                                                                      │
                                                     buyer approves ──▶ completed ──▶ review
```

Allowed transitions live in `src/app/actions.ts` (`transitions`). Admins can set any status from `/admin/orders`, for example to resolve a dispute; the reason goes to the audit log.

**Payments are stubbed.** The "Pay (test mode)" button only moves the order to `in_progress`. No money moves.

### Admin and statistics

- Profile fields and osu! statistics can be edited by admins. osu! stats are overwritten from osu! on the user's next sign-in.
- Marketplace numbers (completed orders, ratings) are never edited directly. They are calculated from orders and reviews, so admins correct the underlying record instead. This keeps the public statistics trustworthy.
- Every admin change is written to `audit_log` and visible at `/admin/audit`.
- Banning a user blocks sign-in and pauses their services. Users with orders can't be deleted, only banned.
- Services with orders are soft-removed rather than deleted.

## Project layout

```
src/
  app/            routes (pages, layouts, server actions)
    actions.ts    user actions: profile, services, orders, reviews
    admin/        admin panel and its actions
  auth.ts         Auth.js config, osu! profile sync, admin bootstrap
  db/schema.ts    database schema
  lib/            queries, formatting, session helpers, audit log
  components/     shared UI
drizzle/          generated SQL migrations
scripts/seed.ts   development data
```

## Database changes

Edit `src/db/schema.ts`, then:

```bash
npm run db:generate   # writes a new migration to drizzle/
npm run db:migrate    # applies it
```

`npm run db:studio` opens a browser UI for the database.

## Roadmap

In rough priority order:

1. **Payments with escrow.** Stripe Connect (or similar) so funds are held by a licensed provider and released on approval. Do this before taking real money, and check EU rules (PSD2, DAC7 reporting) with an accountant.
2. **Order messages.** A thread on each order page, so agreements are recorded on the platform.
3. **Discord.** Account linking, a bot that posts new orders and disputes to staff channels, support tickets.
4. **Seller verification flow.** Applications and staff review for the Verified badge.
5. **Profile customisation.** Banner, portfolio of mapsets pulled from the osu! API.
6. **File delivery and dispute evidence uploads.**
