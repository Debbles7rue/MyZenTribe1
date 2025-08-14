"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Header() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const pathname = usePathname();

  // Apply saved theme on every page load so routes match the chosen season
  useEffect(() => {
    const saved = localStorage.getItem("mzt_theme");
    if (saved) document.documentElement.setAttribute("data-theme", saved);
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUserEmail(data.user?.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });
    return () => {
      mounted = false;
      sub?.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/"; // refresh UI quickly
  };

  // Hide Sign up / Sign in on the calendar page if not logged in
  const hideAuthOnCalendar = pathname === "/calendar" && !userEmail;

  return (
    <header className="site-header">
      <div className="container-app header-inner">
        <Link href="/" className="brand">
          {/* Hide the tiny logo for now to reduce visual noise */}
          {/* <img src="/logo.svg" alt="MyZenTribe" className="brand-logo" /> */}
          <span className="brand-name">
            My<em className="brand-zen">Zen</em>Tribe
          </span>
        </Link>

        <nav className="main-nav">
          <Link href="/login">Sign in</Link>
          <Link href="/calendar" className="nav-link">Calendar</Link>
          <Link href="/communities" className="nav-link">Communities</Link>
          <Link href="/meditation" className="nav-link">Meditation room</Link>
          <Link href="/profile" className="nav-link">Profile</Link>
        </nav>

        {!hideAuthOnCalendar && (
          <div className="auth-area">
            {userEmail ? (
              <>
                <span className="user-chip" title={userEmail}>{userEmail}</span>
                <button className="btn btn-neutral" onClick={signOut}>Sign out</button>
              </>
            ) : (
              <>
                <Link href="/signup" className="btn btn-brand">Sign up</Link>
                <Link href="/login" className="btn btn-neutral">Sign in</Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
