"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function HomePage() {
  const LOGO_SRC = "/logo-myzentribe.png";
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

  // --- styles (unchanged except: black brand + lavender buttons) ---
  const shell: React.CSSProperties = {
    minHeight: "100vh",
    backgroundColor: "#F4ECFF",
    padding: "48px 16px",
  };
  const container: React.CSSProperties = { maxWidth: 880, margin: "0 auto", textAlign: "center" };
  const card: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 10px 20px rgba(0,0,0,0.05)",
  };
  const logo: React.CSSProperties = {
    width: 260,
    height: "auto",
    display: "block",
    margin: "0 auto 24px",
  };
  const title: React.CSSProperties = { fontSize: 36, fontWeight: 800, margin: 0 };
  const brandBlack: React.CSSProperties = { color: "#111827" }; // <-- black “MyZenTribe”
  const p: React.CSSProperties = {
    color: "#374151",
    marginTop: 12,
    lineHeight: 1.6,
    maxWidth: 720,
    marginLeft: "auto",
    marginRight: "auto",
  };
  const row: React.CSSProperties = {
    marginTop: 18,
    display: "flex",
    gap: 12,
    justifyContent: "center",
    flexWrap: "wrap",
  };

  // Lavender button used everywhere on this page
  const btnLavender: React.CSSProperties = {
    display: "inline-block",
    padding: "10px 18px",
    borderRadius: 14,
    background: "#A78BFA",       // violet-400 (soft lavender)
    color: "#fff",
    fontWeight: 600,
    boxShadow: "0 6px 14px rgba(167,139,250,0.35)",
    border: "1px solid #A78BFA",
  };

  return (
    <main style={shell}>
      <section style={container}>
        {/* Logo */}
        <img src={LOGO_SRC} alt="MyZenTribe Logo" loading="lazy" style={logo} />

        {/* Card 1 */}
        <div style={card}>
          <h1 style={title}>
            Welcome to <span style={brandBlack}>MyZenTribe</span>
          </h1>
          <p style={p}>
            A space to connect, recharge, and share what matters. From daily mindfulness and
            gratitude practices to meaningful events, MyZenTribe makes it easy to find your people
            and build something good together.
          </p>

          <div style={row}>
            {!signedIn ? (
              <>
                <Link href="/signin" style={btnLavender}>Sign in</Link>
                <Link href="/signin" style={btnLavender}>Create profile</Link>
              </>
            ) : (
              <>
                <Link href="/calendar" style={btnLavender}>Go to Calendar</Link>
                <Link href="/profile" style={btnLavender}>Open Profile</Link>
              </>
            )}
          </div>
        </div>

        {/* Card 2 */}
        <div style={{ ...card, marginTop: 24, textAlign: "left" }}>
          <h2 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>Our Intention</h2>
          <p style={{ ...p, marginLeft: 0, marginRight: 0, maxWidth: "unset" }}>
            To bring people together across local and global communities, support talented small
            businesses, and encourage every member to play a part in making the world a better
            place.
          </p>
          <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
            <Link href="/commitment" style={btnLavender}>Our Commitment</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
