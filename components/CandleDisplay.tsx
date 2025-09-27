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

  // Main wax tone + gentle tinting for the body gradient
  const colorMap: Record<string, { main: string; gradient: string[]; rim?: string }> = {
    white:  { main: "#ffffff", gradient: ["#ffffff", "#F6F4FB", "#EEEAF7"], rim: "#e9e4f4" },
    gold:   { main: "#f8e3b1", gradient: ["#fff7de", "#f8e3b1", "#e6c56e"], rim: "#e7cf98" },
    rose:   { main: "#f7c4c9", gradient: ["#ffe3e6", "#f7c4c9", "#e8a5ab"], rim: "#eab0b7" },
    azure:  { main: "#c5e3ff", gradient: ["#e9f4ff", "#cfe7ff", "#a9d2fb"], rim: "#b4d3f0" },
    violet: { main: "#d8c7ff", gradient: ["#eee7ff", "#d8c7ff", "#c0a8f7"], rim: "#cdbbfa" },
    emerald:{ main: "#cdebd3", gradient: ["#e8f7ec", "#cdebd3", "#a8d6b3"], rim: "#bfe1c6" }
  };

  const palette = colorMap[color] || colorMap.white;

  const createdDate = new Date(candle.created_at);
  const formattedDate = createdDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Desync multiple flames so they don’t flicker in unison
  const beginOffset = (Math.random() * 1.2).toFixed(2) + "s";

  return (
    <>
      <div className="candle-display">
        <div className="candle-visual">
          <svg viewBox="0 0 120 180" className="candle-svg" aria-hidden>
            <defs>
              {/* ====== Wax body + rim gradients (tinted by palette) ====== */}
              <linearGradient id={`wax-body-${candle.id}`} x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%"  stopColor={palette.gradient[0]} />
                <stop offset="20%" stopColor="#ffffff" />
                <stop offset="58%" stopColor={palette.gradient[1]} />
                <stop offset="100%" stopColor={palette.gradient[2]} />
              </linearGradient>

              <radialGradient id={`wax-top-${candle.id}`} cx="50%" cy="45%" r="62%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="70%" stopColor={palette.rim || "#f2effa"} />
                <stop offset="100%" stopColor="#e8e3f4" />
              </radialGradient>

              {/* Subtle vertical gloss strips */}
              <linearGradient id={`wax-gloss-${candle.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
                <stop offset="50%" stopColor="#ffffff" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
              </linearGradient>

              {/* Plate / ground shadow */}
              <radialGradient id={`plate-${candle.id}`} cx="50%" cy="50%" r="55%">
                <stop offset="0%"   stopColor="rgba(0,0,0,0.22)"/>
                <stop offset="70%"  stopColor="rgba(0,0,0,0.12)"/>
                <stop offset="100%" stopColor="rgba(0,0,0,0.00)"/>
              </radialGradient>

              {/* Warm global glow */}
              <radialGradient id={`global-glow-${candle.id}`} cx="50%" cy="18%" r="68%">
                <stop offset="0%"   stopColor="rgba(255, 234, 180, 0.95)"/>
                <stop offset="55%"  stopColor="rgba(255, 205, 120, 0.35)"/>
                <stop offset="100%" stopColor="rgba(255, 165, 60, 0.0)"/>
              </radialGradient>

              {/* ========= Flame shading ========= */}
              <linearGradient id={`flame-grad-${candle.id}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%"   stopColor="#fff8de"/>
                <stop offset="35%"  stopColor="#ffd27a"/>
                <stop offset="80%"  stopColor="#ff9b3f"/>
                <stop offset="100%" stopColor="#ff7a1a"/>
              </linearGradient>
              <radialGradient id={`flame-core-${candle.id}`} cx="50%" cy="42%" r="62%">
                <stop offset="0%"   stopColor="#ffffff"/>
                <stop offset="60%"  stopColor="#ffe39b"/>
                <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
              </radialGradient>

              {/* Flame blur + heat shimmer */}
              <filter id={`flame-soft-${candle.id}`} x="-70%" y="-70%" width="240%" height="240%">
                <feGaussianBlur stdDeviation="0.55">
                  <animate
                    attributeName="stdDeviation"
                    values="0.45;0.9;0.5;0.75;0.55"
                    dur="1.6s"
                    begin={beginOffset}
                    repeatCount="indefinite"
                  />
                </feGaussianBlur>
              </filter>

              {/* Heat shimmer using turbulence + displacement */}
              <filter id={`heat-${candle.id}`} x="-50%" y="-50%" width="200%" height="200%">
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency="0.8"
                  numOctaves="2"
                  seed="2"
                  result="noise"
                >
                  <animate
                    attributeName="seed"
                    values="1;2;3;4;3;2;1"
                    dur="2.4s"
                    begin={beginOffset}
                    repeatCount="indefinite"
                  />
                </feTurbulence>
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.6" xChannelSelector="R" yChannelSelector="G">
                  <animate
                    attributeName="scale"
                    values="0.8;1.6;1.1;1.9;1.2"
                    dur="1.8s"
                    begin={beginOffset}
                    repeatCount="indefinite"
                  />
                </feDisplacementMap>
              </filter>

              {/* Soft drop shadow for the candle body */}
              <filter id={`soft-shadow-${candle.id}`} x="-40%" y="-40%" width="180%" height="200%">
                <feDropShadow dx="0" dy="2.5" stdDeviation="3" floodOpacity="0.18" />
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

              {/* Small vignette for social-media pop */}
              <radialGradient id={`vignette-${candle.id}`} cx="50%" cy="50%" r="80%">
                <stop offset="70%" stopColor="rgba(0,0,0,0)"/>
                <stop offset="100%" stopColor="rgba(0,0,0,0.24)"/>
              </radialGradient>
            </defs>

            {/* Background warmth / photo-ready vignette */}
            <rect x="0" y="0" width="120" height="180" fill="url(#vignette) " opacity="0" />
            <ellipse cx="60" cy="95" rx="60" ry="70" fill={`url(#global-glow-${candle.id})`}>
              <animate attributeName="opacity" values="0.5;0.85;0.6;0.9;0.5" dur="2.3s" begin={beginOffset} repeatCount="indefinite" />
            </ellipse>

            {/* Ground shadow */}
            <ellipse cx="60" cy="166" rx="40" ry="9" fill={`url(#plate-${candle.id})`}>
              <animate attributeName="rx" values="36;41;38;40;36" dur="2.1s" begin={beginOffset} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.22;0.18;0.2;0.16;0.22" dur="2.1s" begin={beginOffset} repeatCount="indefinite" />
            </ellipse>

            {/* ====== Candle body (rounded glass jar look) ====== */}
            <g filter={`url(#soft-shadow-${candle.id})`}>
              {/* Body */}
              <rect x="33" y="56" width="54" height="94" rx="12" fill={`url(#wax-body-${candle.id})`} />

              {/* Melted rim: a slightly wavy ellipse contour for realism */}
              <path
                d="M36 56c6 -4 42 -4 48 0c2 1 2 3 0 4c-16 6 -32 6 -48 0c-2 -1 -2 -3 0 -4z"
                fill={`url(#wax-top-${candle.id})`}
                opacity="0.98"
              />

              {/* Inner wax pool reflection */}
              <ellipse cx="60" cy="60.8" rx="21.5" ry="6.8" fill="#ffffff" opacity="0.25" />

              {/* Vertical glossy bands */}
              <rect x="44" y="60" width="6.5" height="86" rx="3.2" fill={`url(#wax-gloss-${candle.id})`} opacity="0.55" />
              <rect x="70.2" y="60" width="3.2" height="84" rx="1.6" fill={`url(#wax-gloss-${candle.id})`} opacity="0.35" />
            </g>

            {/* Wick */}
            <rect x="59" y="46" width="2" height="12.5" rx="1" fill="#1e1e1e" />

            {/* ====== Flame (multi-layer, realistic) ====== */}
            <g transform="translate(0,0)">
              {/* Sway + breathe */}
              <g transform="rotate(0 60 52)">
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  values="-2 60 52; 1.2 60 52; 0 60 52; -1.4 60 52; -2 60 52"
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

                {/* Outer flame shape with heat shimmer */}
                <path
                  d="M60 27 C55.4 36 55 42 60 51 C65 42 64.6 36 60 27 Z"
                  fill={`url(#flame-grad-${candle.id})`}
                  filter={`url(#flame-soft-${candle.id})`}
                >
                  {/* Subtle shape morphing for life-like motion */}
                  <animate
                    attributeName="d"
                    dur="1.8s"
                    begin={beginOffset}
                    repeatCount="indefinite"
                    values="
                      M60 27 C55.4 36 55 42 60 51 C65 42 64.6 36 60 27 Z;
                      M60 27 C55.2 35.5 55 42 60 51 C65 43 64.8 36.2 60 27 Z;
                      M60 27 C55.6 36.2 55 42.2 60 50.8 C65 42 64.4 36 60 27 Z;
                      M60 27 C55.4 36 55 42 60 51 C65 42 64.6 36 60 27 Z
                    "
                  />
                </path>

                {/* Hot core */}
                <path
                  d="M60 30 C57.3 37 56.8 40.8 60 47 C63.2 41 62.7 37 60 30 Z"
                  fill={`url(#flame-core-${candle.id})`}
                  filter={`url(#heat-${candle.id})`}
                />

                {/* Tip sparkle */}
                <circle cx="60" cy="28.8" r="0.95" fill="#fff7d2" opacity="0.98">
                  <animate attributeName="r" values="0.8;1;0.85;1;0.8" dur="1.8s" begin={beginOffset} repeatCount="indefinite" />
                </circle>
              </g>
            </g>

            {/* Light halo */}
            <ellipse cx="60" cy="43" rx="34" ry="23" fill={`url(#global-glow-${candle.id})`}>
              <animate attributeName="opacity" values="0.55;0.88;0.62;0.84;0.55" dur="2.2s" begin={beginOffset} repeatCount="indefinite" />
            </ellipse>

            {/* Eternal marker */}
            {isEternal && <text x="60" y="20" textAnchor="middle" fontSize="14" fill="#f3e4b0">✨</text>}

            {/* ====== Plaque with name (unchanged API) ====== */}
            <g>
              {/* Rim/back */}
              <path
                d="M34 132 h52 a9 9 0 0 1 9 9 v3 a9 9 0 0 1 -9 9 h-52 a9 9 0 0 1 -9 -9 v-3 a9 9 0 0 1 9 -9 z"
                fill={`url(#plaque-base-${candle.id})`}
                opacity="0.92"
                filter={`url(#soft-shadow-${candle.id})`}
              />
              {/* Face */}
              <rect x="38" y="135" width="44" height="16" rx="8" fill={`url(#plaque-face-${candle.id})`} stroke="rgba(0,0,0,0.1)" />
              {/* Highlight */}
              <rect x="40" y="137" width="40" height="12" rx="6" fill="rgba(255,255,255,0.45)" opacity="0.5" />
              {/* Name */}
              <text
                x="60"
                y="146"
                textAnchor="middle"
                fontSize="6.4"
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

        .candle-display::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(45deg, transparent, rgba(251,191,36,0.12), transparent);
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
          box-shadow: 0 12px 32px rgba(251,191,36,0.22);
          border-color: rgba(251,191,36,0.32);
        }

        .candle-visual { 
          position: relative; 
          width: 120px; 
          height: 180px; 
        }
        
        .candle-svg { 
          width: 100%; 
          height: 100%; 
          display: block;
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
            width: 110px; 
            height: 165px; 
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
            width: 100px; 
            height: 150px; 
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
