import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { reviews, services, users } from "@/db/schema";
import { sellerStats } from "@/lib/queries";
import { date, money, modeLabel, rating, unitLabel } from "@/lib/format";
import { getCurrentUser } from "@/lib/session";
import { Avatar, Empty, ModeTag, Stars, UserLink, VerifiedBadge } from "@/components/ui";

export default async function ProfilePage({ params }: PageProps<"/u/[username]">) {
  await connection(); // live data: render on each request, not at build time
  const { username } = await params;
  const user = await db.query.users.findFirst({ where: eq(users.username, decodeURIComponent(username)) });
  if (!user || user.isBanned) notFound();

  const viewer = await getCurrentUser();
  const isOwner = viewer?.id === user.id;

  const [stats, userServices, userReviews] = await Promise.all([
    sellerStats(user.id),
    db.query.services.findMany({
      where: and(eq(services.sellerId, user.id), eq(services.status, "active")),
      orderBy: desc(services.createdAt),
    }),
    db
      .select({ review: reviews, author: { username: users.username, image: users.image } })
      .from(reviews)
      .innerJoin(users, eq(reviews.authorId, users.id))
      .where(and(eq(reviews.sellerId, user.id), eq(reviews.isHidden, false)))
      .orderBy(desc(reviews.createdAt))
      .limit(30),
  ]);

  const osuNumbers = [
    { label: "Ranked mapsets", value: user.rankedMapsets },
    { label: "Loved mapsets", value: user.lovedMapsets },
    { label: "Global rank", value: user.globalRank ? `#${user.globalRank.toLocaleString("en")}` : "—" },
    { label: "Main mode", value: user.playmode ? modeLabel[user.playmode] : "—" },
  ];
  const marketNumbers = [
    { label: "Completed orders", value: stats.completed },
    { label: "Active orders", value: stats.active },
    { label: "Rating", value: rating(stats.avgRating) },
    { label: "Reviews", value: stats.reviewCount },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <section className="flex flex-wrap items-start gap-6">
        <Avatar src={user.image} name={user.username} size={96} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold">{user.username}</h1>
            {user.isVerified && <VerifiedBadge />}
            {user.countryCode && <span className="text-muted">{user.countryCode}</span>}
          </div>
          {user.bio ? (
            <p className="mt-3 max-w-2xl whitespace-pre-line">{user.bio}</p>
          ) : (
            isOwner && <p className="mt-3 text-muted">Add a bio from your dashboard so buyers know what you map.</p>
          )}
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            {user.osuId && (
              <a href={`https://osu.ppy.sh/users/${user.osuId}`} className="text-cue hover:underline" rel="noreferrer">
                osu! profile
              </a>
            )}
            {user.discordHandle && <span className="text-muted">Discord: {user.discordHandle}</span>}
            <span className="text-muted">On Meridian since {date(user.createdAt)}</span>
          </div>
        </div>
        {isOwner && (
          <Link href="/dashboard/profile" className="btn btn-ghost btn-sm">
            Edit profile
          </Link>
        )}
      </section>

      <section className="mt-10 grid gap-6 md:grid-cols-2">
        <StatBlock title="osu!" note={user.osuSyncedAt ? `Synced ${date(user.osuSyncedAt)}` : undefined} items={osuNumbers} />
        <StatBlock title="On Meridian" note="Counted from real orders" items={marketNumbers} />
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-bold">Services</h2>
        <div className="mt-4 divide-y divide-line border-y border-line">
          {userServices.length === 0 && <p className="py-6 text-muted">No open services right now.</p>}
          {userServices.map((s) => (
            <Link key={s.id} href={`/services/${s.id}`} className="flex flex-wrap items-center gap-4 py-4 hover:bg-panel/50">
              <span className="font-bold">{s.title}</span>
              <ModeTag mode={s.mode} />
              <span className="ml-auto text-right">
                <span className="font-bold">{money(s.priceCents)}</span>{" "}
                <span className="text-sm text-muted">{unitLabel[s.pricingUnit]}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-bold">Reviews</h2>
        <p className="mt-1 text-sm text-muted">Only buyers with a completed order can leave a review.</p>
        <div className="mt-4 space-y-4">
          {userReviews.length === 0 && <Empty>No reviews yet.</Empty>}
          {userReviews.map(({ review, author }) => (
            <article key={review.id} className="rounded-xl bg-panel p-5">
              <div className="flex flex-wrap items-center gap-3">
                <Stars value={review.rating} />
                <UserLink username={author.username} />
                <span className="text-sm text-muted">{date(review.createdAt)}</span>
              </div>
              <p className="mt-2 whitespace-pre-line">{review.body}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatBlock({
  title,
  note,
  items,
}: {
  title: string;
  note?: string;
  items: { label: string; value: React.ReactNode }[];
}) {
  return (
    <div className="rounded-2xl bg-panel p-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold">{title}</h2>
        {note && <span className="text-sm text-muted">{note}</span>}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4">
        {items.map((i) => (
          <div key={i.label}>
            <dt className="text-sm text-muted">{i.label}</dt>
            <dd className="font-display text-xl">{i.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
