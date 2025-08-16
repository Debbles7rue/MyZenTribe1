// app/commitment/page.tsx
"use client";

import Link from "next/link";

const COMMITMENTS = [
  {
    title: "No Ads. Ever.",
    body:
      "You will never see invasive banner ads, pop-ups, or unrelated product pitches here. Your experience on MyZenTribe will remain peaceful, focused, and free from the noise that clutters so many other online spaces.",
  },
  {
    title: "Transparent Funding",
    body:
      "We are funded entirely through voluntary donations and, in the future, a simple and affordable membership model. Until January 1, 2026, MyZenTribe is completely free for everyone. After that, you’ll have the option to join with a membership plan — or continue supporting through donations if you wish.",
  },
  {
    title: "Community First",
    body:
      "Our decisions, features, and updates are shaped with you in mind. We welcome feedback and actively listen to our members to make this a space that truly serves the needs of spiritual, wellness, and community-focused individuals.",
  },
  {
    title: "A Safe & Supportive Environment",
    body:
      "We take safety seriously. From clear community guidelines to built-in reporting features, MyZenTribe is committed to creating a space where everyone feels welcome, respected, and protected.",
  },
  {
    title: "Giving Back",
    body:
      "Through features like Karma Corner, community events, and opportunities for members to showcase their skills and services, we aim to create ripples of kindness and support that reach far beyond the screen.",
  },
];

export default function CommitmentPage() {
  return (
    <div className="lavender-page">
      <div className="home-wrap">
        {/* Simple Home tab/button */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 4 }}>
          <Link href="/" className="btn btn-neutral">Home</Link>
        </div>

        <div className="hero-inner" style={{ paddingTop: 24, paddingBottom: 8 }}>
          <h1 className="brand-lockup">
            Our <span className="zen">Commitment</span>
          </h1>
          <p className="hero-text">
            At MyZenTribe, we believe connection, community, and kindness should never be overshadowed by distractions or profit-driven agendas. That’s
