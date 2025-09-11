// components/CarpoolFriendSelector.tsx
"use client";

import { useState } from "react";
import { useFriends } from "@/lib/hooks/useFriends";

type CarpoolFriendSelectorProps = {
  onInvite: (friendIds: string[], message: string) => void;
  eventTitle?: string;
  destination?: string;
  time?: string;
};

export default function CarpoolFriendSelector({ 
  onInvite, 
  eventTitle = "this event",
  destination,
  time 
}: CarpoolFriendSelectorProps) {
  const { friends, loading } = useFriends();
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleSendInvites = () => {
    if (selectedFriends.length === 0) {
      alert("Please select at least one friend to invite");
      return;
    }
    
    const defaultMessage = message || `Want to carpool to ${eventTitle}? Let's save money and reduce emissions together! 🚗💚`;
    onInvite(selectedFriends, defaultMessage);
    
    // Reset after sending
    setSelectedFriends([]);
    setMessage("");
    setIsOpen(false);
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

  return (
    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">🚗</span>
        <h3 className="font-semibold text-green-900">Invite Friends to Carpool</h3>
      </div>

      {destination && (
        <p className="text-sm text-green-700 mb-3">
          📍 Destination: {destination} {time && `at ${time}`}
        </p>
      )}

      {/* Friend Selection */}
      <div className="mb-3">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3 py-2 text-left border border-green-300 rounded-lg hover:border-green-400 focus:outline-none focus:border-green-500 bg-white"
        >
          {loading ? (
            "Loading friends..."
          ) : selectedFriends.length > 0 ? (
            <span className="text-green-700">
              {selectedFriends.length} friend(s) selected: {selectedNames}
            </span>
          ) : (
            "Select friends to invite"
          )}
        </button>

        {/* Friend Dropdown */}
        {isOpen && !loading && (
          <div className="mt-2 bg-white border border-green-200 rounded-lg shadow-lg">
            {friends.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <p className="mb-2">No friends to invite yet!</p>
                <a href="/friends" className="text-green-600 hover:underline text-sm">
                  Add friends first →
                </a>
              </div>
            ) : (
              <>
                <div className="max-h-48 overflow-y-auto p-2">
                  {friends.map(friend => (
                    <label
                      key={friend.id}
                      className="flex items-center px-3 py-2 hover:bg-green-50 cursor-pointer rounded transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFriends.includes(friend.id)}
                        onChange={() => toggleFriend(friend.id)}
                        className="mr-3 w-4 h-4 text-green-600 rounded focus:ring-green-500"
                      />
                      <div className="flex-1">
                        <span className="text-gray-800">{friend.name}</span>
                        {friend.avatar_url && (
                          <img 
                            src={friend.avatar_url} 
                            alt={friend.name}
                            className="inline-block w-6 h-6 rounded-full ml-2"
                          />
                        )}
                      </div>
                    </label>
                  ))}
                </div>
                <div className="border-t p-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="w-full px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded"
                  >
                    Done selecting
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Custom Message */}
      {selectedFriends.length > 0 && (
        <div className="mb-3">
          <label className="block text-sm font-medium text-green-700 mb-1">
            Add a message (optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Hey! Want to share a ride? We can split gas and parking..."
            className="w-full px-3 py-2 border border-green-300 rounded-lg resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            rows={2}
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleSendInvites}
          disabled={selectedFriends.length === 0}
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Send Carpool Invites ({selectedFriends.length})
        </button>
        {selectedFriends.length > 0 && (
          <button
            onClick={() => setSelectedFriends([])}
            className="px-4 py-2 border border-green-300 text-green-700 rounded-lg hover:bg-green-50 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Environmental Impact Note */}
      {selectedFriends.length > 0 && (
        <div className="mt-3 p-2 bg-green-100 rounded text-xs text-green-700">
          🌱 Carpooling with {selectedFriends.length} friend{selectedFriends.length > 1 ? 's' : ''} could save 
          ~{(selectedFriends.length * 8).toFixed(0)} lbs of CO₂ emissions!
        </div>
      )}
    </div>
  );
}
