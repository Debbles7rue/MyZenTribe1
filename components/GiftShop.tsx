// components/GiftShop.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import SendGiftModal from '@/components/gifts/SendGiftModal';

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

const CATEGORIES = [
  { id: 'all', name: 'All Gifts', emoji: '🎁', color: '#6b7280' },
  { id: 'celebration', name: 'Celebration', emoji: '🎉', color: '#f59e0b' },
  { id: 'love', name: 'Love & Care', emoji: '💝', color: '#ec4899' },
  { id: 'healing', name: 'Healing', emoji: '🌸', color: '#10b981' },
  { id: 'gratitude', name: 'Gratitude', emoji: '🙏', color: '#8b5cf6' },
  { id: 'zen', name: 'Zen', emoji: '🧘', color: '#06b6d4' },
];

interface GiftShopProps {
  currentUserId: string | null;
  onGiftSent: () => void;
}

export default function GiftShop({ currentUserId, onGiftSent }: GiftShopProps) {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);

  // Load gifts from database
  useEffect(() => {
    loadGifts();
  }, []);

  async function loadGifts() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gifts')
        .select('*')
        .eq('active', true)
        .order('sort_order');

      if (error) {
        console.error('Error loading gifts:', error);
        return;
      }

      setGifts(data || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }

  // Filter gifts by category
  const filteredGifts = selectedCategory === 'all' 
    ? gifts 
    : gifts.filter(gift => gift.category === selectedCategory);

  // Group gifts by category for display
  const giftsByCategory = CATEGORIES.reduce((acc, category) => {
    if (category.id === 'all') return acc;
    acc[category.id] = filteredGifts.filter(gift => gift.category === category.id);
    return acc;
  }, {} as Record<string, Gift[]>);

  function handleGiftSelect(gift: Gift) {
    if (!currentUserId) {
      alert('Please sign in to send gifts');
      return;
    }
    setSelectedGift(gift);
    setShowSendModal(true);
  }

  function handleGiftSent() {
    setShowSendModal(false);
    setSelectedGift(null);
    onGiftSent();
  }

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner"></div>
        <span>Loading gift shop...</span>
      </div>
    );
  }

  return (
    <div className="gift-shop">
      {/* Shop Header */}
      <div className="shop-header">
        <h2 className="shop-title">✨ Gift Shop ✨</h2>
        <p className="shop-subtitle">
          Send virtual gifts for just $1 each • Brighten someone's day with kindness
        </p>
      </div>

      {/* Category Filter */}
      <div className="category-filter">
        {CATEGORIES.map((category) => (
          <button
            key={category.id}
            className={`category-button ${selectedCategory === category.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(category.id)}
            style={{ '--category-color': category.color } as React.CSSProperties}
          >
            <span className="category-emoji">{category.emoji}</span>
            <span className="category-name">{category.name}</span>
          </button>
        ))}
      </div>

      {/* Gifts Display */}
      {selectedCategory === 'all' ? (
        // Show all categories
        <div className="all-categories">
          {CATEGORIES.filter(cat => cat.id !== 'all').map((category) => {
            const categoryGifts = giftsByCategory[category.id];
            if (!categoryGifts || categoryGifts.length === 0) return null;

            return (
              <div key={category.id} className="category-section">
                <h3 
                  className="category-section-title"
                  style={{ '--category-color': category.color } as React.CSSProperties}
                >
                  <span className="category-emoji">{category.emoji}</span>
                  {category.name}
                </h3>
                <div className="gifts-grid">
                  {categoryGifts.map((gift) => (
                    <GiftCard 
                      key={gift.id} 
                      gift={gift} 
                      categoryColor={category.color}
                      onClick={() => handleGiftSelect(gift)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Show selected category
        <div className="single-category">
          <div className="gifts-grid">
            {filteredGifts.map((gift) => {
              const category = CATEGORIES.find(cat => cat.id === gift.category);
              return (
                <GiftCard 
                  key={gift.id} 
                  gift={gift} 
                  categoryColor={category?.color || '#6b7280'}
                  onClick={() => handleGiftSelect(gift)}
                />
              );
            })}
          </div>
          {filteredGifts.length === 0 && (
            <div className="empty-category">
              <p>No gifts in this category yet. Check back soon! 🎁</p>
            </div>
          )}
        </div>
      )}

      {/* Send Gift Modal */}
      {showSendModal && selectedGift && (
        <SendGiftModal
          gift={selectedGift}
          currentUserId={currentUserId}
          onClose={() => setShowSendModal(false)}
          onSuccess={handleGiftSent}
        />
      )}

      <style jsx>{`
        .gift-shop {
          width: 100%;
        }

        .shop-header {
          text-align: center;
          margin-bottom: 2rem;
          background: white;
          padding: 2rem;
          border-radius: 1rem;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .shop-title {
          font-size: 2rem;
          font-weight: 700;
          background: linear-gradient(135deg, #f59e0b, #ec4899, #8b5cf6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0 0 0.5rem 0;
        }

        .shop-subtitle {
          color: #6b7280;
          font-size: 1.125rem;
          margin: 0;
          line-height: 1.6;
        }

        .category-filter {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          margin-bottom: 2rem;
          justify-content: center;
        }

        .category-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 2rem;
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 500;
          color: #374151;
        }

        .category-button:hover {
          border-color: var(--category-color);
          background: rgba(255,255,255,0.9);
          transform: translateY(-1px);
        }

        .category-button.active {
          background: var(--category-color);
          border-color: var(--category-color);
          color: white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .category-emoji {
          font-size: 1.25rem;
        }

        .category-name {
          font-size: 0.875rem;
        }

        .all-categories {
          display: flex;
          flex-direction: column;
          gap: 3rem;
        }

        .category-section {
          background: white;
          border-radius: 1rem;
          padding: 2rem;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .category-section-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--category-color);
          margin: 0 0 1.5rem 0;
          padding-bottom: 0.75rem;
          border-bottom: 2px solid rgba(0,0,0,0.1);
        }

        .single-category {
          background: white;
          border-radius: 1rem;
          padding: 2rem;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .gifts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
        }

        .empty-category {
          text-align: center;
          padding: 2rem;
          color: #9ca3af;
          font-style: italic;
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

        @media (max-width: 768px) {
          .shop-header {
            padding: 1.5rem;
          }
          
          .shop-title {
            font-size: 1.75rem;
          }
          
          .category-filter {
            gap: 0.5rem;
          }
          
          .category-button {
            padding: 0.5rem 0.75rem;
            font-size: 0.875rem;
          }
          
          .gifts-grid {
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
            gap: 0.75rem;
          }
          
          .category-section {
            padding: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}

// Gift Card Component
function GiftCard({ gift, categoryColor, onClick }: {
  gift: Gift;
  categoryColor: string;
  onClick: () => void;
}) {
  return (
    <div 
      className="gift-card"
      onClick={onClick}
      style={{ '--category-color': categoryColor } as React.CSSProperties}
    >
      <div className="gift-emoji">{gift.emoji}</div>
      <h4 className="gift-name">{gift.name}</h4>
      <p className="gift-description">{gift.description}</p>
      <div className="gift-price">$1.00</div>
      <button className="send-button">
        Send Gift ✨
      </button>

      <style jsx>{`
        .gift-card {
          background: white;
          border: 2px solid #f3f4f6;
          border-radius: 1rem;
          padding: 1.5rem;
          text-align: center;
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
          transform: scaleX(0);
          transition: transform 0.2s ease;
        }

        .gift-card:hover {
          border-color: var(--category-color);
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.1);
        }

        .gift-card:hover::before {
          transform: scaleX(1);
        }

        .gift-emoji {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .gift-name {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 0.5rem 0;
        }

        .gift-description {
          font-size: 0.875rem;
          color: #6b7280;
          margin: 0 0 1rem 0;
          line-height: 1.4;
        }

        .gift-price {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--category-color);
          margin: 0 0 1rem 0;
        }

        .send-button {
          width: 100%;
          background: linear-gradient(135deg, var(--category-color), rgba(255,255,255,0.1));
          color: white;
          border: none;
          padding: 0.75rem;
          border-radius: 0.5rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .send-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  );
}
