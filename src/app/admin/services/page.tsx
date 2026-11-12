import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { services, users } from "@/db/schema";
import { adminDeleteService, adminUpdateService } from "@/app/admin/actions";
import { modeLabel } from "@/lib/format";

export const metadata = { title: "Services | Admin" };

export default async function AdminServices({ searchParams }: PageProps<"/admin/services">) {
  const sp = await searchParams;
  const rows = await db
    .select({ service: services, seller: users.username })
    .from(services)
    .innerJoin(users, eq(services.sellerId, users.id))
    .orderBy(desc(services.updatedAt))
    .limit(200);

  return (
    <div>
      <h1 className="text-2xl font-bold">Services</h1>
      {sp.saved && <p className="mt-4 text-cue">Saved and logged.</p>}
      <div className="mt-6 space-y-3">
        {rows.length === 0 && <p className="text-muted">No services yet.</p>}
        {rows.map(({ service: s, seller }) => (
          <details key={s.id} className="rounded-xl bg-panel">
            <summary className="flex cursor-pointer flex-wrap items-center gap-3 px-5 py-3">
              <span className="font-bold">{s.title}</span>
              <span className="text-sm text-muted">
                by {seller} · {modeLabel[s.mode]}
              </span>
              <span className={`ml-auto text-sm ${s.status === "active" ? "text-cue" : "text-muted"}`}>{s.status}</span>
            </summary>
            <div className="border-t border-line px-5 py-4">
              <form action={adminUpdateService.bind(null, s.id)} className="space-y-3">
                <input name="title" defaultValue={s.title} className="field" aria-label="Title" />
                <textarea name="description" rows={4} defaultValue={s.description} className="field" aria-label="Description" />
                <div className="flex flex-wrap gap-3">
                  <label className="text-sm text-muted">
                    Price (EUR)
                    <input name="price" type="number" step="0.01" defaultValue={(s.priceCents / 100).toFixed(2)} className="field mt-1 w-32" />
                  </label>
                  <label className="text-sm text-muted">
                    Delivery days
                    <input name="deliveryDays" type="number" defaultValue={s.deliveryDays} className="field mt-1 w-28" />
                  </label>
                  <label className="text-sm text-muted">
                    Status
                    <select name="status" defaultValue={s.status} className="field mt-1 w-36">
                      <option value="active">active</option>
                      <option value="paused">paused</option>
                      <option value="removed">removed</option>
                    </select>
                  </label>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button className="btn btn-primary btn-sm">Save</button>
                  <Link href={`/services/${s.id}`} className="btn btn-ghost btn-sm">
                    View
                  </Link>
                </div>
              </form>
              <form action={adminDeleteService.bind(null, s.id)} className="mt-3">
                <button className="btn btn-danger btn-sm">Delete service</button>
              </form>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
