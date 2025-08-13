// app/page.tsx
"use client";

import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <>
      {/* Page-only overrides: hide the app nav on the landing page */}
      <style jsx global>{`
        .site-header .main-nav,
        .site-header .auth-area {
          display: none !important;
        }
        .site-header {
          border-bottom: none !important;
          background: transparent !important;
          box-shadow: none !important;
        }
        body {
          background: #f5f3ff; /* lavender like the original */
        }
      `}</style>

      <main className="min-h-screen flex flex-col items-center justify-start p-6">
        {/* Large centered logo (use your uploaded logo) */}
        <div className="mt-8 mb-6">
          <Image
            src="/logo-myzentribe.png"
            alt="MyZenTribe Logo"
            width={250}
            height={250}
            priority
          />
        </div>

        {/* Welcome / intention content */}
        <section className="max-w-4xl text-center space-y-6">
          <h1 className="text-4xl font-bold tracking-tight">
            Welcome to <span className="italic">My</span>Zen
            <span className="italic">Tribe</span>
          </h1>

          <p className="text-lg">
            A space to connect, recharge, and share what matters.
          </p>

          <p className="text-lg">
            From daily mindfulness and gratitude practices to meaningful events,
            MyZenTribe makes it easy to find your people and build something good
            together.
          </p>

          {/* The single primary CTA, like before */}
          <div className="flex justify-center">
            <Link href="/auth" className="rounded-2xl bg-black px-5 py-2.5 text-white">
              Sign up / Sign in
            </Link>
          </div>
        </section>

        {/* Intention card with “Our Commitment” button under it */}
        <section
          id="intention"
          className="mt-10 max-w-3xl rounded-3xl border bg-white/80 p-6 shadow-md text-center"
        >
          <h2 className="mb-2 text-xl font-semibold">Our Intention</h2>
          <p className="mb-5">
            To bring people together across local and global communities, support
            talented small businesses, and encourage every member to play a part
            in making the world a better place.
          </p>

          <Link
            href="/commitment"
            className="inline-block rounded-2xl border px-4 py-2 hover:bg-white"
          >
            Our Commitment
          </Link>
        </section>
      </main>
    </>
  );
}
