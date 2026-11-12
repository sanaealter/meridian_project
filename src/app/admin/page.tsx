import Link from "next/link";
import { count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLog, orders, users } from "@/db/schema";
import { platformStats } from "@/lib/queries";
import { date, money } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "Admin" };

export default async function AdminHome() {
  await requireAdmin();
  const [s, [disputes], [pendingVerify], recent] = await Promise.all([
    platformStats(),
    db.select({ n: count() }).from(orders).where(eq(orders.status, "disputed")),
    db.select({ n: count() }).from(users).where(eq(users.isVerified, false)),
    db
      .select({ log: auditLog, actor: users.username })
      .from(auditLog)
      .leftJoin(users, eq(auditLog.actorId, users.id))
      .orderBy(desc(auditLog.createdAt))
      .limit(10),
  ]);

  const cards = [
    ["Open disputes", disputes.n, "/admin/orders?status=disputed"],
    ["Users", s.users, "/admin/users"],
    ["Unverified users", pendingVerify.n, "/admin/users?verified=0"],
    ["Active services", s.services, "/admin/services"],
    ["Completed orders", s.ordersCompleted, "/admin/orders?status=completed"],
    ["Fees collected", money(s.feesCents), "/stats"],
  ] as const;

  return (
    <div>
      <h1 className="text-2xl font-bold">Overview</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([label, value, href]) => (
          <Link key={label} href={href} className="rounded-xl bg-panel p-5 hover:bg-panel-2">
            <div className="text-sm text-muted">{label}</div>
            <div className={`font-display text-2xl ${label === "Open disputes" && Number(value) > 0 ? "text-alert" : ""}`}>
              {value}
            </div>
          </Link>
        ))}
      </div>

      <h2 className="mt-10 text-lg font-bold">Recent staff actions</h2>
      <ul className="mt-3 divide-y divide-line border-y border-line text-sm">
        {recent.length === 0 && <li className="py-3 text-muted">Nothing yet.</li>}
        {recent.map(({ log, actor }) => (
          <li key={log.id} className="flex gap-4 py-2.5">
            <span className="w-28 text-muted">{date(log.createdAt)}</span>
            <span className="w-32 truncate">{actor ?? "deleted"}</span>
            <span className="text-cue">{log.action}</span>
            <span className="truncate text-muted">{log.targetId}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
