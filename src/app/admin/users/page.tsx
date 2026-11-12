import Link from "next/link";
import { and, desc, eq, like, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { date } from "@/lib/format";
import { Avatar, VerifiedBadge } from "@/components/ui";

export const metadata = { title: "Users | Admin" };

export default async function AdminUsers({ searchParams }: PageProps<"/admin/users">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const conditions: SQL[] = [];
  if (q) conditions.push(like(users.username, `%${q}%`));
  if (sp.verified === "0") conditions.push(eq(users.isVerified, false));
  if (sp.verified === "1") conditions.push(eq(users.isVerified, true));
  if (sp.banned === "1") conditions.push(eq(users.isBanned, true));

  const rows = await db
    .select()
    .from(users)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(users.createdAt))
    .limit(200);

  return (
    <div>
      <h1 className="text-2xl font-bold">Users</h1>
      <form className="mt-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Search username" className="field max-w-xs" />
        <select name="verified" defaultValue={typeof sp.verified === "string" ? sp.verified : ""} className="field w-44">
          <option value="">Any verification</option>
          <option value="1">Verified</option>
          <option value="0">Not verified</option>
        </select>
        <button className="btn btn-ghost">Filter</button>
      </form>

      <ul className="mt-6 divide-y divide-line border-y border-line">
        {rows.map((u) => (
          <li key={u.id}>
            <Link href={`/admin/users/${u.id}`} className="flex flex-wrap items-center gap-3 py-3 hover:bg-panel/50">
              <Avatar src={u.image} name={u.username} size={32} />
              <span className="font-bold">{u.username ?? "(no username)"}</span>
              {u.isVerified && <VerifiedBadge />}
              {u.role === "admin" && <span className="text-sm text-gold">admin</span>}
              {u.isBanned && <span className="text-sm text-alert">banned</span>}
              <span className="ml-auto text-sm text-muted">joined {date(u.createdAt)}</span>
            </Link>
          </li>
        ))}
        {rows.length === 0 && <li className="py-4 text-muted">No users match.</li>}
      </ul>
    </div>
  );
}
