// components/ProfileCandleWidget.tsx - UPDATED WITH PRIVACY
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
  // Privacy fields
  visibility?: 'public' | 'friends' | 'private';
  created_by?: string;
  created_for?: string;
}

interface ProfileCandleWidgetProps {
  userId: string;
  isOwner?: boolean;
  viewerUserId?: string | null;
  relationshipType?: 'friend' | 'acquaintance' | 'restricted' | 'none';
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

export default function ProfileCandleWidget({ 
  userId, 
  isOwner = false,
  viewerUserId = null,
  relationshipType = 'none'
}: ProfileCandleWidgetProps) {
  const [visibleCandle, setVisibleCandle] = useState<Candle | null>(null);
  const [totalCandles, setTotalCandles] = useState(0);
  const [loading, setLoading] = useState(true);
  const [canViewCandles, setCanViewCandles] = useState(false);

  useEffect(() => {
    if (userId) {
      loadCandles();
    }
  }, [userId, viewerUserId, relationshipType]);

  async function loadCandles() {
    if (!userId) return;
    
    try {
      // If owner, show all their candles
      if (isOwner) {
        const { data } = await supabase
          .from("candle_offerings")
          .select("*")
          .or(`created_by.eq.${userId},created_for.eq.${userId}`)
          .order('created_at', { ascending: false });
        
        if (data && data.length > 0) {
          setVisibleCandle(data[0]);
          setTotalCandles(data.length);
          setCanViewCandles(true);
        }
      } else {
        // For viewers, only show candles based on privacy settings
        let query = supabase
          .from("candle_offerings")
          .select("*")
          .or(`created_by.eq.${userId},created_for.eq.${userId}`);
        
        // Apply visibility filter based on relationship
        if (relationshipType === 'friend') {
          // Friends can see public and friends-only candles
          query = query.or('visibility.eq.public,visibility.eq.friends');
        } else {
          // Non-friends can only see public candles
          query = query.eq('visibility', 'public');
        }
        
        const { data } = await query
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (data && data.length > 0) {
          setVisibleCandle(data[0]);
          
          // Get count of visible candles
          const { count } = await supabase
            .from("candle_offerings")
            .select("id", { count: 'exact', head: true })
            .or(`created_by.eq.${userId},created_for.eq.${userId}`)
            .eq('visibility', relationshipType === 'friend' ? 'friends' : 'public');
          
          setTotalCandles(count || 0);
          setCanViewCandles(true);
        }
      }
    } catch (error) {
      console.error('Error loading candles:', error);
    } finally {
      setLoading(false);
    }
  }

  // Don't show widget if no visible candles
  if (!loading && !visibleCandle) {
    return null;
  }

  // Loading state
  if (loading) {
    return (
      <div className="candle-widget-loading">
        <div className="shimmer"></div>
      </div>
    );
  }

  // For owners - always link to their candles page
  if (isOwner) {
    return (
      <>
        <Link href="/profile/candles">
          <div className="candle-widget owner-view">
            {visibleCandle && (
              <>
                <div className="candle-visual">
                  <MiniCandle candle={visibleCandle} />
                  {visibleCandle.candle_type === 'eternal' && (
                    <span className="eternal-badge">Eternal</span>
                  )}
                </div>
                
                <div className="candle-info">
                  <h4 className="candle-name">{visibleCandle.name}</h4>
                  {visibleCandle.message && (
                    <p className="candle-message">{visibleCandle.message}</p>
                  )}
                  <div className="candle-meta">
                    <span className="candle-count">
                      {totalCandles > 1 ? `${totalCandles} candles` : '1 candle'}
                    </span>
                    <span className="view-all">View all →</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </Link>

        {/* Privacy Settings for Owner */}
        <div className="candle-privacy-notice">
          <span className="privacy-icon">🔒</span>
          <span className="privacy-text">
            Your candles are {visibleCandle?.visibility || 'private'}
          </span>
          <Link href="/profile/candles/settings" className="privacy-link">
            Change
          </Link>
        </div>
      </>
    );
  }

  // For viewers - show candle but only link if they have permission
  return (
    <div className="candle-widget viewer-view">
      {visibleCandle && (
        <>
          <div className="candle-visual">
            <MiniCandle candle={visibleCandle} />
            {visibleCandle.candle_type === 'eternal' && (
              <span className="eternal-badge">Eternal</span>
            )}
          </div>
          
          <div className="candle-info">
            <h4 className="candle-name">{visibleCandle.name}</h4>
            {visibleCandle.message && (
              <p className="candle-message">{visibleCandle.message}</p>
            )}
            <div className="candle-meta">
              {canViewCandles && totalCandles > 0 ? (
                <>
                  <span className="candle-count">
                    {totalCandles} {totalCandles === 1 ? 'candle' : 'candles'}
                  </span>
                  {relationshipType === 'friend' && (
                    <Link href={`/profile/${userId}/candles`} className="view-link">
                      View →
                    </Link>
                  )}
                </>
              ) : (
                <span className="private-notice">
                  {relationshipType === 'none' 
                    ? 'Connect as friends to see more'
                    : 'Private candles'}
                </span>
              )}
            </div>
          </div>
        </>
      )}
      
      <style jsx>{`
        .candle-widget-loading {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(251, 191, 36, 0.05));
          border-radius: 1rem;
          padding: 1rem;
          border: 1px solid rgba(251, 191, 36, 0.2);
          height: 120px;
        }

        .shimmer {
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          animation: shimmer 1.5s infinite;
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .candle-widget {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(251, 191, 36, 0.05));
          backdrop-filter: blur(10px);
          border: 1px solid rgba(251, 191, 36, 0.2);
          border-radius: 1rem;
          padding: 1rem;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .candle-widget.owner-view {
          cursor: pointer;
        }

        .candle-widget.owner-view:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(251, 191, 36, 0.15);
          border-color: rgba(251, 191, 36, 0.4);
        }

        .candle-visual {
          position: relative;
          width: 60px;
          height: 80px;
          flex-shrink: 0;
        }

        .eternal-badge {
          position: absolute;
          bottom: -4px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          color: white;
          padding: 2px 6px;
          border-radius: 8px;
          font-size: 0.5rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .candle-info {
          flex: 1;
          min-width: 0;
        }

        .candle-name {
          font-size: 1rem;
          font-weight: 600;
          color: #8b5cf6;
          margin: 0 0 0.25rem 0;
        }

        .candle-message {
          font-size: 0.75rem;
          color: #6b7280;
          font-style: italic;
          margin: 0 0 0.5rem 0;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          line-height: 1.3;
        }

        .candle-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.75rem;
        }

        .candle-count {
          color: #9ca3af;
        }

        .view-all, .view-link {
          color: #8b5cf6;
          font-weight: 500;
          text-decoration: none;
        }

        .private-notice {
          color: #9ca3af;
          font-style: italic;
        }

        .candle-privacy-notice {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem;
          background: rgba(139, 92, 246, 0.05);
          border-radius: 0.5rem;
          margin-top: 0.5rem;
          font-size: 0.75rem;
          color: #6b7280;
        }

        .privacy-icon {
          font-size: 0.875rem;
        }

        .privacy-link {
          color: #8b5cf6;
          text-decoration: none;
          margin-left: auto;
        }

        .privacy-link:hover {
          text-decoration: underline;
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

        @media (max-width: 640px) {
          .candle-widget {
            padding: 0.875rem;
          }
          
          .candle-visual {
            width: 50px;
            height: 70px;
          }
          
          .candle-name {
            font-size: 0.875rem;
          }
        }
      `}</style>
    </div>
  );
}

// ===== UPDATED PROFILE TYPES WITH CANDLE PRIVACY =====
// app/profile/types/profile.ts - UPDATE TO INCLUDE CANDLE SETTINGS

export interface Profile {
  // ... existing fields ...
  
  // Candle privacy settings (NEW)
  candles_visibility?: 'public' | 'friends' | 'private' | null;
  gratitude_visibility?: 'private' | null; // Always private for now
}

// ===== UPDATE FOR VIEWER COMPONENT =====
// In ProfileViewer.tsx, update the candle widget usage:

// Replace the ProfileCandleWidget call with:
{userId && (
  <ProfileCandleWidget 
    userId={userId}
    isOwner={false}
    viewerUserId={currentUserId}
    relationshipType={relationshipType}
  />
)}

// And add this note for viewers:
{/* Note: Gratitude journal is never shown to viewers */}
{/* Only show link if creator has business profile */}
