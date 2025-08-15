// components/SiteHeader.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SiteHeader() {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/"; // back to home
  };

  const Nav = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <Link href={href} className={`nav-link ${pathname === href ? "active" : ""}`}>
      {children}
    </Link>
  );

  return (
    <header className="site-header">
      <div className="header-inner container-app">
        <Link href="/" className="brand" aria-label="MyZenTribe Home">
          {/* optional logo <img className="brand-logo" src="/logo.png" alt="" /> */}
          <div className="brand-name">
            <span className="brand-zen">My</span>ZenTribe
          </div>
        </Link>

        <nav className="main-nav">
          <Nav href="/calendar">Calendar</Nav>
          <Nav href="/communities">Communities</Nav>
          <Nav href="/meditation">Meditation room</Nav>
          <Nav href="/profile">Profile</Nav>
          <Nav href="/karma">Karma Corner</Nav>
        </nav>

        <div className="auth-area">
          {/* We hide the actual email for privacy */}
          {email && <span className="user-chip">Signed in</span>}
          <button className="btn" onClick={signOut}>Sign out</button>
        </div>
      </div>
    </header>
  );
}
