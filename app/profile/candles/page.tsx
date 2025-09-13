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
};

// Beautiful Candle Display Component
function CandleDisplay({ candle }: { candle: Candle }) {
  const isEternal = candle.candle_type === 'eternal';
  const color = candle.color || 'white';
  
  const colorMap: Record<string, { main: string; gradient: string[] }> = {
    white: { 
      main: '#ffffff', 
      gradient: ['#ffffff', '#F3F0F7', '#EDE9F7'] 
    },
    gold: { 
      main: '#f8e3b1', 
      gradient: ['#fff5d6', '#f8e3b1', '#e6c56e'] 
    },
    rose: { 
      main: '#f7c4c9', 
      gradient: ['#ffd6d9', '#f7c4c9', '#e8a5ab'] 
    },
    azure: { 
      main: '#c5e3ff', 
      gradient: ['#dceeff', '#c5e3ff', '#9bc8f7'] 
    },
    violet: { 
      main: '#d8c7ff', 
      gradient: ['#e8dcff', '#d8c7ff', '#c0a8f7'] 
    },
    emerald: { 
      main: '#cdebd3', 
      gradient: ['#dff5e3', '#cdebd3', '#a8d6b3'] 
    },
  };

  const candleColor = colorMap[color] || colorMap.white;
  const createdDate = new Date(candle.created_at);
  const formattedDate = createdDate.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });

  return (
    <div className="candle-display">
      <div className="candle-visual">
        <svg viewBox="0 0 120 160" className="candle-svg">
          <defs>
            <linearGradient id={`flame-${candle.id}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#fff6d5" />
              <stop offset="35%" stopColor="#ffd27a" />
              <stop offset="80%" stopColor="#ff9b3f" />
              <stop offset="100%" stopColor="#ff7a1a" />
            </linearGradient>
            
            <radialGradient id={`flame-inner-${candle.id}`} cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="65%" stopColor="#ffe9a8" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
            
            <linearGradient id={`wax-${candle.id}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={candleColor.gradient[0]} />
              <stop offset="50%" stopColor={candleColor.gradient[1]} />
              <stop offset="100%" stopColor={candleColor.gradient[2]} />
            </linearGradient>
            
            <radialGradient id={`glow-${candle.id}`} cx="50%" cy="30%" r="60%">
              <stop offset="0%" stopColor="rgba(255, 220, 140, 0.95)" />
              <stop offset="60%" stopColor="rgba(255, 190, 90, 0.45)" />
              <stop offset="100%" stopColor="rgba(255, 150, 40, 0)" />
            </radialGradient>
            
            <filter id={`shadow-${candle.id}`} x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15"/>
            </filter>
          </defs>
          
          {/* Shadow */}
          <ellipse cx="60" cy="150" rx="30" ry="6" fill="#000" opacity="0.1" />
          
          {/* Candle body */}
          <rect x="35" y="60" width="50" height="85" rx="8" fill={`url(#wax-${candle.id})`} filter={`url(#shadow-${candle.id})`} />
          <ellipse cx="60" cy="60" rx="25" ry="8" fill={`url(#wax-${candle.id})`} />
          
          {/* Melted wax effect */}
          <path 
            d="M50 75c3 10-2 12-2 15s5 5 8 0 2-12 5-15" 
            fill="none" 
            stroke={candleColor.gradient[1]} 
            strokeWidth="2" 
            strokeLinecap="round" 
            opacity="0.6"
          />
          
          {/* Wick */}
          <rect x="58" y="50" width="4" height="12" rx="2" fill="#333" />
          
          {/* Flame */}
          <g className="flame-group">
            <path d="M60 30 C56 38 55 44 60 52 C65 44 64 38 60 30 Z" fill={`url(#flame-${candle.id})`} />
            <path d="M60 33 C57 39 56.5 43 60 48 C63.5 43 63 39 60 33 Z" fill={`url(#flame-inner-${candle.id})`} />
          </g>
          
          {/* Glow effect */}
          {isEternal && (
            <ellipse cx="60" cy="40" rx="35" ry="25" fill={`url(#glow-${candle.id})`} className="glow-effect" />
          )}
          
          {/* Eternal symbol */}
          {isEternal && (
            <text x="60" y="20" textAnchor="middle" fontSize="14" fill="#f3e4b0">✨</text>
          )}
        </svg>
        
        {isEternal && (
          <div className="eternal-badge">Eternal Flame</div>
        )}
      </div>
      
      <div className="candle-info">
        <h3 className="candle-name">{candle.name}</h3>
        
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
  );
}

