import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "@/components/profile-form";

export const metadata = {
  title: "My Profile — MyZenTribe",
  description: "View and edit your MyZenTribe profile.",
};

export default async function ProfilePage() {
  const supabase = createClient();

  // Who's logged in?
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="min-h-[60vh] grid place-items-center">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">You’re not signed in</h1>
          <p className="opacity-80">
            Please sign in to view and edit your profile.
          </p>
          <Link href="/auth" className="inline-block rounded-2xl bg-black px-4 py-2 text-white">
            Sign up / Sign in
          </Link>
        </div>
      </main>
    );
  }

  // Fetch profile row (creates later if missing)
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, bio, location")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <main className="mx-auto max-w-3xl space-y-8">
      <header className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/80 border text-lg font-semibold">
          {initials(user.email)}
        </div>
        <div>
          <h1 className="text-3xl font-bold">My Profile</h1>
          <p className="text-sm opacity-70">{user.email}</p>
        </div>
      </header>

      <section className="rounded-3xl border bg-white/90 p-6 shadow">
        <h2 className="mb-4 text-xl font-semibold">Edit Details</h2>
        <ProfileForm
          initial={{
            full_name: profile?.full_name ?? "",
            bio: profile?.bio ?? "",
            location: profile?.location ?? "",
          }}
        />
      </section>
    </main>
  );
}

function initials(email?: string | null) {
  if (!email) return "U";
  const name = email.split("@")[0] ?? "u";
  return name.slice(0, 2).toUpperCase();
}
