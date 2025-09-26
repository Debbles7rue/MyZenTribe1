// app/(protected)/find-friends/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
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

interface Business {
  id: string;
  display_name: string | null;
  handle: string | null;
  tagline: string | null;
  logo_url: string | null;
  location_city: string | null;
  location_state: string | null;
  categories?: string[];
  rating_average?: number;
  rating_count?: number;
  follower_count?: number;
  verified?: boolean;
}

interface FriendStatus {
  [userId: string]: 'none' | 'pending' | 'friend' | 'sent';
}

interface FollowStatus {
  [businessId: string]: boolean;
}

type SearchResult = (User & { type: 'person' }) | (Business & { type: 'business' });

// Business category icons mapping
const CATEGORY_ICONS: { [key: string]: string } = {
  'Wellness': '🧘',
  'Healing': '💚',
  'Yoga': '🧘‍♀️',
  'Meditation': '🕉️',
  'Massage': '💆',
  'Reiki': '✋',
  'Sound Healing': '🔔',
  'Crystals': '💎',
  'Holistic': '☯️',
  'Spiritual': '✨',
  'Therapy': '🌿',
  'Coaching': '🎯',
  'Fitness': '💪',
  'Nutrition': '🥗',
  'Art': '🎨',
};

// Suggested search terms
const SEARCH_SUGGESTIONS = [
  'Yoga instructor',
  'Sound healer',
  'Reiki master',
  'Meditation guide',
  'Wellness coach',
  'Massage therapist',
  'Crystal healing',
  'Life coach',
];