export default function MyCandlesPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [myCandles, setMyCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'eternal' | 'renewable'>('all');

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
      const { data } = await supabase
        .from("candle_offerings")
        .select("*")
        .eq('user_id', userId)
        .eq('payment_status', 'paid')
        .order('created_at', { ascending: false });
      
      setMyCandles(data || []);
    } catch (error) {
      console.error('Error loading candles:', error);
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
    const eternal = myCandles.filter(c => c.candle_type === 'eternal');
    const renewable = myCandles.filter(c => c.candle_type !== 'eternal');
    
    let display = myCandles;
    if (filter === 'eternal') display = eternal;
    if (filter === 'renewable') display = renewable;
    
    return { 
      eternalCandles: eternal, 
      renewableCandles: renewable, 
      displayCandles: display 
    };
  }, [myCandles, filter]);

  // Calculate total spent
  const totalSpent = useMemo(() => {
    return myCandles.reduce((sum, candle) => sum + (candle.amount_paid || 0), 0) / 100;
  }, [myCandles]);

  return (
    <div className="my-candles-page">
      <div className="page-background"></div>
      
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
          onClick={() => setFilter('all')}
          className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
        >
          All Candles ({myCandles.length})
        </button>
        <button 
          onClick={() => setFilter('eternal')}
          className={`filter-tab ${filter === 'eternal' ? 'active' : ''}`}
        >
          ✨ Eternal ({eternalCandles.length})
        </button>
        <button 
          onClick={() => setFilter('renewable')}
          className={`filter-tab ${filter === 'renewable' ? 'active' : ''}`}
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
          background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%);
          position: relative;
          padding: 2rem 1rem;
        }

        .page-background {
          position: fixed;
          inset: 0;
          background: 
            radial-gradient(circle at 20% 30%, rgba(251,191,36,0.1) 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(139,92,246,0.08) 0%, transparent 40%),
            radial-gradient(circle at 50% 50%, rgba(245,158,11,0.05) 0%, transparent 50%);
          pointer-events: none;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
          position: relative;
          z-index: 1;
        }

        .back-button, .visit-sanctuary {
          padding: 0.5rem 1rem;
          background: rgba(255,255,255,0.1);
          color: #fbbf24;
          border-radius: 0.5rem;
          text-decoration: none;
          transition: all 0.2s;
          font-size: 0.875rem;
        }

        .back-button:hover, .visit-sanctuary:hover {
          background: rgba(255,255,255,0.15);
          transform: translateY(-1px);
        }

        .page-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.875rem;
          font-weight: 700;
          color: #fbbf24;
          margin: 0;
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
          z-index: 1;
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
        }

        .stat-label {
          font-size: 0.75rem;
          color: #fde68a;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .stat-card.eternal {
          border-color: rgba(168,85,247,0.3);
        }

        .stat-card.renewable {
          border-color: rgba(59,130,246,0.3);
        }

        .stat-card.contribution {
          border-color: rgba(34,197,94,0.3);
        }

        .filter-tabs {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 2rem;
          position: relative;
          z-index: 1;
        }

        .filter-tab {
          padding: 0.625rem 1.25rem;
          background: rgba(255,255,255,0.05);
          color: #fde68a;
          border: 1px solid rgba(251,191,36,0.2);
          border-radius: 2rem;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.875rem;
        }

        .filter-tab:hover {
          background: rgba(255,255,255,0.08);
        }

        .filter-tab.active {
          background: linear-gradient(135deg, rgba(251,191,36,0.2), rgba(245,158,11,0.2));
          border-color: #fbbf24;
          color: #fbbf24;
        }

        .candles-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.5rem;
          position: relative;
          z-index: 1;
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

        .flame-group {
          animation: flicker 1.5s infinite ease-in-out;
          transform-origin: 60px 52px;
        }

        @keyframes flicker {
          0%, 100% { 
            transform: scale(1) rotate(-1deg); 
            opacity: 0.95; 
          }
          25% { 
            transform: scale(1.05) rotate(1deg); 
            opacity: 1; 
          }
          50% { 
            transform: scale(0.95) rotate(0deg); 
            opacity: 0.9; 
          }
          75% { 
            transform: scale(1.02) rotate(-0.5deg); 
            opacity: 0.95; 
          }
        }

        .glow-effect {
          animation: glow 2.5s infinite ease-in-out;
        }

        @keyframes glow {
          0%, 100% { opacity: 0.6; }
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
        }

        .loading-spinner {
          width: 3rem;
          height: 3rem;
          border: 3px solid rgba(251,191,36,0.2);
          border-top: 3px solid #fbbf24;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: #fde68a;
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
        }

        .empty-state p {
          margin: 0 0 1.5rem 0;
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
        }

        .cta-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(251,191,36,0.3);
        }

        @media (max-width: 640px) {
          .my-candles-page {
            padding: 1rem 0.5rem;
          }
          
          .page-title {
            font-size: 1.5rem;
          }
          
          .stats-overview {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .candles-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
