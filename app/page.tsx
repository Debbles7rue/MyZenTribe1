"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function HomePage() {
  // If you keep your logo somewhere else, change this path
  const LOGO_SRC = "/logo.png"; // e.g. /images/myzent_tribe_logo.svg

  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSignedIn(!!data.session?.user?.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setSignedIn(!!session?.user?.id);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <main className="min-h-screen bg-[#F4ECFF]"> {/* soft lavender */}
      <section className="mx-auto max-w-5xl px-6 py-12 text-center">
        {/* Logo */}
        <img
          src={LOGO_SRC}
          alt="MyZenTribe Logo"
          className="mx-auto mb-6 h-16 w-auto"
          loading="lazy"
        />

        {/* Headline */}
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Welcome to <span className="text-brand-600">MyZenTribe</span>
        </h1>

        <p className="mx-auto mt-3 max-w-3xl text-base text-neutral-700">
          A space to connect, recharge, and share what matters. From daily mindfulness and gratitude
          practices to meaningful events, MyZenTribe makes it easy to find your people and build
          something good together.
        </p>

        {/* Primary CTAs */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {!signedIn ? (
            <>
              <Link href="/signin" className="btn btn-brand">
                Sign in
              </Link>
              <Link href="/signin" className="btn btn-neutral">
                Create profile
              </Link>
            </>
          ) : (
            <>
              <Link href="/calendar" className="btn btn-brand">
                Go to Calendar
              </Link>
              <Link href="/profile" className="btn btn-neutral">
                Open Profile
              </Link>
            </>
          )}
        </div>

        {/* Our Intention card */}
        <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-neutral-200 bg-white p-6 text-left shadow">
          <h2 className="text-2xl font-semibold">Our Intention</h2>
          <p className="mt-3 text-neutral-700">
            To bring people together across local and global communities, support talented small
            businesses, and encourage every member to play a part in making the world a better
            place.
          </p>

          <div className="mt-5">
            {/* Link this to wherever your “commitment” content lives (adjust as needed) */}
            <Link href="/good-vibes" className="btn btn-brand">
              Our Commitment
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
