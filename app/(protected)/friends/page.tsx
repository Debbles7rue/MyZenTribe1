// app/(protected)/friends/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

interface Friend {
  id: string;
  friend_id: string;
  friend_name: string | null;
  friend_avatar: string | null;
  friend_location: string | null;
  friend_bio: string | null;
  relationship_type: 'friend' | 'acquaintance' | 'restricted';
  is_online: boolean;
  last_active: string | null;
  mutual_friends_count: number;
  created_at: string;
  notes?: string | null;
  how_we_met?: string | null;
}

type FilterType = 'all' | 'friend' | 'acquaintance' | 'restricted';
type SortType = 'name' | 'recent' | 'online';

export default function FriendsPage() {
  const router = useRouter();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('name');
  const [showFilters, setShowFilters] = useState(false);
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

      // Fetch friends from friends_view (already filtered to current user)
      const { data, error } = await supabase
        .from('friends_view')
        .select(`
          id,
          friend_id,
          relationship_type,
          notes,
          how_we_met,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch friend profiles
      const friendIds = data?.map(f => f.friend_id) || [];
      
      if (friendIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, location_text, bio, show_online_status, last_active_at')
          .in('id', friendIds);

        if (profileError) throw profileError;

        // Combine friend data with profiles
        const friendsWithProfiles = data?.map(friend => {
          const profile = profiles?.find(p => p.id === friend.friend_id);
          const now = new Date();
          const lastActive = profile?.last_active_at ? new Date(profile.last_active_at) : null;
          const isOnline = profile?.show_online_status && lastActive 
            ? (now.getTime() - lastActive.getTime()) < 5 * 60 * 1000 // Active in last 5 minutes
            : false;

          return {
            ...friend,
            friend_name: profile?.full_name || 'Member',
            friend_avatar: profile?.avatar_url,
            friend_location: profile?.location_text,
            friend_bio: profile?.bio,
            is_online: isOnline,
            last_active: profile?.last_active_at,
            mutual_friends_count: 0 // You can implement mutual friends count later
          };
        }) || [];

        setFriends(friendsWithProfiles);
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

  // Filter and sort friends
  const filteredAndSortedFriends = useMemo(() => {
    let filtered = friends;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(friend =>
        friend.friend_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        friend.friend_location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        friend.notes?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply relationship type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(friend => friend.relationship_type === filterType);
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.friend_name || '').localeCompare(b.friend_name || '');
        case 'recent':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'online':
          if (a.is_online === b.is_online) {
            return (a.friend_name || '').localeCompare(b.friend_name || '');
          }
          return a.is_online ? -1 : 1;
        default:
          return 0;
      }
    });

    return sorted;
  }, [friends, searchQuery, filterType, sortBy]);

  async function handleMessage(friendId: string) {
    router.push(`/messages?to=${friendId}`);
  }

  async function removeFriend(friendId: string, friendName: string) {
    if (!confirm(`Remove ${friendName} from friends?`)) return;
    
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .or(`and(user_id.eq.${friendId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${friendId})`);
      
      if (!error) {
        setFriends(friends.filter(f => f.friend_id !== friendId));
      }
    } catch (err) {
      console.error('Error removing friend:', err);
      alert('Failed to remove friend');
    }
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
                {filteredAndSortedFriends.length}
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

          {/* Search and Filters */}
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search friends by name, location, or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span>Filters</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortType)}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="name">Name</option>
                  <option value="recent">Recently Added</option>
                  <option value="online">Online First</option>
                </select>
              </div>
            </div>

            {/* Filter Pills */}
            {showFilters && (
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {(['all', 'friend', 'acquaintance', 'restricted'] as FilterType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      filterType === type
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Friends List */}
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
            {error}
          </div>
        ) : filteredAndSortedFriends.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              {searchQuery || filterType !== 'all' ? 'No friends found' : 'No friends yet'}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || filterType !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Start connecting with people to build your friend list'}
            </p>
            {!searchQuery && filterType === 'all' && (
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
            {filteredAndSortedFriends.map(friend => (
              <div
                key={friend.id}
                className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all p-4"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar with Online Status */}
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
                    {friend.is_online && (
                      <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </Link>

                  {/* Friend Info */}
                  <div className="flex-1 min-w-0">
                    <Link 
                      href={`/profile/${friend.friend_id}`}
                      className="font-semibold text-gray-900 hover:text-purple-600 transition-colors block truncate"
                    >
                      {friend.friend_name || 'Member'}
                    </Link>
                    
                    {/* Relationship Badge */}
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        friend.relationship_type === 'friend' 
                          ? 'bg-green-100 text-green-800' 
                          : friend.relationship_type === 'acquaintance'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {friend.relationship_type === 'friend' && '👥'}
                        {friend.relationship_type === 'acquaintance' && '🤝'}
                        {friend.relationship_type === 'restricted' && '🔒'}
                        {friend.relationship_type}
                      </span>
                    </div>

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

                    {/* Notes (if any) */}
                    {friend.notes && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                        {friend.notes}
                      </p>
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
                    className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Message
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Mobile Quick Add Button */}
        <Link
          href="/find-friends"
          className="fixed bottom-6 right-6 w-14 h-14 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-colors flex items-center justify-center md:hidden"
          aria-label="Find friends"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
