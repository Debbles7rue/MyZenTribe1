"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page">
      <div className="container-app">
        {/* Brand name matching header (Georgia with italic Zen) */}
        <h1 className="page-title" style={{ marginBottom: 6 }}>
          <span style={{ fontFamily: "Georgia, serif", fontWeight: "bold" }}>
            My<em style={{ fontStyle: "italic" }}>Zen</em>Tribe
          </span>
        </h1>

        {/* Intro / intention card */}
        <section className="card p-3" style={{ marginBottom: 12 }}>
          <h2 className="page-title" style={{ fontSize: 22, margin: "0 0 8px" }}>
            Our Intention
          </h2>
          <p className="muted" style={{ fontSize: 16, lineHeight: 1.6, color: "#111827" }}>
            Welcome to MyZenTribe — a space where connection, community, and healing come together.
            Our mission is to connect people to local and global communities, support talented small
            businesses, and encourage everyone to make the world a better place.
          </p>

          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <Link href="/commitment" className="btn">
              Our Commitment
            </Link>
          </div>
        </section>

        {/* Auth actions */}
        <section className="card p-3">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/signup" className="btn btn-brand">
              Sign Up
            </Link>
            <Link href="/login" className="btn btn-neutral">
              Sign In
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
