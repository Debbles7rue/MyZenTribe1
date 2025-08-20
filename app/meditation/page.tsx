// app/meditation/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

// Background images (change to your own)
const BG: Record<Env, string> = {
  room: "/meditation/room.jpg",
  beach: "/meditation/beach.jpg",
  lake: "/meditation/lake.jpg",
  creek: "/meditation/creek.jpg",
  abstract: "/meditation/abstract.jpg",
  candles: "/meditation/candles.jpg",
};

// Door texture
const DOOR_TEXTURE = "/meditation/door.jpg";

/* ---------- simple audio mixer ---------- */
type SoundMode = "nature" | "freq" | "none";
type FreqKey = "432" | "528" | "639" | "963";

function useAudioMixer() {
  // two channels we can fade independently
  const ambientRef = useRef<HTMLAudioElement | null>(null);
  const freqRef = useRef<HTMLAudioElement | null>(null);
  const [started, setStarted] = useState(false);

  function make(url?: string | null) {
    if (!url) return null;
    const a = new Audio(url);
    a.loop = true;
    a.preload = "auto";
    a.crossOrigin = "anonymous";
    a.volume = 0;
    a.onerror = () => {
      // ignore missing/failed files
    };
    return a;
  }

  function setSrcs(ambient?: string | null, freq?: string | null) {
    // Stop previous
    ambientRef.current?.pause();
    freqRef.current?.pause();

    ambientRef.current = make(ambient);
    freqRef.current = make(freq);

    if (started) {
      ambientRef.current?.play().catch(() => {});
      freqRef.current?.play().catch(() => {});
    }
  }

  function ensureStarted() {
    if (started) return;
    setStarted(true);
    ambientRef.current?.play().catch(() => {});
    freqRef.current?.play().catch(() => {});
  }

  function fadeTo(target: HTMLAudioElement | null, v: number, ms = 800) {
    if (!target) return;
    const steps = 24;
    const delta = (v - target.volume) / steps;
    let i = 0;
    const timer = setInterval(() => {
      i++;
      target.volume = Math.max(0, Math.min(1, target.volume + delta));
      if (i >= steps) clearInterval(timer);
    }, Math.max(8, Math.floor(ms / steps)));
  }

  function setVolumes(ambientVol: number, freqVol: number, ms = 800) {
    fadeTo(ambientRef.current, ambientVol, ms);
    fadeTo(freqRef.current, freqVol, ms);
  }

  function stopAll(ms = 500) {
    fadeTo(ambientRef.current, 0, ms);
    fadeTo(freqRef.current, 0, ms);
  }

  return {
    setSrcs,
    setVolumes,
    stopAll,
    ensureStarted,
  };
}

/* Map our scenes to sound files */
const AMBIENT_FOR_ENV: Record<Env, string | null> = {
  room: "/audio/fountain.mp3",
  beach: "/audio/beach_waves.mp3",
  lake: "/audio/lake_softwater.mp3",
  creek: "/audio/forest_creek.mp3",
  abstract: null, // abstract can be silent (or add a soft drone if you have one)
  candles: "/audio/candle_room_chant.mp3",
};

// Optional extra nature layer per env (left off by default in this simple mixer)
// If you want layering (e.g. waves + gulls), just add the gulls into the ambient file
// or later expand the mixer to three channels.
const EXTRA_FOR_ENV: Record<Env, string | null> = {
  room: null,
  beach: "/audio/seagulls.mp3", // not used by default; see note above
  lake: null,
  creek: "/audio/forest_birds.mp3",
  abstract: null,
  candles: null,
};

const FREQ_SRC: Record<FreqKey, string> = {
  "432": "/audio/tone_432.mp3",
  "528": "/audio/tone_528.mp3",
  "639": "/audio/tone_639.mp3",
  "963": "/audio/tone_963.mp3",
};

