"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);

  // check auth on mount and on route change
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, [pathname]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setEmail(null);
    router.push("/login");
  };

  // simple helper for active tab styling
  const tabClass = (href: string) =>
    `px-3 py-1.5 rounded-full border text-sm ${
      pathname?.startsWith(href) ? "bg-brand-600 text-white" : "bg-white hover:bg-gray-50"
    }`;

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto px-4 h-12 flex items-center gap-4">
        <Link href="/" className="font-semibold">
          My<span className="italic">Zen</span>Tribe
        </Link>

        {/* When logged in, show the app tabs */}
        {email ? (
          <nav className="flex gap-2 flex-1">
            <Link href="/calendar" className={tabClass("/calendar")}>Calendar</Link>
            <Link href="/communities" className={tabClass("/communities")}>Communities</Link>
            <Link href="/meditation" className={tabClass("/meditation")}>Meditation</Link>
            <Link href="/profile" className={tabClass("/profile")}>Profile</Link>
            <Link href="/karma" className={tabClass("/karma")}>Karma Corner</Link>
          </nav>
        ) : (
          <div className="flex-1" />
        )}

        {/* Right side: auth controls */}
        {email ? (
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 rounded-full border bg-white">{email}</span>
            <button onClick={signOut} className="btn">Sign out</button>
          </div>
        ) : (
          <Link href="/login" className="btn btn-brand">Sign in</Link>
        )}
      </div>
    </header>
  );
}
