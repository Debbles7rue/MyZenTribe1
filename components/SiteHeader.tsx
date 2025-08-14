"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import ThemeDropdown from "@/components/ThemeDropdown";

export default function SiteHeader() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setSignedIn(!!session?.user)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header className="site-header">
      <div className="header-inner container-app">
        <Link className="brand" href="/">
          <span className="brand-name">My<span className="brand-zen">Zen</span>Tribe</span>
        </Link>

        <nav className="main-nav">
          {signedIn ? (
            <>
              <Link className="nav-link" href="/profile">Profile</Link>
              <Link className="nav-link" href="/calendar">Calendar</Link>
              <Link className="nav-link" href="/meditation">Meditation</Link>
              <Link className="nav-link" href="/communities">Communities</Link>
              <Link className="nav-link" href="/good-vibes">Good Vibes</Link>{/* (Karma + Good News) */}
            </>
          ) : (
            <>
              <Link className="nav-link" href="/signin">Sign in</Link>
              <Link className="nav-link" href="/#commitment">Our Commitment</Link>
            </>
          )}
        </nav>

        <div className="auth-area">
          <ThemeDropdown />
        </div>
      </div>
    </header>
  );
}
