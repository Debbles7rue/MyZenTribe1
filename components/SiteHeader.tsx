"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SiteHeader() {
  const [email, setEmail] = useState<string | null>(null);
  const [theme, setTheme] =
    useState<"spring" | "summer" | "autumn" | "winter">("winter");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const saved = (localStorage.getItem("mzt-theme") as any) || "winter";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/"; // back to home
  };

  const onTheme = (t: "spring" | "summer" | "autumn" | "winter") => {
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("mzt-theme", t);
  };

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand" prefetch={false}>
          {/* optional logo <img className="brand-logo" src="/logo.png" alt="" /> */}
          <span className="brand-name">
            My<span className="brand-zen">Zen</span>Tribe
          </span>
        </Link>

        <nav className="main-nav">
          <Link className="nav-link" href="/calendar">Calendar</Link>
          <Link className="nav-link" href="/communities">Communities</Link>
          <Link className="nav-link" href="/meditation">Meditation room</Link>
          <Link className="nav-link" href="/profile">Profile</Link>
          <Link className="nav-link" href="/karma">Karma Corner</Link>
        </nav>

        <div className="auth-area">
          {/* compact theme dropdown */}
          <select
            className="select"
            value={theme}
            onChange={(e) => onTheme(e.target.value as any)}
            title="Color theme"
          >
            <option value="spring">Spring</option>
            <option value="summer">Summer</option>
            <option value="autumn">Autumn</option>
            <option value="winter">Winter</option>
          </select>

          {/* do NOT show email publicly */}
          {email && <span className="user-chip">Signed in</span>}
          <button className="btn" onClick={signOut}>Sign out</button>
        </div>
      </div>
    </header>
  );
}
