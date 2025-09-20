// components/ProfileCandleWidget.tsx
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Candle = {
  id: string;
  name: string;
  color: string;
  message: string | null;
  created_at: string;
  candle_type?: string;
  visibility?: string;
};

interface ProfileCandleWidgetProps {
  userId: string;
  isOwner?: boolean;
  viewerUserId?: string | null;
  relationshipType?: 'friend' | 'acquaintance' | 'none';
}

// Chevron Icons for expand/collapse
const ChevronDown = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

const ChevronUp = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="18 15 12 9 6 15"></polyline>
  </svg>
);

const EyeOff = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
    <line x1="1" y1="1" x2="23" y2="23"></line>
  </svg>
);

const Eye = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

export default function ProfileCandleWidget({ 
  userId, 
  isOwner = false,
  viewerUserId = null,
  relationshipType = 'none'
}: ProfileCandleWidgetProps) {
  const [visibleCandle, setVisibleCandle] = useState<Candle | null>(null);
  const [totalCandles, setTotalCandles] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isWidgetHidden, setIsWidgetHidden] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);

  // Load user preferences on mount
  useEffect(() => {
    if (isOwner && userId) {
      // Load preferences from localStorage
      const savedPrefs = localStorage.getItem(`candle-widget-prefs-${userId}`);
      if (savedPrefs) {
        const prefs = JSON.parse(savedPrefs);
        setIsExpanded(prefs.expanded ?? false);
        setIsWidgetHidden(prefs.hidden ?? false);
      }
      
      // Also load from database (in case they're syncing across devices)
      loadUserPreferences();
    }
  }, [userId, isOwner]);

  // Load candles
  useEffect(() => {
    if (userId && !isWidgetHidden) {
      loadCandles();
    }
  }, [userId, viewerUserId, relationshipType, isWidgetHidden]);

  async function loadUserPreferences() {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('show_candle_widget, candle_widget_expanded')
        .eq('id', userId)
        .single();
      
      if (data) {
        setIsWidgetHidden(data.show_candle_widget === false);
        setIsExpanded(data.candle_widget_expanded ?? false);
      }
    } catch (error) {
      console.error('Error loading widget preferences:', error);
    }
  }

  async function loadCandles() {
    if (!userId) return;
    
    setLoading(true);
    const debug: any = { userId, queries: [] };
    
    try {
      // COMPREHENSIVE SEARCH - checks all possible fields where your candles might be stored
      // First try created_by (most common for purchases)
      let { data: createdByData, error: error1 } = await supabase
        .from("candle_offerings")
        .select("*")
        .eq('created_by', userId)
        .order('created_at', { ascending: false });

      debug.queries.push({ 
        field: 'created_by', 
        found: createdByData?.length || 0,
        error: error1 
      });

      if (createdByData && createdByData.length > 0) {
        setVisibleCandle(createdByData[0]);
        setTotalCandles(createdByData.length);
        setDebugInfo(debug);
        console.log("Found candles using created_by field:", createdByData.length);
        return;
      }

      // Try user_id field
      let { data: userIdData, error: error2 } = await supabase
        .from("candle_offerings")
        .select("*")
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      debug.queries.push({ 
        field: 'user_id', 
        found: userIdData?.length || 0,
        error: error2 
      });

      if (userIdData && userIdData.length > 0) {
        setVisibleCandle(userIdData[0]);
        setTotalCandles(userIdData.length);
        setDebugInfo(debug);
        return;
      }

      // Try the comprehensive search across ALL fields
      const { data: allData, error: error3 } = await supabase
        .from("candle_offerings")
        .select("*")
        .or(`created_by.eq.${userId},user_id.eq.${userId},created_for.eq.${userId},recipient_id.eq.${userId}`)
        .order('created_at', { ascending: false });
      
      debug.queries.push({ 
        field: 'all_fields_combined', 
        found: allData?.length || 0,
        error: error3 
      });

      if (allData && allData.length > 0) {
        setVisibleCandle(allData[0]);
        setTotalCandles(allData.length);
        console.log("Found candles using comprehensive search:", allData.length);
      } else {
        console.log("No candles found for user:", userId);
      }
      
      setDebugInfo(debug);
    } catch (error) {
      console.error('Error loading candles:', error);
      debug.error = error;
      setDebugInfo(debug);
    } finally {
      setLoading(false);
    }
  }

  async function savePreferences(expanded: boolean, hidden: boolean) {
    // Save to localStorage immediately
    localStorage.setItem(`candle-widget-prefs-${userId}`, JSON.stringify({
      expanded,
      hidden
    }));

    // Also save to database for persistence
    if (isOwner) {
      try {
        await supabase
          .from('profiles')
          .update({
            show_candle_widget: !hidden,
            candle_widget_expanded: expanded
          })
          .eq('id', userId);
      } catch (error) {
        console.error('Error saving preferences:', error);
      }
    }
  }

  function toggleExpanded() {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    savePreferences(newExpanded, isWidgetHidden);
  }

  function toggleWidgetVisibility() {
    const newHidden = !isWidgetHidden;
    setIsWidgetHidden(newHidden);
    savePreferences(isExpanded, newHidden);
    setShowSettings(false);
  }

  // If widget is hidden for owner, show minimal restore button
  if (isOwner && isWidgetHidden) {
    return (
      <div className="hidden-widget-restore">
        <button 
          onClick={toggleWidgetVisibility}
          className="restore-button"
          title="Show Candle Section"
        >
          <span className="candle-icon">🕯️</span>
          <span>Show Candle Section</span>
        </button>
      </div>
    );
  }

  // Don't show widget for non-owners if no candles exist
  if (!isOwner && !loading && totalCandles === 0) {
    return null;
  }

  return (
    <div className="candle-widget-container">
      {/* Header Section - Always visible */}
      <div className="candle-header">
        <div className="header-left">
          <span className="candle-icon">🕯️</span>
          <div className="header-text">
            <h3 className="header-title">My Sacred Candles</h3>
            {!isExpanded && (
              <p className="header-subtitle">View your eternal memorials and prayer candles</p>
            )}
          </div>
        </div>
        
        <div className="header-actions">
          {isOwner && (
            <>
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className="settings-button"
                title="Widget Settings"
              >
                ⚙️
              </button>
              <button 
                onClick={toggleExpanded}
                className="expand-button"
                title={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? <ChevronUp /> : <ChevronDown />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Settings Dropdown */}
      {showSettings && isOwner && (
        <div className="settings-dropdown">
          <button 
            onClick={toggleWidgetVisibility}
            className="hide-widget-button"
          >
            <EyeOff />
            <span>Hide Candle Section</span>
          </button>
          <button 
            onClick={() => setShowDebug(!showDebug)}
            className="debug-button"
            style={{
              marginTop: '0.5rem',
              width: '100%',
              padding: '0.5rem',
              background: 'rgba(139, 92, 246, 0.1)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              borderRadius: '0.375rem',
              color: '#8b5cf6',
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            🐛 {showDebug ? 'Hide' : 'Show'} Debug Info
          </button>
          <div className="settings-note">
            You can show it again from your profile settings
          </div>
        </div>
      )}

      {/* Debug Info Display */}
      {showDebug && debugInfo && (
        <div style={{
          background: 'rgba(139, 92, 246, 0.05)',
          padding: '1rem',
          margin: '0 1rem',
          borderRadius: '0.5rem',
          fontSize: '0.75rem',
          fontFamily: 'monospace',
          color: '#1f2937'
        }}>
          <strong>Debug Info:</strong>
          <div>User ID: {debugInfo.userId}</div>
          {debugInfo.queries?.map((q: any, i: number) => (
            <div key={i} style={{ marginTop: '0.5rem' }}>
              <strong>Query {i+1}: {q.field}</strong>
              <div>Found: {q.found} candles</div>
              {q.error && <div style={{ color: 'red' }}>Error: {q.error.message}</div>}
            </div>
          ))}
          <div style={{ marginTop: '0.5rem', fontWeight: 'bold' }}>
            Total Candles Found: {totalCandles}
          </div>
        </div>
      )}

      {/* Expanded Content */}
      {isExpanded && (
        <div className="candle-content">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <span>Loading candles...</span>
            </div>
          ) : totalCandles > 0 ? (
            <>
              {visibleCandle && (
                <div className="candle-preview">
                  <div className="candle-visual">
                    <svg width="60" height="80" viewBox="0 0 60 80">
                      <defs>
                        <linearGradient id={`flame-${visibleCandle.id}`} x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#fff6d5" />
                          <stop offset="50%" stopColor="#ffd27a" />
                          <stop offset="100%" stopColor="#ff9b3f" />
                        </linearGradient>
                      </defs>
                      <rect x="20" y="30" width="20" height="40" rx="2" fill={visibleCandle.color || '#fff'} />
                      <g className="flame" style={{ animation: "flicker 1.5s infinite ease-in-out", transformOrigin: "30px 26px" }}>
                        <path d="M30 15 C28 19 27.5 22 30 26 C32.5 22 32 19 30 15 Z" fill={`url(#flame-${visibleCandle.id})`} />
                      </g>
                    </svg>
                  </div>
                  
                  <div className="candle-info">
                    <h4 className="candle-name">{visibleCandle.name}</h4>
                    {visibleCandle.message && (
                      <p className="candle-message">"{visibleCandle.message}"</p>
                    )}
                    <div className="candle-stats">
                      <span>{totalCandles} {totalCandles === 1 ? 'candle' : 'candles'} lit</span>
                    </div>
                  </div>
                </div>
              )}
              
              <Link href="/profile/candles" className="view-all-button">
                View My Candles ✨
              </Link>
            </>
          ) : (
            <div className="empty-state">
              <p>Light your first candle to create a sacred space</p>
              <Link href="/meditation/candles" className="cta-button">
                Visit Candle Sanctuary
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Collapsed State - Show button */}
      {!isExpanded && !loading && (
        <div className="collapsed-content">
          <Link href="/profile/candles" className="view-all-button-collapsed">
            View My Candles ✨
          </Link>
        </div>
      )}

      <style jsx>{`
        .candle-widget-container {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.05), rgba(251, 191, 36, 0.03));
          backdrop-filter: blur(10px);
          border: 1px solid rgba(251, 191, 36, 0.15);
          border-radius: 1rem;
          overflow: hidden;
          transition: all 0.3s ease;
          margin-bottom: 1rem;
        }

        .hidden-widget-restore {
          margin-bottom: 1rem;
        }

        .restore-button {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: rgba(251, 191, 36, 0.1);
          color: #8b5cf6;
          border: 1px solid rgba(251, 191, 36, 0.2);
          border-radius: 0.5rem;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .restore-button:hover {
          background: rgba(251, 191, 36, 0.15);
          transform: translateY(-1px);
        }

        .candle-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          cursor: ${isOwner ? 'pointer' : 'default'};
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex: 1;
        }

        .candle-icon {
          font-size: 2rem;
        }

        .header-text {
          flex: 1;
        }

        .header-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #8b5cf6;
          margin: 0 0 0.25rem 0;
        }

        .header-subtitle {
          font-size: 0.875rem;
          color: #6b7280;
          margin: 0;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .settings-button, .expand-button {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 0.5rem;
          padding: 0.375rem 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .settings-button:hover, .expand-button:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        .settings-dropdown {
          background: white;
          border-top: 1px solid rgba(139, 92, 246, 0.1);
          padding: 0.75rem;
        }

        .hide-widget-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.5rem;
          background: transparent;
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 0.375rem;
          color: #ef4444;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .hide-widget-button:hover {
          background: rgba(239, 68, 68, 0.05);
        }

        .settings-note {
          font-size: 0.75rem;
          color: #6b7280;
          margin-top: 0.5rem;
          text-align: center;
        }

        .candle-content {
          padding: 0 1rem 1rem;
          animation: slideDown 0.3s ease-out;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .loading-state {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 2rem;
          color: #6b7280;
        }

        .spinner {
          width: 1.5rem;
          height: 1.5rem;
          border: 2px solid rgba(139, 92, 246, 0.2);
          border-top-color: #8b5cf6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .candle-preview {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.5);
          border-radius: 0.75rem;
          margin-bottom: 1rem;
        }

        .candle-visual {
          flex-shrink: 0;
        }

        .flame {
          animation: flicker 1.5s infinite ease-in-out;
        }

        @keyframes flicker {
          0%, 100% { 
            transform: scale(1) rotate(-1deg); 
            opacity: 0.95; 
          }
          50% { 
            transform: scale(0.95) rotate(1deg); 
            opacity: 0.9; 
          }
        }

        .candle-info {
          flex: 1;
          min-width: 0;
        }

        .candle-name {
          font-size: 1rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 0.25rem 0;
        }

        .candle-message {
          font-size: 0.875rem;
          color: #6b7280;
          font-style: italic;
          margin: 0 0 0.5rem 0;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .candle-stats {
          font-size: 0.75rem;
          color: #9ca3af;
        }

        .view-all-button, .view-all-button-collapsed {
          display: block;
          width: 100%;
          text-align: center;
          padding: 0.75rem;
          background: linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(245, 158, 11, 0.1));
          color: #8b5cf6;
          border-radius: 0.5rem;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.2s;
        }

        .view-all-button-collapsed {
          margin: 0 1rem 1rem;
        }

        .view-all-button:hover, .view-all-button-collapsed:hover {
          background: linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(245, 158, 11, 0.15));
          transform: translateY(-1px);
        }

        .collapsed-content {
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .empty-state {
          text-align: center;
          padding: 2rem 1rem;
          color: #6b7280;
        }

        .empty-state p {
          margin: 0 0 1rem 0;
        }

        .cta-button {
          display: inline-block;
          padding: 0.5rem 1rem;
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: white;
          border-radius: 0.5rem;
          text-decoration: none;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .cta-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }

        @media (max-width: 640px) {
          .candle-header {
            padding: 0.875rem;
          }
          
          .header-title {
            font-size: 1rem;
          }
          
          .header-subtitle {
            font-size: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}
