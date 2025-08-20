// app/meditation/page.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type EnvId = "sacred" | "beach" | "lake" | "creek" | "patterns" | "candles";

type Env = {
  id: EnvId;
  label: string;
  image?: string; // path under /public
};

const LEFT_ENVS: Env[] = [
  { id: "sacred",   label: "Sacred Room",  image: "/meditation/sacred-room.jpg" },
  { id: "beach",    label: "Stunning Beach", image: "/meditation/beach.jpg" },
  { id: "lake",     label: "Peaceful Lake",  image: "/meditation/lake.jpg" },
];

const RIGHT_ENVS: Env[] = [
  { id: "creek",    label: "Forest Creek",  image: "/meditation/forest-creek.gif" }, // <-- your GIF
  { id: "patterns", label: "Meditative Patterns", image: "/meditation/patterns.jpg" },
  { id: "candles",  label: "Light a Candle for Loved Ones", image: "/meditation/candle-room.jpg" },
];

const ALL = [...LEFT_ENVS, ...RIGHT_ENVS];

export default function MeditationPage() {
  // default to creek so you can instantly see your GIF
  const [selected, setSelected] = useState<EnvId>("creek");

  const current = useMemo(() => ALL.find((e) => e.id === selected), [selected]);

  return (
    <div className="page-wrap">
      <div className="page">
        <div className="container-app">
          <h1 className="page-title">Enter the Sacred Space</h1>

          <section className="mz-intro">
            When many people meditate together, our nervous systems entrain, stress drops, and compassion rises.
            Our aim is to keep a gentle wave of presence moving around the globe—<b>24/7</b>.{" "}
            <Link className="link" href="/whats-new">Learn more about collective meditation</Link>
          </section>

          <section className="mz-grid">
            {/* Left column */}
            <div className="mz-side">
              {LEFT_ENVS.map((env) => (
                <button
                  key={env.id}
                  className={`mz-choice ${selected === env.id ? "mz-choice--on" : ""}`}
                  onClick={() => setSelected(env.id)}
                  aria-pressed={selected === env.id}
                >
                  <span className="mz-candle" aria-hidden />
                  <span className="mz-label">{env.label}</span>
                </button>
              ))}
            </div>

            {/* Door / Room */}
            <div className="mz-door">
              <div
                className="mz-doorBg"
                style={{
                  backgroundImage: current?.image
                    ? `url(${current.image})`
                    : "url(/meditation/door-parchment.jpg)",
                }}
              />
              <div className="mz-doorTitle">ENTER THE SACRED SPACE</div>

              {selected === "candles" && (
                <button
                  className="mz-enterBtn"
                  onClick={() => (window.location.href = "/meditation/candles")}
                >
                  Go to Candle Room
                </button>
              )}
            </div>

            {/* Right column */}
            <div className="mz-side">
              {RIGHT_ENVS.map((env) => (
                <button
                  key={env.id}
                  className={`mz-choice ${selected === env.id ? "mz-choice--on" : ""}`}
                  onClick={() => setSelected(env.id)}
                  aria-pressed={selected === env.id}
                >
                  <span className="mz-candle" aria-hidden />
                  <span className="mz-label">{env.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Counters – placeholders for now */}
          <section className="mz-counters">
            <div className="mz-counter">
              <div className="mz-num">0</div>
              <div className="mz-cap">meditating now</div>
            </div>
            <div className="mz-counter">
              <div className="mz-num">0</div>
              <div className="mz-cap">in the last 24 hours</div>
            </div>
          </section>
        </div>
      </div>

      <style jsx global>{`
        :root {
          --sand-1: #faf5ec;
          --sand-2: #f3ebdd;
          --sand-3: #e7dbc3;
          --ink: #2a241c;
          --gold: #c9b27f;
        }

        body { background: radial-gradient(1200px 500px at 50% -200px, #efe7da, #e5dccb 60%, #ddd1bd 100%); }
        .page-title { color: var(--ink); }

        .mz-intro {
          background: var(--sand-2);
          border: 1px solid var(--sand-3);
          border-radius: 14px;
          padding: 12px 14px;
          margin-bottom: 14px;
          color: var(--ink);
        }

        .mz-grid {
          display: grid;
          grid-template-columns: 1fr minmax(540px, 820px) 1fr;
          gap: 16px;
          align-items: stretch;
        }

        .mz-side {
          display: grid;
          gap: 12px;
          align-content: start;
          position: relative;
          z-index: 1; /* ensure nothing overlays the buttons */
        }

        .mz-choice {
          display: grid;
          grid-template-columns: 18px 1fr;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          width: 100%;
          border-radius: 14px;
          border: 1px solid var(--sand-3);
          background: #ffffffcc;
          color: var(--ink);
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(0,0,0,.08);
          transition: transform .06s ease, box-shadow .06s ease, background .06s ease;
          cursor: pointer;
          text-align: left;
        }
        .mz-choice:hover { transform: translateY(-1px); box-shadow: 0 10px 22px rgba(0,0,0,.12); }
        .mz-choice--on { outline: 2px solid var(--gold); background: #fff; }

        .mz-candle {
          width: 10px; height: 14px; border-radius: 3px;
          background: linear-gradient(#ffe8a9, #ffbf5b);
          box-shadow: 0 0 10px #ffd98c, 0 0 2px #fff inset;
        }
        .mz-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .mz-door {
          position: relative;
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid var(--sand-3);
          background: #f1eadf;
          min-height: 520px;
          box-shadow: 0 14px 40px rgba(0,0,0,.12);
          z-index: 0;
        }
        .mz-doorBg {
          position: absolute; inset: 0;
          background-size: cover;
          background-position: center;
          filter: brightness(1.03) contrast(1.02);
        }
        .mz-door::after {
          content: "";
          position: absolute; inset: 0;
          background:
            radial-gradient(700px 220px at 50% 8%, rgba(255,248,228,.55), transparent 60%),
            radial-gradient(900px 500px at 50% 100%, rgba(255,255,255,.22), transparent 60%);
          pointer-events: none; /* don't block clicks */
        }
        .mz-doorTitle {
          position: absolute; top: 14px; left: 0; right: 0;
          text-align: center; letter-spacing: .22em; font-weight: 700;
          color: #5d4b2c; text-shadow: 0 1px 0 #fff;
          z-index: 2; pointer-events: none;
        }
        .mz-enterBtn {
          position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%);
          padding: 10px 16px; border-radius: 12px;
          background: var(--gold); color: #221b0f;
          border: 1px solid #b59f6c; font-weight: 700;
          box-shadow: 0 6px 16px rgba(0,0,0,.18);
          z-index: 2;
        }

        .mz-counters {
          margin-top: 18px;
          display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
        }
        .mz-counter {
          background: #fff; border: 1px solid var(--sand-3);
          border-radius: 14px; padding: 14px; color: var(--ink);
        }
        .mz-num { font-size: 28px; font-weight: 800; line-height: 1; }
        .mz-cap { opacity: .75; margin-top: 4px; }
      `}</style>
    </div>
  );
}
