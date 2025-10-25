// app/(protected)/find-friends/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { createNotification } from "@/lib/notifications";
import FriendQuestionnaire from "@/components/FriendQuestionnaire";

interface User {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  location_text: string | null;
  bio: string | null;
  email: string | null;
  type: 'user';
}

interface Business {
  id: string;
  display_name: string | null;
  logo_url: string | null;
  tagline: string | null;
  bio: string | null;
  handle: string | null;
  user_id: string;
  type: 'business';
  categories?: string[] | null;
}

type SearchResult = User | Business;

interface FriendStatus {
  [userId: string]: 'none' | 'pending' | 'friend' | 'sent';
}

interface FollowStatus {
  [businessId: string]: boolean;
}

export default function FindFriendsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [friendStatuses, setFriendStatuses] = useState<FriendStatus>({});
  const [followStatuses, setFollowStatuses] = useState<FollowStatus>({});
  const [hasSearched, setHasSearched] = useState(false);
  const [searchFilter, setSearchFilter] = useState<'all' | 'people' | 'businesses'>('all');
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [questionnaireData, setQuestionnaireData] = useState<{
    friendId: string;
    friendName: string;
    friendshipId?: string;
  } | null>(null);

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
      const results: SearchResult[] = [];

      // Search for users (if not filtering to businesses only)
      if (searchFilter === 'all' || searchFilter === 'people') {
        const { data: users, error: usersError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, location_text, bio, email')
          .neq('id', currentUserId)
          .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
          .limit(10);

        if (usersError) {
          console.error('Users search error:', usersError);
        } else if (users) {
          results.push(...users.map(user => ({ ...user, type: 'user' as const })));
        }
      }

      // Search for businesses (if not filtering to people only)
      if (searchFilter === 'all' || searchFilter === 'businesses') {
        const { data: businesses, error: businessError } = await supabase
          .from('business_profiles')
          .select('id, display_name, logo_url, tagline, bio, handle, user_id, categories')
          .neq('user_id', currentUserId)
          .eq('visibility', 'public')
          .or(`display_name.ilike.%${searchQuery}%,handle.ilike.%${searchQuery}%,tagline.ilike.%${searchQuery}%`)
          .limit(10);

        if (businessError) {
          console.error('Business search error:', businessError);
        } else if (businesses) {
          results.push(...businesses.map(business => ({ ...business, type: 'business' as const })));
        }
      }

      console.log('Combined search results:', results);
      setSearchResults(results);

      if (results.length > 0) {
        // Check friendship status for users
        const userResults = results.filter(r => r.type === 'user') as User[];
        if (userResults.length > 0) {
          await checkFriendshipStatuses(userResults);
        }

        // Check follow status for businesses
        const businessResults = results.filter(r => r.type === 'business') as Business[];
        if (businessResults.length > 0) {
          await checkFollowStatuses(businessResults);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function checkFriendshipStatuses(users: User[]) {
    if (!currentUserId) return;

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

    setFriendStatuses(prev => ({ ...prev, ...statuses }));
  }

  async function checkFollowStatuses(businesses: Business[]) {
    if (!currentUserId) return;

    const businessIds = businesses.map(b => b.id);
    
    // FIXED: Also filter by following_type to only get business follows
    const { data: follows } = await supabase
      .from('followers')
      .select('following_id')
      .eq('follower_id', currentUserId)
      .eq('following_type', 'business')
      .in('following_id', businessIds);

    const statuses: FollowStatus = {};
    businesses.forEach(business => {
      statuses[business.id] = follows?.some(f => f.following_id === business.id) || false;
    });

    setFollowStatuses(prev => ({ ...prev, ...statuses }));
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
        // Get sender's profile for notification
        const { data: senderProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', currentUserId)
          .single();

        const senderName = senderProfile?.full_name || 'Someone';

        // Create notification for recipient
        await createNotification({
          recipient_id: userId,
          type: 'friend.request',
          title: 'New Friend Request',
          body: `${senderName} sent you a friend request`,
          target_url: '/friend-requests',
          entity_table: 'friend_requests',
          actor_id: currentUserId,
        });

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

      // Create friendship and get the ID back
      const { data: newFriendship, error: friendshipError } = await supabase
        .from('friendships')
        .insert({
          user_id: currentUserId,
          friend_id: userId
        })
        .select()
        .single();

      if (!friendshipError || friendshipError.code === '23505') {
        // Get friend's name from search results
        const friendResult = searchResults.find(r => r.type === 'user' && r.id === userId) as User | undefined;
        const friendName = friendResult?.full_name || 'your new friend';

        // Get accepter's profile for notification
        const { data: accepterProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', currentUserId)
          .single();

        const accepterName = accepterProfile?.full_name || 'Someone';

        // Create notification for the person who sent the request
        await createNotification({
          recipient_id: userId,
          type: 'friend.accepted',
          title: 'Friend Request Accepted!',
          body: `${accepterName} accepted your friend request`,
          target_url: `/profile/${currentUserId}`,
          entity_table: 'friendships',
          actor_id: currentUserId,
        });

        setFriendStatuses(prev => ({
          ...prev,
          [userId]: 'friend'
        }));

        // Show the questionnaire modal
        setQuestionnaireData({
          friendId: userId,
          friendName: friendName,
          friendshipId: newFriendship?.id
        });
        setShowQuestionnaire(true);
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
      alert('Failed to accept friend request. Please try again.');
    }
  }

  async function toggleFollowBusiness(businessId: string) {
    if (!currentUserId) return;

    const isCurrentlyFollowing = followStatuses[businessId];
    console.log('🔘 Toggle follow business:', businessId, 'Currently following:', isCurrentlyFollowing);

    try {
      if (isCurrentlyFollowing) {
        // Unfollow
        console.log('👎 Unfollowing business...');
        const { error } = await supabase
          .from('followers')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', businessId)
          .eq('following_type', 'business');

        if (!error) {
          console.log('✅ Successfully unfollowed');
          setFollowStatuses(prev => ({
            ...prev,
            [businessId]: false
          }));
        } else {
          console.error('❌ Unfollow error:', error);
          throw error;
        }
      } else {
        // Follow - FIXED: Added following_type!
        console.log('👍 Following business...');
        const { error } = await supabase
          .from('followers')
          .insert({
            follower_id: currentUserId,
            following_id: businessId,
            following_type: 'business'  // FIXED: This was missing!
          });

        if (!error) {
          console.log('✅ Successfully followed');
          setFollowStatuses(prev => ({
            ...prev,
            [businessId]: true
          }));
        } else {
          console.error('❌ Follow error:', error);
          throw error;
        }
      }
    } catch (error) {
      console.error('Error toggling follow status:', error);
      alert('Failed to update follow status. Please try again.');
    }
  }

  function renderUserResult(user: User) {
    const displayName = user.full_name || user.email?.split('@')[0] || 'Anonymous User';
    const status = friendStatuses[user.id] || 'none';

    return (
      <div
        key={user.id}
        className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow border-l-4 border-blue-500"
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
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900">{displayName}</h3>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Person</span>
            </div>
            
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
  }

  function renderBusinessResult(business: Business) {
    const displayName = business.display_name || 'Business';
    const isFollowing = followStatuses[business.id] || false;

    return (
      <div
        key={business.id}
        className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow border-l-4 border-green-500"
      >
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {/* Logo */}
          <div className="flex items-center sm:block">
            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold text-xl overflow-hidden flex-shrink-0">
              {business.logo_url ? (
                <img
                  src={business.logo_url}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{displayName.charAt(0).toUpperCase()}</span>
              )}
            </div>
          </div>

          {/* Business Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900">{displayName}</h3>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Business</span>
            </div>
            
            {business.handle && (
              <div className="text-sm text-gray-600 mt-0.5">
                @{business.handle}
              </div>
            )}

            {business.tagline && (
              <p className="text-sm text-gray-600 mt-1 font-medium">
                {business.tagline}
              </p>
            )}

            {business.bio && (
              <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                {business.bio}
              </p>
            )}

            {business.categories && business.categories.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {business.categories.slice(0, 3).map((category, index) => (
                  <span key={index} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    {category}
                  </span>
                ))}
                {business.categories.length > 3 && (
                  <span className="text-xs text-gray-500">+{business.categories.length - 3} more</span>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="w-full sm:w-auto flex flex-col gap-2">
            <button
              onClick={() => router.push(`/business/${business.handle}`)}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              View Business
            </button>
            <button
              onClick={() => toggleFollowBusiness(business.id)}
              className={`w-full px-4 py-2 rounded-lg transition-colors ${
                isFollowing
                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          </div>
        </div>
      </div>
    );
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
            Find Friends & Businesses
          </h1>
          <p className="text-gray-600">
            Search for people or businesses to connect with
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="bg-white rounded-xl shadow-sm p-4 mb-6">
          {/* Search Filters */}
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setSearchFilter('all')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                searchFilter === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setSearchFilter('people')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                searchFilter === 'people'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              People
            </button>
            <button
              type="button"
              onClick={() => setSearchFilter('businesses')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                searchFilter === 'businesses'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Businesses
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder={
                searchFilter === 'people' ? "Search for friends by name or email..." :
                searchFilter === 'businesses' ? "Search for businesses by name or handle..." :
                "Search for friends or businesses..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
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
              No {searchFilter === 'all' ? 'people or businesses' : searchFilter} found matching "{searchQuery}"
            </p>
            <p className="text-gray-400 text-sm">
              Try different keywords or check your spelling
            </p>
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="space-y-4">
            <div className="text-sm text-gray-600 mb-2">
              Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
              {searchFilter !== 'all' && ` in ${searchFilter}`}
            </div>
            {searchResults.map(result => 
              result.type === 'user' 
                ? renderUserResult(result as User)
                : renderBusinessResult(result as Business)
            )}
          </div>
        )}

        {/* Initial State */}
        {!hasSearched && !loading && (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Find People & Businesses
            </h3>
           <p className="text-gray-500">
              Use the search above to find friends or businesses to connect with
            </p>
          </div>
        )}
      </div>
    </div>

    {/* Friend Questionnaire Modal */}
    {showQuestionnaire && questionnaireData && (
      <FriendQuestionnaire
        isOpen={showQuestionnaire}
        onClose={() => {
          setShowQuestionnaire(false);
          setQuestionnaireData(null);
        }}
        friendshipId={questionnaireData.friendshipId}
        friendId={questionnaireData.friendId}
        friendName={questionnaireData.friendName}
        isNewFriend={true}
      />
    )}
  </div>
);
}
