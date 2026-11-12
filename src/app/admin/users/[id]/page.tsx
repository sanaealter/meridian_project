import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { adminDeleteUser, adminUpdateUser } from "@/app/admin/actions";
import { sellerStats } from "@/lib/queries";
import { date, rating } from "@/lib/format";
import { Avatar } from "@/components/ui";

export const metadata = { title: "Edit user | Admin" };

export default async function AdminUser({ params, searchParams }: PageProps<"/admin/users/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const user = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!user) notFound();
  const stats = await sellerStats(user.id);

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4">
        <Avatar src={user.image} name={user.username} size={56} />
        <div>
          <h1 className="text-2xl font-bold">{user.username}</h1>
          <p className="text-sm text-muted">
            osu! ID {user.osuId ?? "—"} · joined {date(user.createdAt)} ·{" "}
            {user.username && (
              <Link href={`/u/${user.username}`} className="text-cue hover:underline">
                public profile
              </Link>
            )}
          </p>
        </div>
      </div>

      {sp.saved && <p className="mt-4 rounded-lg border border-cue/50 px-4 py-2 text-cue">Changes saved and logged.</p>}
      {sp.error === "has-orders" && (
        <p className="mt-4 rounded-lg border border-alert/60 px-4 py-2 text-alert">
          This user has orders, so the account can&apos;t be deleted. Ban it instead.
        </p>
      )}

      <p className="mt-6 text-sm text-muted">
        Marketplace numbers come from orders and reviews and can&apos;t be edited directly: {stats.completed} completed
        orders, {rating(stats.avgRating)} from {stats.reviewCount} reviews. To correct them, edit the orders or reviews.
      </p>

      <form action={adminUpdateUser.bind(null, user.id)} className="mt-6 space-y-5">
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 font-bold">Profile</legend>
          <Field label="Username" name="username" defaultValue={user.username ?? ""} required />
          <Field label="Discord" name="discordHandle" defaultValue={user.discordHandle ?? ""} />
          <div className="sm:col-span-2">
            <label className="label" htmlFor="bio">
              Bio
            </label>
            <textarea id="bio" name="bio" rows={4} defaultValue={user.bio ?? ""} className="field" />
          </div>
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 font-bold">osu! statistics</legend>
          <p className="text-sm text-muted sm:col-span-2">These are overwritten from osu! the next time the user signs in.</p>
          <Field label="Country code" name="countryCode" defaultValue={user.countryCode ?? ""} />
          <Field label="Global rank" name="globalRank" type="number" defaultValue={user.globalRank ?? ""} />
          <Field label="pp" name="pp" type="number" step="0.01" defaultValue={user.pp ?? ""} />
          <Field label="Ranked mapsets" name="rankedMapsets" type="number" defaultValue={user.rankedMapsets} />
          <Field label="Loved mapsets" name="lovedMapsets" type="number" defaultValue={user.lovedMapsets} />
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="mb-2 font-bold">Access</legend>
          <div>
            <label className="label" htmlFor="role">
              Role
            </label>
            <select id="role" name="role" defaultValue={user.role} className="field w-40">
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <Check name="isVerified" label="Verified Meridian Member" defaultChecked={user.isVerified} />
          <Check name="isBanned" label="Banned (also pauses all their services)" defaultChecked={user.isBanned} />
        </fieldset>

        <button className="btn btn-primary">Save user</button>
      </form>

      <form action={adminDeleteUser.bind(null, user.id)} className="mt-10 border-t border-line pt-6">
        <p className="mb-3 text-sm text-muted">
          Deleting removes the account, its services and reviews it wrote. Accounts with orders can only be banned.
        </p>
        <button className="btn btn-danger btn-sm">Delete user</button>
      </form>
    </div>
  );
}

function Field({ label, name, ...rest }: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <input id={name} name={name} className="field" {...rest} />
    </div>
  );
}

function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center gap-3">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-4 accent-cue" />
      {label}
    </label>
  );
}
