import Link from "next/link";

export const metadata = {
  title: "MyZenTribe — Welcome",
  description:
    "A spiritual wellness community for events, meditation, gratitude, and kind connections.",
};

export default function HomePage() {
  return (
    <section className="grid gap-10 md:grid-cols-2 items-center">
      <div className="space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">
          Welcome to <span className="italic">My</span>Zen
          <span className="italic">Tribe</span>
        </h1>

        <p className="text-lg opacity-85">
          We bring kind people together for healing, growth, and joy—with
          community events, meditation, and gratitude practices that radiate
          good energy into the world.
        </p>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/auth"
            className="px-4 py-2 rounded-2xl bg-black text-white"
          >
            Sign up / Sign in
          </Link>
          <Link
            href="/auth#about"
            className="px-4 py-2 rounded-2xl border"
          >
            Learn more
          </Link>
        </div>

        <ul className="list-disc pl-5 space-y-1 text-sm opacity-80">
          <li>Gentle, inclusive community spaces</li>
          <li>Support for daily meditation & gratitude</li>
          <li>Events that uplift and connect</li>
        </ul>
      </div>

      <div className="rounded-3xl border bg-white/70 p-6 shadow-md">
        <h2 className="font-semibold mb-2">Our Intention</h2>
        <p className="opacity-80">
          A continuous flow of kindness and healing energy shared across our
          community—near and far. Join us and add your light.
        </p>
      </div>
    </section>
  );
}
