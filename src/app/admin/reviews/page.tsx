import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { db } from "@/db";
import { reviews, users } from "@/db/schema";
import { adminDeleteReview, adminToggleReview, adminUpdateReview } from "@/app/admin/actions";
import { date } from "@/lib/format";
import { Stars } from "@/components/ui";

export const metadata = { title: "Reviews | Admin" };

const author = alias(users, "author");
const seller = alias(users, "seller");

export default async function AdminReviews() {
  const rows = await db
    .select({ review: reviews, author: author.username, seller: seller.username })
    .from(reviews)
    .innerJoin(author, eq(reviews.authorId, author.id))
    .innerJoin(seller, eq(reviews.sellerId, seller.id))
    .orderBy(desc(reviews.createdAt))
    .limit(200);

  return (
    <div>
      <h1 className="text-2xl font-bold">Reviews</h1>
      <p className="mt-2 text-sm text-muted">
        Hidden reviews don&apos;t count toward ratings. Prefer hiding over editing, and note why in the audit log.
      </p>
      <div className="mt-6 space-y-3">
        {rows.length === 0 && <p className="text-muted">No reviews yet.</p>}
        {rows.map(({ review: r, author, seller }) => (
          <details key={r.id} className={`rounded-xl bg-panel ${r.isHidden ? "opacity-60" : ""}`}>
            <summary className="flex cursor-pointer flex-wrap items-center gap-3 px-5 py-3">
              <Stars value={r.rating} />
              <span className="text-sm">
                {author} → {seller}
              </span>
              <span className="text-sm text-muted">{date(r.createdAt)}</span>
              {r.isHidden && <span className="text-sm text-alert">hidden</span>}
              <span className="w-full truncate text-muted">{r.body}</span>
            </summary>
            <div className="border-t border-line px-5 py-4">
              <form action={adminUpdateReview.bind(null, r.id)} className="space-y-3">
                <select name="rating" defaultValue={r.rating} className="field w-28" aria-label="Rating">
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n} / 5
                    </option>
                  ))}
                </select>
                <textarea name="body" rows={3} defaultValue={r.body} className="field" aria-label="Review text" />
                <button className="btn btn-primary btn-sm">Save edit</button>
              </form>
              <div className="mt-3 flex gap-3">
                <form action={adminToggleReview.bind(null, r.id, !r.isHidden)}>
                  <button className="btn btn-ghost btn-sm">{r.isHidden ? "Show review" : "Hide review"}</button>
                </form>
                <form action={adminDeleteReview.bind(null, r.id)}>
                  <button className="btn btn-danger btn-sm">Delete review</button>
                </form>
              </div>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
