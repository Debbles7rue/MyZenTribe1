// components/FriendSelector.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Friend = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
};

interface FriendSelectorProps {
  value: string[];
  onChange: (friendIds: string[]) => void;
  multiple?: boolean;
  placeholder?: string;
  className?: string;
  label?: string;
}

export default function FriendSelector({
  value,
  onChange,
  multiple = true,
  placeholder = "Click to select friends...",
  className = "",
  label
}: FriendSelectorProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    loadFriends();
  }, []);

  async function loadFriends() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setFriends([]);
        setLoading(false);
        return;
      }

      // Query friendships table directly (simpler approach)
      const { data: friendships } = await supabase
        .from("friendships")
        .select("user_id, friend_id")
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq("status", "accepted");

      if (!friendships || friendships.length === 0) {
        setFriends([]);
        setLoading(false);
        return;
      }

      // Extract friend IDs
      const friendIds: string[] = [];
      friendships.forEach(f => {
        if (f.user_id === user.id && f.friend_id) {
          friendIds.push(f.friend_id);
        } else if (f.friend_id === user.id && f.user_id) {
          friendIds.push(f.user_id);
        }
      });

      // Get friend profiles
      if (friendIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, email")
          .in("id", friendIds);

        setFriends(profiles || []);
      }
    } catch (error) {
      console.error("Error loading friends:", error);
      setFriends([]);
    }
    setLoading(false);
  }

  function toggleFriend(friendId: string) {
    if (value.includes(friendId)) {
      onChange(value.filter(id => id !== friendId));
    } else {
      onChange([...value, friendId]);
    }
  }

  // Get selected friend details
  const selectedFriends = friends.filter(f => value.includes(f.id));

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      
      {/* Selected Friends Display */}
      {selectedFriends.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {selectedFriends.map(friend => (
            <div
              key={friend.id}
              className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
            >
              <span>{friend.full_name || friend.email || "Friend"}</span>
              <button
                onClick={() => toggleFriend(friend.id)}
                className="text-purple-600 hover:text-purple-800 font-bold"
                type="button"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Dropdown Toggle Button */}
      <button
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left focus:ring-2 focus:ring-purple-500 focus:border-transparent"
      >
        {loading ? "Loading friends..." : placeholder}
      </button>
      
      {/* Dropdown */}
      {showDropdown && !loading && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {friends.length === 0 ? (
            <div className="p-3 text-center text-gray-500">
              No friends yet. Add some friends first!
            </div>
          ) : (
            friends.map(friend => {
              const isSelected = value.includes(friend.id);
              return (
                <button
                  key={friend.id}
                  type="button"
                  className={`w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-50 text-left ${
                    isSelected ? "bg-purple-50" : ""
                  }`}
                  onClick={() => toggleFriend(friend.id)}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="pointer-events-none"
                  />
                  
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">
                      {friend.full_name || "Friend"}
                    </div>
                    {friend.email && (
                      <div className="text-xs text-gray-500">{friend.email}</div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
      
      {/* Help text */}
      <p className="mt-1 text-xs text-gray-500">
        Click to select friends as co-creators
      </p>
    </div>
  );
}
