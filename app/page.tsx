// app/page.tsx
"use client";

import Link from "next/link";

export default function HomePage() {
 return (
  <div className="home-wrap">
    {/* Brand / Welcome */}
    <div className="hero-card">
      <h1 className="brand-lockup">
        My<span className="zen">Zen</span>Tribe
      </h1>
      <h2 className="hero-title">Welcome to Your Community</h2>
      <p className="hero-text">
        Our intention is to connect people to local and global communities,
        support talented small businesses, and encourage everyone to make the
        world a better place.
      </p>
      <div className="hero-actions">
        <a href="/signup" className="btn btn-brand">Join Now</a>
        <a href="/about" className="btn subtle">Learn More</a>
      </div>
    </div>

    {/* Commitment */}
    <section className="commitment">
      <h3 className="commitment-title">Our Commitment</h3>
      <p className="commitment-sub">What makes MyZenTribe special</p>
      <div className="commitment-grid">
        <div className="commitment-card">
          <h4>No Ads, Ever</h4>
          <p>We believe in real connection without distraction or data mining.</p>
        </div>
        <div className="commitment-card">
          <h4>No Doom-Scrolling</h4>
          <p>Our platform encourages mindful, uplifting interactions only.</p>
        </div>
        <div className="commitment-card">
          <h4>Kindness & Respect</h4>
          <p>We uphold clear community agreements so all feel safe and valued.</p>
        </div>
      </div>
    </section>

    {/* Why We’re Different */}
    <section className="why-wrap">
      <h3 className="why-title">Why We’re Different</h3>
      <div className="why-grid">
        <div className="why-card">
          <h4>Mindful by Design</h4>
          <p>Features are built to foster positivity, not endless scrolling.</p>
        </div>
        <div className="why-card">
          <h4>Community First</h4>
          <p>We spotlight members’ talents, events, and kindness challenges.</p>
        </div>
        <div className="why-card">
          <h4>Aligned with Your Values</h4>
          <p>Our mission is about wellness, connection, and collective good.</p>
        </div>
      </div>
    </section>
  </div>
);
