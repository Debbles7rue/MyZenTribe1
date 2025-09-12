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
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadFriends();
  }, []);

  async function loadFriends() {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log("No user found");
        setLoading(false);
        return;
      }

      console.log("Loading friends for user:", user.id);

      // Get friendships where user is the requester
      const { data: friendships1, error: error1 } = await supabase
        .from("friendships")
        .select("friend_id")
        .eq("user_id", user.id)
        .eq("status", "accepted");

      if (error1) {
        console.error("Error loading friendships (as user):", error1);
      }

      // Get friendships where user is the friend
      const { data: friendships2, error: error2 } = await supabase
        .from("friendships")
        .select("user_id")
        .eq("friend_id", user.id)
        .eq("status", "accepted");

      if (error2) {
        console.error("Error loading friendships (as friend):", error2);
      }

      // Combine friend IDs from both directions
      const friendIds = [
        ...(friendships1 || []).map(f => f.friend_id),
        ...(friendships2 || []).map(f => f.user_id)
      ];

      console.log("Found friend IDs:", friendIds);

      if (friendIds.length === 0) {
        console.log("No friends found");
        setFriends([]);
        setLoading(false);
        return;
      }

      // Get friend profiles
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", friendIds);

      if (profileError) {
        console.error("Error loading friend profiles:", profileError);
        setFriends([]);
      } else {
        console.log("Loaded friend profiles:", profiles);
        // Sort friends alphabetically by name for easier finding
        const sortedFriends = (profiles || []).sort((a, b) => {
          const nameA = (a.full_name || "").toLowerCase();
          const nameB = (b.full_name || "").toLowerCase();
          return nameA.localeCompare(nameB);
        });
        setFriends(sortedFriends);
      }
    } catch (error) {
      console.error("Error in loadFriends:", error);
      setFriends([]);
    } finally {
      setLoading(false);
    }
  }

  // Filter friends based on search query
  const filteredFriends = friends.filter(friend => {
    const name = (friend.full_name || "Friend").toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  // Get names of selected friends
  const selectedNames = friends
    .filter(f => value.includes(f.id))
    .map(f => f.full_name || "Friend")
    .join(", ");

  // Handle select all visible
  const selectAllVisible = () => {
    const visibleIds = filteredFriends.map(f => f.id);
    const newSelection = Array.from(new Set([...value, ...visibleIds]));
    onChange(newSelection);
  };

  // Handle clear all
  const clearAll = () => {
    onChange([]);
    setSearchQuery("");
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Add co-creators to this post
      </label>
      
      {/* Display selected friends */}
      {selectedNames && (
        <div className="mb-2 p-2 bg-purple-50 rounded text-sm text-purple-700">
          <div className="font-medium mb-1">Selected: {selectedNames}</div>
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-purple-600 hover:text-purple-800 underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Simple dropdown button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-left border border-gray-300 rounded-lg hover:border-purple-400 focus:outline-none focus:border-purple-500 bg-white"
        disabled={loading}
      >
        {loading ? (
          "Loading friends..."
        ) : friends.length === 0 ? (
          "No friends added yet"
        ) : value.length > 0 ? (
          `${value.length} friend(s) selected - Click to add more`
        ) : (
          "Click to select friends"
        )}
      </button>

      {/* Friend list dropdown with search - Mobile & Desktop optimized */}
      {isOpen && !loading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-w-full sm:max-w-sm">
          {friends.length === 0 ? (
            <div className="p-4 text-gray-500 text-center">
              <p className="mb-2 text-base">No friends yet!</p>
              <p className="text-sm">Add friends to collaborate on posts together.</p>
            </div>
          ) : (
            <>
              {/* Search bar - Mobile optimized with larger touch target */}
              <div className="p-3 border-b border-gray-200 sticky top-0 bg-white rounded-t-lg">
                <input
                  type="text"
                  placeholder="🔍 Type friend's name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 min-h-[44px] border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 text-base"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
                {filteredFriends.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={selectAllVisible}
                      className="text-xs text-purple-600 hover:text-purple-800 underline"
                    >
                      Select all {filteredFriends.length === friends.length ? '' : `${filteredFriends.length} visible`}
                    </button>
                    {value.length > 0 && (
                      <button
                        type="button"
                        onClick={clearAll}
                        className="text-xs text-red-600 hover:text-red-800 underline ml-auto"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Friend list */}
              <div className="max-h-60 sm:max-h-72 overflow-y-auto">
                {filteredFriends.length === 0 ? (
                  <div className="p-4 text-gray-500 text-center">
                    <p className="text-sm">No friends found matching "{searchQuery}"</p>
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="mt-2 text-xs text-purple-600 hover:text-purple-800 underline"
                    >
                      Clear search
                    </button>
                  </div>
                ) : (
                  filteredFriends.map(friend => (
                    <label
                      key={friend.id}
                      className="flex items-center px-4 py-3 min-h-[48px] hover:bg-purple-50 cursor-pointer transition-colors active:bg-purple-100"
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
                        className="mr-3 w-5 h-5 sm:w-4 sm:h-4 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <div className="flex-1">
                        <span className="text-gray-800 text-base select-none">
                          {friend.full_name || "Friend"}
                        </span>
                        {value.includes(friend.id) && (
                          <span className="ml-2 text-xs text-purple-600">✓ Selected</span>
                        )}
                      </div>
                    </label>
                  ))
                )}
              </div>

              {/* Results count */}
              {searchQuery && filteredFriends.length > 0 && (
                <div className="px-4 py-2 text-xs text-gray-500 border-t">
                  Showing {filteredFriends.length} of {friends.length} friends
                </div>
              )}
            </>
          )}
          
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setSearchQuery(""); // Clear search when closing
            }}
            className="w-full p-3 min-h-[44px] text-sm font-medium text-gray-600 hover:bg-gray-50 active:bg-gray-100 border-t transition-colors"
          >
            Done {value.length > 0 && `(${value.length} selected)`}
          </button>
        </div>
      )}
    </div>
  );
}
