// components/gifts/ReceivedGifts.tsx
"use client";

import React, { useState } from 'react';

type Gift = {
  id: string;
  name: string;
  emoji: string;
  category: string;
  price_cents: number;
  description: string;
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

interface ReceivedGiftsProps {
  gifts: SentGift[];
  loading: boolean;
  onRefresh: () => void;
}

export default function ReceivedGifts({ gifts, loading, onRefresh }: ReceivedGiftsProps) {
  const [selectedGift, setSelectedGift] = useState<SentGift | null>(null);

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }

  function getCategoryColor(category: string) {
    switch (category) {
      case 'celebration': return '#f59e0b'; // amber
      case 'love': return '#ec4899'; // pink
      case 'healing': return '#10b981'; // emerald
      case 'gratitude': return '#8b5cf6'; // purple
      case 'zen': return '#06b6d4'; // cyan
      default: return '#6b7280'; // gray
    }
  }

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner"></div>
        <span>Loading your gifts...</span>
      </div>
    );
  }

  if (gifts.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🎁</div>
        <h3 className="empty-title">No gifts yet</h3>
        <p className="empty-text">
          When someone sends you a gift, it will appear here. Share your profile 
          with friends so they can brighten your day!
        </p>
        <button onClick={onRefresh} className="refresh-button">
          🔄 Check for gifts
        </button>
      </div>
    );
  }

  return (
    <div className="received-gifts">
      <div className="gifts-header">
        <h2 className="section-title">
          Your Gift Collection ({gifts.length})
        </h2>
        <button onClick={onRefresh} className="refresh-button-small">
          🔄
        </button>
      </div>

      <div className="gifts-grid">
        {gifts.map((sentGift) => (
          <div 
            key={sentGift.id} 
            className="gift-card"
            onClick={() => setSelectedGift(sentGift)}
            style={{ '--category-color': getCategoryColor(sentGift.gift.category) } as React.CSSProperties}
          >
            <div className="gift-emoji">{sentGift.gift.emoji}</div>
            <div className="gift-info">
              <h3 className="gift-name">{sentGift.gift.name}</h3>
              <p className="gift-sender">
                {sentGift.is_anonymous ? '💫 Anonymous' : `From ${sentGift.sender_name}`}
              </p>
              <p className="gift-time">{formatDate(sentGift.created_at)}</p>
              {sentGift.message && (
                <div className="gift-preview-message">
                  "{sentGift.message.length > 50 
                    ? sentGift.message.substring(0, 50) + '...' 
                    : sentGift.message}"
                </div>
              )}
            </div>
            {!sentGift.delivered_at && (
              <div className="new-badge">New!</div>
            )}
          </div>
        ))}
      </div>

      {/* Gift Detail Modal */}
      {selectedGift && (
        <div className="modal-overlay" onClick={() => setSelectedGift(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button 
              className="modal-close" 
              onClick={() => setSelectedGift(null)}
            >
              ×
            </button>
            
            <div className="modal-gift">
              <div 
                className="modal-gift-emoji"
                style={{ '--category-color': getCategoryColor(selectedGift.gift.category) } as React.CSSProperties}
              >
                {selectedGift.gift.emoji}
              </div>
              <h2 className="modal-gift-name">{selectedGift.gift.name}</h2>
              <p className="modal-gift-description">{selectedGift.gift.description}</p>
              
              <div className="modal-sender-info">
                <p className="modal-sender">
                  {selectedGift.is_anonymous ? (
                    <span>💫 Sent anonymously</span>
                  ) : (
                    <span>💝 From {selectedGift.sender_name}</span>
                  )}
                </p>
                <p className="modal-time">{formatDate(selectedGift.created_at)}</p>
              </div>

              {selectedGift.message && (
                <div className="modal-message">
                  <h4>Personal Message:</h4>
                  <p>"{selectedGift.message}"</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .received-gifts {
          width: 100%;
        }

        .gifts-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.5rem;
        }

        .section-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
        }

        .refresh-button-small {
          padding: 0.5rem;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .refresh-button-small:hover {
          background: #f9fafb;
          transform: rotate(180deg);
        }

        .gifts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
        }

        .gift-card {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          border: 2px solid transparent;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
        }

        .gift-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: var(--category-color);
        }

        .gift-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.1);
          border-color: var(--category-color);
        }

        .gift-emoji {
          font-size: 3rem;
          text-align: center;
          margin-bottom: 1rem;
        }

        .gift-info {
          text-align: center;
        }

        .gift-name {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 0.5rem 0;
        }

        .gift-sender {
          font-size: 0.875rem;
          color: #6b7280;
          margin: 0 0 0.25rem 0;
          font-weight: 500;
        }

        .gift-time {
          font-size: 0.75rem;
          color: #9ca3af;
          margin: 0 0 0.75rem 0;
        }

        .gift-preview-message {
          font-size: 0.875rem;
          color: #374151;
          font-style: italic;
          background: #f9fafb;
          padding: 0.5rem;
          border-radius: 0.5rem;
          border-left: 3px solid var(--category-color);
        }

        .new-badge {
          position: absolute;
          top: 0.75rem;
          right: 0.75rem;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 1rem;
          font-size: 0.75rem;
          font-weight: 600;
          box-shadow: 0 2px 4px rgba(239,68,68,0.3);
        }

        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          background: white;
          border-radius: 1rem;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .empty-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 1rem 0;
        }

        .empty-text {
          color: #6b7280;
          line-height: 1.6;
          max-width: 24rem;
          margin: 0 auto 2rem auto;
        }

        .refresh-button {
          background: linear-gradient(135deg, #f59e0b, #ec4899);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .refresh-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(245,158,11,0.3);
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

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .modal-content {
          background: white;
          border-radius: 1.5rem;
          padding: 2rem;
          max-width: 28rem;
          width: 100%;
          position: relative;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }

        .modal-close {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: #f3f4f6;
          border: none;
          width: 2rem;
          height: 2rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .modal-close:hover {
          background: #e5e7eb;
        }

        .modal-gift {
          text-align: center;
        }

        .modal-gift-emoji {
          font-size: 5rem;
          margin-bottom: 1rem;
          padding: 1rem;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--category-color), rgba(255,255,255,0.1));
          width: 8rem;
          height: 8rem;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.5rem auto;
          box-shadow: 0 8px 24px rgba(0,0,0,0.1);
        }

        .modal-gift-name {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 0.5rem 0;
        }

        .modal-gift-description {
          color: #6b7280;
          font-size: 1.125rem;
          line-height: 1.6;
          margin: 0 0 1.5rem 0;
        }

        .modal-sender-info {
          background: #f9fafb;
          padding: 1rem;
          border-radius: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .modal-sender {
          font-weight: 600;
          color: #374151;
          margin: 0 0 0.25rem 0;
        }

        .modal-time {
          font-size: 0.875rem;
          color: #9ca3af;
          margin: 0;
        }

        .modal-message {
          background: linear-gradient(135deg, #fef3c7, #fed7aa);
          padding: 1.5rem;
          border-radius: 0.75rem;
          text-align: left;
        }

        .modal-message h4 {
          font-size: 0.875rem;
          font-weight: 600;
          color: #92400e;
          margin: 0 0 0.5rem 0;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .modal-message p {
          color: #1f2937;
          font-size: 1.125rem;
          line-height: 1.6;
          margin: 0;
          font-style: italic;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 640px) {
          .gifts-grid {
            grid-template-columns: 1fr;
          }
          
          .modal-content {
            margin: 1rem;
            padding: 1.5rem;
          }
          
          .modal-gift-emoji {
            font-size: 4rem;
            width: 6rem;
            height: 6rem;
          }
        }
      `}</style>
    </div>
  );
}
