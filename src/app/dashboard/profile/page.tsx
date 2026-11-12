import { updateProfile } from "@/app/actions";
import { requireUser } from "@/lib/session";
import { PageTitle } from "@/components/ui";

export const metadata = { title: "Edit profile" };

export default async function EditProfile() {
  const user = await requireUser();
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <PageTitle sub="Your username, avatar and osu! stats come from osu! and update each time you sign in.">
        Edit profile
      </PageTitle>
      <form action={updateProfile} className="space-y-5">
        <div>
          <label className="label" htmlFor="bio">
            Bio
          </label>
          <textarea id="bio" name="bio" rows={6} maxLength={1500} defaultValue={user.bio ?? ""} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="discordHandle">
            Discord username
          </label>
          <input id="discordHandle" name="discordHandle" maxLength={64} defaultValue={user.discordHandle ?? ""} className="field" />
        </div>
        <button className="btn btn-primary">Save profile</button>
      </form>
    </div>
  );
}
