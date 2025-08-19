// components/SiteHeader.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function SiteHeader() {
  const pathname = usePathname();

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
          <Nav href="/business">Business</Nav>
          <Nav href="/karma">Karma Corner</Nav>
        </nav>

        <div className="auth-area">
          <Link href="/messages" className={`btn ${pathname === "/messages" ? "btn-brand" : ""}`}>
            Messages
          </Link>
          <button className="btn" onClick={signOut} aria-label="Sign out">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
