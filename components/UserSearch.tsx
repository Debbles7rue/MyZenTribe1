// components/UserSearch.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

type User = {
  id: string;
  full_name: string | null;
  username: string | null;  // Unique handle like @sara-smith-10
  avatar_url: string | null;
  email: string | null;
  bio?: string | null;
};

type UserSearchProps = {
  onUserSelect: (user: User) => void;
  placeholder?: string;
  excludeIds?: string[];  // Don't show these users (e.g., existing friends)
  actionLabel?: string;   // Label for the action button
  showFriendStatus?: boolean;
  className?: string;
};

export default function UserSearch({
  onUserSelect,
  placeholder = "Search by name or @username...",
  excludeIds = [],
  actionLabel = "Select",
  showFriendStatus = false,
  className = ""
}: UserSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const searchTimeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (showFriendStatus) {
      loadFriendStatuses();
    }
  }, [showFriendStatus]);

  async function loadFriendStatuses() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get existing friendships
    const { data: friendships } = await supabase
      .from("friendships")
      .select("user_id, friend_id, status")
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    const friends = new Set<string>();
    const pending = new Set<string>();

    friendships?.forEach(f => {
      const friendId = f.user_id === user.id ? f.friend_id : f.user_id;
      if (f.status === "accepted") {
        friends.add(friendId);
      } else if (f.status === "pending") {
        pending.add(friendId);
      }
    });

    setFriendIds(friends);
    setPendingIds(pending);
  }

  async function searchUsers(query: string) {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    
    try {
      // Search by username (if starts with @) or by name
      let searchQuery = supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, email, bio");

      if (query.startsWith("@")) {
        // Exact username search
        const username = query.substring(1).toLowerCase();
        searchQuery = searchQuery.ilike("username", `${username}%`);
      } else {
        // Search by name or username
        searchQuery = searchQuery.or(
          `full_name.ilike.%${query}%,username.ilike.%${query}%`
        );
      }

      // Exclude specified IDs
      if (excludeIds.length > 0) {
        searchQuery = searchQuery.not("id", "in", `(${excludeIds.join(",")})`);
      }

      const { data, error } = await searchQuery.limit(10);

      if (error) {
        console.error("Search error:", error);
        setSearchResults([]);
      } else {
        setSearchResults(data || []);
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSearchChange(value: string) {
    setSearchTerm(value);
    setShowResults(true);

    // Debounce search
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(() => {
      searchUsers(value);
    }, 300);
  }

  function getFriendStatus(userId: string) {
    if (friendIds.has(userId)) return "friends";
    if (pendingIds.has(userId)) return "pending";
    return "none";
  }

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={() => setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          placeholder={placeholder}
          className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
      </div>

      {/* Helper Text */}
      <p className="mt-1 text-xs text-gray-500">
        Search by name or @username (e.g., @sara-smith-10)
      </p>

      {/* Search Results Dropdown */}
      {showResults && (searchTerm.length >= 2) && (
        <div className="absolute z-30 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-pulse">Searching...</div>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {searchTerm.length < 2 
                ? "Type at least 2 characters to search"
                : "No users found"}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {searchResults.map(user => {
                const status = showFriendStatus ? getFriendStatus(user.id) : "none";
                
                return (
                  <div
                    key={user.id}
                    className="p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt=""
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-lg">
                          {(user.full_name || user.username || "?")[0].toUpperCase()}
                        </div>
                      )}

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 truncate">
                            {user.full_name || "Anonymous"}
                          </p>
                          {status === "friends" && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                              Friend
                            </span>
                          )}
                          {status === "pending" && (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                              Pending
                            </span>
                          )}
                        </div>
                        {user.username && (
                          <p className="text-sm text-purple-600 font-medium">
                            @{user.username}
                          </p>
                        )}
                        {user.bio && (
                          <p className="text-xs text-gray-500 truncate mt-1">
                            {user.bio}
                          </p>
                        )}
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={() => onUserSelect(user)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                        disabled={status === "friends" || status === "pending"}
                      >
                        {status === "friends" ? "Friends" : 
                         status === "pending" ? "Pending" : 
                         actionLabel}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Info about usernames */}
          {searchResults.length > 0 && (
            <div className="p-3 bg-gray-50 border-t text-xs text-gray-600">
              💡 Tip: Users without @usernames can set one in their profile settings
            </div>
          )}
        </div>
      )}
    </div>
  );
}
