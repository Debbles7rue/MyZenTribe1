"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page">
      {/* Lavender hero */}
      <div className="lavender-hero">
        <div className="container-app hero-inner">
          <h1 className="brand-display">
            <span style={{ fontFamily: "Georgia, serif", fontWeight: "bold" }}>
              My<em style={{ fontStyle: "italic" }}>Zen</em>Tribe
            </span>
          </h1>
          <p className="hero-tagline">Feel the vibe, find your tribe.</p>

          <div className="hero-actions">
            <Link href="/signup" className="btn btn-brand">Sign Up</Link>
            <Link href="/login" className="btn btn-neutral">Sign In</Link>
          </div>
        </div>
      </div>

      {/* Intention section */}
      <div className="container-app">
        <section className="card p-3 home-card center-wrap">
          <h2 className="home-section-title">Our Intention</h2>
          <p className="home-copy">
            Welcome to MyZenTribe — a space where connection, community, and healing come together.
            Our mission is to connect people to local and global communities, support talented small
            businesses, and encourage everyone to make the world a better place.
          </p>
          <div style={{ marginTop: 10 }}>
            <Link href="/commitment" className="btn">Our Commitment</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
