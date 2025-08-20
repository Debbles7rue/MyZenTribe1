// app/meditation/page.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type EnvId = "sacred" | "beach" | "lake" | "creek" | "patterns" | "candles";

type Env = {
  id: EnvId;
  label: string;
  image?: string; // served from /public
};

const LEFT: Env[] = [
  { id: "sacred",   label: "Sacred Room",            image: "/meditation/sacred-room.jpg" },
  { id: "beach",    label: "Stunning Beach",         image: "/meditation/beach.jpg" },
  { id: "lake",     label: "Peaceful Lake",          image: "/meditation/lake.jpg" },
];

const RIGHT: Env[] = [
  // 👉 your animated GIF
  { id: "creek",    label: "Forest Creek",           image: "/meditation/forest-creek.gif" },
  { id: "patterns", label: "Meditative Patterns",    image: "/meditation/patterns.jpg" },
  { id: "candles",  label: "Light a Candle for Loved Ones", image: "/meditation/candle-room.jpg" },
];

const ALL = [...LEFT, ...RIGHT];

export default function MeditationPage() {
  // default to creek so you can instantly see your GIF
  const [selected, setSelected] = useState<EnvId>("creek");

  const current = useMemo(() => {
    return ALL.find((e) => e.id === selected);
  }, [selected]);

  return (
    <div className="page-wrap">
      <div className="page">
        <div className="container-app">

          {/* header / intro */}
          <h1 className="page-title">Enter the Sacred Space</h1>

          <section className="intro-card">
            <p>
              When many people meditate together, our nervous systems entrain, stress drops, and compassion rises.
              Our aim is to keep a gentle wave of presence moving around the globe—<b>24/7</b>.
              <span className="spacer" />
              <Link className="link" href="/whats-new">Learn more about collective meditation</Link>
            </p>
          </section>

          <section className="door-layout">
            {/* Left choices */}
            <div className="side">
              {LEFT.map((env) => (
                <button
                  key={env.id}
                  className={`choice ${selected === env.id ? "choice-on" : ""}`}
                  onClick={() => setSelected(env.id)}
                >
                  <span className="candle-dot" />
                  <span className="choice-label">{env.label}</span>
                </button>
              ))}
            </div>

            {/* The “door” / room */}
            <div className="door">
              <div
                className="door-bg"
                // Use inline style to ensure GIFs animate and images show reliably
                style={{
                  backgroundImage: current?.image
                    ? `url(${current.image})`
                    : "url(/meditation/door-parchment.jpg)",
                }}
              />
              <div className="door-top-title">ENTER THE SACRED SPACE</div>

              {selected === "candles" && (
                <button
                  className="enter-btn"
                  onClick={() => (window.location.href = "/meditation/candles")}
                >
                  Go to Candle Room
                </button>
              )}
            </div>

            {/* Right choices */}
            <div className="side">
              {RIGHT.map((env) => (
                <button
                  key={env.id}
                  className={`choice ${selected === env.id ? "choice-on" : ""}`}
                  onClick={() => setSelected(env.id)}
                >
                  <span className="candle-dot" />
                  <span className="choice-label">{env.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Counters (wire to Supabase later) */}
          <section className="counters">
            <div className="counter">
              <div className="num">0</div>
              <div className="cap">meditating now</div>
            </div>
            <div className="counter">
              <div className="num">0</div>
              <div className="cap">in the last 24 hours</div>
            </div>
          </section>
        </div>
      </div>

      {/* Style block – lighter, “sandy” palette with strong contrast */}
      <style jsx global>{`
        :root {
          --sand-1: #faf5ec;
          --sand-2: #f3ebdd;
          --sand-3: #e7dbc3;
          --ink: #2a241c;
          --ink-soft: #4a4339;
          --brand-gold: #c9b27f;
        }

        body { background: radial-gradient(1200px 500px at 50% -200px, #efe7da, #e5dccb 60%, #ddd1bd 100%); }

        .page-title { color: var(--ink); }

        .intro-card {
          background: var(--sand-2);
          color: var(--ink);
          border: 1px solid var(--sand-3);
          border-radius: 14px;
          padding: 12px 14px;
          margin-bottom: 16px;
        }
        .intro-card .spacer { display: inline-block; width: 10px; }
        .link { text-decoration: underline; color: #4d4a40; }

        .door-layout {
          display: grid;
          grid-template-columns: 1fr minmax(520px, 820px) 1fr;
          gap: 16px;
          align-items: stretch;
        }

        .side {
          display: grid;
          gap: 12px;
          align-content: start;
        }

        .choice {
          display: grid;
          grid-template-columns: 18px 1fr;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          background: rgba(255,255,255,.72);
          color: var(--ink);
          border: 1px solid var(--sand-3);
          border-radius: 14px;
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(0,0,0,.08);
          transition: transform .06s ease, box-shadow .06s ease, background .06s ease;
        }
        .choice:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 22px rgba(0,0,0,.12);
          background: rgba(255,255,255,.85);
        }
        .choice-on {
          outline: 2px solid var(--brand-gold);
          background: #fff;
        }
        .candle-dot {
          width: 10px; height: 14px; border-radius: 3px;
          background: linear-gradient(#ffe8a9, #ffbf5b);
          box-shadow: 0 0 10px #ffd98c, 0 0 2px #fff inset;
        }
        .choice-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .door {
          position: relative;
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid var(--sand-3);
          background: #f1eadf;
          min-height: 520px;
          box-shadow: 0 14px 40px rgba(0,0,0,.12);
        }
        .door-bg {
          position: absolute; inset: 0;
          background-size: cover;
          background-position: center;
          filter: brightness(1.02) contrast(1.02);
        }
        /* gentle “cathedral light” overlay instead of heavy darkness */
        .door::after {
          content: "";
          position: absolute; inset: 0;
          background:
            radial-gradient(700px 220px at 50% 8%, rgba(255,248,228,.55), transparent 60%),
            radial-gradient(900px 500px at 50% 100%, rgba(255,255,255,.22), transparent 60%);
          pointer-events: none;
        }
        .door-top-title {
          position: absolute; top: 14px; left: 0; right: 0;
          text-align: center;
          letter-spacing: .22em;
          font-weight: 700;
          color: #5d4b2c;
          text-shadow: 0 1px 0 #fff;
        }
        .enter-btn {
          position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%);
          padding: 10px 16px; border-radius: 12px;
          background: var(--brand-gold); color: #221b0f;
          border: 1px solid #b59f6c; font-weight: 700;
          box-shadow: 0 6px 16px rgba(0,0,0,.18);
        }

        .counters {
          margin-top: 18px;
          display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
        }
        .counter {
          background: #fff;
          border: 1px solid var(--sand-3);
          border-radius: 14px; padding: 14px;
          color: var(--ink);
        }
        .counter .num { font-size: 28px; font-weight: 800; line-height: 1; }
        .counter .cap { opacity: .75; margin-top: 4px; }
      `}</style>
    </div>
  );
}
