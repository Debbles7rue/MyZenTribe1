// app/meditation/page.tsx
"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";

type EnvId = "sacred" | "beach" | "lake" | "creek" | "patterns" | "candles";

type EnvConfig = {
  id: EnvId;
  label: string;
  // Use image for GIFs; you can also add video later if you want
  image?: string; // served from /public
  // optional audio loop for ambience (you can drop files in /public/sounds)
  sound?: string;
};

const ENVS: EnvConfig[] = [
  { id: "sacred",   label: "Sacred Room", image: "/meditation/sacred-room.jpg" },
  { id: "beach",    label: "Stunning Beach", image: "/meditation/beach.jpg", sound: "/sounds/beach-waves.mp3" },
  { id: "lake",     label: "Peaceful Lake", image: "/meditation/lake.jpg", sound: "/sounds/lake-breeze.mp3" },
  // ⬇⬇ Your GIF goes here
  { id: "creek",    label: "Forest Creek", image: "/meditation/forest-creek.gif", sound: "/sounds/forest-creek.mp3" },
  { id: "patterns", label: "Meditative Patterns", image: "/meditation/patterns.jpg" },
  { id: "candles",  label: "Light a candle for loved ones", image: "/meditation/candle-room.jpg" },
];

export default function MeditationPage() {
  const [selected, setSelected] = useState<EnvId | null>("creek"); // default to show your GIF immediately
  const [soundMode, setSoundMode] = useState<"nature" | "frequency" | "off">("off");
  const [volume, setVolume] = useState(0.6);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const envMap = useMemo(() => {
    const m: Record<EnvId, EnvConfig> = {} as any;
    ENVS.forEach((e) => (m[e.id] = e));
    return m;
  }, []);

  const current = selected ? envMap[selected] : null;

  // pick audio source based on selection + sound mode
  const audioSrc = useMemo(() => {
    if (!current || soundMode === "off") return undefined;
    if (soundMode === "frequency") return "/sounds/432hz.mp3"; // drop a file later or change name
    return current.sound; // nature sounds by default, if provided
  }, [current, soundMode]);

  return (
    <div className="page-wrap">
      <div className="page">
        <div className="container-app">

          {/* Intro banner */}
          <section className="mx-auto mb-5 rounded-xl p-4"
                   style={{ background: "#eee4d8", color: "#3a2d1f", border: "1px solid #e3dccf" }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Enter the Sacred Space</div>
            <div style={{ lineHeight: 1.5 }}>
              When many people meditate together, our nervous systems entrain, stress drops, and compassion rises.
              Our aim is to keep a gentle wave of presence moving around the globe—<b>24/7</b>.{" "}
              <Link href="/whats-new" className="link">Learn more about collective meditation</Link>
            </div>
          </section>

          {/* Panel with options */}
          <section className="card card-lg" style={{ background: "#2b2d30", color: "#e9e4dc" }}>
            <div className="muted mb-2">Environment</div>
            <div className="env-grid">
              {ENVS.map((env) => (
                <button
                  key={env.id}
                  className={`env-pill ${selected === env.id ? "env-pill-active" : ""}`}
                  onClick={() => setSelected(env.id)}
                >
                  <span>{env.label}</span>
                </button>
              ))}
            </div>

            <div className="muted mt-4">Sound</div>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                className={`chip ${soundMode === "nature" ? "chip-on" : ""}`}
                onClick={() => setSoundMode("nature")}
              >
                Nature sounds
              </button>
              <button
                className={`chip ${soundMode === "frequency" ? "chip-on" : ""}`}
                onClick={() => setSoundMode("frequency")}
              >
                Frequencies
              </button>
              <button
                className={`chip ${soundMode === "off" ? "chip-on" : ""}`}
                onClick={() => setSoundMode("off")}
              >
                No sound
              </button>

              <div className="flex items-center gap-2" style={{ marginLeft: "auto" }}>
                <span className="muted">Volume</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setVolume(v);
                    if (audioRef.current) audioRef.current.volume = v;
                  }}
                />
              </div>
            </div>

            <div className="mt-4">
              <button className="btn btn-brand"
                      onClick={() => {
                        // If candles was chosen, route them over
                        if (selected === "candles") window.location.href = "/meditation/candles";
                      }}>
                {selected === "candles" ? "Go to Candle Room" : "Enter"}
              </button>
            </div>
          </section>

          {/* Big room view */}
          <section className="mt-6">
            <div className="room-frame">
              {/* Use <img> for GIF animation (next/image can freeze GIFs) */}
              {current?.image && (
                <img
                  src={current.image}
                  alt={current.label}
                  className="room-bg"
                />
              )}

              <div className="room-overlay">
                <div className="room-title">ENTER THE SACRED SPACE</div>
              </div>
            </div>

            {/* Ambient audio */}
            {audioSrc && (
              <audio
                ref={audioRef}
                src={audioSrc}
                autoPlay
                loop
                onCanPlay={() => {
                  if (audioRef.current) audioRef.current.volume = volume;
                }}
              />
            )}
          </section>

          {/* Counters (simple placeholders; wire to Supabase later) */}
          <section className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="counter-card">
              <div className="big">0</div>
              <div className="muted">meditating now</div>
            </div>
            <div className="counter-card">
              <div className="big">0</div>
              <div className="muted">in the last 24 hours</div>
            </div>
          </section>
        </div>
      </div>

      <style jsx global>{`
        .env-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        @media (min-width: 960px) {
          .env-grid { grid-template-columns: repeat(3, minmax(0,1fr)); }
        }
        .env-pill {
          text-align: left;
          padding: 16px 18px;
          border-radius: 14px;
          background: linear-gradient(180deg, #504a45, #2f2b28);
          border: 1px solid #5b524a;
          color: #f3eee6;
          font-weight: 600;
          transition: transform .08s ease, box-shadow .08s ease;
        }
        .env-pill:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(0,0,0,.25); }
        .env-pill-active {
          outline: 2px solid #d7c7a6;
          background: linear-gradient(180deg, #6a5e55, #3a342f);
        }

        .chip {
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid #6b6660;
          background: #3a3a3a;
          color: #f1eadf;
          font-size: 14px;
        }
        .chip-on { background: #d7c7a6; color: #2a241c; border-color: #d7c7a6; }

        .room-frame {
          position: relative;
          height: min(70vh, 720px);
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid #e3dccf;
          background: #201a15;
        }
        .room-bg {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
          object-fit: cover;
        }
        .room-overlay {
          position: absolute; inset: 0;
          background: radial-gradient(ellipse at 50% 20%, rgba(255,248,225,.18), transparent 55%);
          display: grid; place-items: start center;
          padding-top: 24px;
          pointer-events: none;
        }
        .room-title {
          color: #e8d9b8;
          letter-spacing: .22em;
          font-weight: 600;
        }
        .counter-card {
          border: 1px solid #e3dccf;
          border-radius: 14px;
          padding: 14px 16px;
          background: #f6f1e8;
        }
        .big { font-size: 32px; font-weight: 700; }
      `}</style>
    </div>
  );
}
