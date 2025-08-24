// components/SiteHeader.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SiteHeader() {
  const pathname = usePathname();
  const [userId, setUserId] = useState<string | null | "loading">("loading");
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        // Best-effort check; if profiles table/policy is missing, we allow nav.
        const { data: prof, error } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", uid)
          .maybeSingle();
        setHasProfile(error ? true : !!prof);
      } else {
        setHasProfile(false);
      }
    })();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const Nav = ({ href, children }: { href: string; children: React.ReactNode }) => {
    const active =
      pathname === href ||
      (href !== "/" && (pathname?.startsWith(href) ?? false));
    return (
      <Link
        href={href}
        className={`nav-link ${active ? "active" : ""}`}
      >
        {children}
      </Link>
    );
  };

  const showAuthedNav = userId && hasProfile !== false;

  return (
    <header className="site-header">
      <div className="header-inner container-app">
        <Link href="/" className="brand" aria-label="MyZenTribe Home">
          <div className="brand-name">
            <span className="brand-zen">My</span>ZenTribe
          </div>
        </Link>

        {userId === "loading" ? (
          <div style={{ height: 38 }} />
        ) : showAuthedNav ? (
          <>
            <nav className="main-nav">
              <Nav href="/calendar">Calendar</Nav>
              <Nav href="/communities">Communities</Nav>
              <Nav href="/meditation">Meditation room</Nav>
              <Nav href="/profile">Profile</Nav>
              <Nav href="/business">Business</Nav>
              <Nav href="/karma">Karma Corner</Nav>
            </nav>

            <div className="auth-area">
              <Link
                href="/messages"
                className={`btn ${pathname?.startsWith("/messages") ? "btn-brand" : ""}`}
              >
                Messages
              </Link>
              <button className="btn" onClick={signOut} aria-label="Sign out">
                Sign out
              </button>
            </div>
          </>
        ) : (
          <div className="auth-area">
            <Link href="/login" className="btn btn-brand">
              Log in
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
