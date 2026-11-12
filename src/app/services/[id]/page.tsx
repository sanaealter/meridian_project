import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { reviews, services, users } from "@/db/schema";
import { createOrder } from "@/app/actions";
import { getCurrentUser } from "@/lib/session";
import { sellerStats } from "@/lib/queries";
import { FEE_BPS, date, money, rating, unitLabel } from "@/lib/format";
import { Avatar, ModeTag, Stars, UserLink, VerifiedBadge } from "@/components/ui";

export default async function ServicePage({ params }: PageProps<"/services/[id]">) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const service = await db.query.services.findFirst({ where: eq(services.id, id) });
  if (!service || service.status === "removed") notFound();
  const seller = await db.query.users.findFirst({ where: eq(users.id, service.sellerId) });
  if (!seller || seller.isBanned) notFound();

  const [viewer, stats, serviceReviews] = await Promise.all([
    getCurrentUser(),
    sellerStats(seller.id),
    db
      .select({ review: reviews, author: { username: users.username } })
      .from(reviews)
      .innerJoin(users, eq(reviews.authorId, users.id))
      .where(and(eq(reviews.serviceId, service.id), eq(reviews.isHidden, false)))
      .orderBy(desc(reviews.createdAt))
      .limit(20),
  ]);
  const isOwner = viewer?.id === seller.id;

  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-4 py-12 lg:grid-cols-[1fr_360px]">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <ModeTag mode={service.mode} />
          {service.status === "paused" && <span className="text-sm text-gold">Paused: not taking new orders</span>}
        </div>
        <h1 className="mt-3 text-3xl font-bold">{service.title}</h1>
        <p className="mt-6 max-w-2xl whitespace-pre-line">{service.description}</p>

        <h2 className="mt-12 text-xl font-bold">Reviews for this service</h2>
        <div className="mt-4 space-y-4">
          {serviceReviews.length === 0 && <p className="text-muted">No reviews yet.</p>}
          {serviceReviews.map(({ review, author }) => (
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
      </div>

      <aside className="space-y-6">
        <div className="rounded-2xl bg-panel p-6">
          <div className="font-display text-3xl">{money(service.priceCents)}</div>
          <div className="text-muted">{unitLabel[service.pricingUnit]}</div>
          <div className="mt-2 text-sm text-muted">Usual delivery: {service.deliveryDays} days</div>

          {isOwner ? (
            <Link href={`/dashboard/services/${service.id}/edit`} className="btn btn-ghost mt-6 w-full">
              Edit service
            </Link>
          ) : service.status !== "active" ? null : viewer ? (
            <form action={createOrder.bind(null, service.id)} className="mt-6 space-y-4">
              <div>
                <label className="label" htmlFor="brief">
                  What do you want mapped?
                </label>
                <textarea
                  id="brief"
                  name="brief"
                  required
                  minLength={20}
                  rows={5}
                  className="field"
                  placeholder="Song, length, which difficulties, style references, deadline…"
                />
              </div>
              <div>
                <label className="label" htmlFor="songUrl">
                  Link to the song (optional)
                </label>
                <input id="songUrl" name="songUrl" type="url" className="field" placeholder="https://" />
              </div>
              <button className="btn btn-primary w-full">Send request</button>
              <p className="text-sm text-muted">
                You don&apos;t pay yet. The mapper confirms the final price first. Meridian adds a {FEE_BPS / 100}% fee.
              </p>
            </form>
          ) : (
            <Link href="/signin" className="btn btn-primary mt-6 w-full">
              Sign in to order
            </Link>
          )}
        </div>

        <div className="rounded-2xl border border-line p-6">
          <div className="flex items-center gap-3">
            <Avatar src={seller.image} name={seller.username} size={48} />
            <div>
              <UserLink username={seller.username} />
              {seller.isVerified && (
                <div className="mt-1">
                  <VerifiedBadge />
                </div>
              )}
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <dt className="text-muted">Ranked mapsets</dt>
            <dd>{seller.rankedMapsets}</dd>
            <dt className="text-muted">Completed orders</dt>
            <dd>{stats.completed}</dd>
            <dt className="text-muted">Rating</dt>
            <dd>{rating(stats.avgRating)}</dd>
          </dl>
        </div>
      </aside>
    </div>
  );
}
