import NextAuth from "next-auth";
import Osu from "next-auth/providers/osu";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, sessions, users, verificationTokens, type GameMode } from "@/db/schema";

/** The subset of the osu! API v2 `/me` response we use. */
type OsuProfile = {
  id: number;
  username: string;
  avatar_url: string;
  country_code: string;
  playmode: GameMode;
  ranked_beatmapset_count?: number;
  ranked_and_approved_beatmapset_count?: number;
  loved_beatmapset_count?: number;
  statistics?: { global_rank: number | null; pp: number | null };
};

function osuFields(p: OsuProfile) {
  return {
    osuId: p.id,
    username: p.username,
    name: p.username,
    image: p.avatar_url,
    countryCode: p.country_code,
    playmode: p.playmode,
    globalRank: p.statistics?.global_rank ?? null,
    pp: p.statistics?.pp ?? null,
    rankedMapsets: p.ranked_beatmapset_count ?? p.ranked_and_approved_beatmapset_count ?? 0,
    lovedMapsets: p.loved_beatmapset_count ?? 0,
    osuSyncedAt: new Date(),
  };
}

const adminOsuIds = new Set(
  (process.env.ADMIN_OSU_IDS ?? "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter(Boolean),
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Osu({
      // Fields returned here are stored on first sign-in by the adapter.
      profile(profile) {
        const p = profile as unknown as OsuProfile;
        return { id: String(p.id), email: null, ...osuFields(p) };
      },
    }),
  ],
  pages: { signIn: "/signin" },
  callbacks: {
    async signIn({ user }) {
      // Banned users cannot sign in. New users have no row yet, so they pass.
      if (!user.id) return true;
      const row = await db.query.users.findFirst({ where: eq(users.id, user.id) });
      return !row?.isBanned;
    },
    session({ session, user }) {
      const u = user as typeof user & { role: "user" | "admin"; username: string | null };
      session.user.id = u.id;
      session.user.role = u.role;
      session.user.username = u.username;
      return session;
    },
  },
  events: {
    // Refresh osu! stats on every sign-in and grant admin role from env.
    async signIn({ user, profile }) {
      if (!user.id || !profile) return;
      const fields = osuFields(profile as unknown as OsuProfile);
      await db
        .update(users)
        .set({ ...fields, ...(adminOsuIds.has(fields.osuId) ? { role: "admin" as const } : {}) })
        .where(eq(users.id, user.id));
    },
  },
});
