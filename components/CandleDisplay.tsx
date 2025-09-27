// components/CandleDisplay.tsx
"use client";

import React from "react";

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

interface CandleDisplayProps {
  candle: Candle;
}

export default function CandleDisplay({ candle }: CandleDisplayProps) {
  const isEternal = candle.candle_type === "eternal";
  const color = candle.color || "white";

  const colorMap: Record<string, { main: string; gradient: string[]; rim?: string }> = {
    white: { main: "#ffffff", gradient: ["#ffffff", "#F6F4FB", "#EEEAF7"], rim: "#e9e4f4" },
    gold: { main: "#f8e3b1", gradient: ["#fff5d6", "#f8e3b1", "#e6c56e"], rim: "#e7cf98" },
    rose: { main: "#f7c4c9", gradient: ["#ffd6d9", "#f7c4c9", "#e8a5ab"], rim: "#eab0b7" },
    azure: { main: "#c5e3ff", gradient: ["#dceeff", "#c5e3ff", "#9bc8f7"], rim: "#b4d3f0" },
    violet: { main: "#d8c7ff", gradient: ["#e8dcff", "#d8c7ff", "#c0a8f7"], rim: "#cdbbfa" },
    emerald: { main: "#cdebd3", gradient: ["#dff5e3", "#cdebd3", "#a8d6b3"], rim: "#bfe1c6" }
  };

  const palette = colorMap[color] || colorMap.white;

  const createdDate = new Date(candle.created_at);
  const formattedDate = createdDate.toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  // Slight randomization so multiple flames don't sync perfectly
  const beginOffset = (Math.random() * 1.2).toFixed(2) + "s";

  return (
    <>
      <div className="candle-display">
        <div className="candle-visual">
          <svg viewBox="0 0 120 160" className="candle-svg" aria-hidden>
            <defs>
              {/* Body gradients */}
              <linearGradient id={`body-grad-${candle.id}`} x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%"  stopColor="#f7f6fc" />
                <stop offset="18%" stopColor="#ffffff" />
                <stop offset="55%" stopColor="#f1eef9" />
                <stop offset="100%" stopColor="#ece8f6" />
              </linearGradient>
              <radialGradient id={`top-ell-${candle.id}`} cx="50%" cy="45%" r="60%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="70%" stopColor="#f2effa" />
                <stop offset="100%" stopColor="#e8e3f4" />
              </radialGradient>
              <linearGradient id={`squiggle-${candle.id}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#d7d2ea" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0.2" />
              </linearGradient>

              {/* Base plate (soft) */}
              <radialGradient id={`plate-${candle.id}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%"   stopColor="rgba(0,0,0,0.18)" />
                <stop offset="70%"  stopColor="rgba(0,0,0,0.12)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.00)" />
              </radialGradient>

              {/* Flame + glow */}
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
                <feGaussianBlur stdDeviation="0.55">
                  <animate attributeName="stdDeviation" values="0.45;0.8;0.5;0.7;0.55" dur="1.6s" begin={beginOffset} repeatCount="indefinite"/>
                </feGaussianBlur>
              </filter>
              <radialGradient id={`glow-${candle.id}`} cx="50%" cy="30%" r="60%">
                <stop offset="0%" stopColor="rgba(255, 232, 170, 0.95)" />
                <stop offset="60%" stopColor="rgba(255, 194, 100, 0.35)" />
                <stop offset="100%" stopColor="rgba(255, 160, 40, 0)" />
              </radialGradient>

              {/* Soft shadow */}
              <filter id={`shadow-${candle.id}`} x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
              </filter>

              {/* Plaque */}
              <linearGradient id={`plaque-base-${candle.id}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%"   stopColor="#caa85a" />
                <stop offset="100%" stopColor="#a27d2c" />
              </linearGradient>
              <linearGradient id={`plaque-face-${candle.id}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%"   stopColor="#fff2c9" />
                <stop offset="55%"  stopColor="#f6d784" />
                <stop offset="100%" stopColor="#e9c15a" />
              </linearGradient>
            </defs>

            {/* Ground plate + soft vignette */}
            <ellipse cx="60" cy="151" rx="38" ry="8" fill={`url(#plate-${candle.id})`} />

            {/* Candle body (sleek white) */}
            <g filter={`url(#shadow-${candle.id})`}>
              <rect x="36.5" y="58" width="47" height="86" rx="11" fill={`url(#body-grad-${candle.id})`} />
              {/* top ellipse */}
              <ellipse cx="60" cy="58" rx="23.5" ry="8.3" fill={`url(#top-ell-${candle.id})`} />
              {/* vertical gloss strips */}
              <rect x="45" y="62" width="6" height="78" rx="3" fill="#ffffff" opacity="0.45" />
              <rect x="70.5" y="62" width="3.2" height="76" rx="1.6" fill="#efeaff" opacity="0.35" />
              {/* subtle embossed squiggle */}
              <path d="M56 88c6 8-5 10 1 16c4 4 8-4 10-8" fill="none" stroke={`url(#squiggle-${candle.id})`} strokeWidth="2" strokeLinecap="round" opacity="0.55" />
            </g>

            {/* Wick */}
            <rect x="59" y="45" width="2" height="12.5" rx="1" fill="#1e1e1e" />

            {/* Flame group with TRUE flicker (SVG animate) */}
            <g id={`flamegrp-${candle.id}`} transform="rotate(0,60,52)">
              {/* rotate/sway */}
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="-2 60 52; 1 60 52; 0 60 52; -1 60 52; -2 60 52"
                dur="1.6s"
                begin={beginOffset}
                repeatCount="indefinite"
              />
              {/* opacity twinkle */}
              <animate
                attributeName="opacity"
                values="0.92;1;0.88;0.98;0.92"
                dur="1.6s"
                begin={beginOffset}
                repeatCount="indefinite"
              />
              {/* scale breathing */}
              <animateTransform
                attributeName="transform"
                additive="sum"
                type="scale"
                values="1 1; 1.04 1.06; 0.98 0.96; 1.02 1.02; 1 1"
                dur="1.6s"
                begin={beginOffset}
                repeatCount="indefinite"
              />

              {/* outer flame */}
              <path d="M60 27 C55.4 36 55 42 60 51 C65 42 64.6 36 60 27 Z" fill={`url(#flame-${candle.id})`} filter={`url(#flame-blur-${candle.id})`} />
              {/* inner hot core */}
              <path d="M60 30 C57.2 37 56.7 41 60 47 C63.3 41 62.8 37 60 30 Z" fill={`url(#flame-inner-${candle.id})`} />
              {/* tip sparkle */}
              <circle cx="60" cy="28.6" r="0.9" fill="#fff6d5" opacity="0.95" />
            </g>

            {/* Warm glow that also breathes */}
            <ellipse cx="60" cy="41" rx="32" ry="22" fill={`url(#glow-${candle.id})`}>
              <animate attributeName="opacity" values="0.55;0.9;0.6;0.85;0.55" dur="2.2s" begin={beginOffset} repeatCount="indefinite" />
            </ellipse>

            {/* Eternal mark */}
            {isEternal && (
              <text x="60" y="18" textAnchor="middle" fontSize="14" fill="#f3e4b0">✨</text>
            )}

            {/* Gold name plaque (ornate, centered under candle) */}
            <g>
              {/* rim/back */}
              <path
                d="M34 125 h52 a9 9 0 0 1 9 9 v3 a9 9 0 0 1 -9 9 h-52 a9 9 0 0 1 -9 -9 v-3 a9 9 0 0 1 9 -9 z"
                fill={`url(#plaque-base-${candle.id})`}
                opacity="0.9"
                filter={`url(#shadow-${candle.id})`}
              />
              {/* face */}
              <rect x="38" y="128" width="44" height="16" rx="8" fill={`url(#plaque-face-${candle.id})`} stroke="rgba(0,0,0,0.1)" />
              {/* inner highlight */}
              <rect x="40" y="130" width="40" height="12" rx="6" fill="rgba(255,255,255,0.4)" opacity="0.5" />
              {/* name */}
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

      <style jsx>{`
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
          background: linear-gradient(45deg, transparent, rgba(251,191,36,0.1), transparent);
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

        /* Mobile Optimizations */
        @media (max-width: 640px) {
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
        }

        @media (max-width: 375px) {
          .candle-display { 
            padding: 1rem; 
          }
          
          .candle-visual { 
            width: 90px; 
            height: 130px; 
          }
          
          .candle-name { 
            font-size: 0.9375rem; 
          }
          
          .candle-message { 
            font-size: 0.75rem; 
          }
          
          .candle-meta {
            flex-direction: column;
            gap: 0.25rem;
            font-size: 0.6875rem;
          }
        }
      `}</style>
    </>
  );
}
