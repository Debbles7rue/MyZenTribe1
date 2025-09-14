// components/ProfileCandleWidget.tsx
// NEW FILE - CREATE THIS IN YOUR COMPONENTS FOLDER
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

interface Candle {
  id: string;
  name: string;
  color: string;
  message: string | null;
  created_at: string;
  candle_type?: string;
  amount_paid?: number;
}

interface ProfileCandleWidgetProps {
  userId: string;
  isOwner?: boolean;
}

// Mini Candle SVG Component
function MiniCandle({ candle }: { candle: Candle }) {
  const isEternal = candle.candle_type === 'eternal';
  const color = candle.color || 'white';
  
  const colorMap: Record<string, string> = {
    white: '#ffffff',
    gold: '#f8e3b1',
    rose: '#f7c4c9',
    azure: '#c5e3ff',
    violet: '#d8c7ff',
    emerald: '#cdebd3',
  };

  const candleColor = colorMap[color] || colorMap.white;

  return (
    <svg viewBox="0 0 60 80" style={{ width: "100%", height: "100%" }}>
      <defs>
        <linearGradient id={`flame-mini-${candle.id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#fff6d5" />
          <stop offset="35%" stopColor="#ffd27a" />
          <stop offset="80%" stopColor="#ff9b3f" />
          <stop offset="100%" stopColor="#ff7a1a" />
        </linearGradient>
        
        <radialGradient id={`glow-mini-${candle.id}`} cx="50%" cy="25%" r="60%">
          <stop offset="0%" stopColor="rgba(255, 220, 140, 0.8)" />
          <stop offset="100%" stopColor="rgba(255, 150, 40, 0)" />
        </radialGradient>
      </defs>
      
      {/* Candle body */}
      <rect x="20" y="30" width="20" height="40" rx="3" fill={candleColor} opacity="0.9" />
      
      {/* Wick */}
      <rect x="29" y="25" width="2" height="6" fill="#333" />
      
      {/* Flame with animation */}
      <g style={{ animation: "flicker 1.5s infinite ease-in-out", transformOrigin: "30px 26px" }}>
        <path d="M30 15 C28 19 27.5 22 30 26 C32.5 22 32 19 30 15 Z" fill={`url(#flame-mini-${candle.id})`} />
      </g>
      
      {/* Glow for eternal flames */}
      {isEternal && (
        <ellipse cx="30" cy="20" rx="20" ry="15" fill={`url(#glow-mini-${candle.id})`} />
      )}
      
      {/* Eternal star */}
      {isEternal && (
        <text x="30" y="10" textAnchor="middle" fontSize="8" fill="#f3e4b0">✨</text>
      )}
    </svg>
  );
}

export default function ProfileCandleWidget({ userId, isOwner = false }: ProfileCandleWidgetProps) {
  const [latestCandle, setLatestCandle] = useState<Candle | null>(null);
  const [totalCandles, setTotalCandles] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadCandles();
    }
  }, [userId]);

  async function loadCandles() {
    if (!userId) return;
    
    try {
      // Try the RPC function first
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_user_candles', { p_user_id: userId });
      
      if (rpcData && rpcData.length > 0) {
        setLatestCandle(rpcData[0]);
        setTotalCandles(rpcData.length);
        return;
      }
      
      // Fallback to direct query
      const { data, error } = await supabase
        .from("candle_offerings")
        .select("*")
        .or(`user_id.eq.${userId},recipient_id.eq.${userId},created_for.eq.${userId},created_by.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (data && data.length > 0) {
        setLatestCandle(data[0]);
        
        // Get total count
        const { count } = await supabase
          .from("candle_offerings")
          .select("id", { count: 'exact', head: true })
          .or(`user_id.eq.${userId},recipient_id.eq.${userId},created_for.eq.${userId},created_by.eq.${userId}`);
        
        setTotalCandles(count || 0);
      }
    } catch (error) {
      console.error('Error loading candles:', error);
    } finally {
      setLoading(false);
    }
  }

  // Don't show widget if no candles
  if (!loading && !latestCandle) {
    return null;
  }

  if (loading) {
    return (
      <div style={{
        background: "linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(251, 191, 36, 0.05))",
        borderRadius: "1rem",
        padding: "1rem",
        border: "1px solid rgba(251, 191, 36, 0.2)",
        animation: "pulse 2s infinite"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{
            width: "60px",
            height: "80px",
            background: "rgba(255, 255, 255, 0.2)",
            borderRadius: "0.5rem",
            animation: "shimmer 1.5s infinite"
          }} />
          <div style={{ flex: 1 }}>
            <div style={{
              height: "1rem",
              background: "rgba(255, 255, 255, 0.2)",
              borderRadius: "0.25rem",
              marginBottom: "0.5rem",
              animation: "shimmer 1.5s infinite"
            }} />
            <div style={{
              height: "0.75rem",
              width: "60%",
              background: "rgba(255, 255, 255, 0.2)",
              borderRadius: "0.25rem",
              animation: "shimmer 1.5s infinite"
            }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Link href={isOwner ? "/profile/candles" : `/profile/${userId}/candles`}>
        <div style={{
          background: "linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(251, 191, 36, 0.05))",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(251, 191, 36, 0.2)",
          borderRadius: "1rem",
          padding: "1rem",
          cursor: "pointer",
          transition: "all 0.3s ease",
          display: "flex",
          alignItems: "center",
          gap: "1rem"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 8px 24px rgba(251, 191, 36, 0.15)";
          e.currentTarget.style.borderColor = "rgba(251, 191, 36, 0.4)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "";
          e.currentTarget.style.boxShadow = "";
          e.currentTarget.style.borderColor = "rgba(251, 191, 36, 0.2)";
        }}
        >
          {latestCandle && (
            <>
              {/* Candle Visual */}
              <div style={{
                position: "relative",
                width: "60px",
                height: "80px",
                flexShrink: 0
              }}>
                <MiniCandle candle={latestCandle} />
                {latestCandle.candle_type === 'eternal' && (
                  <span style={{
                    position: "absolute",
                    bottom: "-4px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
                    color: "white",
                    padding: "2px 6px",
                    borderRadius: "8px",
                    fontSize: "0.5rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    Eternal
                  </span>
                )}
              </div>
              
              {/* Candle Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{
                  fontSize: "1rem",
                  fontWeight: 600,
                  color: "#8b5cf6",
                  margin: "0 0 0.25rem 0"
                }}>
                  {latestCandle.name}
                </h4>
                {latestCandle.message && (
                  <p style={{
                    fontSize: "0.75rem",
                    color: "#6b7280",
                    fontStyle: "italic",
                    margin: "0 0 0.5rem 0",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    lineHeight: 1.3
                  }}>
                    {latestCandle.message}
                  </p>
                )}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "0.75rem"
                }}>
                  <span style={{ color: "#9ca3af" }}>
                    {totalCandles > 1 ? `${totalCandles} candles` : '1 candle'}
                  </span>
                  <span style={{ color: "#8b5cf6", fontWeight: 500 }}>
                    View all →
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </Link>

      <style jsx>{`
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

        @keyframes shimmer {
          0% { opacity: 0.5; }
          50% { opacity: 0.8; }
          100% { opacity: 0.5; }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.95; }
        }
      `}</style>
    </>
  );
}
