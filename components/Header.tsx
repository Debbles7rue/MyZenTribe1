"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Header() {
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUserEmail(data.user?.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setUserEmail(s?.user?.email ?? null);
    });
    return () => {
      mounted = false;
      sub?.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    // refresh page so UI updates quickly
    window.location.href = "/";
  };

  return (
    <header className="site-header">
      <div className="container-app header-inner">
        <Link href="/" className="brand">
          <img src="/logo.svg" alt="MyZenTribe" className="brand-logo" />
          <span className="brand-name">MyZenTribe</span>
        </Link>

        <nav className="main-nav">
          <Link href="/calendar" className="nav-link">Calendar</Link>
          <Link href="/communities" className="nav-link">Communities</Link>
          <Link href="/meditation" className="nav-link">Meditation room</Link>
          <Link href="/profile" className="nav-link">Profile</Link>
        </nav>

        <div className="auth-area">
          {userEmail ? (
            <>
              <span className="user-chip" title={userEmail}>
                {userEmail}
              </span>
              <button className="btn btn-neutral" onClick={signOut}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/signup" className="btn btn-brand">Sign up</Link>
              <Link href="/login" className="btn btn-neutral">Sign in</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
