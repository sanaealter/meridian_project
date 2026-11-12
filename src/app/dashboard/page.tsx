import Link from "next/link";
import { desc, eq, or } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { db } from "@/db";
import { orders, services, users } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { date, money } from "@/lib/format";
import { Empty, ModeTag, PageTitle, StatusTag } from "@/components/ui";

export const metadata = { title: "Dashboard" };

const buyer = alias(users, "buyer");
const seller = alias(users, "seller");

export default async function Dashboard() {
  const user = await requireUser();

  const [myOrders, myServices] = await Promise.all([
    db
      .select({
        order: orders,
        title: services.title,
        buyer: buyer.username,
        seller: seller.username,
      })
      .from(orders)
      .innerJoin(services, eq(orders.serviceId, services.id))
      .innerJoin(buyer, eq(orders.buyerId, buyer.id))
      .innerJoin(seller, eq(orders.sellerId, seller.id))
      .where(or(eq(orders.buyerId, user.id), eq(orders.sellerId, user.id)))
      .orderBy(desc(orders.updatedAt))
      .limit(50),
    db.query.services.findMany({ where: eq(services.sellerId, user.id), orderBy: desc(services.createdAt) }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <PageTitle sub={<Link href="/dashboard/profile" className="text-cue hover:underline">Edit your profile</Link>}>
        Hi, {user.username}
      </PageTitle>

      <section>
        <h2 className="text-xl font-bold">Orders</h2>
        <div className="mt-4">
          {myOrders.length === 0 ? (
            <Empty>
              No orders yet. <Link href="/sellers" className="text-cue hover:underline">Find a mapper</Link> to start one.
            </Empty>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {myOrders.map(({ order, title, buyer, seller }) => {
                const asSeller = order.sellerId === user.id;
                return (
                  <li key={order.id}>
                    <Link href={`/orders/${order.id}`} className="flex flex-wrap items-center gap-4 py-4 hover:bg-panel/50">
                      <span className="w-20 text-sm text-muted">{asSeller ? "Selling" : "Buying"}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold">{title}</span>
                        <span className="text-sm text-muted">
                          {asSeller ? `for ${buyer}` : `by ${seller}`} · updated {date(order.updatedAt)}
                        </span>
                      </span>
                      <StatusTag status={order.status} />
                      <span className="w-24 text-right font-bold">{money(order.priceCents)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-12">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-bold">Your services</h2>
          <Link href="/dashboard/services/new" className="btn btn-primary btn-sm">
            New service
          </Link>
        </div>
        <div className="mt-4">
          {myServices.length === 0 ? (
            <Empty>List what you map, your prices and turnaround time so buyers can order from you.</Empty>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {myServices.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-4 py-4">
                  <Link href={`/services/${s.id}`} className="min-w-0 flex-1 truncate font-bold hover:text-cue">
                    {s.title}
                  </Link>
                  <ModeTag mode={s.mode} />
                  <span className="text-sm text-muted">{s.status}</span>
                  <Link href={`/dashboard/services/${s.id}/edit`} className="btn btn-ghost btn-sm">
                    Edit
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
