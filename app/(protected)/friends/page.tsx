// app/(protected)/friends/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

interface Friend {
  friend_id: string;
  friend_name: string | null;
  friend_avatar: string | null;
  friend_location: string | null;
  relationship_type?: string;
  is_online?: boolean;
}

export default function FriendsPage() {
  const router = useRouter();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFriends();
  }, []);

  async function loadFriends() {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Get friends from the simple friends_view
      const { data: friendsData, error: friendsError } = await supabase
        .from('friends_view')
        .select('friend_id, status, created_at');

      if (friendsError) {
        throw friendsError;
      }

      // Get friend IDs from the view
      const friendIds = (friendsData || []).map(f => f.friend_id).filter(Boolean);

      if (friendIds.length > 0) {
        // Get profiles for all friends
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, location_text')
          .in('id', friendIds);

        // Combine the data
        const friendsList = friendIds.map(friendId => {
          const profile = (profiles || []).find(p => p.id === friendId);
          return {
            friend_id: friendId,
            friend_name: profile?.full_name || null,
            friend_avatar: profile?.avatar_url || null,
            friend_location: profile?.location_text || null,
            relationship_type: 'friend'
          };
        });

        setFriends(friendsList);
      } else {
        setFriends([]);
      }
    } catch (err) {
      console.error('Error loading friends:', err);
      setError('Failed to load friends. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Filter friends based on search
  const filteredFriends = friends.filter(friend => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      friend.friend_name?.toLowerCase().includes(searchLower) ||
      friend.friend_location?.toLowerCase().includes(searchLower)
    );
  });

  async function handleMessage(friendId: string) {
    router.push(`/messages?to=${friendId}`);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-32 mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-xl p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-48"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              My Friends
              <span className="ml-3 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                {filteredFriends.length}
              </span>
            </h1>
            
            <Link
              href="/find-friends"
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <span className="hidden sm:inline">Find Friends</span>
            </Link>
          </div>

          {/* Search Bar */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search friends by name or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 mb-6">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <button 
                onClick={loadFriends}
                className="text-red-700 underline hover:no-underline"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Friends List */}
        {!error && (
          <>
            {filteredFriends.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  {searchQuery ? 'No friends found' : 'No friends yet'}
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchQuery 
                    ? 'Try adjusting your search'
                    : 'Start connecting with people to build your friend list'}
                </p>
                {!searchQuery && (
                  <Link
                    href="/find-friends"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    Find Friends
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredFriends.map((friend, index) => (
                  <div
                    key={friend.friend_id || index}
                    className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all p-4"
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <Link href={`/profile/${friend.friend_id}`} className="relative">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-xl overflow-hidden">
                          {friend.friend_avatar ? (
                            <img
                              src={friend.friend_avatar}
                              alt={friend.friend_name || 'Friend'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{friend.friend_name?.charAt(0) || '?'}</span>
                          )}
                        </div>
                      </Link>

                      {/* Friend Info */}
                      <div className="flex-1 min-w-0">
                        <Link 
                          href={`/profile/${friend.friend_id}`}
                          className="font-semibold text-gray-900 hover:text-purple-600 transition-colors block truncate"
                        >
                          {friend.friend_name || 'Member'}
                        </Link>

                        {/* Location */}
                        {friend.friend_location && (
                          <div className="flex items-center gap-1 mt-2 text-sm text-gray-500">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="truncate">{friend.friend_location}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                      <Link
                        href={`/profile/${friend.friend_id}`}
                        className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-center text-sm font-medium"
                      >
                        View Profile
                      </Link>
                      <button
                        onClick={() => handleMessage(friend.friend_id)}
                        className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                      >
                        Message
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
