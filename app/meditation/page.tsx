// app/meditation/page.tsx
"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { usePresenceCount } from "@/hooks/usePresenceCount"; // keep using your hook
import "./meditation.css";

/** Environments */
type EnvId = "sacred" | "beach" | "creek" | "fire" | "patterns" | "candles";
type Env = { id: EnvId; label: string; image?: string };

const LEFT_ENVS: Env[] = [
  { id: "sacred",  label: "Sacred Room",    image: "/mz/sacred-room.jpg" },
  { id: "beach",   label: "Stunning Beach", image: "/mz/beach.jpg" },
];

const RIGHT_ENVS: Env[] = [
  { id: "creek",    label: "Forest Creek",                  image: "/mz/forest-creek.gif" },
  { id: "fire",     label: "Crackling Fire",                image: "/mz/hearth.jpg" },
  { id: "patterns", label: "Meditative Patterns",           image: "/mz/patterns.jpg" },
  { id: "candles",  label: "Light a Candle for Loved Ones", image: "/mz/candle-room.jpg" },
];

const ALL_ENVS: Env[] = [...LEFT_ENVS, ...RIGHT_ENVS];

/** Small button with presence pill */
function EnvButton({
  id, label, onClick, on,
}: {
  id: EnvId; label: string; onClick: () => void; on: boolean;
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

// --- helpers for coverage ---
type Interval = { s: number; e: number };
function mergeIntervals(a: Interval[]): Interval[] {
  if (!a.length) return [];
  const sorted = [...a].sort((x, y) => x.s - y.s);
  const out: Interval[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = out[out.length - 1];
    const cur = sorted[i];
    if (cur.s <= prev.e) prev.e = Math.max(prev.e, cur.e);
    else out.push(cur);
  }
  return out;
}

export default function MeditationPage() {
  const [selected, setSelected] = useState<EnvId>("creek");
  const [doorsOpen, setDoorsOpen] = useState(false);

  // counters
  const [nowCount, setNowCount] = useState(0);
  const [dayCount, setDayCount] = useState(0);
  const [coveragePct, setCoveragePct] = useState(0); // 0–100

  const current = useMemo(
    () => ALL_ENVS.find((e) => e.id === selected),
    [selected]
  );

  // active session id so we can end it on close/leave
  const activeSessionId = useRef<string | null>(null);

  function choose(id: EnvId) {
    setSelected(id);
    setDoorsOpen(false);
  }

  async function startSession(env: EnvId) {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return; // middleware should have gated this, but be safe
      const { data, error } = await supabase
        .from("meditation_sessions")
        .insert([{ user_id: uid, env }])
        .select("id")
        .single();
      if (!error && data) activeSessionId.current = data.id as unknown as string;
    } catch (e) {
      console.warn("startSession failed", e);
    }
  }

  async function endSession() {
    const id = activeSessionId.current;
    if (!id) return;
    try {
      await supabase
        .from("meditation_sessions")
        .update({ ended_at: new Date().toISOString() })
        .eq("id", id);
    } catch (e) {
      console.warn("endSession failed", e);
    } finally {
      activeSessionId.current = null;
    }
  }

  async function onEnter() {
    if (selected === "candles") {
      window.location.href = "/meditation/candles";
      return;
    }
    setDoorsOpen(true);
    startSession(selected);
  }

  function onClose() {
    setDoorsOpen(false);
    endSession();
  }

  // end session if the tab is closed or navigated away
  useEffect(() => {
    const handler = () => { endSession(); };
    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
      endSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- COUNTERS: poll every 30s ----
  useEffect(() => {
    let timer: any;
    const load = async () => {
      const now = new Date();
      const ago45 = new Date(now.getTime() - 45 * 60 * 1000).toISOString();
      const ago24 = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

      // Now meditating: ended_at IS NULL and started_at within 45m
      const nowQ = await supabase
        .from("meditation_sessions")
        .select("*", { count: "exact", head: true })
        .is("ended_at", null)
        .gte("started_at", ago45);
      setNowCount(nowQ.count || 0);

      // Past 24h: simply count sessions started in last 24h
      const dQ = await supabase
        .from("meditation_sessions")
        .select("*", { count: "exact", head: true })
        .gte("started_at", ago24);
      setDayCount(dQ.count || 0);

      // Coverage: fetch sessions that *overlap* the last 24h window
      const sQ = await supabase
        .from("meditation_sessions")
        .select("started_at, ended_at")
        .or(`started_at.gte.${ago24},ended_at.gte.${ago24}`); // good enough given typical session lengths

      const windowStart = new Date(ago24).getTime();
      const windowEnd = now.getTime();

      const intervals: Interval[] =
        (sQ.data || []).map((r) => {
          const s = Math.max(new Date(r.started_at as string).getTime(), windowStart);
          const eSrc = r.ended_at ? new Date(r.ended_at as string).getTime() : now.getTime();
          const e = Math.min(eSrc, windowEnd);
          return { s, e };
        }).filter(iv => iv.e > iv.s);

      const merged = mergeIntervals(intervals);
      const coveredMs = merged.reduce((sum, iv) => sum + (iv.e - iv.s), 0);
      const pct = Math.max(0, Math.min(100, Math.round((coveredMs / (24 * 60 * 60 * 1000)) * 100)));
      setCoveragePct(pct);
    };

    load();
    timer = setInterval(load, 30_000);
    return () => clearInterval(timer);
  }, []);

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
              <div className={`mz-panel mz-panel--left ${doorsOpen ? "is-open" : ""}`} aria-hidden />
              <div className={`mz-panel mz-panel--right ${doorsOpen ? "is-open" : ""}`} aria-hidden />

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
                  onClick={() => choose(env.id)}
                  on={selected === env.id}
                />
              ))}
            </div>
          </section>

          {/* Counters */}
          <section className="mz-counters">
            <div className="mz-counter">
              <div className="mz-num">{nowCount}</div>
              <div className="mz-cap">meditating now</div>
            </div>
            <div className="mz-counter">
              <div className="mz-num">{dayCount}</div>
              <div className="mz-cap">sessions started in the last 24 hours</div>
            </div>
            <div className="mz-counter">
              <div className="mz-num">{coveragePct}%</div>
              <div className="mz-cap">24/7 goal covered in the last day</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
