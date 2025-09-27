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
  const createdDate = new Date(candle.created_at);
  const formattedDate = createdDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // desync multiple flames
  const beginOffset = (Math.random() * 1.2).toFixed(2) + "s";

  return (
    <>
      <div className="candle-display">
        <div className="candle-visual">
          <svg viewBox="0 0 160 220" className="candle-svg" aria-hidden>
            <defs>
              {/* Pillar wax (warm amber, darker edges) */}
              <linearGradient id={`waxSide-${candle.id}`} x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#c26826" />
                <stop offset="14%" stopColor="#e28c3c" />
                <stop offset="50%" stopColor="#ffd096" />
                <stop offset="86%" stopColor="#e28c3c" />
                <stop offset="100%" stopColor="#b85c20" />
              </linearGradient>
              {/* front glow to fake subsurface scattering */}
              <radialGradient id={`waxFront-${candle.id}`} cx="50%" cy="35%" r="70%">
                <stop offset="0%" stopColor="#ffe4b8" stopOpacity="0.95" />
                <stop offset="45%" stopColor="#ffd9a1" stopOpacity="0.85" />
                <stop offset="85%" stopColor="#f1a555" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#a44d1a" stopOpacity="0.35" />
              </radialGradient>

              {/* Melted top rim + inner pool */}
              <radialGradient id={`waxTop-${candle.id}`} cx="50%" cy="40%" r="65%">
                <stop offset="0%" stopColor="#ffe9c7" />
                <stop offset="55%" stopColor="#ffd299" />
                <stop offset="100%" stopColor="#eaa25c" />
              </radialGradient>
              <radialGradient id={`pool-${candle.id}`} cx="50%" cy="55%" r="70%">
                <stop offset="0%" stopColor="#fff4dd" />
                <stop offset="60%" stopColor="#ffd69f" />
                <stop offset="100%" stopColor="#ffb764" />
              </radialGradient>

              {/* plate + vignette */}
              <radialGradient id={`plate-${candle.id}`} cx="50%" cy="50%" r="55%">
                <stop offset="0%" stopColor="rgba(0,0,0,0.22)" />
                <stop offset="70%" stopColor="rgba(0,0,0,0.12)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.0)" />
              </radialGradient>
              <radialGradient id={`bgGlow-${candle.id}`} cx="50%" cy="10%" r="85%">
                <stop offset="0%" stopColor="rgba(255,220,150,0.9)" />
                <stop offset="60%" stopColor="rgba(255,195,110,0.35)" />
                <stop offset="100%" stopColor="rgba(255,165,60,0.0)" />
              </radialGradient>

              {/* Flame */}
              <linearGradient id={`flame-${candle.id}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="35%" stopColor="#ffe7b3" />
                <stop offset="75%" stopColor="#ff9b3f" />
                <stop offset="100%" stopColor="#ff7a1a" />
              </linearGradient>
              <radialGradient id={`flameCore-${candle.id}`} cx="50%" cy="40%" r="60%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="65%" stopColor="#ffe7b3" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </radialGradient>
              <filter id={`flameBlur-${candle.id}`} x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="0.6">
                  <animate
                    attributeName="stdDeviation"
                    values="0.45;0.95;0.55;0.8;0.6"
                    dur="1.6s"
                    begin={beginOffset}
                    repeatCount="indefinite"
                  />
                </feGaussianBlur>
              </filter>
              {/* heat shimmer */}
              <filter id={`heat-${candle.id}`} x="-50%" y="-50%" width="200%" height="200%">
                <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="2" result="t" />
                <feDisplacementMap in="SourceGraphic" in2="t" scale="1.8" xChannelSelector="R" yChannelSelector="G">
                  <animate attributeName="scale" values="1;2;1.4;2.2;1.2" dur="1.8s" begin={beginOffset} repeatCount="indefinite" />
                </feDisplacementMap>
              </filter>

              {/* soft shadow */}
              <filter id={`softShadow-${candle.id}`} x="-35%" y="-35%" width="170%" height="190%">
                <feDropShadow dx="0" dy="2.5" stdDeviation="3" floodOpacity="0.18" />
              </filter>

              {/* gold tag for name */}
              <linearGradient id={`tagBase-${candle.id}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#caa85a" />
                <stop offset="100%" stopColor="#a27d2c" />
              </linearGradient>
              <linearGradient id={`tagFace-${candle.id}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#fff2c9" />
                <stop offset="55%" stopColor="#f6d784" />
                <stop offset="100%" stopColor="#e9c15a" />
              </linearGradient>
            </defs>

            {/* ambience */}
            <ellipse cx="80" cy="100" rx="72" ry="78" fill={`url(#bgGlow-${candle.id})`}>
              <animate attributeName="opacity" values="0.55;0.88;0.62;0.84;0.55" dur="2.2s" begin={beginOffset} repeatCount="indefinite" />
            </ellipse>

            {/* ground shadow */}
            <ellipse cx="80" cy="204" rx="46" ry="10" fill={`url(#plate-${candle.id})`}>
              <animate attributeName="opacity" values="0.22;0.18;0.21;0.16;0.22" dur="2.0s" begin={beginOffset} repeatCount="indefinite" />
            </ellipse>

            {/* ===== pillar body ===== */}
            <g filter={`url(#softShadow-${candle.id})`}>
              {/* rounded pillar */}
              <rect x="42" y="62" width="76" height="124" rx="18" fill={`url(#waxSide-${candle.id})`} />
              {/* warm front glow overlay */}
              <rect x="42" y="62" width="76" height="124" rx="18" fill={`url(#waxFront-${candle.id})`} opacity="0.9" />

              {/* melted top with concave pocket */}
              <path
                d="M50 62
                   Q80 48 110 62
                   C112 65 110 68 106 69
                   C94 73 66 73 54 69
                   C50 68 48 65 50 62 Z"
                fill={`url(#waxTop-${candle.id})`}
              />
              {/* inner wax pool reflection */}
              <ellipse cx="80" cy="72" rx="24" ry="7.2" fill={`url(#pool-${candle.id})`} opacity="0.85" />
            </g>

            {/* wick (slightly warm highlight) */}
            <rect x="79" y="64" width="2" height="16" rx="1" fill="#2a2a2a" />
            <rect x="79.3" y="64" width="1.4" height="7" rx="0.7" fill="#5a4630" opacity="0.6" />

            {/* ===== flame ===== */}
            <g transform="translate(0,0)">
              <g transform="rotate(0 80 60)">
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  values="-2 80 60; 1.2 80 60; 0 80 60; -1.4 80 60; -2 80 60"
                  dur="1.6s"
                  begin={beginOffset}
                  repeatCount="indefinite"
                />
                <animateTransform
                  attributeName="transform"
                  additive="sum"
                  type="scale"
                  values="1 1; 1.05 1.06; 0.98 0.96; 1.03 1.02; 1 1"
                  dur="1.6s"
                  begin={beginOffset}
                  repeatCount="indefinite"
                />
                <animate attributeName="opacity" values="0.93;1;0.88;0.99;0.93" dur="1.6s" begin={beginOffset} repeatCount="indefinite" />

                {/* outer flame */}
                <path
                  d="M80 34 C74.5 45 74 52 80 62 C86 52 85.5 45 80 34 Z"
                  fill={`url(#flame-${candle.id})`}
                  filter={`url(#flameBlur-${candle.id})`}
                >
                  <animate
                    attributeName="d"
                    dur="1.8s"
                    begin={beginOffset}
                    repeatCount="indefinite"
                    values="
                      M80 34 C74.5 45 74 52 80 62 C86 52 85.5 45 80 34 Z;
                      M80 34 C74.2 44.5 74 52 80 62 C86 53 85.8 45.5 80 34 Z;
                      M80 34 C74.8 45.5 74.2 52 80 61.6 C85.8 52 85.2 45 80 34 Z;
                      M80 34 C74.5 45 74 52 80 62 C86 52 85.5 45 80 34 Z
                    "
                  />
                </path>

                {/* inner hot core with heat shimmer */}
                <path
                  d="M80 37 C77 45 76.5 49 80 56 C83.5 49 83 45 80 37 Z"
                  fill={`url(#flameCore-${candle.id})`}
                  filter={`url(#heat-${candle.id})`}
                />
                <circle cx="80" cy="36" r="1" fill="#fff7d2">
                  <animate attributeName="r" values="0.8;1.05;0.85;1.05;0.8" dur="1.8s" begin={beginOffset} repeatCount="indefinite" />
                </circle>
              </g>
            </g>

            {/* name tag button under candle */}
            <g transform="translate(0,0)">
              <path d="M58 148 h44 a10 10 0 0 1 10 10 v2 a10 10 0 0 1 -10 10 h-44 a10 10 0 0 1 -10 -10 v-2 a10 10 0 0 1 10 -10 z" fill={`url(#tagBase-${candle.id})`} opacity="0.92" filter={`url(#softShadow-${candle.id})`} />
              <rect x="60" y="150" width="40" height="16" rx="8" fill={`url(#tagFace-${candle.id})`} />
              <text x="80" y="161" textAnchor="middle" fontSize="7" fontWeight={700} fill="#3e2e16" style={{ userSelect: "none" }} textLength={34} lengthAdjust="spacingAndGlyphs">
                {candle.name}
              </text>
            </g>

            {isEternal && <text x="80" y="24" textAnchor="middle" fontSize="14" fill="#f3e4b0">✨</text>}
          </svg>

          {isEternal && <div className="eternal-badge">Eternal Flame</div>}
        </div>

        <div className="candle-info">
          <h3 className="candle-name">{candle.name}</h3>
          {candle.message && <p className="candle-message">"{candle.message}"</p>}
          <div className="candle-meta">
            <span className="candle-date">Lit on {formattedDate}</span>
            {candle.amount_paid && <span className="candle-amount">${(candle.amount_paid / 100).toFixed(2)}</span>}
          </div>
        </div>
      </div>

      <style jsx>{`
        .candle-display {
          background: radial-gradient(120% 90% at 50% 0%, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
          backdrop-filter: blur(12px);
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
        .candle-display:hover {
          transform: translateY(-4px);
          background: rgba(255,255,255,0.06);
          box-shadow: 0 12px 32px rgba(251,191,36,0.22);
          border-color: rgba(251,191,36,0.32);
        }
        .candle-visual { position: relative; width: 160px; height: 220px; }
        .candle-svg { width: 100%; height: 100%; display: block; }

        .eternal-badge {
          position: absolute;
          bottom: -0.5rem; left: 50%; transform: translateX(-50%);
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          color: white; padding: 0.25rem 0.75rem; border-radius: 1rem;
          font-size: 0.625rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.05em; box-shadow: 0 4px 12px rgba(251,191,36,0.3);
        }
        .candle-info { text-align: center; width: 100%; }
        .candle-name { font-size: 1.125rem; font-weight: 600; color: #fbbf24; margin: 0 0 0.5rem 0; text-shadow: 0 2px 4px rgba(0,0,0,0.2); }
        .candle-message { font-size: 0.875rem; color: #fde68a; font-style: italic; margin: 0 0 0.75rem 0; opacity: 0.9; line-height: 1.4; }
        .candle-meta { display: flex; justify-content: center; gap: 1rem; font-size: 0.75rem; color: #fde68a; opacity: 0.75; }

        /* Mobile */
        @media (max-width: 640px) {
          .candle-visual { width: 140px; height: 200px; }
          .candle-name { font-size: 1rem; }
          .candle-message { font-size: 0.8125rem; }
        }
        @media (max-width: 375px) {
          .candle-display { padding: 1rem; }
          .candle-visual { width: 120px; height: 180px; }
          .candle-name { font-size: 0.95rem; }
          .candle-message { font-size: 0.75rem; }
          .candle-meta { flex-direction: column; gap: 0.25rem; font-size: 0.6875rem; }
        }
      `}</style>
    </>
  );
}
