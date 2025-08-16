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

  const shell: React.CSSProperties = {
    minHeight: "100vh",
    backgroundColor: "#F4ECFF", // lavender
    padding: "48px 16px",
  };
  const container: React.CSSProperties = {
    maxWidth: 880,
    margin: "0 auto",
    textAlign: "center",
  };
  const logo: React.CSSProperties = {
    width: 260,
    height: "auto",
    display: "block",
    margin: "0 auto 24px",
  };
  const card: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 10px 20px rgba(0,0,0,0.05)",
  };
  const h1: React.CSSProperties = { fontSize: 32, fontWeight: 600, margin: 0 };
  const h2: React.CSSProperties = { fontSize: 24, fontWeight: 600, margin: 0 };
  const p: React.CSSProperties = { color: "#374151", marginTop: 12, lineHeight: 1.6 };

  return (
    <main style={shell}>
      <section style={container}>
        {/* Logo */}
        <img src={LOGO_SRC} alt="MyZenTribe Logo" style={logo} loading="lazy" />

        {/* Card 1: Welcome + blurb (white box) */}
        <div style={card}>
          <h1 style={h1}>
            Welcome to <span style={{ color: "#6d28d9" }}>MyZenTribe</span>
          </h1>
          <p style={{ ...p, maxWidth: 720, margin: "12px auto 0" }}>
            A space to connect, recharge, and share what matters. From daily mindfulness and
            gratitude practices to meaningful events, MyZenTribe makes it easy to find your people
            and build something good together.
          </p>

          {/* Centered buttons */}
          <div style={{ marginTop: 18, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {!signedIn ? (
              <>
                <Link href="/signin" className="btn btn-brand">Sign in</Link>
                <Link href="/signin" className="btn btn-neutral">Create profile</Link>
              </>
            ) : (
              <>
                <Link href="/calendar" className="btn btn-brand">Go to Calendar</Link>
                <Link href="/profile" className="btn btn-neutral">Open Profile</Link>
              </>
            )}
          </div>
        </div>

        {/* Card 2: Our Intention (white box with button inside) */}
        <div style={{ ...ca