export default function MeditationPage() {
  const [env, setEnv] = useState<Env>("room");
  const [open, setOpen] = useState(false);

  // sound UI
  const [soundMode, setSoundMode] = useState<SoundMode>("nature");
  const [volume, setVolume] = useState<number>(0.65);
  const [freq, setFreq] = useState<FreqKey>("528");

  // stats
  const [liveNow, setLiveNow] = useState(0);
  const [lastDay, setLastDay] = useState(0);
  const [loadingCounts, setLoadingCounts] = useState(true);

  const mixer = useAudioMixer();

  // whenever env / sound mode / freq / open changes, retune audio
  useEffect(() => {
    if (!open) {
      mixer.stopAll(350);
      return;
    }
    // choose sources
    const ambient = soundMode === "nature" ? AMBIENT_FOR_ENV[env] : null;
    const freqSrc = soundMode === "freq" ? FREQ_SRC[freq] : null;

    mixer.setSrcs(ambient, freqSrc);
    mixer.ensureStarted();

    // ambient gets full volume, freq is a little softer by default
    const ambVol = soundMode === "nature" ? volume : 0;
    const freqVol = soundMode === "freq" ? Math.min(1, volume) : 0;
    mixer.setVolumes(ambVol, freqVol, 700);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [env, soundMode, freq, open]);

  // when user moves the volume
  useEffect(() => {
    if (!open) return;
    const ambVol = soundMode === "nature" ? volume : 0;
    const freqVol = soundMode === "freq" ? Math.min(1, volume) : 0;
    mixer.setVolumes(ambVol, freqVol, 250);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volume]);

  // Stats pull (best-effort)
  useEffect(() => {
    let alive = true;
    async function fetchCounts() {
      try {
        const { count: live } = await supabase
          .from("meditation_sessions")
          .select("id", { head: true, count: "exact" })
          .is("ended_at", null);

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

  function choose(next: Env) {
    setEnv(next);
    setOpen(true);
  }

  return (
    <div className="mz-page">
      <h1 className="mz-title">Enter the Sacred Space</h1>

      <section
        className="mz-scene-shell"
        style={{ ["--door-texture" as any]: `url(${DOOR_TEXTURE})` }}
      >
        <div className="mz-scene">
          <div className="mz-aura" />
          <div
            className="mz-bg-img"
            style={{ ["--bg-img" as any]: `url(${BG[env]})` }}
            aria-hidden
          />
          <Scene env={env} />
        </div>

        {/* Doors + choices */}
        <div className={`mz-doorgroup ${open ? "is-open" : ""}`}>
          <div className="mz-door">
            <div className="mz-ancient">ENTER THE SACRED SPACE</div>
            <div className="mz-door-candles">
              <DoorCandle />
              <DoorCandle />
              <DoorCandle />
              <DoorCandle />
            </div>
            <div className="mz-door-panel left" />
            <div className="mz-door-panel right" />
          </div>

          <div className="mz-choices left">
            <Choice label={ENV_LABEL.room} onClick={() => choose("room")} />
            <Choice label={ENV_LABEL.beach} onClick={() => choose("beach")} />
            <Choice label={ENV_LABEL.lake} onClick={() => choose("lake")} />
          </div>
          <div className="mz-choices right">
            <Choice label={ENV_LABEL.creek} onClick={() => choose("creek")} />
            <Choice
              label={ENV_LABEL.abstract}
              onClick={() => choose("abstract")}
            />
            <Choice
              label={ENV_LABEL.candles}
              onClick={() => choose("candles")}
            />
          </div>

          {open && (
            <div className="mz-session-hud">
              <button className="mz-chip" onClick={() => setOpen(false)}>
                ← Change setting
              </button>
            </div>
          )}
        </div>

        {/* Sound controls (only show after entering) */}
        {open && (
          <div className="mz-controls">
            <div className="row">
              <button
                className={`pill ${soundMode === "nature" ? "active" : ""}`}
                onClick={() => setSoundMode("nature")}
              >
                Nature
              </button>
              <button
                className={`pill ${soundMode === "freq" ? "active" : ""}`}
                onClick={() => setSoundMode("freq")}
              >
                Frequencies
              </button>
              <button
                className={`pill ${soundMode === "none" ? "active" : ""}`}
                onClick={() => setSoundMode("none")}
              >
                No sound
              </button>

              {soundMode === "freq" && (
                <div className="select-wrap">
                  <label className="muted">Tone</label>
                  <select
                    className="select"
                    value={freq}
                    onChange={(e) => setFreq(e.target.value as FreqKey)}
                  >
                    <option value="432">432 Hz</option>
                    <option value="528">528 Hz</option>
                    <option value="639">639 Hz</option>
                    <option value="963">963 Hz</option>
                  </select>
                </div>
              )}

              <div className="vol-wrap">
                <label className="muted">Volume</label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Stats */}
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

/* ---------- visuals from the previous version ---------- */

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
        <div className="sea">
          <div className="wave w1" />
          <div className="wave w2" />
          <div className="wave w3" />
        </div>
      </div>
    );
  }
  if (env === "lake") {
    return (
      <div className="mz-lake">
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
  // sacred room
  return (
    <div className="mz-room">
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
