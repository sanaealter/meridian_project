import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { db } from "@/db";
import { ORDER_STATUSES, orders, services, users, type OrderStatus } from "@/db/schema";
import { adminUpdateOrder } from "@/app/admin/actions";
import { date, money, statusLabel } from "@/lib/format";
import { StatusTag } from "@/components/ui";

export const metadata = { title: "Orders | Admin" };

const buyer = alias(users, "buyer");
const seller = alias(users, "seller");

export default async function AdminOrders({ searchParams }: PageProps<"/admin/orders">) {
  const sp = await searchParams;
  const status = ORDER_STATUSES.includes(sp.status as OrderStatus) ? (sp.status as OrderStatus) : undefined;

  const rows = await db
    .select({ order: orders, title: services.title, buyer: buyer.username, seller: seller.username })
    .from(orders)
    .innerJoin(services, eq(orders.serviceId, services.id))
    .innerJoin(buyer, eq(orders.buyerId, buyer.id))
    .innerJoin(seller, eq(orders.sellerId, seller.id))
    .where(status ? eq(orders.status, status) : undefined)
    .orderBy(desc(orders.updatedAt))
    .limit(200);

  return (
    <div>
      <h1 className="text-2xl font-bold">Orders</h1>
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <Link href="/admin/orders" className={!status ? "text-cue" : "text-muted hover:text-ink"}>
          All
        </Link>
        {ORDER_STATUSES.map((s) => (
          <Link key={s} href={`/admin/orders?status=${s}`} className={status === s ? "text-cue" : "text-muted hover:text-ink"}>
            {statusLabel[s]}
          </Link>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {rows.length === 0 && <p className="text-muted">No orders here.</p>}
        {rows.map(({ order: o, title, buyer, seller }) => (
          <details key={o.id} className="rounded-xl bg-panel" open={o.status === "disputed"}>
            <summary className="flex cursor-pointer flex-wrap items-center gap-3 px-5 py-3">
              <StatusTag status={o.status} />
              <span className="font-bold">{title}</span>
              <span className="text-sm text-muted">
                {buyer} → {seller} · {date(o.updatedAt)}
              </span>
              <span className="ml-auto font-bold">{money(o.priceCents)}</span>
            </summary>
            <div className="border-t border-line px-5 py-4">
              <p className="whitespace-pre-line text-sm">{o.brief}</p>
              <form action={adminUpdateOrder.bind(null, o.id)} className="mt-4 flex flex-wrap items-end gap-3">
                <label className="text-sm text-muted">
                  Status
                  <select name="status" defaultValue={o.status} className="field mt-1 w-56">
                    {ORDER_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {statusLabel[s]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-muted">
                  Price (EUR)
                  <input name="price" type="number" step="0.01" defaultValue={(o.priceCents / 100).toFixed(2)} className="field mt-1 w-32" />
                </label>
                <label className="min-w-56 flex-1 text-sm text-muted">
                  Reason (saved in audit log)
                  <input name="note" className="field mt-1" />
                </label>
                <button className="btn btn-primary btn-sm">Update order</button>
                <Link href={`/orders/${o.id}`} className="btn btn-ghost btn-sm">
                  Open
                </Link>
              </form>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
