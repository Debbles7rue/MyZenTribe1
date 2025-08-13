// app/page.tsx
"use client";

import Link from "next/link";

export default function HomePage() {
  return (
   <div className="home-wrap">
  {/* Brand lockup: MyZenTribe (Zen italic) */}
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
      <a href="/calendar" className="btn btn-brand">Open calendar</a>
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
        <h4>Kindness & Respect</h4>
        <p>We value kindness, understanding, and respectful communication in all interactions.</p>
      </div>

      <div className="commitment-card">
        <h4>Support & Connection</h4>
        <p>We aim to create an uplifting community where people can find connection and encouragement.</p>
      </div>

      <div className="commitment-card">
        <h4>Positive Impact</h4>
        <p>Every event, discussion, and shared moment is an opportunity to make the world a better place.</p>
      </div>

      <div className="commitment-card">
        <h4>Privacy & Boundaries</h4>
        <p>We protect your privacy and honor personal boundaries.</p>
      </div>

      <div className="commitment-card">
        <h4>Spam-Free Space</h4>
        <p>No spam, scams, or exploitation — ever.</p>
      </div>
    </div>
  </section>

  {/* Why We’re Different */}
  <section className="why-wrap">
    <h3 className="why-title">Why we’re different</h3>
    <div className="why-grid">
      <div className="why-card">
        <h4>No Doom Scrolling</h4>
        <p>This is a place for uplifting connection, not endless distractions. Spend more time living, not just looking.</p>
      </div>
      <div className="why-card">
        <h4>No Ads, Ever</h4>
        <p>Your attention is valuable. We’ll never fill your feed with ads or sell your data.</p>
      </div>
      <div className="why-card">
        <h4>Mindful Design</h4>
        <p>Every feature encourages meaningful engagement and real connection — quality over quantity.</p>
      </div>
    </div>
  </section>
</div>
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