export default function FindFriendsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [friendStatuses, setFriendStatuses] = useState<FriendStatus>({});
  const [followStatuses, setFollowStatuses] = useState<FollowStatus>({});
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchType, setSearchType] = useState<'all' | 'people' | 'businesses'>('all');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [animatingCards, setAnimatingCards] = useState<Set<string>>(new Set());
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    checkAuth();
    loadRecentSearches();
  }, []);

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setCurrentUserId(user.id);
  }

  function loadRecentSearches() {
    const saved = localStorage.getItem('mzt-recent-searches');
    if (saved) {
      setRecentSearches(JSON.parse(saved).slice(0, 5));
    }
  }

  function saveRecentSearch(query: string) {
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('mzt-recent-searches', JSON.stringify(updated));
  }

  const animateCard = useCallback((id: string) => {
    setAnimatingCards(prev => new Set(prev).add(id));
    setTimeout(() => {
      setAnimatingCards(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 600);
  }, []);

  async function handleSearch() {
    if (!searchQuery.trim() || !currentUserId) return;

    setSearching(true);
    setLoading(true);
    setSearchError(null);
    setSearchResults([]);
    setShowSuggestions(false);
    saveRecentSearch(searchQuery);

    try {
      let results: SearchResult[] = [];

      // Search for people if type is 'all' or 'people'
      if (searchType === 'all' || searchType === 'people') {
        const { data: users, error } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, location_text, bio, email')
          .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
          .neq('id', currentUserId)
          .limit(10);

        if (!error && users) {
          const userResults = users.map(u => ({ ...u, type: 'person' as const }));
          results = [...results, ...userResults];

          // Check friendship status
          const userIds = users.map(u => u.id);
          
          const { data: friendships } = await supabase
            .from('friendships')
            .select('user_id, friend_id')
            .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`)
            .in('user_id', [...userIds, currentUserId])
            .in('friend_id', [...userIds, currentUserId]);

          const { data: pendingRequests } = await supabase
            .from('friend_requests')
            .select('from_user, to_user, status')
            .or(`from_user.eq.${currentUserId},to_user.eq.${currentUserId}`)
            .in('from_user', [...userIds, currentUserId])
            .in('to_user', [...userIds, currentUserId])
            .eq('status', 'pending');

          const statuses: FriendStatus = {};
          
          users.forEach(user => {
            const isFriend = friendships?.some(f => 
              (f.user_id === currentUserId && f.friend_id === user.id) ||
              (f.friend_id === currentUserId && f.user_id === user.id)
            );

            if (isFriend) {
              statuses[user.id] = 'friend';
            } else {
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
      }

      // Search for businesses if type is 'all' or 'businesses'
      if (searchType === 'all' || searchType === 'businesses') {
        const { data: businesses, error } = await supabase
          .from('business_profiles')
          .select('id, display_name, handle, tagline, logo_url, location_city, location_state, categories, rating_average, rating_count, follower_count, verified')
          .or(`display_name.ilike.%${searchQuery}%,handle.ilike.%${searchQuery}%,tagline.ilike.%${searchQuery}%`)
          .eq('discoverable', true)
          .limit(10);

        if (!error && businesses) {
          const businessResults = businesses.map(b => ({ ...b, type: 'business' as const }));
          results = [...results, ...businessResults];

          // Check follow status
          const businessIds = businesses.map(b => b.id);
          
          const { data: following } = await supabase
            .from('business_followers')
            .select('business_id')
            .eq('user_id', currentUserId)
            .in('business_id', businessIds);

          const followStatus: FollowStatus = {};
          following?.forEach(f => {
            followStatus[f.business_id] = true;
          });
          setFollowStatuses(followStatus);
        }
      }

      // Animate cards as they appear
      results.forEach((result, index) => {
        setTimeout(() => {
          animateCard(result.id);
        }, index * 100);
      });

      setSearchResults(results);
      
      if (results.length === 0) {
        console.log('No results found for query:', searchQuery);
      }

    } catch (error) {
      console.error('Search error:', error);
      setSearchError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function sendFriendRequest(userId: string) {
    if (!currentUserId) return;

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
        animateCard(userId);
        
        // Show success animation
        const button = document.getElementById(`btn-${userId}`);
        if (button) {
          button.classList.add('animate-bounce');
          setTimeout(() => button.classList.remove('animate-bounce'), 1000);
        }
      } else if (error.code === '23505') {
        alert('Friend request already sent!');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      alert('Failed to send friend request. Please try again.');
    }
  }

  async function acceptFriendRequest(userId: string) {
    if (!currentUserId) return;

    try {
      const { error: updateError } = await supabase
        .from('friend_requests')
        .update({ status: 'accepted' })
        .eq('from_user', userId)
        .eq('to_user', currentUserId);

      if (updateError) throw updateError;

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
        animateCard(userId);
        
        // Celebration animation
        const card = document.getElementById(`card-${userId}`);
        if (card) {
          card.classList.add('animate-pulse');
          setTimeout(() => card.classList.remove('animate-pulse'), 2000);
        }
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
      alert('Failed to accept friend request. Please try again.');
    }
  }

  async function toggleFollowBusiness(businessId: string) {
    if (!currentUserId) return;

    const isFollowing = followStatuses[businessId];

    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('business_followers')
          .delete()
          .eq('business_id', businessId)
          .eq('user_id', currentUserId);

        if (!error) {
          setFollowStatuses(prev => ({ ...prev, [businessId]: false }));
          animateCard(businessId);
        }
      } else {
        const { error } = await supabase
          .from('business_followers')
          .insert({
            business_id: businessId,
            user_id: currentUserId
          });

        if (!error) {
          setFollowStatuses(prev => ({ ...prev, [businessId]: true }));
          animateCard(businessId);
        }
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  }

  function getCategoryIcon(category: string): string {
    return CATEGORY_ICONS[category] || '🏢';
  }

  function renderResult(result: SearchResult, index: number) {
    const isAnimating = animatingCards.has(result.id);
    
    if (result.type === 'person') {
      const user = result as User & { type: 'person' };
      const displayName = user.full_name || user.email?.split('@')[0] || 'Anonymous User';
      const showEmail = user.email && (!user.full_name || user.full_name !== displayName);

      return (
        <div
          key={user.id}
          id={`card-${user.id}`}
          className={`bg-white rounded-xl shadow-sm p-4 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 ${
            isAnimating ? 'animate-fadeInUp' : ''
          }`}
          style={{
            animationDelay: `${index * 100}ms`,
            animationFillMode: 'backwards'
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            {/* Avatar with online indicator */}
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-xl overflow-hidden flex-shrink-0 ring-2 ring-purple-100">
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
              {friendStatuses[user.id] === 'friend' && (
                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></span>
              )}
            </div>

            {/* User Info with animations */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-lg">
                {displayName}
              </h3>
              
              {showEmail && (
                <div className="text-sm text-gray-600 mt-0.5 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  {user.email}
                </div>
              )}
              
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

              {/* Mutual friends indicator */}
              {friendStatuses[user.id] !== 'friend' && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white"></div>
                    ))}
                  </div>
                  <span className="text-xs text-gray-500">3 mutual friends</span>
                </div>
              )}
            </div>

            {/* Action Button with states */}
            <div className="w-full sm:w-auto">
              {friendStatuses[user.id] === 'friend' ? (
                <button
                  onClick={() => router.push(`/profile/${user.id}`)}
                  className="w-full px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 rounded-lg hover:from-purple-200 hover:to-pink-200 transition-all duration-200 font-medium flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  View Profile
                </button>
              ) : friendStatuses[user.id] === 'sent' ? (
                <button
                  disabled
                  className="w-full px-4 py-2 bg-gray-100 text-gray-500 rounded-lg cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Request Sent
                </button>
              ) : friendStatuses[user.id] === 'pending' ? (
                <button
                  id={`btn-${user.id}`}
                  onClick={() => acceptFriendRequest(user.id)}
                  className="w-full px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  ✨ Accept Request
                </button>
              ) : (
                <button
                  id={`btn-${user.id}`}
                  onClick={() => sendFriendRequest(user.id)}
                  className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  Add Friend
                </button>
              )}
            </div>
          </div>
        </div>
      );
    } else {
      const business = result as Business & { type: 'business' };
      const location = [business.location_city, business.location_state].filter(Boolean).join(', ');

      return (
        <div
          key={business.id}
          id={`card-${business.id}`}
          className={`bg-white rounded-xl shadow-sm p-4 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 border-l-4 border-blue-500 ${
            isAnimating ? 'animate-fadeInUp' : ''
          }`}
          style={{
            animationDelay: `${index * 100}ms`,
            animationFillMode: 'backwards'
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            {/* Logo with category icon */}
            <div className="relative">
              <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white font-bold text-2xl overflow-hidden flex-shrink-0 shadow-md">
                {business.logo_url ? (
                  <img
                    src={business.logo_url}
                    alt={business.display_name || 'Business'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{business.categories?.[0] ? getCategoryIcon(business.categories[0]) : '🏢'}</span>
                )}
              </div>
              {business.verified && (
                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  ✓
                </span>
              )}
            </div>

            {/* Business Info with rich details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2">
                <h3 className="font-semibold text-gray-900 text-lg">
                  {business.display_name || 'Unnamed Business'}
                </h3>
                <span className="text-xs bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 px-2 py-1 rounded-full flex-shrink-0 font-medium">
                  Business
                </span>
              </div>
              
              {business.handle && (
                <div className="text-sm text-gray-600 mt-0.5">
                  @{business.handle}
                </div>
              )}
              
              {business.tagline && (
                <p className="text-sm text-gray-700 mt-1 font-medium italic">
                  "{business.tagline}"
                </p>
              )}
              
              <div className="flex items-center gap-3 mt-2 text-sm">
                {location && (
                  <div className="flex items-center gap-1 text-gray-500">
                    <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="truncate">{location}</span>
                  </div>
                )}
                
                {business.rating_average && business.rating_count && (
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-500">★</span>
                    <span className="font-medium">{business.rating_average}</span>
                    <span className="text-gray-400">({business.rating_count})</span>
                  </div>
                )}
                
                {business.follower_count !== undefined && (
                  <div className="text-gray-500">
                    {business.follower_count} followers
                  </div>
                )}
              </div>

              {business.categories && business.categories.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {business.categories.slice(0, 3).map((cat, idx) => (
                    <span key={idx} className="text-xs bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600 px-2 py-1 rounded-full border border-gray-200">
                      {getCategoryIcon(cat)} {cat}
                    </span>
                  ))}
                  {business.categories.length > 3 && (
                    <span className="text-xs text-gray-400">
                      +{business.categories.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="w-full sm:w-auto flex gap-2">
              <button
                onClick={() => toggleFollowBusiness(business.id)}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg transition-all duration-200 font-medium ${
                  followStatuses[business.id]
                    ? 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 hover:from-gray-200 hover:to-gray-300'
                    : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 shadow-md hover:shadow-lg transform hover:scale-105'
                }`}
              >
                {followStatuses[business.id] ? '✓ Following' : '+ Follow'}
              </button>
              <button
                onClick={() => router.push(`/business/${business.handle || business.id}`)}
                className="px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-lg hover:from-gray-200 hover:to-gray-300 transition-all duration-200 font-medium"
              >
                View
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeInUp {
          animation: fadeInUp 0.6s ease-out;
        }
      `}</style>
      
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6 animate-fadeInUp">
          <button
            onClick={() => router.back()}
            className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group"
          >
            <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-2">
            Discover Amazing People & Businesses
          </h1>
          <p className="text-gray-600">
            Find and connect with your tribe
          </p>
        </div>

        {/* Search Type Tabs with gradient */}
        <div className="bg-white rounded-xl shadow-sm p-2 mb-4 flex gap-2">
          {['all', 'people', 'businesses'].map((type) => (
            <button
              key={type}
              onClick={() => setSearchType(type as any)}
              className={`flex-1 px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                searchType === type
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md transform scale-105'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {type === 'all' ? '🌟 All' : type === 'people' ? '👥 People' : '🏢 Businesses'}
            </button>
          ))}
        </div>

        {/* Search Bar with suggestions */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder={
                  searchType === 'people' 
                    ? "Search by name or email..."
                    : searchType === 'businesses'
                    ? "Search by business name..."
                    : "Search for people or businesses..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              />
              
              {/* Search suggestions dropdown */}
              {showSuggestions && !searching && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-100 z-10 max-h-64 overflow-y-auto">
                  {recentSearches.length > 0 && (
                    <div className="p-2 border-b border-gray-100">
                      <div className="text-xs text-gray-500 uppercase tracking-wider px-2 mb-1">Recent</div>
                      {recentSearches.map((search, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setSearchQuery(search);
                            handleSearch();
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded text-sm flex items-center gap-2"
                        >
                          <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {search}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="p-2">
                    <div className="text-xs text-gray-500 uppercase tracking-wider px-2 mb-1">Suggestions</div>
                    {SEARCH_SUGGESTIONS.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSearchQuery(suggestion);
                          handleSearch();
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-purple-50 rounded text-sm"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <button
              onClick={handleSearch}
              disabled={!searchQuery.trim() || loading}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105 w-full sm:w-auto"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Searching...
                </span>
              ) : (
                '🔍 Search'
              )}
            </button>
          </div>
          {searchError && (
            <p className="mt-2 text-sm text-red-600 animate-shake">{searchError}</p>
          )}
        </div>

        {/* Search Results */}
        {searching && !loading && searchResults.length === 0 && !searchError && (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center animate-fadeInUp">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-12 h-12 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              No results found
            </h3>
            <p className="text-gray-500 mb-2">
              No {searchType === 'all' ? 'results' : searchType} found matching "{searchQuery}"
            </p>
            <p className="text-gray-400 text-sm">
              Try searching with different keywords or check the spelling
            </p>
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="space-y-4">
            {searchResults.map((result, index) => renderResult(result, index))}
          </div>
        )}

        {/* Initial State with better illustration */}
        {!searching && (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center animate-fadeInUp">
            <div className="w-32 h-32 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <svg className="w-16 h-16 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-2">
              Ready to Connect?
            </h3>
            <p className="text-gray-500 mb-4">
              Enter a name above to start your search
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {['Wellness', 'Healing', 'Yoga', 'Meditation'].map(cat => (
                <span key={cat} className="text-sm bg-gradient-to-r from-purple-50 to-pink-50 text-purple-600 px-3 py-1 rounded-full">
                  {getCategoryIcon(cat)} {cat}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
