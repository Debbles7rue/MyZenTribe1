import Image from "next/image";
import Link from "next/link";
import { Lora } from "next/font/google";

const lora = Lora({ subsets: ["latin"] });

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      {/* Logo */}
      <div className="mb-8 grid place-items-center">
        <Image
          src="/logo-myzentribe.png"
          alt="MyZenTribe logo"
          width={520}
          height={520}
          priority
          className="h-auto w-[240px] md:w-[320px] rounded-xl"
        />
      </div>

      {/* Title */}
      <h1 className="text-center text-4xl md:text-5xl font-extrabold tracking-tight">
        <span className={lora.className}>
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

      {/* CTA buttons */}
      <div className="mt-8 flex items-center justify-center gap-3">
        <Link
          href="/auth"
          className="rounded-2xl bg-black px-5 py-2.5 text-white shadow hover:opacity-90"
        >
          Sign up / Sign in
        </Link>

        <Link
          href="#commitment"
          className="rounded-2xl px-5 py-2.5 text-gray-900 shadow border
                     bg-[#EDE6F5] hover:bg-[#E2D4F0] transition"
          aria-label="Read our commitment"
        >
          Our commitment
        </Link>
      </div>

      {/* Intent / Commitment card */}
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
      </section>
    </main>
  );
}
