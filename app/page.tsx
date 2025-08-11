import Image from "next/image";
import Link from "next/link";
import { Playfair_Display } from "next/font/google";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  style: ["normal", "italic"],
});

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      {/* Logo */}
      <div className="mb-8 grid place-items-center">
        <Image
          src="/logo-myzentribe.png"     // keep this name; swap the file in /public if needed
          alt="MyZenTribe logo"
          width={520}
          height={520}
          priority
          className="h-auto w-[240px] md:w-[320px] rounded-xl"
        />
      </div>

      {/* Wordmark — only Zen italic */}
      <h1 className="text-center text-4xl md:text-5xl tracking-tight">
        <span className={`${playfair.className} font-black`}>
          <span className="not-italic">My</span>
          <span className="italic">Zen</span>
          <span className="not-italic">Tribe</span>
        </span>
      </h1>

      {/* Tagline */}
      <p className="mx-auto mt-4 max-w-2xl text-center text-lg opacity-80">
        A space to connect, recharge, and share what matters.
      </p>
      <p className="mx-auto mt-2 max-w-3xl text-center text-base md:text-lg opacity-80">
        From daily mindfulness and gratitude practices to meaningful events,
        MyZenTribe makes it easy to find your people and build something good
        together.
      </p>

      {/* Primary CTA only (no commitment button here) */}
      <div className="mt-8 flex items-center justify-center">
        <Link
          href="/auth"
          className="rounded-2xl bg-black px-5 py-2.5 text-white shadow hover:opacity-90"
        >
          Sign up / Sign in
        </Link>
      </div>

      {/* Our Intention card with the "Our commitment" button INSIDE */}
      <section
        id="commitment"
        className="mx-auto mt-10 max-w-4xl rounded-3xl border bg-white/90 p-6 shadow"
      >
        <h2 className="text-xl font-semibold mb-3">Our Intention</h2>
        <p className="opacity-90">
          To bring people together across local and global communities, support
          talented small businesses, and encourage every member to play a part
          in making the world a better place.
        </p>

        {/* Commitment button INSIDE the card with soft lavender fill */}
        <div className="mt-4">
          <Link
            href="/commitment"
            className="inline-flex items-center rounded-2xl border px-4 py-2
                       text-gray-900 shadow bg-[#EDE6F5] hover:bg-[#E2D4F0] transition"
          >
            Our commitment
          </Link>
        </div>
      </section>
    </main>
  );
}
