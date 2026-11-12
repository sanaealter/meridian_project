import Link from "next/link";
import { signOut } from "@/auth";
import { getCurrentUser } from "@/lib/session";
import { Avatar } from "./ui";

export async function UserNav() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <Link href="/signin" className="btn btn-primary btn-sm whitespace-nowrap">
        Sign in with osu!
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-4">
      {user.role === "admin" && (
        <Link href="/admin" className="text-gold hover:underline">
          Admin
        </Link>
      )}
      <Link href="/dashboard" className="text-muted hover:text-ink">
        Dashboard
      </Link>
      <Link href={`/u/${user.username}`} aria-label="Your profile">
        <Avatar src={user.image} name={user.username} size={32} />
      </Link>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
      >
        <button className="text-sm text-muted hover:text-ink">Sign out</button>
      </form>
    </div>
  );
}
