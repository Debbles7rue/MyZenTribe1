// components/CarpoolFriendSelector.tsx
"use client";

import { useState } from "react";
import { useFriends } from "@/lib/hooks/useFriends";
import { createClient } from '@/lib/supabase/client';
import dynamic from "next/dynamic";

const supabase = createClient();

// Dynamic import to avoid SSR issues
const EventCarpoolModal = dynamic(
  () => import("@/app/(protected)/calendar/components/EventCarpoolModal"),
  { ssr: false }
);

type CarpoolFriendSelectorProps = {
  onInvite?: (friendIds: string[], message: string) => void;
  eventTitle?: string;
  destination?: string;
  time?: string;
  event?: any; // The full event object
  userId?: string;
  showToast?: (toast: { type: string; message: string }) => void;
  isMobile?: boolean;
  eventId?: string; // Add eventId for direct DB operations
};

export default function CarpoolFriendSelector({ 
  onInvite, 
  eventTitle = "this event",
  destination,
  time,
  event,
  userId,
  showToast,
  isMobile,
  eventId
}: CarpoolFriendSelectorProps) {
  const { friends, loading } = useFriends();
  const [showFullModal, setShowFullModal] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSendInvites = async () => {
    if (selectedFriends.length === 0) {
      showToast?.({ type: 'warning', message: "Please select at least one friend to invite" });
      return;
    }
    
    setSending(true);
    
    try {
      const defaultMessage = message || `Want to carpool to ${eventTitle}? Let's save money and reduce emissions together! 🚗💚`;
      
      // If onInvite callback is provided, use it
      if (onInvite) {
        await onInvite(selectedFriends, defaultMessage);
        showToast?.({ type: 'success', message: `Invited ${selectedFriends.length} friend${selectedFriends.length > 1 ? 's' : ''}!` });
      } 
      // Otherwise, send invites directly to database
      else if (userId && eventId) {
        const invitePromises = selectedFriends.map(async (friendId) => {
          return supabase
            .from('carpool_invitations')
            .insert({
              event_id: eventId,
              sender_id: userId,
              recipient_id: friendId,
              message: defaultMessage,
              status: 'pending',
              created_at: new Date().toISOString()
            });
        });
        
        await Promise.all(invitePromises);
        showToast?.({ type: 'success', message: `🎉 Invited ${selectedFriends.length} friend${selectedFriends.length > 1 ? 's' : ''} to carpool!` });
      } else {
        showToast?.({ type: 'error', message: 'Missing required information to send invites' });
        return;
      }
      
      // Reset after sending
      setSelectedFriends([]);
      setMessage("");
      setIsOpen(false);
      
    } catch (error) {
      console.error('Failed to send invites:', error);
      showToast?.({ type: 'error', message: 'Failed to send invites. Please try again.' });
    } finally {
      setSending(false);
    }
  };

  const toggleFriend = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const selectedNames = friends
    .filter(f => selectedFriends.includes(f.id))
    .map(f => f.name)
    .join(", ");

  // If user wants the full experience, open the comprehensive modal
  const openAdvancedCarpool = () => {
    setShowFullModal(true);
  };

  return (
    <>
      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🚗</span>
            <h3 className="font-semibold text-green-900 dark:text-green-100">
              Carpool Options
            </h3>
          </div>
          
          {/* Advanced Mode Button */}
          <button
            onClick={openAdvancedCarpool}
            className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            Advanced Mode →
          </button>
        </div>

        {destination && (
          <p className="text-sm text-green-700 dark:text-green-300 mb-3">
            📍 Destination: {destination} {time && `at ${time}`}
          </p>
        )}

        {/* Quick Friend Selection */}
        <div className="mb-3">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full px-3 py-2 text-left border border-green-300 dark:border-green-700 rounded-lg hover:border-green-400 dark:hover:border-green-600 focus:outline-none focus:border-green-500 bg-white dark:bg-gray-800 transition-colors"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600" />
                Loading friends...
              </span>
            ) : selectedFriends.length > 0 ? (
              <span className="text-green-700 dark:text-green-300">
                ✓ {selectedFriends.length} friend(s) selected: {selectedNames}
              </span>
            ) : (
              <span className="text-gray-600 dark:text-gray-400">
                Click to select friends to invite
              </span>
            )}
          </button>

          {/* Friend Dropdown */}
          {isOpen && !loading && (
            <div className="mt-2 bg-white dark:bg-gray-800 border border-green-200 dark:border-green-700 rounded-lg shadow-lg overflow-hidden animate-slideDown">
              {friends.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  <p className="mb-2">No friends to invite yet!</p>
                  <a href="/friends" className="text-green-600 dark:text-green-400 hover:underline text-sm">
                    Add friends first →
                  </a>
                </div>
              ) : (
                <>
                  <div className="max-h-64 overflow-y-auto p-2">
                    {friends.map(friend => (
                      <label
                        key={friend.id}
                        className="flex items-center px-3 py-2 hover:bg-green-50 dark:hover:bg-green-900/30 cursor-pointer rounded transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedFriends.includes(friend.id)}
                          onChange={() => toggleFriend(friend.id)}
                          className="mr-3 w-4 h-4 text-green-600 rounded focus:ring-green-500"
                        />
                        <div className="flex items-center gap-2 flex-1">
                          {friend.avatar_url ? (
                            <img 
                              src={friend.avatar_url} 
                              alt={friend.name}
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-medium">
                              {friend.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="text-gray-800 dark:text-gray-200">{friend.name}</span>
                        </div>
                        {selectedFriends.includes(friend.id) && (
                          <span className="text-green-600 text-sm">✓</span>
                        )}
                      </label>
                    ))}
                  </div>
                  <div className="border-t dark:border-gray-700 p-2 bg-gray-50 dark:bg-gray-900">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 rounded transition-colors"
                    >
                      Done selecting
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Optional Custom Message */}
        {selectedFriends.length > 0 && (
          <div className="mb-3">
            <label className="block text-xs font-medium text-green-700 dark:text-green-300 mb-1">
              Custom message (optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a personal message..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-green-300 dark:border-green-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleSendInvites}
            disabled={selectedFriends.length === 0 || sending}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm flex items-center justify-center gap-2"
          >
            {sending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Sending...
              </>
            ) : (
              <>
                Send Invites ({selectedFriends.length})
              </>
            )}
          </button>
          <button
            onClick={openAdvancedCarpool}
            className="px-4 py-2 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors text-sm"
          >
            Full Chat
          </button>
        </div>

        {/* Environmental Impact Note */}
        {selectedFriends.length > 0 && (
          <div className="mt-3 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg text-xs text-green-700 dark:text-green-300 flex items-center gap-2">
            <span className="text-lg">🌱</span>
            <div>
              <strong>Environmental Impact:</strong> Carpooling with {selectedFriends.length} friend{selectedFriends.length > 1 ? 's' : ''} could save 
              ~<strong>{(selectedFriends.length * 8).toFixed(0)} lbs</strong> of CO₂ emissions per trip!
            </div>
          </div>
        )}
        
        {/* Teaser for advanced features */}
        <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-700">
          <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
            <span>💡</span>
            <span>
              Want real-time chat, route planning, and cost splitting?{' '}
              <button onClick={openAdvancedCarpool} className="underline font-medium hover:text-green-700 dark:hover:text-green-300">
                Try Advanced Mode
              </button>
            </span>
          </p>
        </div>
      </div>

      {/* Full EventCarpoolModal */}
      {showFullModal && event && (
        <EventCarpoolModal
          isOpen={showFullModal}
          onClose={() => setShowFullModal(false)}
          event={event}
          userId={userId}
          carpoolData={{
            carpoolMatches: [],
            friends: friends,
            sendCarpoolInvite: async (matchId: string, message?: string) => {
              try {
                await supabase
                  .from('carpool_invitations')
                  .insert({
                    event_id: event.id,
                    sender_id: userId,
                    recipient_id: matchId,
                    message: message || `Join our carpool to ${eventTitle}!`,
                    status: 'pending',
                    created_at: new Date().toISOString()
                  });
                showToast?.({ type: 'success', message: 'Invitation sent!' });
                return { success: true, message: 'Sent' };
              } catch (error) {
                console.error('Failed to send invitation:', error);
                showToast?.({ type: 'error', message: 'Failed to send invitation' });
                return { success: false, message: 'Failed' };
              }
            },
            createCarpoolGroup: async (eventId: string, friendIds: string[], message?: string) => {
              try {
                const invitePromises = friendIds.map(friendId =>
                  supabase
                    .from('carpool_invitations')
                    .insert({
                      event_id: eventId,
                      sender_id: userId,
                      recipient_id: friendId,
                      message: message || 'Join our carpool!',
                      status: 'pending',
                      created_at: new Date().toISOString()
                    })
                );
                await Promise.all(invitePromises);
                showToast?.({ type: 'success', message: 'Group created and invites sent!' });
                return { success: true, groupId: Date.now().toString(), message: 'Group created' };
              } catch (error) {
                console.error('Failed to create group:', error);
                showToast?.({ type: 'error', message: 'Failed to create carpool group' });
                return { success: false, groupId: '', message: 'Failed' };
              }
            }
          }}
          showToast={showToast}
          isMobile={isMobile}
        />
      )}
    </>
  );
}
