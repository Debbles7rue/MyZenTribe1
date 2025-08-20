// app/meditation/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import "./meditation.css";

type Env = "room" | "beach" | "lake" | "creek" | "abstract" | "candles";

const ENV_LABEL: Record<Env, string> = {
  room: "Sacred Room",
  beach: "Stunning Beach",
  lake: "Peaceful Lake",
  creek: "Forest Creek",
  abstract: "Meditative Patterns",
  candles: "Light a Candle for Loved Ones",
};

export default function MeditationPage() {
  const [env, setEnv] = useState<Env>("room");
  const [open, setOpen] = useState(false);
  const [liveNow, setLiveNow] = useState<number>(0);
  const [lastDay, setLastDay] = useState<number>(0);
  const [loadingCounts, setLoadingCounts] = useState(true);

  // Stats: pull from Supabase if available, otherwise show 0s
  useEffect(() => {
    let alive = true;

    async function fetchCounts() {
      try {
        // live (no ended_at)
        const { count: live } = await supabase
          .from("meditation_sessions")
          .select("id", { head: true, count: "exact" })
          .is("ended_at", null);

        // last 24h (by started_at)
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count: day } = await supabase
          .from("meditation_sessions")
          .select("id", { head: true, count: "exact" })
          .gte("started_at", since);

        if (!alive) return;
        setLiveNow(live ?? 0);
        setLastDay(day ?? 0);
      } catch {
        if (!alive) return;
        setLiveNow(0);
        setLastDay(0);
      } finally {
        if (alive) setLoadingCounts(false);
      }
    }

    fetchCounts();
    const t = setInterval(fetchCounts, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  // choose & open
  function choose(next: Env) {
    setEnv(next);
    setOpen(true);
  }

  return (
    <div className="mz-page">
      <h1 className="mz-title">Enter the Sacred Space</h1>

      {/* SELECTION + DOORS */}
      <section className="mz-scene-shell">
        {/* Background room/aura always present */}
        <div className="mz-scene">
          <div className="mz-aura" />

          {/* Render the chosen environment behind the doors */}
          <Scene env={env} />
        </div>

        {/* The grand doors & side choices */}
        <div className={`mz-doorgroup ${open ? "is-open" : ""}`}>
          <div className="mz-door">
            <div className="mz-ancient">ENTER THE SACRED SPACE</div>

            {/* candle sconces */}
            <div className="mz-door-candles">
              <DoorCandle />
              <DoorCandle />
              <DoorCandle />
              <DoorCandle />
            </div>

            {/* the two big panels */}
            <div className="mz-door-panel left" />
            <div className="mz-door-panel right" />
          </div>

          {/* choices on left & right */}
          <div className="mz-choices left">
            <Choice label={ENV_LABEL.room} onClick={() => choose("room")} />
            <Choice label={ENV_LABEL.beach} onClick={() => choose("beach")} />
            <Choice label={ENV_LABEL.lake} onClick={() => choose("lake")} />
          </div>
          <div className="mz-choices right">
            <Choice label={ENV_LABEL.creek} onClick={() => choose("creek")} />
            <Choice label={ENV_LABEL.abstract} onClick={() => choose("abstract")} />
            <Choice
              label={ENV_LABEL.candles}
              onClick={() => choose("candles")}
            />
          </div>

          {/* top-right controls when open */}
          {open && (
            <div className="mz-session-hud">
              <button className="mz-chip" onClick={() => setOpen(false)}>
                ← Change setting
              </button>
            </div>
          )}
        </div>
      </section>

      {/* STATS BAR (bottom, out of the way) */}
      <section className="mz-statsbar">
        <div className="mz-statbox">
          <div className="n">{loadingCounts ? "…" : liveNow}</div>
          <div className="t">meditating now</div>
        </div>
        <div className="mz-statbox">
          <div className="n">{loadingCounts ? "…" : lastDay}</div>
          <div className="t">in the last 24 hours</div>
        </div>
        <div className="mz-linksbar">
          <span className="muted">Learn more: </span>
          <Link className="mz-link" href="/whats-new">
            collective meditation
          </Link>
          <span className="muted"> · </span>
          <Link className="mz-link" href="/communities">
            communities
          </Link>
        </div>
      </section>
    </div>
  );
}

/* ---------- tiny components ---------- */

function Choice({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="mz-choice" onClick={onClick}>
      <span className="flame">
        <span className="glow" />
        <span className="core" />
      </span>
      <span className="label">{label}</span>
    </button>
  );
}

function DoorCandle() {
  return (
    <div className="dc">
      <div className="flame">
        <span className="glow" />
        <span className="core" />
      </div>
    </div>
  );
}

function Scene({ env }: { env: Env }) {
  if (env === "beach") {
    return (
      <div className="mz-beach">
        <div className="sky" />
        <div className="sun" />
        <div className="sea">
          <div className="wave w1" />
          <div className="wave w2" />
          <div className="wave w3" />
        </div>
        <div className="sand" />
      </div>
    );
  }
  if (env === "lake") {
    return (
      <div className="mz-lake">
        <div className="mist" />
        <div className="mounts" />
        <div className="water">
          <div className="ripple r1" />
          <div className="ripple r2" />
          <div className="ripple r3" />
        </div>
      </div>
    );
  }
  if (env === "creek") {
    return (
      <div className="mz-creek">
        <div className="trees" />
        <div className="stream">
          <div className="flow f0" />
          <div className="flow f1" />
          <div className="flow f2" />
          <div className="flow f3" />
          <div className="flow f4" />
          <div className="flow f5" />
          <div className="flow f6" />
          <div className="flow f7" />
        </div>
      </div>
    );
  }
  if (env === "abstract") {
    return (
      <div className="mz-abstract">
        <div className="swirl s1" />
        <div className="swirl s2" />
        <div className="swirl s3" />
        <div className="swirl s4" />
      </div>
    );
  }
  if (env === "candles") {
    return (
      <div className="mz-candlewall">
        <div className="stars" />
        <div className="sconces">
          <div className="sconce">
            <DoorCandle />
          </div>
          <div className="sconce">
            <DoorCandle />
          </div>
        </div>
        <div className="wall-grid">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="tribute white">
              <div className="name">Loved One</div>
              <div className="holder">
                <MiniCandle />
              </div>
            </div>
          ))}
        </div>
        <button
          className="mz-chip add"
          onClick={() => alert("Candle creator coming soon ✨")}
        >
          + Add a candle
        </button>
      </div>
    );
  }
  // sacred room (default)
  return (
    <div className="mz-room">
      <div className="arches" />
      <div className="shelves">
        <div className="shelf top" />
        <div className="shelf mid" />
        <div className="candles">
          <Candle size="tall" />
          <Candle size="mid" />
          <Candle size="short" />
          <Candle size="mid" />
          <Candle size="tall" />
        </div>
      </div>
      <div className="fountain">
        <div className="pillar" />
        <div className="stream s1" />
        <div className="stream s2" />
        <div className="stream s3" />
        <div className="ripple r1" />
        <div className="ripple r2" />
        <div className="ripple r3" />
      </div>
    </div>
  );
}

function Candle({ size = "mid" as "short" | "mid" | "tall" }) {
  return (
    <div className={`candle ${size}`}>
      <div className="wax" />
      <div className="flame">
        <span className="glow" />
        <span className="core" />
      </div>
      <div className="halo" />
    </div>
  );
}

function MiniCandle() {
  return (
    <div className="mini-candle">
      <div className="wax" />
      <div className="flame">
        <span className="glow" />
        <span className="core" />
      </div>
    </div>
  );
}
