"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import ThemeSwitch from "@/components/ThemeSwitch";

export default function SiteHeader() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setEmail(data.user?.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header className="site-header">
      <div className="header-inner container-app">
        <Link className="brand" href="/">
          {/* If you have a logo: <img src="/logo.png" className="brand-logo" alt="logo" /> */}
          <span className="brand-name">My<span className="brand-zen">Zen</span>Tribe</span>
        </Link>

        {/* Tabs: only when signed in */}
        <nav className="main-nav">
          {email ? (
            <>
              <Link className="nav-link" href="/profile">Profile</Link>
              <Link className="nav-link" href="/calendar">Calendar</Link>
              <Link className="nav-link" href="/meditation">Meditation</Link>
              <Link className="nav-link" href="/communities">Communities</Link>
              <Link className="nav-link" href="/gratitude">Gratitude</Link>
              <Link className="nav-link" href="/photos">Photos</Link>
            </>
          ) : (
            <>
              <Link className="nav-link" href="/signin">Sign in</Link>
              <Link className="nav-link" href="/#commitment">Our Commitment</Link>
            </>
          )}
        </nav>

        <div className="auth-area">
          <ThemeSwitch />
          {email && <span className="user-chip">{email}</span>}
        </div>
      </div>
    </header>
  );
}
