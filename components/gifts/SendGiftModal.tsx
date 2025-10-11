// components/gifts/SendGiftModal.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Gift = {
  id: string;
  name: string;
  emoji: string;
  category: string;
  price_cents: number;
  description: string;
};

type Friend = {
  id: string;
  full_name: string;
  avatar_url: string | null;
};

interface SendGiftModalProps {
  gift: Gift;
  currentUserId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SendGiftModal({ gift, currentUserId, onClose, onSuccess }: SendGiftModalProps) {
  const [step, setStep] = useState<'recipient' | 'message' | 'payment'>('recipient');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Load friends list
  useEffect(() => {
    if (currentUserId) {
      loadFriends();
    }
  }, [currentUserId]);

  async function loadFriends() {
    if (!currentUserId) return;

    setFriendsLoading(true);
    try {
      // Get friends from friendships table
      const { data: friendships, error } = await supabase
        .from('friendships')
        .select(`
          user_id,
          friend_id,
          friend:profiles!friendships_friend_id_fkey(id, full_name, avatar_url),
          user:profiles!friendships_user_id_fkey(id, full_name, avatar_url)
        `)
        .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`);

      if (error) {
        console.error('Error loading friends:', error);
        return;
      }

      // Extract friend profiles (the person who is NOT the current user)
      const friendProfiles: Friend[] = [];
      friendships?.forEach(friendship => {
        if (friendship.user_id === currentUserId && friendship.friend) {
          friendProfiles.push(friendship.friend as Friend);
        } else if (friendship.friend_id === currentUserId && friendship.user) {
          friendProfiles.push(friendship.user as Friend);
        }
      });

      // Remove duplicates and sort by name
      const uniqueFriends = friendProfiles
        .filter((friend, index, self) => 
          index === self.findIndex(f => f.id === friend.id)
        )
        .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));

      setFriends(uniqueFriends);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setFriendsLoading(false);
    }
  }

  // Filter friends by search query
  const filteredFriends = friends.filter(friend =>
    (friend.full_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function handleSendGift() {
    if (!currentUserId || !selectedFriend) return;

    setLoading(true);
    try {
      // Get current user's name for the sender_name field
      const { data: currentUser } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', currentUserId)
        .single();

      const senderName = isAnonymous ? 'Anonymous' : (currentUser?.full_name || 'Someone');

      // Create Stripe checkout session
      const response = await fetch('/api/create-gift-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gift_id: gift.id,
          gift_name: gift.name,
          price_cents: gift.price_cents,
          recipient_id: selectedFriend.id,
          recipient_name: selectedFriend.full_name,
          sender_id: currentUserId,
          message: message.trim() || null,
          sender_name: senderName,
          is_anonymous: isAnonymous,
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        alert('Payment setup failed: ' + data.error);
        return;
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
      
    } catch (err) {
      console.error('Error:', err);
      alert('Something went wrong. Please try again.');
      setLoading(false);
    }
    // Don't set loading to false here - user is being redirected
  }

  function getCategoryColor(category: string) {
    switch (category) {
      case 'celebration': return '#f59e0b';
      case 'love': return '#ec4899';
      case 'healing': return '#10b981';
      case 'gratitude': return '#8b5cf6';
      case 'zen': return '#06b6d4';
      default: return '#6b7280';
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        
        {/* Header */}
        <div className="modal-header">
          <div 
            className="gift-preview"
            style={{ '--category-color': getCategoryColor(gift.category) } as React.CSSProperties}
          >
            <div className="gift-emoji">{gift.emoji}</div>
            <div className="gift-info">
              <h3 className="gift-name">{gift.name}</h3>
              <p className="gift-price">${(gift.price_cents / 100).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="steps-indicator">
          <div className={`step ${step === 'recipient' ? 'active' : step === 'message' || step === 'payment' ? 'completed' : ''}`}>
            <span className="step-number">1</span>
            <span className="step-label">Recipient</span>
          </div>
          <div className={`step ${step === 'message' ? 'active' : step === 'payment' ? 'completed' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-label">Message</span>
          </div>
          <div className={`step ${step === 'payment' ? 'active' : ''}`}>
            <span className="step-number">3</span>
            <span className="step-label">Send</span>
          </div>
        </div>

        {/* Content */}
        <div className="modal-body">
          {step === 'recipient' && (
            <div className="recipient-step">
              <h4>Who would you like to send this gift to?</h4>
              
              {friendsLoading ? (
                <div className="loading">Loading your friends...</div>
              ) : friends.length === 0 ? (
                <div className="no-friends">
                  <p>You don't have any friends added yet.</p>
                  <p>Add friends to start sending gifts! 👥</p>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Search friends..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                  />
                  
                  <div className="friends-list">
                    {filteredFriends.map((friend) => (
                      <div
                        key={friend.id}
                        className={`friend-item ${selectedFriend?.id === friend.id ? 'selected' : ''}`}
                        onClick={() => setSelectedFriend(friend)}
                      >
                        <div className="friend-avatar">
                          {friend.avatar_url ? (
                            <img src={friend.avatar_url} alt={friend.full_name || 'Friend'} />
                          ) : (
                            <div className="avatar-placeholder">
                              {(friend.full_name || '?')[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                        <span className="friend-name">{friend.full_name || 'Friend'}</span>
                        {selectedFriend?.id === friend.id && (
                          <div className="selected-checkmark">✓</div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
              
              <div className="step-actions">
                <button 
                  className="btn btn-primary"
                  onClick={() => setStep('message')}
                  disabled={!selectedFriend}
                >
                  Next: Add Message
                </button>
              </div>
            </div>
          )}

          {step === 'message' && (
            <div className="message-step">
              <h4>Add a personal message (optional)</h4>
              
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write a kind message to go with your gift..."
                className="message-input"
                rows={4}
                maxLength={200}
              />
              <div className="character-count">{message.length}/200</div>
              
              <label className="anonymous-checkbox">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                />
                <span>Send anonymously</span>
              </label>
              
              <div className="step-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setStep('recipient')}
                >
                  Back
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={() => setStep('payment')}
                >
                  Next: Send Gift
                </button>
              </div>
            </div>
          )}

          {step === 'payment' && (
            <div className="payment-step">
              <h4>Ready to send!</h4>
              
              <div className="gift-summary">
                <div className="summary-row">
                  <span>Gift:</span>
                  <span>{gift.emoji} {gift.name}</span>
                </div>
                <div className="summary-row">
                  <span>To:</span>
                  <span>{selectedFriend?.full_name}</span>
                </div>
                {message && (
                  <div className="summary-row">
                    <span>Message:</span>
                    <span>"{message}"</span>
                  </div>
                )}
                <div className="summary-row">
                  <span>From:</span>
                  <span>{isAnonymous ? '💫 Anonymous' : 'You'}</span>
                </div>
                <div className="summary-row total">
                  <span>Total:</span>
                  <span>${(gift.price_cents / 100).toFixed(2)}</span>
                </div>
              </div>
              
              <div className="payment-notice">
                <p>💳 Payment integration coming soon!</p>
                <p>For now, gifts will be sent for free to test the system.</p>
              </div>
              
              <div className="step-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setStep('message')}
                >
                  Back
                </button>
                <button 
                  className="btn btn-primary btn-send"
                  onClick={handleSendGift}
                  disabled={loading}
                >
                  {loading ? 'Sending...' : `Send Gift 🎁`}
                </button>
              </div>
            </div>
          )}
        </div>

        <style jsx>{`
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 1rem;
          }

          .modal-content {
            background: white;
            border-radius: 1.5rem;
            padding: 0;
            max-width: 32rem;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
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
            z-index: 10;
          }

          .modal-close:hover {
            background: #e5e7eb;
          }

          .modal-header {
            background: linear-gradient(135deg, #fef3c7, #fed7aa);
            padding: 2rem;
            border-radius: 1.5rem 1.5rem 0 0;
          }

          .gift-preview {
            display: flex;
            align-items: center;
            gap: 1rem;
          }

          .gift-emoji {
            font-size: 3rem;
            background: white;
            border-radius: 50%;
            width: 4rem;
            height: 4rem;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }

          .gift-info h3 {
            font-size: 1.5rem;
            font-weight: 600;
            color: #1f2937;
            margin: 0;
          }

          .gift-price {
            font-size: 1.25rem;
            font-weight: 700;
            color: var(--category-color);
            margin: 0;
          }

          .steps-indicator {
            display: flex;
            justify-content: center;
            gap: 2rem;
            padding: 1.5rem;
            background: #f9fafb;
            border-bottom: 1px solid #e5e7eb;
          }

          .step {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.5rem;
          }

          .step-number {
            width: 2rem;
            height: 2rem;
            border-radius: 50%;
            background: #e5e7eb;
            color: #6b7280;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            transition: all 0.2s;
          }

          .step.active .step-number {
            background: #f59e0b;
            color: white;
          }

          .step.completed .step-number {
            background: #10b981;
            color: white;
          }

          .step-label {
            font-size: 0.875rem;
            color: #6b7280;
            font-weight: 500;
          }

          .step.active .step-label {
            color: #f59e0b;
          }

          .modal-body {
            padding: 2rem;
          }

          .recipient-step h4,
          .message-step h4,
          .payment-step h4 {
            font-size: 1.25rem;
            font-weight: 600;
            color: #1f2937;
            margin: 0 0 1.5rem 0;
            text-align: center;
          }

          .search-input {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #d1d5db;
            border-radius: 0.5rem;
            margin-bottom: 1rem;
            font-size: 1rem;
          }

          .search-input:focus {
            outline: none;
            border-color: #f59e0b;
            box-shadow: 0 0 0 3px rgba(245,158,11,0.1);
          }

          .friends-list {
            max-height: 12rem;
            overflow-y: auto;
            margin-bottom: 1.5rem;
          }

          .friend-item {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem;
            border-radius: 0.5rem;
            cursor: pointer;
            transition: all 0.2s;
            border: 2px solid transparent;
          }

          .friend-item:hover {
            background: #f9fafb;
          }

          .friend-item.selected {
            background: #fef3c7;
            border-color: #f59e0b;
          }

          .friend-avatar {
            width: 2.5rem;
            height: 2.5rem;
            border-radius: 50%;
            overflow: hidden;
            flex-shrink: 0;
          }

          .friend-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .avatar-placeholder {
            width: 100%;
            height: 100%;
            background: #e5e7eb;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            color: #6b7280;
          }

          .friend-name {
            flex: 1;
            font-weight: 500;
            color: #1f2937;
          }

          .selected-checkmark {
            color: #f59e0b;
            font-weight: 700;
          }

          .message-input {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #d1d5db;
            border-radius: 0.5rem;
            margin-bottom: 0.5rem;
            font-size: 1rem;
            resize: vertical;
            font-family: inherit;
          }

          .message-input:focus {
            outline: none;
            border-color: #f59e0b;
            box-shadow: 0 0 0 3px rgba(245,158,11,0.1);
          }

          .character-count {
            text-align: right;
            font-size: 0.875rem;
            color: #9ca3af;
            margin-bottom: 1rem;
          }

          .anonymous-checkbox {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            cursor: pointer;
            margin-bottom: 1.5rem;
          }

          .gift-summary {
            background: #f9fafb;
            border-radius: 0.75rem;
            padding: 1.5rem;
            margin-bottom: 1rem;
          }

          .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 0.75rem;
          }

          .summary-row:last-child {
            margin-bottom: 0;
          }

          .summary-row.total {
            border-top: 1px solid #e5e7eb;
            padding-top: 0.75rem;
            font-weight: 600;
            font-size: 1.125rem;
          }

          .payment-notice {
            background: #dbeafe;
            border: 1px solid #bfdbfe;
            border-radius: 0.5rem;
            padding: 1rem;
            margin-bottom: 1.5rem;
            text-align: center;
          }

          .payment-notice p {
            margin: 0 0 0.5rem 0;
            color: #1e40af;
          }

          .payment-notice p:last-child {
            margin-bottom: 0;
            font-size: 0.875rem;
          }

          .step-actions {
            display: flex;
            gap: 1rem;
            justify-content: center;
          }

          .btn {
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            border: none;
            font-size: 1rem;
          }

          .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .btn-primary {
            background: linear-gradient(135deg, #f59e0b, #ec4899);
            color: white;
          }

          .btn-primary:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(245,158,11,0.3);
          }

          .btn-secondary {
            background: #f3f4f6;
            color: #374151;
          }

          .btn-secondary:hover {
            background: #e5e7eb;
          }

          .btn-send {
            min-width: 8rem;
          }

          .loading,
          .no-friends {
            text-align: center;
            padding: 2rem;
            color: #6b7280;
          }

          .no-friends p {
            margin: 0 0 0.5rem 0;
          }

          @media (max-width: 640px) {
            .modal-content {
              margin: 0.5rem;
              max-height: 95vh;
            }
            
            .modal-header {
              padding: 1.5rem;
            }
            
            .gift-preview {
              flex-direction: column;
              text-align: center;
              gap: 0.75rem;
            }
            
            .gift-emoji {
              font-size: 2.5rem;
              width: 3.5rem;
              height: 3.5rem;
            }
            
            .gift-info h3 {
              font-size: 1.25rem;
            }
            
            .gift-price {
              font-size: 1.125rem;
            }
            
            .modal-body {
              padding: 1.5rem;
            }
            
            .steps-indicator {
              gap: 1rem;
              padding: 1rem;
              flex-wrap: wrap;
              justify-content: center;
            }
            
            .step {
              min-width: 4rem;
            }
            
            .step-actions {
              flex-direction: column;
              gap: 0.75rem;
            }
            
            .btn {
              width: 100%;
              padding: 0.875rem;
            }
            
            .friends-list {
              max-height: 10rem;
            }
            
            .friend-item {
              padding: 0.5rem;
            }
            
            .friend-avatar {
              width: 2rem;
              height: 2rem;
            }
            
            .friend-name {
              font-size: 0.875rem;
            }
            
            .message-input {
              font-size: 16px; /* Prevent zoom on iOS */
            }
            
            .search-input {
              font-size: 16px; /* Prevent zoom on iOS */
            }
          }

          @media (max-width: 480px) {
            .modal-content {
              margin: 0.25rem;
            }
            
            .modal-header {
              padding: 1rem;
            }
            
            .modal-body {
              padding: 1rem;
            }
            
            .steps-indicator {
              padding: 0.75rem;
            }
            
            .step-number {
              width: 1.75rem;
              height: 1.75rem;
              font-size: 0.875rem;
            }
            
            .step-label {
              font-size: 0.75rem;
            }
            
            .gift-summary {
              padding: 1rem;
            }
            
            .summary-row {
              font-size: 0.875rem;
              margin-bottom: 0.5rem;
            }
            
            .payment-notice {
              padding: 0.75rem;
            }
            
            .friends-list {
              max-height: 8rem;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
