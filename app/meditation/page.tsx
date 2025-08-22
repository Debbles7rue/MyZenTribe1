"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePresenceCount, useTrackPresence } from "@/hooks/usePresence";

type EnvId = "sacred" | "beach" | "creek" | "fire" | "patterns" | "candles";
type Env = { id: EnvId; label: string; image?: string };

const LEFT_ENVS: Env[] = [
  { id: "sacred", label: "Sacred Room",    image: "/mz/sacred-room.jpg" },
  { id: "beach",  label: "Stunning Beach", image: "/mz/beach.jpg" },
];

const RIGHT_ENVS: Env[] = [
  { id: "creek",    label: "Forest Creek",                  image: "/mz/forest-creek.gif" },
  { id: "fire",     label: "Crackling Fire",                image: "/mz/hearth.jpg" },
  { id: "patterns", label: "Meditative Patterns",           image: "/mz/patterns.jpg" },
  { id: "candles",  label: "Light a Candle for Loved Ones", image: "/mz/candle-room.jpg" },
];

const ALL = [...LEFT_ENVS, ...RIGHT_ENVS];

export default function MeditationPage() {
  const [selected, setSelected] = useState<EnvId>("creek");
  const [doorsOpen, setDoorsOpen] = useState(false);
  const current = useMemo(() => ALL.find((e) => e.id === selected), [selected]);

  // When doors are open, we advertise ourselves in the presence channel for that room
  const topic = `mz:env:${selected}`;
  useTrackPresence(topic, doorsOpen && selected !== "candles");

  function choose(id: EnvId) {
    setSelected(id);
    setDoorsOpen(false);
  }

  function onEnter() {
    if (selected === "candles") {
      window.location.href = "/meditation/candles";
      return;
    }
    setDoorsOpen(true);
  }

  function onClose() {
    setDoorsOpen(false);
  }

  return (
    <div className="page-wrap mz-root">
      <div className="page">
        <div className="container-app">
          <div className="mz-header">
            <h1 className="page-title">Enter the Sacred Space</h1>
            <div className="mz-actions">
              <Link href="/meditation/lounge" className="mz-scheduleBtn">
                Public Lounge (chat)
              </Link>
              <Link href="/calendar" className="mz-scheduleBtn">
                Schedule a Meditation
              </Link>
            </div>
          </div>

          <section className="mz-intro">
            When many people meditate together, our nervous systems entrain, stress
            drops, and compassion rises. Our aim is to keep a gentle wave of
            presence moving around the globe—<b>24/7</b>.{" "}
            <Link className="link" href="/whats-new">
              Learn more about collective meditation
            </Link>
          </section>

          <section className="mz-grid">
            <div className="mz-side">
              {LEFT_ENVS.map((env) => (
                <EnvButton
                  key={env.id}
                  id={env.id}
                  label={env.label}
                  on={selected === env.id}
                  onClick={() => choose(env.id)}
                />
              ))}
            </div>

            {/* DOOR FRAME */}
            <div className={`mz-door ${doorsOpen ? "is-immersive" : ""}`}>
              {/* Optional shield (hidden when immersive) */}
              <img src="/mz/shield.png" alt="" className="mz-shield" aria-hidden />

              {/* scene background (behind the doors) */}
              <div
                className="mz-doorBg"
                style={{
                  backgroundImage: current?.image
                    ? `url(${current.image})`
                    : "url(/mz/sacred-room.jpg)",
                  filter: doorsOpen ? "none" : "blur(1px) brightness(0.98)",
                }}
              />

              {/* gentle glow */}
              <div className="mz-lightOverlay" />

              {/* title on closed doors */}
              <div className="mz-doorTitle">ENTER THE SACRED SPACE</div>

              {/* seam */}
              <div className="mz-seam" aria-hidden />

              {/* two door panels */}
              <div className={`mz-panel mz-panel--left ${doorsOpen ? "is-open" : ""}`} aria-hidden />
              <div className={`mz-panel mz-panel--right ${doorsOpen ? "is-open" : ""}`} aria-hidden />

              {/* handles */}
              <span className="mz-handle mz-handle--left" aria-hidden />
              <span className="mz-handle mz-handle--right" aria-hidden />

              {/* controls */}
              {!doorsOpen ? (
                <button className="mz-enterBtn" onClick={onEnter}>ENTER</button>
              ) : (
                <button className="mz-closeBtn" onClick={onClose} aria-label="Close Doors" />
              )}
            </div>

            <div className="mz-side">
              {RIGHT_ENVS.map((env) => (
                <EnvButton
                  key={env.id}
                  id={env.id}
                  label={env.label}
                  on={selected === env.id}
                  onClick={() => choose(env.id)}
                />
              ))}
            </div>
          </section>

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
          --sand-2: #f3ebdd;
          --sand-3: #e7dbc3;
          --ink: #2a241c;
          --gold: #c9b27f;
          --door-edge: rgba(255, 255, 255, 0.18);
        }

        .mz-root { position: relative; z-index: 999; }

        .mz-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .mz-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .mz-scheduleBtn {
          border: 1px solid #dfd6c4;
          background: linear-gradient(#fff, #f5efe6);
          border-radius: 10px;
          padding: 8px 12px;
          font-size: 14px;
          text-decoration: none;
          color: var(--ink);
        }
        .mz-scheduleBtn:hover { filter: brightness(0.98); }

        body {
          background: radial-gradient(1200px 500px at 50% -200px, #efe7da, #e5dccb 60%, #ddd1bd 100%);
        }
        .page-title { color: var(--ink); }

        .mz-intro {
          background: var(--sand-2);
          border: 1px solid var(--sand-3);
          border-radius: 14px;
          padding: 12px 14px;
          margin: 12px 0 14px;
          color: var(--ink);
        }

        .mz-grid {
          display: grid;
          grid-template-columns: 1fr minmax(560px, 860px) 1fr;
          gap: 16px;
          align-items: stretch;
        }
        .mz-side {
          display: grid;
          gap: 12px;
          align-content: start;
          position: relative;
          z-index: 3;
        }
        .mz-choice {
          display: grid;
          grid-template-columns: 18px 1fr auto; /* <- space for the pill */
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid var(--sand-3);
          background: #ffffffcc;
          color: var(--ink);
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          transition: transform 0.06s, box-shadow 0.06s, background 0.06s;
          cursor: pointer;
          text-align: left;
        }
        .mz-choice:hover { transform: translateY(-1px); box-shadow: 0 10px 22px rgba(0,0,0,0.12); }
        .mz-choice--on { outline: 2px solid var(--gold); background: #fff; }
        .mz-candle {
          width: 10px; height: 14px; border-radius: 3px;
          background: linear-gradient(#ffe8a9, #ffbf5b);
          box-shadow: 0 0 10px #ffd98c, 0 0 2px #fff inset;
        }
        .mz-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .mz-pill {
          padding: 2px 8px;
          border-radius: 999px;
          border: 1px solid var(--sand-3);
          background: #efe7da;
          font-size: 12px;
          color: #6b5a3c;
        }

        .mz-door {
          position: relative;
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid var(--sand-3);
          background: #f1eadf;
          min-height: 580px;
          box-shadow: 0 14px 40px rgba(0,0,0,0.12);
          perspective: 1400px;
          z-index: 10;
        }
        .mz-door.is-immersive {
          position: fixed; inset: 0; border-radius: 0; min-height: 100vh;
          z-index: 1000; box-shadow: none;
        }
        .mz-door.is-immersive .mz-doorTitle,
        .mz-door.is-immersive .mz-seam,
        .mz-door.is-immersive .mz-shield { display: none; }

        .mz-doorBg {
          position: absolute; inset: 0;
          background-size: cover; background-position: center;
          transition: filter 0.5s; z-index: 0;
        }
        .mz-lightOverlay {
          position: absolute; inset: 0;
          background:
            radial-gradient(700px 220px at 50% 8%, rgba(255,248,228,0.55), transparent 60%),
            radial-gradient(900px 500px at 50% 100%, rgba(255,255,255,0.22), transparent 60%);
          pointer-events: none; z-index: 1;
        }
        .mz-doorTitle {
          position: absolute; top: 14px; left: 0; right: 0; text-align: center;
          letter-spacing: 0.22em; font-weight: 700; color: #5d4b2c; text-shadow: 0 1px 0 #fff;
          z-index: 5; pointer-events: none;
        }
        .mz-seam {
          position: absolute; top: 0; bottom: 0; left: 50%;
          width: 1px; transform: translateX(-0.5px);
          background: linear-gradient(to bottom, rgba(0,0,0,0.25), rgba(0,0,0,0.08), rgba(0,0,0,0.25));
          z-index: 2; opacity: 0.35; pointer-events: none;
        }

        .mz-shield {
          position: absolute; inset: 0; object-fit: cover;
          opacity: .28; mix-blend-mode: screen; pointer-events: none; z-index: 2;
        }

        .mz-panel {
          position: absolute; top: 0; bottom: 0; width: 50%; z-index: 4;
          background-image: url("/mz/doors-1920.webp");
          background-size: 200% 100%;
          box-shadow: inset 0 0 40px rgba(0,0,0,0.28), 0 10px 30px rgba(0,0,0,0.18);
          transition: transform 1s cubic-bezier(0.18, 0.82, 0.2, 1), box-shadow 0.6s;
          transform-style: preserve-3d; backface-visibility: hidden;
        }
        .mz-panel::after {
          content: ""; position: absolute; inset: 0;
          box-shadow: inset 0 0 60px rgba(0,0,0,0.25); pointer-events: none;
        }
        .mz-panel--left  { left: 0; transform-origin: left center;  background-position: left center;  border-right: 1px solid var(--door-edge); }
        .mz-panel--right { right: 0; transform-origin: right center; background-position: right center; border-left: 1px solid var(--door-edge); }
        .mz-panel--left.is-open  { transform: rotateY(-100deg); }
        .mz-panel--right.is-open { transform: rotateY(100deg); }

        .mz-handle {
          position: absolute; top: 50%; transform: translateY(-50%);
          width: 18px; height: 18px; border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #fff2c0, #b48e47 55%, #6a5529 100%);
          box-shadow: 0 2px 4px rgba(0,0,0,0.35), inset 0 1px 1px rgba(255,255,255,0.7);
          z-index: 6;
        }
        .mz-handle--left  { left: calc(50% - 40px); }
        .mz-handle--right { right: calc(50% - 40px); }

        .mz-enterBtn {
          position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%);
          padding: 10px 16px; border-radius: 12px;
          background: var(--gold); color: #221b0f; border: 1px solid #b59f6c;
          font-weight: 700; box-shadow: 0 6px 16px rgba(0,0,0,0.18);
          z-index: 6; cursor: pointer;
        }
        .mz-closeBtn {
          position: absolute; top: 14px; right: 14px; width: 36px; height: 36px;
          border-radius: 999px; background: rgba(255,255,255,0.9);
          border: 1px solid var(--sand-3); box-shadow: 0 8px 20px rgba(0,0,0,0.12);
          z-index: 7; cursor: pointer;
        }
        .mz-closeBtn::before, .mz-closeBtn::after {
          content: ""; position: absolute; top: 50%; left: 50%; width: 16px; height: 2px; background: #333; transform-origin: center;
        }
        .mz-closeBtn::before { transform: translate(-50%, -50%) rotate(45deg); }
        .mz-closeBtn::after  { transform: translate(-50%, -50%) rotate(-45deg); }

        .mz-counters {
          margin-top: 18px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
        }
        .mz-counter { background: #fff; border: 1px solid var(--sand-3); border-radius: 14px; padding: 14px; color: var(--ink); }
        .mz-num { font-size: 28px; font-weight: 800; line-height: 1; }
        .mz-cap { opacity: 0.75; margin-top: 4px; }

        @media (max-width: 880px) {
          .mz-grid { grid-template-columns: 1fr; }
          .mz-side { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </div>
  );
}

/** Small button component with the presence badge */
function EnvButton({
  id,
  label,
  on,
  onClick,
}: {
  id: EnvId;
  label: string;
  on: boolean;
  onClick: () => void;
}) {
  const here = usePresenceCount(`mz:env:${id}`);
  return (
    <button className={`mz-choice ${on ? "mz-choice--on" : ""}`} onClick={onClick}>
      <span className="mz-candle" aria-hidden />
      <span className="mz-label">{label}</span>
      <span className="mz-pill">{here}</span>
    </button>
  );
}
