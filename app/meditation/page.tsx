// app/meditation/page.tsx - Updated Prayer/Meditation with Door Animation
"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import ScheduleMeditation from "@/components/ScheduleMeditation";
import Link from "next/link";

type Env = {
  id: string;
  name: string;
  bg?: string;
  video?: string;
  audio?: string;
};

const ENVIRONMENTS: Env[] = [
  { id: "sacred", name: "Sacred Room", bg: "/mz/sacred-room.jpg", audio: "/audio/candle_room_chant.mp3" },
  { id: "beach", name: "Beach Waves", bg: "/mz/beach.jpg", audio: "/audio/beach_waves.mp3" },
  { id: "creek", name: "Forest Creek", bg: "/mz/forest-creek.gif", audio: "/audio/forest_creek.mp3" },
  { id: "forest", name: "Forest Birds", bg: "/mz/hearth.jpg", audio: "/audio/forest_birds.mp3" },
  { id: "lake", name: "Lake Waters", bg: "/mz/beach.jpg", audio: "/audio/lake_softwater.mp3" },
  { id: "candle", name: "Candle Room", bg: "/mz/candle-room.jpg", audio: "/audio/candle_room_chant.mp3" },
  { id: "tone432", name: "432 Hz Healing", bg: "/mz/patterns.jpg", audio: "/audio/tone_432.mp3" },
  { id: "tone528", name: "528 Hz Love", bg: "/mz/patterns.jpg", audio: "/audio/tone_528.mp3" },
  { id: "tone639", name: "639 Hz Heart", bg: "/mz/patterns.jpg", audio: "/audio/tone_639.mp3" },
  { id: "tone963", name: "963 Hz Crown", bg: "/mz/patterns.jpg", audio: "/audio/tone_963.mp3" },
];

