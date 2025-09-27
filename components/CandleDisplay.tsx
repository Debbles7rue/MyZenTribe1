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
  const isEternal = candle?.candle_type === "eternal";
  const color = candle?.color || "white";

  const colorMap: Record<string, { main: string; wax: string; shadow: string; glow: string }> = {
    white: { 
      main: "#f8f9fa", 
      wax: "#ffffff", 
      shadow: "rgba(0,0,0,0.15)", 
      glow: "rgba(255,248,220,0.8)" 
    },
    gold: { 
      main: "#fdf6e3", 
      wax: "#f4e4bc", 
      shadow: "rgba(139,69,19,0.2)", 
      glow: "rgba(255,215,0,0.6)" 
    },
    rose: { 
      main: "#fef7f7", 
      wax: "#f7e6e6", 
      shadow: "rgba(139,69,19,0.15)", 
      glow: "rgba(255,182,193,0.5)" 
    },
    azure: { 
      main: "#f0f8ff", 
      wax: "#e6f3ff", 
      shadow: "rgba(70,130,180,0.15)", 
      glow: "rgba(173,216,230,0.6)" 
    },
    violet: { 
      main: "#f8f4ff", 
      wax: "#f0e6ff", 
      shadow: "rgba(75,0,130,0.15)", 
      glow: "rgba(221,160,221,0.5)" 
    },
    emerald: { 
      main: "#f0fff0", 
      wax: "#e6ffe6", 
      shadow: "rgba(34,139,34,0.15)", 
      glow: "rgba(144,238,144,0.5)" 
    }
  };

  const palette = colorMap[color] || colorMap.white;

  const createdDate = new Date(candle.created_at);
  const formattedDate = createdDate.toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  // Randomized animation timing for natural feel
  const flickerDelay = (Math.random() * 2).toFixed(2) + "s";
  const glowDelay = (Math.random() * 1.5).toFixed(2) + "s";

  return (
    <>
      <div className="candle-display">
        <div className="candle-container">
          {/* Ambient glow background */}
          <div 
            className="ambient-glow"
            style={{ 
              background: `radial-gradient(circle at center, ${palette.glow} 0%, transparent 70%)`,
              animationDelay: glowDelay
            }}
          ></div>

          {/* Candle holder/base */}
          <div className="candle-holder">
            <div className="holder-rim"></div>
            <div className="holder-body"></div>
          </div>

          {/* Main candle body */}
          <div className="candle-body" style={{ backgroundColor: palette.main }}>
            {/* Wax texture overlay */}
            <div className="wax-texture" style={{ backgroundColor: palette.wax }}></div>
            
            {/* Subtle highlights */}
            <div className="candle-highlight-left"></div>
            <div className="candle-highlight-right"></div>
            
            {/* Very subtle wax drip */}
            <div className="wax-drip"></div>
            
            {/* Candle top (slightly oval) */}
            <div className="candle-top" style={{ backgroundColor: palette.wax }}></div>
          </div>

          {/* Wick */}
          <div className="wick"></div>

          {/* Realistic flame */}
          <div className="flame-container" style={{ animationDelay: flickerDelay }}>
            <div className="flame-outer"></div>
            <div className="flame-inner"></div>
            <div className="flame-core"></div>
          </div>

          {/* Name plaque - elegant and understated */}
          <div className="name-plaque">
            <div className="plaque-background"></div>
            <span className="candle-name-text">{candle.name}</span>
          </div>

          {/* Eternal indicator */}
          {isEternal && (
            <div className="eternal-indicator">
              <div className="eternal-glow"></div>
              <span className="eternal-text">∞</span>
            </div>
          )}
        </div>

        {/* Candle information */}
        <div className="candle-info">
          <h3 className="candle-title">{candle.name}</h3>
          
          {candle.message && (
            <p className="candle-message">"{candle.message}"</p>
          )}
          
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
          background: rgba(255,255,255,0.02);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 1.25rem;
          padding: 2rem 1.5rem;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          position: relative;
          overflow: visible;
          min-height: 380px;
        }

        .candle-display:hover {
          transform: translateY(-2px);
          background: rgba(255,255,255,0.03);
          box-shadow: 
            0 20px 40px rgba(0,0,0,0.1),
            0 0 30px rgba(251,191,36,0.1);
          border-color: rgba(255,255,255,0.15);
        }

        .candle-container {
          position: relative;
          width: 80px;
          height: 200px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        /* Ambient glow effect */
        .ambient-glow {
          position: absolute;
          top: -10px;
          left: -15px;
          right: -15px;
          bottom: -10px;
          border-radius: 50%;
          animation: gentleGlow 4s ease-in-out infinite;
          z-index: 0;
          opacity: 0.4;
        }

        @keyframes gentleGlow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }

        /* Candle holder/base */
        .candle-holder {
          position: absolute;
          bottom: 0;
          width: 90px;
          height: 12px;
          z-index: 1;
        }

        .holder-rim {
          width: 100%;
          height: 4px;
          background: linear-gradient(135deg, #d4af37 0%, #ffd700 50%, #b8860b 100%);
          border-radius: 4px 4px 0 0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }

        .holder-body {
          width: 95%;
          height: 8px;
          margin: 0 auto;
          background: linear-gradient(135deg, #b8860b 0%, #daa520 50%, #8b6914 100%);
          border-radius: 0 0 2px 2px;
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);
        }

        /* Main candle body - more realistic proportions */
        .candle-body {
          position: absolute;
          bottom: 12px;
          width: 64px;
          height: 160px;
          border-radius: 2px 2px 4px 4px;
          box-shadow: 
            0 0 20px rgba(0,0,0,0.1),
            inset -8px 0 15px rgba(0,0,0,0.05),
            inset 8px 0 15px rgba(255,255,255,0.1);
          z-index: 2;
        }

        /* Wax texture overlay */
        .wax-texture {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          border-radius: inherit;
          opacity: 0.7;
          background-image: 
            radial-gradient(circle at 20% 30%, rgba(255,255,255,0.1) 1px, transparent 1px),
            radial-gradient(circle at 70% 60%, rgba(0,0,0,0.02) 1px, transparent 1px),
            radial-gradient(circle at 40% 80%, rgba(255,255,255,0.05) 1px, transparent 1px);
          background-size: 8px 8px, 12px 12px, 6px 6px;
        }

        /* Subtle highlights for realism */
        .candle-highlight-left {
          position: absolute;
          top: 10px;
          left: 2px;
          width: 8px;
          height: 120px;
          background: linear-gradient(to bottom, 
            rgba(255,255,255,0.3) 0%,
            rgba(255,255,255,0.1) 50%,
            transparent 100%);
          border-radius: 4px;
          filter: blur(1px);
        }

        .candle-highlight-right {
          position: absolute;
          top: 20px;
          right: 4px;
          width: 3px;
          height: 80px;
          background: linear-gradient(to bottom, 
            transparent 0%,
            rgba(255,255,255,0.15) 30%,
            rgba(255,255,255,0.05) 100%);
          border-radius: 2px;
          filter: blur(0.5px);
        }

        /* Subtle wax drip */
        .wax-drip {
          position: absolute;
          top: 40px;
          right: -1px;
          width: 3px;
          height: 15px;
          background: inherit;
          border-radius: 0 2px 2px 0;
          opacity: 0.8;
          box-shadow: 1px 0 2px rgba(0,0,0,0.1);
        }

        /* Candle top */
        .candle-top {
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          height: 8px;
          border-radius: 50%;
          box-shadow: 
            0 2px 4px rgba(0,0,0,0.1),
            inset 0 1px 2px rgba(255,255,255,0.2);
        }

        /* Wick */
        .wick {
          position: absolute;
          top: -15px;
          left: 50%;
          transform: translateX(-50%);
          width: 2px;
          height: 12px;
          background: linear-gradient(to bottom, #2d2d2d 0%, #1a1a1a 100%);
          border-radius: 1px;
          z-index: 4;
        }

        /* Realistic flame */
        .flame-container {
          position: absolute;
          top: -35px;
          left: 50%;
          transform: translateX(-50%);
          width: 16px;
          height: 28px;
          z-index: 5;
          animation: naturalFlicker 2.5s ease-in-out infinite;
        }

        @keyframes naturalFlicker {
          0%, 100% { 
            transform: translateX(-50%) scale(1) rotate(-0.5deg); 
            opacity: 0.95; 
          }
          25% { 
            transform: translateX(-50%) scale(1.02) rotate(0.5deg); 
            opacity: 1; 
          }
          50% { 
            transform: translateX(-50%) scale(0.98) rotate(-0.3deg); 
            opacity: 0.92; 
          }
          75% { 
            transform: translateX(-50%) scale(1.01) rotate(0.3deg); 
            opacity: 0.98; 
          }
        }

        .flame-outer {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(ellipse at 50% 80%, 
            #ff6b1a 0%, 
            #ff8c42 30%, 
            #ffaa6b 60%, 
            rgba(255,170,107,0.4) 100%);
          border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
          filter: blur(1px);
        }

        .flame-inner {
          position: absolute;
          top: 3px;
          left: 3px;
          right: 3px;
          bottom: 6px;
          background: radial-gradient(ellipse at 50% 70%, 
            #ffd93d 0%, 
            #ffeb3b 40%, 
            rgba(255,235,59,0.8) 80%, 
            transparent 100%);
          border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
        }

        .flame-core {
          position: absolute;
          top: 6px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 12px;
          background: radial-gradient(ellipse at center, 
            #ffffff 0%, 
            #fff8dc 50%, 
            rgba(255,248,220,0.5) 100%);
          border-radius: 50%;
          filter: blur(0.5px);
        }

        /* Elegant name plaque */
        .name-plaque {
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 3;
          text-align: center;
          min-width: 100px;
        }

        .plaque-background {
          position: absolute;
          top: -4px;
          left: -12px;
          right: -12px;
          bottom: -4px;
          background: linear-gradient(135deg, 
            rgba(212,175,55,0.9) 0%, 
            rgba(255,215,0,0.8) 50%, 
            rgba(184,134,11,0.9) 100%);
          border-radius: 12px;
          box-shadow: 
            0 2px 8px rgba(0,0,0,0.2),
            inset 0 1px 2px rgba(255,255,255,0.3);
          filter: blur(0.5px);
        }

        .candle-name-text {
          position: relative;
          display: inline-block;
          padding: 4px 8px;
          font-size: 0.75rem;
          font-weight: 600;
          color: #2d1810;
          text-shadow: 0 1px 1px rgba(255,255,255,0.3);
          letter-spacing: 0.5px;
          z-index: 1;
        }

        /* Eternal indicator */
        .eternal-indicator {
          position: absolute;
          top: -45px;
          right: -10px;
          z-index: 6;
        }

        .eternal-glow {
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          bottom: -2px;
          background: radial-gradient(circle, rgba(255,215,0,0.4) 0%, transparent 70%);
          border-radius: 50%;
          animation: eternalPulse 3s ease-in-out infinite;
        }

        @keyframes eternalPulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.2); }
        }

        .eternal-text {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          background: linear-gradient(135deg, #ffd700, #ffed4e);
          border-radius: 50%;
          font-size: 0.875rem;
          font-weight: bold;
          color: #8b4513;
          text-shadow: 0 1px 1px rgba(255,255,255,0.3);
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }

        /* Candle information styling */
        .candle-info {
          text-align: center;
          width: 100%;
          max-width: 240px;
        }

        .candle-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #fbbf24;
          margin: 0 0 0.75rem 0;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
          line-height: 1.3;
        }

        .candle-message {
          font-size: 0.875rem;
          color: #fde68a;
          font-style: italic;
          margin: 0 0 1rem 0;
          opacity: 0.9;
          line-height: 1.4;
          text-align: center;
        }

        .candle-meta {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          font-size: 0.75rem;
          color: #fde68a;
          opacity: 0.7;
        }

        .candle-date, .candle-amount {
          font-weight: 500;
        }

        /* Mobile Optimizations */
        @media (max-width: 640px) {
          .candle-display { 
            padding: 1.5rem 1rem;
            min-height: 280px;
          }
          
          .candle-container {
            width: 70px;
            height: 180px;
          }
          
          .candle-body {
            width: 56px;
            height: 140px;
          }
          
          .candle-holder {
            width: 80px;
          }
          
          .candle-title { 
            font-size: 1rem; 
          }
          
          .candle-message { 
            font-size: 0.8125rem; 
          }
        }

        @media (max-width: 375px) {
          .candle-display { 
            padding: 1.25rem 0.75rem;
            min-height: 260px;
          }
          
          .candle-container {
            width: 60px;
            height: 160px;
          }
          
          .candle-body {
            width: 48px;
            height: 120px;
          }
          
          .candle-holder {
            width: 70px;
          }
          
          .candle-title { 
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

          .name-plaque {
            min-width: 80px;
          }

          .candle-name-text {
            font-size: 0.6875rem;
            padding: 3px 6px;
          }
        }
      `}</style>
    </>
  );
}
