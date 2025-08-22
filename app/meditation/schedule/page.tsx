"use client";

import Link from "next/link";

export default function ScheduleHub() {
  return (
    <main className="wrap">
      <header className="head">
        <h1 className="title">Schedule a Meditation</h1>
        <Link href="/meditation" className="btn">← Back to Meditation</Link>
      </header>

      <p className="muted">Choose how you’d like to schedule:</p>

      <section className="grid">
        <article className="card">
          <h2>Solo Session</h2>
          <p>Pick a time and duration. We’ll generate a calendar invite you can add to your device.</p>
          <Link href="/meditation/schedule/solo" className="cta">Schedule solo</Link>
        </article>

        <article className="card">
          <h2>Group Session</h2>
          <p>Create a shared session and invite your community, friends, or a few individuals.</p>
          <Link href="/meditation/schedule/group" className="cta">Start a group session</Link>
        </article>
      </section>

      <style jsx>{`
        .wrap { max-width: 1000px; margin:0 auto; padding:24px; }
        .head { display:flex; align-items:center; justify-content:space-between; }
        .title { font-size:28px; }
        .btn, .cta {
          border:1px solid #dfd6c4; background:linear-gradient(#fff,#f5efe6);
          border-radius:10px; padding:8px 12px; text-decoration:none; color:#2a241c;
        }
        .muted { opacity:.72; margin:12px 0; }
        .grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
        .card { background:#faf7f1; border:1px solid #e7e0d2; border-radius:16px; padding:16px; }
        .card h2 { margin:0 0 6px; }
        .cta { display:inline-block; margin-top:10px; }
        @media (max-width: 820px) { .grid { grid-template-columns:1fr; } }
      `}</style>
    </main>
  );
}
