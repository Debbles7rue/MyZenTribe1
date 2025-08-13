// app/page.tsx
"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <div className="home-wrap">
      {/* Brand lockup that matches your screenshot: MyZenTribe with Zen italic */}
      <h1 className="brand-lockup" aria-label="MyZenTribe">
        <span className="brand-word">
          My<span className="zen">Zen</span>Tribe
        </span>
      </h1>

      {/* Welcome / Intention */}
      <section className="hero-card">
        <h2 className="hero-title">Welcome</h2>
        <p className="hero-text">
          Our intention is to <strong>connect</strong> people to local and global
          communities, <strong>support</strong> talented small businesses, and{" "}
          <strong>encourage</strong> everyone to make the world a better place — together.
        </p>

        <div className="hero-actions">
          <Link href="/calendar" className="btn btn-brand">Open calendar</Link>
          <a href="#commitment" className="btn btn-neutral subtle">Our commitment</a>
        </div>
      </section>

      {/* Our Commitment */}
      <section id="commitment" className="commitment">
        <h3 className="commitment-title">Our commitment</h3>
        <p className="commitment-sub">
          We promise to keep MyZenTribe kind, safe, and genuinely helpful.
        </p>

        <div className="commitment-grid">
          <div className="commitment-card">
            <h4>Kindness & inclusion</h4>
            <p>We foster kindness, inclusion, and respect for all members.</p>
          </div>

          <div className="commitment-card">
            <h4>Privacy & boundaries</h4>
            <p>We protect your privacy and honor personal boundaries.</p>
          </div>

          <div className="commitment-card">
            <h4>Support small business</h4>
            <p>We uplift makers, wellness pros, and local businesses.</p>
          </div>

          <div className="commitment-card">
            <h4>Growth & connection</h4>
            <p>We encourage personal growth, real connection, and community.</p>
          </div>

          <div className="commitment-card">
            <h4>Spam-free space</h4>
            <p>No spam, scams, or exploitation — ever.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
