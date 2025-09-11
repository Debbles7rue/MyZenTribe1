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

type FriendSelectorProps = {
  value: string[];
  onChange: (friendIds: string[]) => void;
  multiple?: boolean;
  placeholder?: string;
  className?: string;
  label?: string;
};

export default function FriendSelector({
  value,
  onChange,
  multiple = true,
  placeholder = "Search and select friends...",
  className = "",
  label
}: FriendSelectorProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<Friend[]>([]);

  useEffect(() => {
    loadFriends();
  }, []);

  useEffect(() => {
    // Update selected friends when value changes
    if (friends.length > 0) {
      setSelectedFriends(friends.filter(f => value.includes(f.id)));
    }
  }, [value, friends]);

  async function loadFriends() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get friendships where user is either user_id or friend_id
      const { data: friendships } = await supabase
        .from("friendships")
        .select("user_id, friend_id")
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq("status", "accepted");

      if (!friendships || friendships.length === 0) {
        setFriends([]);
        return;
      }

      // Get unique friend IDs
      const friendIds = new Set<string>();
      friendships.forEach(f => {
        if (f.user_id === user.id) {
          friendIds.add(f.friend_id);
        } else {
          friendIds.add(f.user_id);
        }
      });

      // Get friend profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, email")
        .in("id", Array.from(friendIds));

      setFriends(profiles || []);
    } catch (error) {
      console.error("Error loading friends:", error);
    } finally {
      setLoading(false);
    }
  }

  function toggleFriend(friend: Friend) {
    if (multiple) {
      const newValue = value.includes(friend.id)
        ? value.filter(id => id !== friend.id)
        : [...value, friend.id];
      onChange(newValue);
    } else {
      onChange([friend.id]);
      setShowDropdown(false);
    }
  }

  function removeFriend(friendId: string) {
    onChange(value.filter(id => id !== friendId));
  }

  const filteredFriends = friends.filter(friend => {
    const name = friend.full_name || friend.email || "";
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
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
              {friend.avatar_url ? (
                <img
                  src={friend.avatar_url}
                  alt=""
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-purple-300 flex items-center justify-center text-xs text-white font-bold">
                  {(friend.full_name || friend.email || "?")[0].toUpperCase()}
                </div>
              )}
              <span>{friend.full_name || friend.email || "Friend"}</span>
              <button
                onClick={() => removeFriend(friend.id)}
                className="text-purple-600 hover:text-purple-800 font-bold"
                type="button"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        />
        
        {/* Dropdown */}
        {showDropdown && (
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {loading ? (
              <div className="p-3 text-center text-gray-500">
                Loading friends...
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className="p-3 text-center text-gray-500">
                {friends.length === 0 
                  ? "No friends yet. Invite some friends first!"
                  : "No friends match your search"}
              </div>
            ) : (
              filteredFriends.map(friend => {
                const isSelected = value.includes(friend.id);
                return (
                  <button
                    key={friend.id}
                    type="button"
                    className={`w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left ${
                      isSelected ? "bg-purple-50" : ""
                    }`}
                    onClick={() => toggleFriend(friend)}
                  >
                    {/* Checkbox for multiple selection */}
                    {multiple && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="pointer-events-none"
                      />
                    )}
                    
                    {/* Avatar */}
                    {friend.avatar_url ? (
                      <img
                        src={friend.avatar_url}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold">
                        {(friend.full_name || friend.email || "?")[0].toUpperCase()}
                      </div>
                    )}
                    
                    {/* Name */}
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">
                        {friend.full_name || "Anonymous"}
                      </div>
                      {friend.email && (
                        <div className="text-xs text-gray-500">{friend.email}</div>
                      )}
                    </div>
                    
                    {/* Selected indicator */}
                    {isSelected && !multiple && (
                      <span className="text-purple-600">✓</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
      
      {/* Help text */}
      <p className="mt-1 text-xs text-gray-500">
        {multiple 
          ? "Click friends to add them as co-creators"
          : "Select a friend"}
      </p>
    </div>
  );
}
