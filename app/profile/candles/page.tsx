// app/profile/candles/page.tsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Candle = {
  id: string;
  name: string;
  color: string;
  message: string | null;
  created_at: string;
  expires_at: string | null;
  candle_type?: string;
  payment_status?: string;
  stripe_payment_id?: string;
  amount_paid?: number;
  fade_stage?: number;
  user_id?: string;
  recipient_id?: string;
  created_for?: string;
  created_by?: string;
};

// Starry Background Component
function StarryBackground() {
  return (
    <div className="starry-container">
      {/* Generate random stars */}
      {Array.from({ length: 50 }).map((_, i) => (
        <div
          key={i}
          className="star"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${2 + Math.random() * 3}s`
          }}
        />
      ))}
      
      {/* Floating sparkles */}
      {Array.from({ length: 15 }).map((_, i) => (
        <div
          key={`sparkle-${i}`}
          className="sparkle"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${10 + Math.random() * 20}s`
          }}
        />
      ))}
    </div>
  );
}

// Beautiful Candle Display Component (updated visual only)
function CandleDisplay({ candle }: { candle: Candle }) {
  const isEternal = candle.candle_type === "eternal";
  const color = candle.color || "white";

  // Kept your map; we still default to a white candle, but only
  // use the palette for subtle accents (e.g., plaque rim if desired)
  const colorMap: Record<
    string,
    { main: string; gradient: string[]; rim?: string }
  > = {
    white: {
      main: "#ffffff",
      gradient: ["#ffffff", "#F6F4FB", "#EEEAF7"],
      rim: "#e9e4f4",
    },
    gold: {
      main: "#f8e3b1",
      gradient: ["#fff5d6", "#f8e3b1", "#e6c56e"],
      rim: "#e7cf98",
    },
    rose: {
      main: "#f7c4c9",
      gradient: ["#ffd6d9", "#f7c4c9", "#e8a5ab"],
      rim: "#eab0b7",
    },
    azure: {
      main: "#c5e3ff",
      gradient: ["#dceeff", "#c5e3ff", "#9bc8f7"],
      rim: "#b4d3f0",
    },
    violet: {
      main: "#d8c7ff",
      gradient: ["#e8dcff", "#d8c7ff", "#c0a8f7"],
      rim: "#cdbbfa",
    },
    emerald: {
      main: "#cdebd3",
      gradient: ["#dff5e3", "#cdebd3", "#a8d6b3"],
      rim: "#bfe1c6",
    },
  };

  const palette = colorMap[color] || colorMap.white;

  const createdDate = new Date(candle.created_at);
  const formattedDate = createdDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // random offsets so multiple flames don't sync
  const swayDelay = `${(Math.random() * 1.2).toFixed(2)}s`;
  const flickerDelay = `${(Math.random() * 0.9).toFixed(2)}s`;

  return (
    <div className="candle-display">
      <div className="candle-visual">
        <svg viewBox="0 0 120 160" className="candle-svg" aria-hidden>
          <defs>
            {/* Candle body gradients (white glossy cylinder) */}
            <linearGradient id={`body-grad-${candle.id}`} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#faf9ff" />
              <stop offset="25%" stopColor="#ffffff" />
              <stop offset="55%" stopColor="#f3f0fa" />
              <stop offset="100%" stopColor="#ece8f6" />
            </linearGradient>
            {/* vertical gloss */}
            <linearGradient id={`body-vert-${candle.id}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#d9d3eb" stopOpacity="0.45" />
            </linearGradient>

            {/* Top ellipse (wax rim) */}
            <radialGradient id={`top-ell-${candle.id}`} cx="50%" cy="45%" r="60%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="70%" stopColor="#f2effa" />
              <stop offset="100%" stopColor="#e8e3f4" />
            </radialGradient>

            {/* Subtle inner emboss squiggle */}
            <linearGradient id={`squiggle-${candle.id}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#d7d2ea" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.2" />
            </linearGradient>

            {/* Flame */}
            <linearGradient id={`flame-${candle.id}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#fff7d5" />
              <stop offset="35%" stopColor="#ffd27a" />
              <stop offset="80%" stopColor="#ff9b3f" />
              <stop offset="100%" stopColor="#ff7a1a" />
            </linearGradient>
            <radialGradient id={`flame-inner-${candle.id}`} cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="65%" stopColor="#ffe9a8" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
            <filter id={`flame-blur-${candle.id}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="0.6" />
            </filter>

            {/* Glow */}
            <radialGradient id={`glow-${candle.id}`} cx="50%" cy="30%" r="60%">
              <stop offset="0%" stopColor="rgba(255, 230, 160, 0.95)" />
              <stop offset="60%" stopColor="rgba(255, 190, 90, 0.35)" />
              <stop offset="100%" stopColor="rgba(255, 150, 40, 0)" />
            </radialGradient>

            {/* Soft drop shadow */}
            <filter id={`shadow-${candle.id}`} x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
            </filter>

            {/* Name plaque gradients */}
            <linearGradient id={`plaque-base-${candle.id}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#caa85a" />
              <stop offset="100%" stopColor="#a27d2c" />
            </linearGradient>
            <linearGradient id={`plaque-face-${candle.id}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#fff2c9" />
              <stop offset="60%" stopColor="#f6d784" />
              <stop offset="100%" stopColor="#e9c15a" />
            </linearGradient>
          </defs>

          {/* Ground shadow */}
          <ellipse cx="60" cy="150" rx="30" ry="6" fill="#000" opacity="0.12" />

          {/* CANDLE BODY (simple, elegant white cylinder) */}
          {/* Main body */}
          <g filter={`url(#shadow-${candle.id})`}>
            <rect x="37" y="58" width="46" height="86" rx="10" fill={`url(#body-grad-${candle.id})`} />
            {/* top wax ellipse */}
            <ellipse cx="60" cy="58" rx="23" ry="8" fill={`url(#top-ell-${candle.id})`} />
            {/* subtle vertical gloss strip */}
            <rect x="44" y="60" width="6" height="80" rx="3" fill="white" opacity="0.5" />
            <rect x="70" y="60" width="3" height="78" rx="1.5" fill="#efeaff" opacity="0.35" />
            {/* a gentle embossed squiggle like in your screenshot */}
            <path
              d="M56 88c6 8-5 10 1 16c4 4 8-4 10-8"
              fill="none"
              stroke={`url(#squiggle-${candle.id})`}
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.6"
            />
          </g>

          {/* Wick */}
          <rect x="59" y="45" width="2" height="12.5" rx="1" fill="#1e1e1e" />

          {/* Flame (flicker + glow) */}
          <g className="flame-group" style={{ animationDelay: swayDelay }}>
            <path d="M60 27 C55.4 36 55 42 60 51 C65 42 64.6 36 60 27 Z" fill={`url(#flame-${candle.id})`} filter={`url(#flame-blur-${candle.id})`} />
            <path d="M60 30 C57.2 37 56.7 41 60 47 C63.3 41 62.8 37 60 30 Z" fill={`url(#flame-inner-${candle.id})`} />
            <circle cx="60" cy="28.6" r="0.9" fill="#fff6d5" opacity="0.9" />
          </g>

          {/* Warm glow */}
          <ellipse
            cx="60"
            cy="40"
            rx="32"
            ry="22"
            fill={`url(#glow-${candle.id})`}
            className="glow-effect"
            style={{ animationDelay: flickerDelay }}
          />

          {/* Eternal mark */}
          {isEternal && (
            <text x="60" y="18" textAnchor="middle" fontSize="14" fill="#f3e4b0">
              ✨
            </text>
          )}

          {/* NAME PLAQUE (gold, separate from candle body) */}
          <g transform="translate(0, 0)">
            {/* shadowy under-base */}
            <path
              d="M36 126 h48 a8 8 0 0 1 8 8 v2 a8 8 0 0 1 -8 8 h-48 a8 8 0 0 1 -8 -8 v-2 a8 8 0 0 1 8 -8 z"
              fill={`url(#plaque-base-${candle.id})`}
              opacity="0.85"
              filter={`url(#shadow-${candle.id})`}
            />
            {/* face */}
            <rect x="38" y="128" width="44" height="16" rx="8" fill={`url(#plaque-face-${candle.id})`} stroke="rgba(0,0,0,0.1)" />
            {/* inner inset highlight */}
            <rect x="40" y="130" width="40" height="12" rx="6" fill="rgba(255,255,255,0.35)" opacity="0.5" />
            {/* name text */}
            <text
              x="60"
              y="139"
              textAnchor="middle"
              fontSize="6.2"
              fontWeight={700}
              fill="#3e2e16"
              letterSpacing="0.3"
              style={{ userSelect: "none" }}
              textLength={40}
              lengthAdjust="spacingAndGlyphs"
            >
              {candle.name}
            </text>
          </g>
        </svg>

        {isEternal && <div className="eternal-badge">Eternal Flame</div>}
      </div>

      <div className="candle-info">
        <h3 className="candle-name">{candle.name}</h3>

        {candle.message && <p className="candle-message">"{candle.message}"</p>}

        <div className="candle-meta">
          <span className="candle-date">Lit on {formattedDate}</span>
          {candle.amount_paid && (
            <span className="candle-amount">
              ${(candle.amount_paid / 100).toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MyCandlesPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [myCandles, setMyCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "eternal" | "renewable">("all");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      setUserId(user?.id ?? null);
    });
  }, []);

  const loadMyCandles = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      // Query using created_by field (where purchased candles are stored)
      const { data, error } = await supabase
        .from("candle_offerings")
        .select("*")
        .eq("created_by", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading candles:", error);
      } else {
        setMyCandles(data || []);
      }
    } catch (error) {
      console.error("Error loading candles:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      loadMyCandles();
    }
  }, [userId]);

  // Filter and categorize candles
  const { eternalCandles, renewableCandles, displayCandles } = useMemo(() => {
    const eternal = myCandles.filter((c) => c.candle_type === "eternal");
    const renewable = myCandles.filter((c) => c.candle_type !== "eternal");

    let display = myCandles;
    if (filter === "eternal") display = eternal;
    if (filter === "renewable") display = renewable;

    return {
      eternalCandles: eternal,
      renewableCandles: renewable,
      displayCandles: display,
    };
  }, [myCandles, filter]);

  // Calculate total spent
  const totalSpent = useMemo(() => {
    return myCandles.reduce((sum, candle) => sum + (candle.amount_paid || 0), 0) / 100;
  }, [myCandles]);

  return (
    <div className="my-candles-page">
      {/* Animated Starry Background */}
      <StarryBackground />
      <div className="page-background"></div>

      {/* Inspirational Quote */}
      <div className="inspirational-quote">
        "Each flame carries a prayer, each light holds a memory, each candle bridges heaven and earth."
      </div>

      <header className="page-header">
        <Link href="/profile" className="back-button">
          ← Back to Profile
        </Link>

        <h1 className="page-title">
          <span className="title-icon">🕯️</span>
          My Sacred Candles
        </h1>

        <Link href="/meditation/candles" className="visit-sanctuary">
          Visit Sanctuary →
        </Link>
      </header>

      {/* Stats Overview */}
      <div className="stats-overview">
        <div className="stat-card total">
          <div className="stat-value">{myCandles.length}</div>
          <div className="stat-label">Total Candles</div>
        </div>

        <div className="stat-card eternal">
          <div className="stat-value">{eternalCandles.length}</div>
          <div className="stat-label">Eternal Flames</div>
        </div>

        <div className="stat-card renewable">
          <div className="stat-value">{renewableCandles.length}</div>
          <div className="stat-label">Prayer Candles</div>
        </div>

        <div className="stat-card contribution">
          <div className="stat-value">${totalSpent.toFixed(2)}</div>
          <div className="stat-label">Total Contribution</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button
          onClick={() => setFilter("all")}
          className={`filter-tab ${filter === "all" ? "active" : ""}`}
        >
          All Candles ({myCandles.length})
        </button>
        <button
          onClick={() => setFilter("eternal")}
          className={`filter-tab ${filter === "eternal" ? "active" : ""}`}
        >
          ✨ Eternal ({eternalCandles.length})
        </button>
        <button
          onClick={() => setFilter("renewable")}
          className={`filter-tab ${filter === "renewable" ? "active" : ""}`}
        >
          🕯️ Renewable ({renewableCandles.length})
        </button>
      </div>

      {/* Candles Grid */}
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your sacred candles...</p>
        </div>
      ) : displayCandles.length > 0 ? (
        <div className="candles-grid">
          {displayCandles.map((candle) => (
            <CandleDisplay key={candle.id} candle={candle} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">🕯️</div>
          <h2>No Candles Yet</h2>
          <p>Light your first candle to create a sacred space</p>
          <Link href="/meditation/candles" className="cta-button">
            Visit Candle Sanctuary
          </Link>
        </div>
      )}

      <style jsx>{`
        .my-candles-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #4c3a8b 0%, #6b5ca5 50%, #8b7bb8 100%);
          position: relative;
          padding: 2rem 1rem;
          overflow-x: hidden;
        }

        .starry-container {
          position: fixed;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 0;
        }

        .star {
          position: absolute;
          width: 2px;
          height: 2px;
          background: white;
          border-radius: 50%;
          animation: twinkle 3s infinite;
          box-shadow: 0 0 6px rgba(255, 255, 255, 0.5);
        }

        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }

        .sparkle {
          position: absolute;
          width: 4px;
          height: 4px;
          background: #fbbf24;
          border-radius: 50%;
          animation: floatSparkle 20s infinite linear;
          box-shadow: 
            0 0 10px rgba(251, 191, 36, 0.5),
            0 0 20px rgba(251, 191, 36, 0.3);
        }

        @keyframes floatSparkle {
          0% { 
            transform: translateY(100vh) translateX(0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% { 
            transform: translateY(-100vh) translateX(100px) rotate(720deg);
            opacity: 0;
          }
        }

        .page-background {
          position: fixed;
          inset: 0;
          background: 
            radial-gradient(circle at 20% 30%, rgba(251,191,36,0.15) 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(139,92,246,0.1) 0%, transparent 40%),
            radial-gradient(circle at 50% 50%, rgba(245,158,11,0.08) 0%, transparent 50%);
          pointer-events: none;
          z-index: 1;
        }

        .inspirational-quote {
          text-align: center;
          color: #fde68a;
          font-style: italic;
          font-size: 1.125rem;
          margin-bottom: 2rem;
          padding: 0 1rem;
          position: relative;
          z-index: 2;
          opacity: 0.9;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
          position: relative;
          z-index: 2;
        }

        .back-button, .visit-sanctuary {
          padding: 0.5rem 1rem;
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(10px);
          color: #fbbf24;
          border-radius: 0.5rem;
          text-decoration: none;
          transition: all 0.2s;
          font-size: 0.875rem;
          border: 1px solid rgba(251,191,36,0.2);
        }

        .back-button:hover, .visit-sanctuary:hover {
          background: rgba(255,255,255,0.15);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(251,191,36,0.2);
        }

        .page-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.875rem;
          font-weight: 700;
          color: #fbbf24;
          margin: 0;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        .title-icon {
          font-size: 2rem;
        }

        .stats-overview {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
          position: relative;
          z-index: 2;
        }

        .stat-card {
          background: rgba(255,255,255,0.05);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(251,191,36,0.2);
          border-radius: 0.75rem;
          padding: 1.25rem;
          text-align: center;
          transition: all 0.3s;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          background: rgba(255,255,255,0.08);
          box-shadow: 0 8px 24px rgba(251,191,36,0.15);
        }

        .stat-value {
          font-size: 1.75rem;
          font-weight: 700;
          color: #fbbf24;
          margin-bottom: 0.25rem;
          text-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .stat-label {
          font-size: 0.75rem;
          color: #fde68a;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .stat-card.eternal {
          border-color: rgba(168,85,247,0.3);
          background: linear-gradient(135deg, rgba(168,85,247,0.05), rgba(139,92,246,0.05));
        }

        .stat-card.renewable {
          border-color: rgba(59,130,246,0.3);
          background: linear-gradient(135deg, rgba(59,130,246,0.05), rgba(37,99,235,0.05));
        }

        .stat-card.contribution {
          border-color: rgba(34,197,94,0.3);
          background: linear-gradient(135deg, rgba(34,197,94,0.05), rgba(22,163,74,0.05));
        }

        .filter-tabs {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 2rem;
          position: relative;
          z-index: 2;
          flex-wrap: wrap;
        }

        .filter-tab {
          padding: 0.625rem 1.25rem;
          background: rgba(255,255,255,0.05);
          backdrop-filter: blur(10px);
          color: #fde68a;
          border: 1px solid rgba(251,191,36,0.2);
          border-radius: 2rem;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.875rem;
        }

        .filter-tab:hover {
          background: rgba(255,255,255,0.08);
          transform: translateY(-1px);
        }

        .filter-tab.active {
          background: linear-gradient(135deg, rgba(251,191,36,0.3), rgba(245,158,11,0.3));
          border-color: #fbbf24;
          color: #fbbf24;
          box-shadow: 0 4px 12px rgba(251,191,36,0.2);
        }

        .candles-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.5rem;
          position: relative;
          z-index: 2;
        }

        @media (min-width: 768px) {
          .candles-grid {
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          }
        }

        .candle-display {
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(251,191,36,0.15);
          border-radius: 1rem;
          padding: 1.5rem;
          transition: all 0.3s;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          position: relative;
          overflow: hidden;
        }

        .candle-display::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(
            45deg,
            transparent,
            rgba(251,191,36,0.1),
            transparent
          );
          transform: rotate(45deg);
          transition: all 0.5s;
          opacity: 0;
        }

        .candle-display:hover::before {
          opacity: 1;
          animation: shimmer 0.5s;
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
          100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
        }

        .candle-display:hover {
          transform: translateY(-4px);
          background: rgba(255,255,255,0.06);
          box-shadow: 0 12px 32px rgba(251,191,36,0.2);
          border-color: rgba(251,191,36,0.3);
        }

        .candle-visual {
          position: relative;
          width: 120px;
          height: 160px;
        }

        .candle-svg {
          width: 100%;
          height: 100%;
        }

        /* Flicker + sway */
        .flame-group {
          animation: flicker 1.6s infinite ease-in-out, sway 2.8s infinite ease-in-out;
          transform-origin: 60px 52px;
        }

        @keyframes flicker {
          0%, 100% { filter: brightness(1); }
          20% { filter: brightness(1.05); }
          40% { filter: brightness(0.95); }
          60% { filter: brightness(1.08); }
          80% { filter: brightness(0.98); }
        }

        @keyframes sway {
          0%   { transform: rotate(-1deg) translateX(-0.3px) scale(1); opacity: 0.96; }
          25%  { transform: rotate(1deg) translateX(0.4px)  scale(1.03); opacity: 1; }
          50%  { transform: rotate(0deg) translateX(0px)    scale(0.98); opacity: 0.92; }
          75%  { transform: rotate(-0.6deg) translateX(-0.2px) scale(1.02); opacity: 0.96; }
          100% { transform: rotate(-1deg) translateX(-0.3px) scale(1); opacity: 0.96; }
        }

        .glow-effect {
          animation: glow 2.5s infinite ease-in-out;
        }

        @keyframes glow {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 0.9; }
        }

        .eternal-badge {
          position: absolute;
          bottom: -0.5rem;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.625rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          box-shadow: 0 4px 12px rgba(251,191,36,0.3);
        }

        .candle-info {
          text-align: center;
          width: 100%;
        }

        .candle-name {
          font-size: 1.125rem;
          font-weight: 600;
          color: #fbbf24;
          margin: 0 0 0.5rem 0;
          text-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .candle-message {
          font-size: 0.875rem;
          color: #fde68a;
          font-style: italic;
          margin: 0 0 0.75rem 0;
          opacity: 0.9;
          line-height: 1.4;
        }

        .candle-meta {
          display: flex;
          justify-content: center;
          gap: 1rem;
          font-size: 0.75rem;
          color: #fde68a;
          opacity: 0.7;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 300px;
          color: #fde68a;
          position: relative;
          z-index: 2;
        }

        .loading-spinner {
          width: 3rem;
          height: 3rem;
          border: 3px solid rgba(251,191,36,0.2);
          border-top: 3px solid #fbbf24;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          box-shadow: 0 0 20px rgba(251,191,36,0.3);
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: #fde68a;
          position: relative;
          z-index: 2;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          animation: float 3s infinite ease-in-out;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .empty-state h2 {
          font-size: 1.5rem;
          color: #fbbf24;
          margin: 0 0 0.5rem 0;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        .empty-state p {
          margin: 0 0 1.5rem 0;
          opacity: 0.9;
        }

        .cta-button {
          display: inline-block;
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          color: white;
          border-radius: 0.5rem;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(251,191,36,0.3);
        }

        .cta-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(251,191,36,0.4);
        }

        /* Mobile Optimizations */
        @media (max-width: 640px) {
          .my-candles-page {
            padding: 1rem 0.5rem;
          }
          
          .inspirational-quote {
            font-size: 1rem;
            margin-bottom: 1.5rem;
          }

          .page-header {
            flex-direction: column;
            text-align: center;
            gap: 0.75rem;
          }
          
          .page-title {
            font-size: 1.5rem;
          }

          .back-button, .visit-sanctuary {
            width: 100%;
            text-align: center;
          }
          
          .stats-overview {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.75rem;
          }

          .stat-card {
            padding: 1rem;
          }

          .stat-value {
            font-size: 1.5rem;
          }

          .filter-tabs {
            justify-content: center;
            width: 100%;
          }

          .filter-tab {
            padding: 0.5rem 1rem;
            font-size: 0.8125rem;
          }
          
          .candles-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .candle-display {
            padding: 1.25rem;
          }

          .candle-visual {
            width: 100px;
            height: 140px;
          }

          .candle-name {
            font-size: 1rem;
          }

          .candle-message {
            font-size: 0.8125rem;
          }

          .empty-state {
            padding: 3rem 1.5rem;
          }

          .empty-icon {
            font-size: 3rem;
          }

          .empty-state h2 {
            font-size: 1.25rem;
          }
        }

        @media (max-width: 375px) {
          .filter-tab {
            padding: 0.5rem 0.75rem;
            font-size: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}
