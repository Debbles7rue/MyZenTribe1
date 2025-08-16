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

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#F4ECFF",
        padding: "48px 16px",
      }}
    >
      <section
        style={{
          maxWidth: 880,
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <img
          src={LOGO_SRC}
          alt="MyZenTribe Logo"
          loading="lazy"
          style={{ width: 260, height: "auto", display: "block", margin: "0 auto 24px" }}
        />

        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            padding: 24,
            boxShadow: "0 10px 20px rgba(0,0,0,0.05)",
          }}
        >
          <h1 style={{ fontSize: 32, fontWeight: 600, margin: 0 }}>
            Welcome to <span style={{ color: "#6d28d9" }}>MyZenTribe</span>
          </h1>
          <p
            style={{
              color: "#374151",
              marginTop: 12,
              lineHeight: 1.6,
              maxWidth: 720,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            A space to connect, recharge, and share what matters. From daily mindfulness and
            gratitude practices to meaningful events, MyZenTribe makes it easy to find your people
            and build something good together.
          </p>

          <div
            style={{
              marginTop: 18,
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            {!signedIn ? (
              <>
                <Link href="/signin" className="btn btn-brand">Sign in</Link>
                <Link href="/signup" className="btn btn-neutral">Create profile</Link>
              </>
            ) : (
              <>
                <Link href="/calendar" className="btn btn-brand">Go to Calendar</Link>
                <Link href="/profile" className="btn btn-neutral">Open Profile</Link>
              </>
            )}
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            padding: 24,
            boxShadow: "0 10px 20px rgba(0,0,0,0.05)",
            marginTop: 24,
            textAlign: "left",
          }}
        >
          <h2 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>Our Intention</h2>
          <p style={{ color: "#374151", marginTop: 12, lineHeight: 1.6 }}>
            To bring people together across local and global communities, support talented small
            businesses, and encourage every member to play a part in making the world a better
            place.
          </p>
          <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
            <Link href="/commitment" className="btn btn-brand">Our Commitment</Link>
          </div
