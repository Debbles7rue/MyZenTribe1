// components/CandleDisplay.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

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
    year: "numeric" 
  });

  // Random delays for natural flame movement
  const flameDelay = useMemo(() => Math.random() * 2, [candle.id]);
  const glowDelay = useMemo(() => Math.random() * 3, [candle.id]);

  // Lush memorial flower arrangement around base
  const flowers = useMemo(() => {
    const cx = 100; // center x
    const cy = 285; // center y (base of candle)
    
    const arrangement = [];
    
    // Create a full, lush arrangement with multiple layers
    // Back layer - larger flowers
    const backFlowers = [
      { type: 'lily', x: 70, y: 275, rotation: -15, color: '#ffffff', size: 1.3 },
      { type: 'lily', x: 130, y: 275, rotation: 15, color: '#ffffff', size: 1.3 },
      { type: 'rose', x: 85, y: 280, rotation: -25, color: '#ffffff', size: 1.2 },
      { type: 'rose', x: 115, y: 280, rotation: 25, color: '#ffffff', size: 1.2 },
    ];
    
    // Middle layer - medium flowers
    const middleFlowers = [
      { type: 'carnation', x: 60, y: 285, rotation: -30, color: '#ffffff', size: 1.1 },
      { type: 'carnation', x: 140, y: 285, rotation: 30, color: '#ffffff', size: 1.1 },
      { type: 'rose', x: 75, y: 290, rotation: -10, color: '#f8f8f8', size: 1.0 },
      { type: 'rose', x: 125, y: 290, rotation: 10, color: '#f8f8f8', size: 1.0 },
      { type: 'lily', x: 100, y: 275, rotation: 0, color: '#ffffff', size: 1.2 },
    ];
    
    // Front layer - smaller flowers and details
    const frontFlowers = [
      { type: 'carnation', x: 90, y: 292, rotation: -5, color: '#ffffff', size: 0.9 },
      { type: 'carnation', x: 110, y: 292, rotation: 5, color: '#ffffff', size: 0.9 },
      { type: 'rose', x: 100, y: 288, rotation: 0, color: '#ffffff', size: 0.8 },
    ];
    
    // Add lots of greenery and baby's breath
    const greenery = [
      // Leaves scattered throughout
      { type: 'leaf', x: 65, y: 288, rotation: -20, size: 1.0 },
      { type: 'leaf', x: 135, y: 288, rotation: 20, size: 1.0 },
      { type: 'leaf', x: 80, y: 295, rotation: -45, size: 0.8 },
      { type: 'leaf', x: 120, y: 295, rotation: 45, size: 0.8 },
      { type: 'leaf', x: 95, y: 295, rotation: -10, size: 0.9 },
      { type: 'leaf', x: 105, y: 295, rotation: 10, size: 0.9 },
      
      // Baby's breath clusters
      { type: 'breath', x: 72, y: 282, size: 1.2 },
      { type: 'breath', x: 128, y: 282, size: 1.2 },
      { type: 'breath', x: 88, y: 287, size: 1.0 },
      { type: 'breath', x: 112, y: 287, size: 1.0 },
      { type: 'breath', x: 77, y: 293, size: 0.9 },
      { type: 'breath', x: 123, y: 293, size: 0.9 },
    ];
    
    return [...backFlowers, ...middleFlowers, ...frontFlowers, ...greenery];
  }, [candle.id]);

  return (
    <>
      <div className="candle-display">
        <div className="stage">
          {/* Soft ambient glow */}
          <div className="ambient-glow" />
          
          <div className="candle-container">
            <svg 
              className="candle-svg" 
              viewBox="0 0 200 300" 
              role="img" 
              aria-label={`Memorial candle for ${candle.name}`}
            >
              <defs>
                {/* Realistic wax gradients */}
                <linearGradient id={`wax-main-${candle.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#e8e4f0" />
                  <stop offset="15%" stopColor="#f5f3f8" />
                  <stop offset="35%" stopColor="#ffffff" />
                  <stop offset="65%" stopColor="#fdfcfe" />
                  <stop offset="85%" stopColor="#f0eef4" />
                  <stop offset="100%" stopColor="#e2dde8" />
                </linearGradient>
                
                <radialGradient id={`wax-top-${candle.id}`} cx="50%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="40%" stopColor="#faf9fc" />
                  <stop offset="100%" stopColor="#f0edf5" />
                </radialGradient>

                {/* Melted wax pool */}
                <radialGradient id={`wax-pool-${candle.id}`} cx="50%" cy="40%" r="60%">
                  <stop offset="0%" stopColor="#fff8f0" />
                  <stop offset="50%" stopColor="#f5f0e8" />
                  <stop offset="100%" stopColor="#ede5db" />
                </radialGradient>

                {/* Realistic flame */}
                <linearGradient id={`flame-outer-${candle.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="20%" stopColor="#fff8e1" />
                  <stop offset="50%" stopColor="#ffd54f" />
                  <stop offset="80%" stopColor="#ff8f00" />
                  <stop offset="100%" stopColor="#e65100" />
                </linearGradient>

                <radialGradient id={`flame-inner-${candle.id}`} cx="50%" cy="60%" r="40%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="30%" stopColor="#fff9c4" />
                  <stop offset="70%" stopColor="#ffeb3b" />
                  <stop offset="100%" stopColor="transparent" />
                </radialGradient>

                {/* Soft shadow */}
                <filter id={`shadow-${candle.id}`} x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000000" floodOpacity="0.15"/>
                </filter>

                {/* Flame glow */}
                <filter id={`flame-glow-${candle.id}`} x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge> 
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              {/* Ground shadow */}
              <ellipse cx="100" cy="295" rx="45" ry="8" fill="#000000" opacity="0.08" />

              {/* Main candle body */}
              <g filter={`url(#shadow-${candle.id})`}>
                {/* Candle cylinder */}
                <rect 
                  x="45" 
                  y="80" 
                  width="110" 
                  height="200" 
                  rx="8" 
                  fill={`url(#wax-main-${candle.id})`} 
                />
                
                {/* Top rim */}
                <ellipse 
                  cx="100" 
                  cy="80" 
                  rx="55" 
                  ry="12" 
                  fill={`url(#wax-top-${candle.id})`} 
                />

                {/* Melted wax pool */}
                <ellipse 
                  cx="100" 
                  cy="85" 
                  rx="40" 
                  ry="8" 
                  fill={`url(#wax-pool-${candle.id})`} 
                />

                {/* Subtle wax drips */}
                <path 
                  d="M 75 85 Q 73 120 75 155 Q 74 180 76 200" 
                  stroke="#f0edf5" 
                  strokeWidth="1.5" 
                  fill="none" 
                  opacity="0.6"
                />
                <path 
                  d="M 125 88 Q 127 110 125 140 Q 126 170 124 190" 
                  stroke="#f0edf5" 
                  strokeWidth="1" 
                  fill="none" 
                  opacity="0.4"
                />

                {/* Highlight on left side */}
                <rect 
                  x="50" 
                  y="85" 
                  width="8" 
                  height="190" 
                  rx="4" 
                  fill="#ffffff" 
                  opacity="0.3" 
                />
              </g>

              {/* Wick */}
              <rect 
                x="98" 
                y="75" 
                width="4" 
                height="15" 
                rx="2" 
                fill="#2c2c2c" 
              />

              {/* Realistic flame */}
              <g 
                className="flame-group" 
                style={{ 
                  transformOrigin: '100px 75px',
                  animationDelay: `${flameDelay}s`
                }}
                filter={`url(#flame-glow-${candle.id})`}
              >
                {/* Outer flame */}
                <path 
                  d="M 100 75 
                     C 92 65, 90 55, 95 45
                     C 98 40, 102 40, 105 45
                     C 110 55, 108 65, 100 75 Z" 
                  fill={`url(#flame-outer-${candle.id})`}
                  className="flame-outer"
                />
                
                {/* Inner flame */}
                <path 
                  d="M 100 72
                     C 95 63, 94 56, 98 50
                     C 100 48, 102 48, 102 50
                     C 106 56, 105 63, 100 72 Z" 
                  fill={`url(#flame-inner-${candle.id})`}
                  className="flame-inner"
                />

                {/* Bright core */}
                <ellipse 
                  cx="100" 
                  cy="65" 
                  rx="2" 
                  ry="3" 
                  fill="#ffffff" 
                  opacity="0.8"
                  className="flame-core"
                />
              </g>

              {/* Name plaque - elegant and simple */}
              <g transform="translate(100, 240)">
                {/* Base shadow */}
                <rect 
                  x="-35" 
                  y="-8" 
                  width="70" 
                  height="16" 
                  rx="8" 
                  fill="#000000" 
                  opacity="0.1" 
                />
                
                {/* Gold plaque */}
                <rect 
                  x="-35" 
                  y="-10" 
                  width="70" 
                  height="16" 
                  rx="8" 
                  fill="#d4af37" 
                />
                
                {/* Plaque highlight */}
                <rect 
                  x="-33" 
                  y="-8" 
                  width="66" 
                  height="12" 
                  rx="6" 
                  fill="#f4e4a7" 
                />

                {/* Name text */}
                <text 
                  x="0" 
                  y="2" 
                  textAnchor="middle" 
                  fontSize="9" 
                  fontWeight="600" 
                  fill="#8b4513"
                  style={{ userSelect: 'none' }}
                >
                  {candle.name}
                </text>
              </g>

              {/* Lush memorial flower arrangement */}
              <g className="flowers" opacity="0.94">
                {flowers.map((flower, index) => (
                  <g 
                    key={index} 
                    transform={`translate(${flower.x}, ${flower.y}) rotate(${flower.rotation || 0}) scale(${flower.size || 1})`}
                  >
                    {flower.type === 'lily' && (
                      <>
                        {/* Large white lily - traditional memorial flower */}
                        {[0, 60, 120, 180, 240, 300].map(angle => (
                          <ellipse 
                            key={angle}
                            cx="0" 
                            cy="-4" 
                            rx="2.5" 
                            ry="6" 
                            fill={flower.color}
                            transform={`rotate(${angle})`}
                            opacity="0.9"
                          />
                        ))}
                        {/* Center with golden stamens */}
                        <circle cx="0" cy="0" r="2" fill="#fff8f0" />
                        <circle cx="0" cy="-0.5" r="1" fill="#ffd700" opacity="0.7" />
                        
                        {/* Visible stem */}
                        <line x1="0" y1="4" x2="0" y2="12" stroke="#4a5d4a" strokeWidth="1.2" />
                      </>
                    )}
                    
                    {flower.type === 'rose' && (
                      <>
                        {/* Full white rose */}
                        <circle cx="0" cy="0" r="5" fill={flower.color} opacity="0.9" />
                        <circle cx="-1.5" cy="-1.5" r="3.8" fill={flower.color} opacity="0.85" />
                        <circle cx="1.5" cy="1.5" r="3" fill="#f8f8f8" opacity="0.8" />
                        <circle cx="0" cy="0" r="2" fill="#ffffff" />
                        
                        {/* Multiple petal layers */}
                        {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
                          <ellipse 
                            key={angle}
                            cx="0" 
                            cy="-3.5" 
                            rx="2.2" 
                            ry="3.8" 
                            fill={flower.color}
                            opacity="0.7"
                            transform={`rotate(${angle})`}
                          />
                        ))}
                        
                        {/* Stem */}
                        <line x1="0" y1="5" x2="0" y2="13" stroke="#4a5d4a" strokeWidth="1.5" />
                        
                        {/* Rose leaves */}
                        <ellipse cx="-3" cy="8" rx="2.5" ry="1.5" fill="#5a6b5a" opacity="0.8" />
                        <ellipse cx="3" cy="9" rx="2.2" ry="1.3" fill="#5a6b5a" opacity="0.8" />
                      </>
                    )}
                    
                    {flower.type === 'carnation' && (
                      <>
                        {/* Ruffled carnation */}
                        {[0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320, 340].map(angle => (
                          <path 
                            key={angle}
                            d="M 0 0 Q -1.8 -3.5 0 -5 Q 1.8 -3.5 0 0"
                            fill={flower.color}
                            opacity="0.85"
                            transform={`rotate(${angle})`}
                          />
                        ))}
                        
                        {/* Center */}
                        <circle cx="0" cy="0" r="1.5" fill="#f8f8f8" />
                        
                        {/* Stem */}
                        <line x1="0" y1="3" x2="0" y2="10" stroke="#4a5d4a" strokeWidth="1" />
                      </>
                    )}
                    
                    {flower.type === 'leaf' && (
                      <>
                        {/* Large decorative leaves */}
                        <ellipse cx="0" cy="0" rx="3.5" ry="1.8" fill="#5a6b5a" opacity="0.85" />
                        <ellipse cx="0" cy="0" rx="3" ry="1.3" fill="#6b7c6b" opacity="0.7" />
                        {/* Leaf vein */}
                        <line x1="-3" y1="0" x2="3" y2="0" stroke="#4a5d4a" strokeWidth="0.5" opacity="0.6" />
                      </>
                    )}
                    
                    {flower.type === 'breath' && (
                      <>
                        {/* Abundant baby's breath clusters */}
                        <g transform={`scale(${flower.size})`}>
                          <circle cx="0" cy="0" r="1.2" fill="#ffffff" opacity="0.9" />
                          <circle cx="3" cy="1.5" r="1" fill="#ffffff" opacity="0.85" />
                          <circle cx="-2.5" cy="2" r="1.1" fill="#ffffff" opacity="0.8" />
                          <circle cx="2" cy="-2.5" r="0.9" fill="#ffffff" opacity="0.75" />
                          <circle cx="-3" cy="-1.5" r="1" fill="#ffffff" opacity="0.8" />
                          <circle cx="1.5" cy="3" r="0.8" fill="#ffffff" opacity="0.7" />
                          <circle cx="-1" cy="-3" r="0.9" fill="#ffffff" opacity="0.75" />
                        </g>
                      </>
                    )}
                  </g>
                ))}
              </g>

              {/* Eternal badge if applicable */}
              {isEternal && (
                <g transform="translate(160, 100)">
                  <circle cx="0" cy="0" r="12" fill="#ffd700" opacity="0.9" />
                  <text 
                    x="0" 
                    y="0" 
                    textAnchor="middle" 
                    dominantBaseline="central" 
                    fontSize="14" 
                    fill="#ffffff"
                  >
                    ∞
                  </text>
                </g>
              )}
            </svg>
          </div>
        </div>

        {/* Candle information */}
        <div className="candle-info">
          <h3 className="candle-name">{candle.name}</h3>
          {candle.message && (
            <p className="candle-message">"{candle.message}"</p>
          )}
          <div className="candle-meta">
            <span className="lit-date">Lit on {formattedDate}</span>
            {candle.amount_paid && (
              <span className="amount">${(candle.amount_paid / 100).toFixed(2)}</span>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .candle-display {
          background: linear-gradient(145deg, 
            rgba(255,255,255,0.08) 0%, 
            rgba(251,191,36,0.05) 50%, 
            rgba(255,255,255,0.03) 100%);
          border: 1px solid rgba(251,191,36,0.2);
          backdrop-filter: blur(15px);
          border-radius: 20px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          transition: all 0.4s ease;
          overflow: hidden;
          position: relative;
        }

        .candle-display::before {
          content: '';
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          bottom: -2px;
          background: linear-gradient(45deg, 
            transparent, 
            rgba(251,191,36,0.3), 
            transparent, 
            rgba(251,191,36,0.1), 
            transparent);
          border-radius: 22px;
          opacity: 0;
          transition: opacity 0.4s ease;
          z-index: -1;
        }

        .candle-display:hover::before {
          opacity: 1;
        }

        .candle-display:hover {
          transform: translateY(-6px);
          background: linear-gradient(145deg, 
            rgba(255,255,255,0.12) 0%, 
            rgba(251,191,36,0.08) 50%, 
            rgba(255,255,255,0.06) 100%);
          border-color: rgba(251,191,36,0.4);
          box-shadow: 
            0 20px 40px rgba(251,191,36,0.15),
            0 8px 16px rgba(0,0,0,0.1);
        }

        .stage {
          position: relative;
          width: 220px;
          height: 320px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ambient-glow {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 120px;
          height: 120px;
          background: radial-gradient(
            ellipse at center,
            rgba(255, 193, 94, 0.4) 0%,
            rgba(255, 165, 50, 0.2) 40%,
            rgba(255, 140, 30, 0.1) 70%,
            transparent 100%
          );
          border-radius: 50%;
          filter: blur(4px);
          animation: ambient-pulse 4s ease-in-out infinite;
          pointer-events: none;
        }

        @keyframes ambient-pulse {
          0%, 100% { 
            opacity: 0.6; 
            transform: translateX(-50%) scale(1);
          }
          50% { 
            opacity: 0.9; 
            transform: translateX(-50%) scale(1.1);
          }
        }

        .candle-container {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .candle-svg {
          width: 100%;
          height: 100%;
          filter: drop-shadow(0 8px 16px rgba(0,0,0,0.1));
        }

        /* Realistic flame animations */
        .flame-group {
          animation: 
            flame-sway 3.2s ease-in-out infinite,
            flame-flicker 1.8s ease-in-out infinite;
        }

        @keyframes flame-sway {
          0%, 100% { 
            transform: translateX(-0.5px) rotate(-1deg) scaleY(1);
          }
          25% { 
            transform: translateX(0.8px) rotate(1.5deg) scaleY(1.05);
          }
          50% { 
            transform: translateX(0px) rotate(0deg) scaleY(0.98);
          }
          75% { 
            transform: translateX(-0.3px) rotate(-0.8deg) scaleY(1.02);
          }
        }

        @keyframes flame-flicker {
          0%, 100% { opacity: 0.95; }
          10% { opacity: 1; }
          20% { opacity: 0.92; }
          30% { opacity: 0.98; }
          40% { opacity: 0.94; }
          50% { opacity: 1; }
          60% { opacity: 0.96; }
          70% { opacity: 0.93; }
          80% { opacity: 0.99; }
          90% { opacity: 0.97; }
        }

        .flame-outer {
          filter: blur(0.3px);
        }

        .flame-inner {
          opacity: 0.8;
        }

        .flame-core {
          animation: core-pulse 2.1s ease-in-out infinite;
        }

        @keyframes core-pulse {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }

        /* Flower animations */
        .flowers {
          animation: gentle-sway 6s ease-in-out infinite;
        }

        @keyframes gentle-sway {
          0%, 100% { transform: translateX(0px); }
          50% { transform: translateX(1px); }
        }

        /* Information styling */
        .candle-info {
          text-align: center;
          max-width: 300px;
        }

        .candle-name {
          margin: 0 0 8px 0;
          font-size: 1.2rem;
          font-weight: 600;
          color: #fbbf24;
          text-shadow: 0 2px 8px rgba(251,191,36,0.3);
          letter-spacing: 0.02em;
        }

        .candle-message {
          margin: 0 0 12px 0;
          font-size: 0.95rem;
          color: #fde68a;
          font-style: italic;
          opacity: 0.95;
          line-height: 1.4;
        }

        .candle-meta {
          display: flex;
          justify-content: center;
          gap: 16px;
          font-size: 0.85rem;
          color: #fde68a;
          opacity: 0.85;
        }

        .lit-date {
          font-weight: 500;
        }

        .amount {
          font-weight: 600;
          color: #fbbf24;
        }

        /* Responsive design */
        @media (max-width: 480px) {
          .stage {
            width: 180px;
            height: 280px;
          }
          
          .candle-name {
            font-size: 1.1rem;
          }
          
          .candle-message {
            font-size: 0.9rem;
          }
          
          .candle-meta {
            font-size: 0.8rem;
          }
        }
      `}</style>
    </>
  );
}
