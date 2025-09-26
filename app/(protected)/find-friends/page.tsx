// app/(protected)/find-friends/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

interface User {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  location_text: string | null;
  bio: string | null;
  email: string | null;
}

interface FriendStatus {
  [userId: string]: 'none' | 'pending' | 'friend' | 'sent';
}

export default function FindFriendsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [friendStatuses, setFriendStatuses] = useState<FriendStatus>({});
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setCurrentUserId(user.id);
  }

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    
    if (!searchQuery.trim() || !currentUserId) {
      console.log('No search query or user not logged in');
      return;
    }

    console.log('Searching for:', searchQuery);
    setLoading(true);
    setHasSearched(true);
    setSearchResults([]);

    try {
      // Search for users
      const { data: users, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, location_text, bio, email')
        .neq('id', currentUserId)
        .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .limit(20);

      console.log('Search results:', users);
      console.log('Search error:', error);

      if (error) {
        console.error('Search error:', error);
        alert('Search failed. Please try again.');
        setSearchResults([]);
        return;
      }

      setSearchResults(users || []);

      // Check friendship status for each result
      if (users && users.length > 0) {
        const userIds = users.map(u => u.id);
        
        // Check existing friendships
        const { data: friendships } = await supabase
          .from('friendships')
          .select('user_id, friend_id')
          .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`);

        // Check pending friend requests
        const { data: pendingRequests } = await supabase
          .from('friend_requests')
          .select('from_user, to_user, status')
          .eq('status', 'pending');

        const statuses: FriendStatus = {};
        
        users.forEach(user => {
          // Check if already friends
          const isFriend = friendships?.some(f => 
            (f.user_id === currentUserId && f.friend_id === user.id) ||
            (f.friend_id === currentUserId && f.user_id === user.id)
          );

          if (isFriend) {
            statuses[user.id] = 'friend';
          } else {
            // Check for pending requests
            const sentRequest = pendingRequests?.find(r => 
              r.from_user === currentUserId && r.to_user === user.id
            );
            const receivedRequest = pendingRequests?.find(r => 
              r.to_user === currentUserId && r.from_user === user.id
            );

            if (sentRequest) {
              statuses[user.id] = 'sent';
            } else if (receivedRequest) {
              statuses[user.id] = 'pending';
            } else {
              statuses[user.id] = 'none';
            }
          }
        });

        setFriendStatuses(statuses);
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function sendFriendRequest(userId: string) {
    if (!currentUserId) return;

    console.log('Sending friend request to:', userId);

    try {
      const { error } = await supabase
        .from('friend_requests')
        .insert({
          from_user: currentUserId,
          to_user: userId,
          status: 'pending'
        });

      if (!error) {
        setFriendStatuses(prev => ({
          ...prev,
          [userId]: 'sent'
        }));
        alert('Friend request sent!');
      } else if (error.code === '23505') {
        alert('Friend request already sent!');
      } else {
        throw error;
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      alert('Failed to send friend request. Please try again.');
    }
  }

  async function acceptFriendRequest(userId: string) {
    if (!currentUserId) return;

    console.log('Accepting friend request from:', userId);

    try {
      // Update friend request status
      const { error: updateError } = await supabase
        .from('friend_requests')
        .update({ status: 'accepted' })
        .eq('from_user', userId)
        .eq('to_user', currentUserId);

      if (updateError) throw updateError;

      // Create friendship
      const { error: friendshipError } = await supabase
        .from('friendships')
        .insert({
          user_id: currentUserId,
          friend_id: userId
        });

      if (!friendshipError || friendshipError.code === '23505') {
        setFriendStatuses(prev => ({
          ...prev,
          [userId]: 'friend'
        }));
        alert('Friend request accepted!');
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
      alert('Failed to accept friend request. Please try again.');
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Find Friends
          </h1>
          <p className="text-gray-600">
            Search for people by name or email address
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Enter name or email (e.g., Test, Donna, ndonna3)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              autoFocus
            />
            <button
              type="submit"
              disabled={!searchQuery.trim() || loading}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full sm:w-auto font-medium"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            Try searching for: "Test", "Donna", "Beautiful", or email addresses like "ndonna3"
          </div>
        </form>



        {/* Search Results */}
        {hasSearched && !loading && searchResults.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              No results found
            </h3>
            <p className="text-gray-500 mb-2">
              No users found matching "{searchQuery}"
            </p>
            <p className="text-gray-400 text-sm">
              Try searching for email addresses or partial names
            </p>
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="space-y-4">
            <div className="text-sm text-gray-600 mb-2">
              Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
            </div>
            {searchResults.map(user => {
              const displayName = user.full_name || user.email?.split('@')[0] || 'Anonymous User';
              const status = friendStatuses[user.id] || 'none';

              return (
                <div
                  key={user.id}
                  className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* Avatar */}
                    <div className="flex items-center sm:block">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-xl overflow-hidden flex-shrink-0">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={displayName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>{displayName.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">
                        {displayName}
                      </h3>
                      
                      <div className="text-sm text-gray-600 mt-0.5">
                        {user.email}
                      </div>
                      
                      {user.location_text && (
                        <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="truncate">{user.location_text}</span>
                        </div>
                      )}

                      {user.bio && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                          {user.bio}
                        </p>
                      )}


                    </div>

                    {/* Action Button */}
                    <div className="w-full sm:w-auto">
                      {status === 'friend' ? (
                        <button
                          onClick={() => router.push(`/profile/${user.id}`)}
                          className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          View Profile
                        </button>
                      ) : status === 'sent' ? (
                        <button
                          disabled
                          className="w-full px-4 py-2 bg-gray-100 text-gray-500 rounded-lg cursor-not-allowed"
                        >
                          Request Sent
                        </button>
                      ) : status === 'pending' ? (
                        <button
                          onClick={() => acceptFriendRequest(user.id)}
                          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Accept Request
                        </button>
                      ) : (
                        <button
                          onClick={() => sendFriendRequest(user.id)}
                          className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          Add Friend
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Initial State */}
        {!hasSearched && !loading && (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Find People
            </h3>
            <p className="text-gray-500">
              Enter a name or email above to search
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
