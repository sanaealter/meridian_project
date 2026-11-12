import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { orders, reviews, services, users } from "@/db/schema";
import { changeOrderStatus, createReview } from "@/app/actions";
import { requireUser } from "@/lib/session";
import { date, money } from "@/lib/format";
import { StatusTag, Stars, UserLink } from "@/components/ui";

export const metadata = { title: "Order" };

export default async function OrderPage({ params }: PageProps<"/orders/[id]">) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const viewer = await requireUser();

  const order = await db.query.orders.findFirst({ where: eq(orders.id, id) });
  if (!order) notFound();
  const isBuyer = order.buyerId === viewer.id;
  const isSeller = order.sellerId === viewer.id;
  if (!isBuyer && !isSeller && viewer.role !== "admin") notFound();

  const [service, buyer, seller, review] = await Promise.all([
    db.query.services.findFirst({ where: eq(services.id, order.serviceId) }),
    db.query.users.findFirst({ where: eq(users.id, order.buyerId) }),
    db.query.users.findFirst({ where: eq(users.id, order.sellerId) }),
    db.query.reviews.findFirst({ where: eq(reviews.orderId, order.id) }),
  ]);

  const act = changeOrderStatus.bind(null, order.id);
  const s = order.status;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex flex-wrap items-center gap-3">
        <StatusTag status={s} />
        <span className="text-sm text-muted">Opened {date(order.createdAt)}</span>
      </div>
      <h1 className="mt-3 text-2xl font-bold">
        {service ? <Link href={`/services/${service.id}`}>{service.title}</Link> : "Service removed"}
      </h1>
      <p className="mt-2 text-muted">
        Buyer <UserLink username={buyer?.username ?? null} /> · Mapper <UserLink username={seller?.username ?? null} />
      </p>

      <dl className="mt-8 grid gap-4 rounded-2xl bg-panel p-6 sm:grid-cols-3">
        <div>
          <dt className="text-sm text-muted">Price</dt>
          <dd className="font-display text-xl">{money(order.priceCents)}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Meridian fee</dt>
          <dd className="font-display text-xl">{money(order.feeCents)}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Buyer pays</dt>
          <dd className="font-display text-xl">{money(order.priceCents + order.feeCents)}</dd>
        </div>
      </dl>

      <section className="mt-8">
        <h2 className="text-lg font-bold">Brief</h2>
        <p className="mt-2 whitespace-pre-line">{order.brief}</p>
        {order.songUrl && (
          <a href={order.songUrl} className="mt-2 inline-block text-cue hover:underline" rel="noreferrer nofollow">
            Song link
          </a>
        )}
        {order.deliveryUrl && (
          <p className="mt-4">
            Delivered map:{" "}
            <a href={order.deliveryUrl} className="text-cue hover:underline" rel="noreferrer nofollow">
              {order.deliveryUrl}
            </a>
          </p>
        )}
      </section>

      <section className="mt-10 space-y-4 border-t border-line pt-8">
        <h2 className="text-lg font-bold">Next step</h2>

        {isSeller && s === "requested" && (
          <form action={act} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="to" value="accepted" />
            <div>
              <label className="label" htmlFor="price">
                Final price (EUR)
              </label>
              <input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min="1"
                defaultValue={(order.priceCents / 100).toFixed(2)}
                className="field w-36"
              />
            </div>
            <button className="btn btn-primary">Accept order</button>
          </form>
        )}

        {isBuyer && s === "accepted" && (
          <form action={act}>
            <input type="hidden" name="to" value="in_progress" />
            <button className="btn btn-primary">Pay {money(order.priceCents + order.feeCents)} (test mode)</button>
            <p className="mt-2 text-sm text-muted">Payments are not connected yet. This marks the order as paid.</p>
          </form>
        )}

        {isSeller && s === "in_progress" && (
          <form action={act} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="to" value="delivered" />
            <div className="min-w-64 flex-1">
              <label className="label" htmlFor="deliveryUrl">
                Link to the beatmap
              </label>
              <input id="deliveryUrl" name="deliveryUrl" type="url" required className="field" placeholder="https://osu.ppy.sh/beatmapsets/…" />
            </div>
            <button className="btn btn-primary">Deliver map</button>
          </form>
        )}

        {isBuyer && s === "delivered" && (
          <div className="flex flex-wrap gap-3">
            <StatusButton act={act} to="completed" className="btn-primary">
              Approve and release payment
            </StatusButton>
            <StatusButton act={act} to="in_progress" className="btn-ghost">
              Ask for revisions
            </StatusButton>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {(s === "requested" || s === "accepted") && (isBuyer || isSeller) && (
            <StatusButton act={act} to="cancelled" className="btn-danger btn-sm">
              Cancel order
            </StatusButton>
          )}
          {isBuyer && (s === "in_progress" || s === "delivered") && (
            <StatusButton act={act} to="disputed" className="btn-danger btn-sm">
              Open a dispute
            </StatusButton>
          )}
        </div>

        {s === "disputed" && <p className="text-alert">Meridian staff are reviewing this order. Payment stays on hold.</p>}
        {s === "cancelled" && <p className="text-muted">This order was cancelled.</p>}
        {s === "requested" && isBuyer && <p className="text-muted">Waiting for the mapper to confirm the price.</p>}
        {s === "in_progress" && isBuyer && <p className="text-muted">The mapper is working on your map.</p>}
        {s === "delivered" && isSeller && <p className="text-muted">Waiting for the buyer to approve.</p>}
      </section>

      {s === "completed" && (
        <section className="mt-10 border-t border-line pt-8">
          <h2 className="text-lg font-bold">Review</h2>
          {review ? (
            <div className="mt-3 rounded-xl bg-panel p-5">
              <Stars value={review.rating} />
              <p className="mt-2 whitespace-pre-line">{review.body}</p>
            </div>
          ) : isBuyer ? (
            <form action={createReview.bind(null, order.id)} className="mt-4 space-y-4">
              <div>
                <label className="label" htmlFor="rating">
                  Rating
                </label>
                <select id="rating" name="rating" className="field w-40" defaultValue="5">
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n} / 5
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="body">
                  Your review
                </label>
                <textarea id="body" name="body" required minLength={10} rows={4} className="field" />
              </div>
              <button className="btn btn-primary">Publish review</button>
            </form>
          ) : (
            <p className="mt-2 text-muted">The buyer hasn&apos;t left a review yet.</p>
          )}
        </section>
      )}
    </div>
  );
}

function StatusButton({
  act,
  to,
  className,
  children,
}: {
  act: (fd: FormData) => Promise<void>;
  to: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <form action={act}>
      <input type="hidden" name="to" value={to} />
      <button className={`btn ${className}`}>{children}</button>
    </form>
  );
}
