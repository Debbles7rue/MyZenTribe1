// app/profile/candles/page.tsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import CandleDisplay from "@/components/CandleDisplay";

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
          background: linear-gradient(135deg, #6d5bd0 0%, #8b7dd8 25%, #a89ade 50%, #c5b5e4 75%, #d4c5e8 100%);
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
          10% { opacity: 1; }
          90% { opacity: 1; }
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

        .title-icon { font-size: 2rem; }

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
          .candles-grid { grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); }
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
        @keyframes spin { to { transform: rotate(360deg); } }

        .empty-state { text-align: center; padding: 4rem 2rem; color: #fde68a; position: relative; z-index: 2; }
        .empty-icon { font-size: 4rem; margin-bottom: 1rem; animation: float 3s infinite ease-in-out; }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .empty-state h2 { font-size: 1.5rem; color: #fbbf24; margin: 0 0 0.5rem 0; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
        .empty-state p { margin: 0 0 1.5rem 0; opacity: 0.9; }

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
        .cta-button:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(251,191,36,0.4); }

        /* Mobile Optimizations */
        @media (max-width: 640px) {
          .my-candles-page { padding: 1rem 0.5rem; }
          .inspirational-quote { font-size: 1rem; margin-bottom: 1.5rem; }
          .page-header { flex-direction: column; text-align: center; gap: 0.75rem; }
          .page-title { font-size: 1.5rem; }
          .back-button, .visit-sanctuary { width: 100%; text-align: center; }
          .stats-overview { grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
          .stat-card { padding: 1rem; }
          .stat-value { font-size: 1.5rem; }
          .filter-tabs { justify-content: center; width: 100%; }
          .filter-tab { padding: 0.5rem 1rem; font-size: 0.8125rem; }
          .candles-grid { grid-template-columns: 1fr; gap: 1rem; }
          .empty-state { padding: 3rem 1.5rem; }
          .empty-icon { font-size: 3rem; }
          .empty-state h2 { font-size: 1.25rem; }
        }

        @media (max-width: 375px) {
          .filter-tab { padding: 0.5rem 0.75rem; font-size: 0.75rem; }
        }
      `}</style>
    </div>
  );
}
