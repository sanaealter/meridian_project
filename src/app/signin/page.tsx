import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Sign in" };

export default async function SignInPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <h1 className="text-3xl font-bold">Sign in with your osu! account</h1>
      <p className="mt-3 text-muted">
        Meridian uses osu! to confirm who you are. We only read your public profile: username, avatar, country, rank and
        mapping history. We never see your password.
      </p>
      <form
        className="mt-8"
        action={async () => {
          "use server";
          await signIn("osu", { redirectTo: "/dashboard" });
        }}
      >
        <button className="btn btn-primary w-full">Continue with osu!</button>
      </form>
    </div>
  );
}
