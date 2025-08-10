import Link from "next/link";

export const metadata = {
  title: "MyZenTribe — Welcome",
  description:
    "A spiritual wellness community for events, meditation, gratitude, and kind connections.",
};

export default function HomePage() {
  return (
    <section className="mx-auto max-w-4xl space-y-6 py-10">
      <h1 className="text-4xl font-bold tracking-tight">
        Welcome to <span className="italic">My</span>Zen<span className="italic">Tribe</span>
      </h1>

      <p className="text-lg opacity-80">
        MyZenTribe is a spiritual wellness community. We host uplifting events,
        support daily meditation and gratitude, and connect kind people who want
        to send healing energy into the world.
      </p>

      <div className="grid gap-4 rounded-2xl border p-6 bg-white/70">
        <h2 className="text-xl font-semibold">Join the Tribe</h2>
        <p className="opacity-80">
          Create an account or sign in to access events, groups, journaling, and more.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/auth"
            className="px-4 py-2 rounded-2xl bg-black text-white"
          >
            Sign up / Sign in
          </Link>
          <Link
            href="/events"
            className="px-4 py-2 rounded-2xl border"
          >
            Explore Events
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold">What is MyZenTribe?</h3>
        <ul className="list-disc pl-5 space-y-1 opacity-90">
          <li>Community-led events for growth, healing, and joy.</li>
          <li>Meditation and gratitude tools to support daily practice.</li>
          <li>Gentle, inclusive spaces to connect with kind people.</li>
        </ul>
      </div>
    </section>
  );
}
