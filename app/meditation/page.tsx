"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePresenceCount } from "@/hooks/usePresenceCount"; // keep this hook file as we set earlier
import "./meditation.css";

/** Environment definitions */
type EnvId = "sacred" | "beach" | "creek" | "fire" | "patterns" | "candles";
type Env = { id: EnvId; label: string; image?: string };

const LEFT_ENVS: Env[] = [
  { id: "sacred",  label: "Sacred Room",    image: "/mz/sacred-room.jpg" },
  { id: "beach",   label: "Stunning Beach", image: "/mz/beach.jpg" },
];

const RIGHT_ENVS: Env[] = [
  // Today we use a GIF; if/when you upload /mz/forest-creek.mp4,
  // just change this `image` to that .mp4 path and the video element will kick in.
  { id: "creek",    label: "Forest Creek",                  image: "/mz/forest-creek.gif" },
  { id: "fire",     label: "Crackling Fire",                image: "/mz/hearth.jpg" },
  { id: "patterns", label: "Meditative Patterns",           image: "/mz/patterns.jpg" },
  { id: "candles",  label: "Light a Candle for Loved Ones", image: "/mz/candle-room.jpg" },
];

const ALL_ENVS: Env[] = [...LEFT_ENVS, ...RIGHT_ENVS];

/** Small button with presence pill */
function EnvButton({
  id,
  label,
  onClick,
  on,
}: {
  id: EnvId;
  label: string;
  onClick: () => void;
  on: boolean;
}) {
  const here = usePresenceCount(`mz:env:${id}`);
  return (
    <button
      className={`mz-choice ${on ? "mz-choice--on" : ""}`}
      onClick={onClick}
      aria-pressed={on}
    >
      <span className="mz-candle" aria-hidden />
      <span className="mz-label">{label}</span>
      <span className="mz-pill">{here}</span>
    </button>
  );
}

export default function MeditationPage() {
  const [selected, setSelected] = useState<EnvId>("creek");
  const [doorsOpen, setDoorsOpen] = useState(false);

  const current = useMemo(
    () => ALL_ENVS.find((e) => e.id === selected),
    [selected]
  );

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

  // helper to decide if we should render a video instead of CSS bg
  const isVideo = Boolean(current?.image && current.image.endsWith(".mp4"));

  return (
    <div className="page-wrap mz-root">
      <div className="page">
        <div className="container-app">
          {/* Header row: title + actions */}
          <div className="mz-header">
            <h1 className="page-title">Enter the Sacred Space</h1>
            <div className="mz-headerActions">
              <Link href="/meditation/schedule" className="mz-scheduleBtn">
                Schedule a Meditation
              </Link>
              <Link href="/meditation/lounge" className="mz-scheduleBtn">
                Open Lounge
              </Link>
            </div>
          </div>

          {/* Intro note */}
          <section className="mz-intro">
            When many people meditate together, our nervous systems entrain, stress
            drops, and compassion rises. Our aim is to keep a gentle wave of
            presence moving around the globe—<b>24/7</b>.{" "}
            <Link className="link" href="/whats-new">
              Learn more about collective meditation
            </Link>
          </section>

          {/* Main grid: choices — doors — choices */}
          <section className="mz-grid">
            <div className="mz-side">
              {LEFT_ENVS.map((env) => (
                <EnvButton
                  key={env.id}
                  id={env.id}
                  label={env.label}
                  on={() => choose(env.id)}
                  onClick={() => choose(env.id)}
                  on={selected === env.id}
                />
              ))}
            </div>

            {/* DOOR FRAME */}
            <div className={`mz-door ${doorsOpen ? "is-immersive" : ""}`}>
              {/* Optional protection overlay — safe if missing */}
              <img src="/mz/shield.png" alt="" className="mz-shield" aria-hidden />

              {/* Background scene (video or static) */}
              {!isVideo ? (
                <div
                  className="mz-doorBg"
                  style={{
                    backgroundImage: current?.image
                      ? `url(${current.image})`
                      : "url(/mz/sacred-room.jpg)",
                    filter: doorsOpen ? "none" : "blur(1px) brightness(0.98)",
                  }}
                />
              ) : (
                <video
                  className="mz-video"
                  src={current!.image}
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              )}

              {/* gentle glow */}
              <div className="mz-lightOverlay" />

              {/* title on closed doors */}
              <div className="mz-doorTitle">ENTER THE SACRED SPACE</div>

              {/* seam */}
              <div className="mz-seam" aria-hidden />

              {/* doors */}
              <div
                className={`mz-panel mz-panel--left ${doorsOpen ? "is-open" : ""}`}
                aria-hidden
              />
              <div
                className={`mz-panel mz-panel--right ${doorsOpen ? "is-open" : ""}`}
                aria-hidden
              />

              {/* handles */}
              <span className="mz-handle mz-handle--left" aria-hidden />
              <span className="mz-handle mz-handle--right" aria-hidden />

              {/* controls */}
              {!doorsOpen ? (
                <button className="mz-enterBtn" onClick={onEnter}>
                  ENTER
                </button>
              ) : (
                <button
                  className="mz-closeBtn"
                  onClick={onClose}
                  aria-label="Close Doors"
                />
              )}
            </div>

            <div className="mz-side">
              {RIGHT_ENVS.map((env) => (
                <EnvButton
                  key={env.id}
                  id={env.id}
                  label={env.label}
                  on={() => choose(env.id)}
                  onClick={() => choose(env.id)}
                  on={selected === env.id}
                />
              ))}
            </div>
          </section>

          {/* Counters (placeholder for now) */}
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
    </div>
  );
}
