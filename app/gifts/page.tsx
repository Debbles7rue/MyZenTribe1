// app/gifts/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import GiftShop from '@/components/GiftShop';
import ReceivedGifts from '@/components/gifts/ReceivedGifts';

type Gift = {
  id: string;
  name: string;
  emoji: string;
  category: string;
  price_cents: number;
  description: string;
  active: boolean;
  sort_order: number;
};

type SentGift = {
  id: string;
  gift_id: string;
  sender_id: string;
  recipient_id: string;
  message: string | null;
  sender_name: string;
  is_anonymous: boolean;
  payment_status: string;
  created_at: string;
  delivered_at: string | null;
  gift: Gift;
};

export default function GiftsPage() {
  const [activeTab, setActiveTab] = useState<'received' | 'shop'>('received');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [receivedGifts, setReceivedGifts] = useState<SentGift[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  // Load received gifts
  useEffect(() => {
    if (!userId) return;
    loadReceivedGifts();
  }, [userId]);

  async function loadReceivedGifts() {
    if (!userId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sent_gifts')
        .select(`
          *,
          gift:gifts(*)
        `)
        .eq('recipient_id', userId)
        .eq('payment_status', 'completed')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading gifts:', error);
        return;
      }

      setReceivedGifts(data || []);
      
      // Count unread gifts (not delivered yet)
      const unread = (data || []).filter(gift => !gift.delivered_at).length;
      setUnreadCount(unread);

      // Mark gifts as delivered now that user has viewed them
      if (unread > 0) {
        await supabase
          .from('sent_gifts')
          .update({ delivered_at: new Date().toISOString() })
          .eq('recipient_id', userId)
          .is('delivered_at', null);
      }

    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }

  // Handle gift sent successfully
  function handleGiftSent() {
    // Could show a success message or confetti animation
    console.log('Gift sent successfully!');
  }

  if (loading && activeTab === 'received') {
    return (
      <div className="gifts-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <span>Loading your gifts...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="gifts-page">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">
          <span className="title-icon">🎁</span>
          Gifts
        </h1>
        <p className="page-subtitle">
          Spread joy and kindness in your mindful community
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'received' ? 'active' : ''}`}
          onClick={() => setActiveTab('received')}
        >
          <span className="tab-icon">📥</span>
          <span>Received</span>
          {unreadCount > 0 && (
            <span className="notification-badge">{unreadCount}</span>
          )}
        </button>
        
        <button
          className={`tab-button ${activeTab === 'shop' ? 'active' : ''}`}
          onClick={() => setActiveTab('shop')}
        >
          <span className="tab-icon">🛍️</span>
          <span>Gift Shop</span>
        </button>
      </div>

      {/* Content */}
      <div className="tab-content">
        {activeTab === 'received' ? (
          <ReceivedGifts 
            gifts={receivedGifts}
            loading={loading}
            onRefresh={loadReceivedGifts}
          />
        ) : (
          <GiftShop 
            currentUserId={userId}
            onGiftSent={handleGiftSent}
          />
        )}
      </div>

      <style jsx>{`
        .gifts-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 20%, #fecaca 40%, #fde68a 60%, #f3e8ff 80%, #fdf4ff 100%);
          padding: 2rem 1rem;
          position: relative;
        }

        .gifts-page::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 
            radial-gradient(circle at 25% 25%, rgba(245,158,11,0.1) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(236,72,153,0.08) 0%, transparent 50%),
            radial-gradient(circle at 50% 100%, rgba(139,92,246,0.06) 0%, transparent 50%);
          pointer-events: none;
          z-index: 0;
        }

        .gifts-page > * {
          position: relative;
          z-index: 1;
        }

        .page-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .page-title {
          font-size: 2.5rem;
          font-weight: 700;
          background: linear-gradient(135deg, #f59e0b, #ec4899, #8b5cf6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0 0 0.5rem 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .title-icon {
          font-size: 2rem;
        }

        .page-subtitle {
          color: #6b7280;
          font-size: 1.125rem;
          margin: 0;
          max-width: 28rem;
          margin-left: auto;
          margin-right: auto;
        }

        .tab-navigation {
          display: flex;
          background: white;
          border-radius: 1rem;
          padding: 0.5rem;
          margin-bottom: 2rem;
          box-shadow: 0 4px 6px rgba(0,0,0,0.05);
          max-width: 24rem;
          margin-left: auto;
          margin-right: auto;
          margin-bottom: 2rem;
        }

        .tab-button {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border: none;
          background: transparent;
          border-radius: 0.75rem;
          cursor: pointer;
          font-weight: 500;
          color: #6b7280;
          transition: all 0.2s ease;
          position: relative;
        }

        .tab-button:hover {
          color: #374151;
          background: rgba(0,0,0,0.02);
        }

        .tab-button.active {
          background: linear-gradient(135deg, #f59e0b, #ec4899);
          color: white;
          box-shadow: 0 2px 4px rgba(245,158,11,0.3);
        }

        .tab-icon {
          font-size: 1.25rem;
        }

        .notification-badge {
          position: absolute;
          top: -0.25rem;
          right: -0.25rem;
          background: #ef4444;
          color: white;
          border-radius: 50%;
          width: 1.25rem;
          height: 1.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 600;
          min-width: 1.25rem;
        }

        .tab-content {
          max-width: 48rem;
          margin: 0 auto;
        }

        .loading-state {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 4rem 2rem;
          text-align: center;
        }

        .loading-spinner {
          width: 2rem;
          height: 2rem;
          border: 3px solid rgba(245,158,11,0.2);
          border-top: 3px solid #f59e0b;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 640px) {
          .gifts-page {
            padding: 1rem 0.5rem;
          }
          
          .page-title {
            font-size: 2rem;
            flex-direction: column;
            gap: 0.25rem;
          }
          
          .title-icon {
            font-size: 1.75rem;
          }
          
          .page-subtitle {
            font-size: 1rem;
            padding: 0 1rem;
          }
          
          .tab-navigation {
            margin-bottom: 1.5rem;
            max-width: 100%;
          }
          
          .tab-button {
            padding: 0.5rem 0.75rem;
            font-size: 0.875rem;
            flex-direction: column;
            gap: 0.25rem;
          }
          
          .tab-icon {
            font-size: 1rem;
          }
          
          .notification-badge {
            top: -0.5rem;
            right: -0.5rem;
          }
        }

        @media (max-width: 480px) {
          .gifts-page {
            padding: 0.5rem 0.25rem;
          }
          
          .page-header {
            margin-bottom: 1.5rem;
          }
          
          .tab-button span {
            font-size: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}