export default function MeditationPage() {
  const [me, setMe] = useState<{ id: string; email?: string } | null>(null);
  const [selected, setSelected] = useState("sacred");
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const [activeCount, setActiveCount] = useState(0);
  const [totalSessions24h, setTotalSessions24h] = useState(0);
  const [tribePulse, setTribePulse] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const env = ENVIRONMENTS.find((e) => e.id === selected) || ENVIRONMENTS[0];

  useEffect(() => {
    checkUser();
    loadStats();
    loadActiveCount();
    
    // Initialize audio element
    audioRef.current = new Audio();
    audioRef.current.loop = true;
    audioRef.current.volume = 0.3;
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Update audio source when environment changes
    if (audioRef.current && env.audio && audioEnabled) {
      audioRef.current.src = env.audio;
      audioRef.current.play().catch(console.error);
    }
  }, [selected, audioEnabled]);

  async function checkUser() {
    const { data } = await supabase.auth.getUser();
    setMe(data.user ? { id: data.user.id, email: data.user.email } : null);
  }

  async function loadStats() {
    const now = new Date();
    const h24ago = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from("meditation_sessions")
      .select("id, duration_minutes")
      .gte("created_at", h24ago.toISOString())
      .lte("created_at", now.toISOString());

    if (!error && data) {
      setTotalSessions24h(data.length);
      
      // Calculate tribe pulse (coverage percentage)
      const totalMinutes = data.reduce((sum, s) => sum + (s.duration_minutes || 15), 0);
      const totalPossibleMinutes = 24 * 60;
      const coverage = Math.min((totalMinutes / totalPossibleMinutes) * 100, 100);
      setTribePulse(Math.round(coverage));
    }
  }

  async function loadActiveCount() {
    const { data } = await supabase
      .from("meditation_presence")
      .select("id")
      .is("left_at", null);
    setActiveCount(data?.length || 0);
  }

  async function enterMeditation() {
    if (!me) {
      alert("Please sign in to enter the prayer/meditation room");
      return;
    }

    // Track entry
    await supabase.from("meditation_presence").insert({
      user_id: me.id,
      environment: selected,
      joined_at: new Date().toISOString(),
    });

    setDoorsOpen(true);
    if (audioEnabled && audioRef.current && env.audio) {
      audioRef.current.play().catch(console.error);
    }
  }

  function toggleImmersive() {
    setImmersive(!immersive);
    if (!immersive) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }

  function toggleAudio() {
    const newEnabled = !audioEnabled;
    setAudioEnabled(newEnabled);
    
    if (audioRef.current) {
      if (newEnabled && env.audio && doorsOpen) {
        audioRef.current.src = env.audio;
        audioRef.current.play().catch(console.error);
      } else {
        audioRef.current.pause();
      }
    }
  }

  async function exitMeditation() {
    if (me) {
      // Update presence record
      const { data } = await supabase
        .from("meditation_presence")
        .select("id")
        .eq("user_id", me.id)
        .is("left_at", null)
        .order("joined_at", { ascending: false })
        .limit(1)
        .single();
        
      if (data) {
        await supabase
          .from("meditation_presence")
          .update({ left_at: new Date().toISOString() })
          .eq("id", data.id);
      }
    }
    
    setDoorsOpen(false);
    setImmersive(false);
    document.body.style.overflow = "";
    
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }

  return (
    <div className="mz-root page">
      <div className="container-app">
        <header className="mz-header">
          <div>
            <h1 className="page-title flex items-center gap-2">
              🙏 PRAYER / MEDITATION ROOM
            </h1>
            <p className="text-sm opacity-75 mt-1">Creating continuous 24/7 healing energy for the world</p>
          </div>
          <div className="mz-headerActions">
            <ScheduleMeditation />
            <Link href="/meditation/schedule" className="mz-scheduleBtn">
              📅 Schedule
            </Link>
          </div>
        </header>

        {/* Mission Statement */}
        <div className="mz-intro">
          <div className="text-center mb-3">
            <strong>✨ Our Mission: 24/7 Global Healing</strong>
          </div>
          <p className="text-sm">
            When we pray and meditate together, even from different locations, we create a powerful field of healing energy 
            that radiates across the world. Our goal is to maintain continuous coverage - ensuring someone is always holding 
            space for peace, love, and healing on our planet.
          </p>
          <div className="mt-3 p-3 bg-amber-100/30 rounded-lg text-center">
            <div className="text-2xl font-bold text-amber-800">{tribePulse}%</div>
            <div className="text-xs text-amber-700">24h Coverage (Tribe Pulse)</div>
            <p className="text-xs mt-1 opacity-75">Help us reach 100% by joining or scheduling a session!</p>
          </div>
        </div>

        <div className="mz-grid">
          {/* Left side: Environment choices */}
          <div className="mz-side">
            <h3 className="text-sm font-semibold mb-2 opacity-75">Choose Your Sacred Space:</h3>
            {ENVIRONMENTS.map((e) => (
              <button
                key={e.id}
                className={`mz-choice ${selected === e.id ? "mz-choice--on" : ""}`}
                onClick={() => setSelected(e.id)}
              >
                <div className="mz-candle" />
                <div className="mz-label">{e.name}</div>
                {e.audio && <div className="mz-pill">🎵</div>}
              </button>
            ))}
            
            {/* Audio Toggle */}
            <button
              onClick={toggleAudio}
              className={`mz-choice mt-2 ${audioEnabled ? "mz-choice--on" : ""}`}
            >
              <div className="text-sm">🔊</div>
              <div className="mz-label">Sound {audioEnabled ? "On" : "Off"}</div>
            </button>
          </div>

          {/* Center: The door */}
          <div className={`mz-door ${immersive ? "is-immersive" : ""}`}>
            <div className="mz-doorTitle">MEDITATION ROOM</div>
            <div className="mz-seam" />
            
            {/* Background image/video */}
            {env.video ? (
              <video className="mz-video" src={env.video} autoPlay loop muted playsInline />
            ) : (
              <div className="mz-doorBg" style={{ backgroundImage: `url(${env.bg})` }} />
            )}
            
            <div className="mz-lightOverlay" />
            
            {/* Optional shield overlay */}
            <img className="mz-shield" src="/mz/shield.png" alt="" />

            {/* Door panels */}
            <div className={`mz-panel mz-panel--left ${doorsOpen ? "is-open" : ""}`} />
            <div className={`mz-panel mz-panel--right ${doorsOpen ? "is-open" : ""}`} />

            {/* Handles */}
            {!doorsOpen && (
              <>
                <div className="mz-handle mz-handle--left" />
                <div className="mz-handle mz-handle--right" />
              </>
            )}

            {/* Enter/Exit button */}
            {!doorsOpen ? (
              <button className="mz-enterBtn" onClick={enterMeditation}>
                {me ? "Enter Sacred Space" : "Sign in to Enter"}
              </button>
            ) : (
              <>
                {!immersive && (
                  <button className="mz-enterBtn" onClick={toggleImmersive}>
                    Fullscreen
                  </button>
                )}
                {immersive && (
                  <button className="mz-closeBtn" onClick={exitMeditation} aria-label="Exit" />
                )}
              </>
            )}
          </div>

          {/* Right side: Stats & Links */}
          <div className="mz-side">
            <div className="mz-counters">
              <div className="mz-counter">
                <div className="mz-num">{activeCount}</div>
                <div className="mz-cap">Active Now</div>
              </div>
              <div className="mz-counter">
                <div className="mz-num">{totalSessions24h}</div>
                <div className="mz-cap">Sessions (24h)</div>
              </div>
            </div>

            {/* Candle Room Link */}
            <Link href="/meditation/candles" className="mz-choice mt-4">
              <div className="text-sm">🕯️</div>
              <div className="mz-label">Visit Candle Room</div>
            </Link>
            
            {/* Lounge Link */}
            <Link href="/meditation/lounge" className="mz-choice">
              <div className="text-sm">💬</div>
              <div className="mz-label">Community Lounge</div>
            </Link>

            {/* Tips */}
            <div className="mt-4 p-3 bg-white/60 rounded-lg text-xs opacity-75">
              <p className="font-semibold mb-1">Prayer & Meditation Tips:</p>
              <ul className="space-y-1">
                <li>• Begin with deep breathing</li>
                <li>• Set an intention for healing</li>
                <li>• Send love to those who need it</li>
                <li>• You're contributing to global peace</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Calendar Link */}
        <div className="mz-calendar-link">
          <span className="mz-calendar-icon">📅</span>
          <span>Schedule your sessions in the <Link href="/calendar" className="underline">Calendar</Link></span>
        </div>
      </div>
    </div>
  );
}
