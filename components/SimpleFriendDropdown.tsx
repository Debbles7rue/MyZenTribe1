// components/SimpleFriendDropdown.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Friend = {
  id: string;
  full_name: string | null;
};

type SimpleFriendDropdownProps = {
  value: string[];
  onChange: (value: string[]) => void;
};

export default function SimpleFriendDropdown({ value, onChange }: SimpleFriendDropdownProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFriends();
  }, []);

  async function loadFriends() {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Get friendships - simple direct query
      const { data: friendships1 } = await supabase
        .from("friendships")
        .select("friend_id")
        .eq("user_id", user.id)
        .eq("status", "accepted");

      const { data: friendships2 } = await supabase
        .from("friendships")
        .select("user_id")
        .eq("friend_id", user.id)
        .eq("status", "accepted");

      // Combine friend IDs
      const friendIds = [
        ...(friendships1 || []).map(f => f.friend_id),
        ...(friendships2 || []).map(f => f.user_id)
      ];

      if (friendIds.length > 0) {
        // Get friend names
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", friendIds);

        setFriends(profiles || []);
      }
    } catch (error) {
      console.error("Error loading friends:", error);
    }
    setLoading(false);
  }

  // Get names of selected friends
  const selectedNames = friends
    .filter(f => value.includes(f.id))
    .map(f => f.full_name || "Friend")
    .join(", ");

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Add co-creators to this post
      </label>
      
      {/* Display selected friends */}
      {selectedNames && (
        <div className="mb-2 p-2 bg-purple-50 rounded text-sm text-purple-700">
          Selected: {selectedNames}
        </div>
      )}

      {/* Simple dropdown button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-left border border-gray-300 rounded-lg hover:border-purple-400 focus:outline-none focus:border-purple-500 bg-white"
      >
        {loading ? "Loading friends..." : value.length > 0 ? `${value.length} friend(s) selected` : "Click to select friends"}
      </button>

      {/* Friend list dropdown */}
      {isOpen && !loading && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-w-full">
          {friends.length === 0 ? (
            <div className="p-3 text-gray-500 text-center">
              No friends yet. Add friends to collaborate on posts!
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto">
              {friends.map(friend => (
                <label
                  key={friend.id}
                  className="flex items-center px-3 py-2 hover:bg-purple-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={value.includes(friend.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onChange([...value, friend.id]);
                      } else {
                        onChange(value.filter(id => id !== friend.id));
                      }
                    }}
                    className="mr-3 w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="text-gray-800">
                    {friend.full_name || "Friend"}
                  </span>
                </label>
              ))}
            </div>
          )}
          
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-full p-2 text-sm text-gray-600 hover:bg-gray-50 border-t transition-colors"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
