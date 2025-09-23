// app/profile/[id]/page.tsx - PUBLIC PROFILE VIEW
"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import PostComposer from "@/components/PostComposer";
import PhotoMemories from "../../(protected)/calendar/components/PhotoMemories";

type PublicProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location_text: string | null;
  location_is_public: boolean | null;
  business_name: string | null;
  has_creator_profile: boolean;
  memories_visibility: 'public' | 'friends' | 'private' | null;
};

type RelationshipType = 'friend' | 'acquaintance' | 'restricted' | 'none';

type Memory = {
  id: string;
  user_id: string;
  date: string;
  photo_url: string;
  caption: string;
  event_title?: string;
  visibility: 'public' | 'friends' | 'private';
  created_at: string;
};

export default function PublicProfilePage() {
  const params = useParams();
  const profileId = params?.id as string;
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('none');
  const [friendStatus, setFriendStatus] = useState<"none" | "pending" | "friends">("none");
  const [friendsCount, setFriendsCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [showMemories, setShowMemories] = useState(false);
  const [todayMemories, setTodayMemories] = useState<Memory[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [memoriesLoading, setMemoriesLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Get current user
    supabase.auth.getUser().then(({ data }) => {
      const userId = data.user?.id ?? null;
      setCurrentUserId(userId);
      setIsOwnProfile(userId === profileId);
    });

    // Load profile
    async function loadProfile() {
      try {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', profileId)
          .single();

        if (error) throw error;
        setProfile(profileData);

        // Get friend counts
        const { count: friendCount } = await supabase
          .from('friendships')
          .select('*', { count: 'exact', head: true })
          .or(`user_id.eq.${profileId},friend_id.eq.${profileId}`)
          .eq('status', 'accepted');

        setFriendsCount(friendCount || 0);

        // Check relationship with current user
        if (currentUserId && currentUserId !== profileId) {
          const { data: friendship } = await supabase
            .from('friendships')
            .select('status')
            .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`)
            .or(`user_id.eq.${profileId},friend_id.eq.${profileId}`)
            .single();

          if (friendship) {
            setFriendStatus(friendship.status === 'accepted' ? 'friends' : 'pending');
            setRelationshipType(friendship.status === 'accepted' ? 'friend' : 'none');
          }
        }

      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [profileId, currentUserId]);

  // Load memories for today
  const loadTodayMemories = useCallback(async () => {
    if (!profileId || (!isOwnProfile && relationshipType === 'none' && profile?.memories_visibility !== 'public')) {
      return;
    }

    setMemoriesLoading(true);
    try {
      const today = new Date();
      const todayStr = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      let query = supabase
        .from('calendar_memories')
        .select('*')
        .eq('user_id', profileId)
        .like('date', `%${todayStr}`);

      // Apply visibility filters
      if (!isOwnProfile) {
        if (relationshipType === 'friend') {
          query = query.in('visibility', ['public', 'friends']);
        } else {
          query = query.eq('visibility', 'public');
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      setTodayMemories(data || []);
      if (data && data.length > 0) {
        setShowMemories(true);
      }
    } catch (error) {
      console.error('Error loading memories:', error);
    } finally {
      setMemoriesLoading(false);
    }
  }, [profileId, isOwnProfile, relationshipType, profile?.memories_visibility]);

  useEffect(() => {
    loadTodayMemories();
  }, [loadTodayMemories]);

  const sendFriendRequest = async () => {
    if (!currentUserId) {
      alert("Please sign in to send a friend request");
      return;
    }

    try {
      const { error } = await supabase
        .from('friendships')
        .insert({
          user_id: currentUserId,
          friend_id: profileId,
          status: 'pending'
        });

      if (error) throw error;
      setFriendStatus("pending");
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  const unfriend = async () => {
    if (!currentUserId || !confirm("Are you sure you want to unfriend this person?")) return;

    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`)
        .or(`user_id.eq.${profileId},friend_id.eq.${profileId}`);

      if (error) throw error;
      setFriendStatus("none");
      setRelationshipType('none');
    } catch (error) {
      console.error('Error unfriending:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center">
        <div className="text-purple-600">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Profile not found</h2>
          <Link href="/dashboard" className="text-purple-600 hover:underline">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* Mobile-optimized Header */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <Link href="/dashboard" className="flex items-center space-x-2 sm:space-x-3">
              <span className="text-xl sm:text-2xl">🏠</span>
              <span className="font-semibold text-gray-700 text-sm sm:text-base">
                {isMobile ? 'Back' : 'Back to Dashboard'}
              </span>
            </Link>
            
            {isOwnProfile && (
              <div className="flex items-center space-x-3 sm:space-x-4">
                <Link 
                  href="/settings" 
                  className="text-gray-600 hover:text-purple-600 transition-colors text-sm sm:text-base"
                >
                  Settings
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Header - Mobile Optimized */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
            {/* Avatar */}
            <div className="relative">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || 'Profile'}
                  className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-purple-200"
                />
              ) : (
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-3xl sm:text-4xl font-bold">
                  {profile.full_name?.charAt(0) || '?'}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                {profile.full_name || 'Anonymous User'}
              </h1>
              
              {profile.business_name && (
                <p className="text-gray-600 text-sm sm:text-base">
                  🏢 {profile.business_name}
                </p>
              )}
              
              {profile.bio && (
                <p className="mt-2 sm:mt-3 text-gray-600 max-w-2xl text-sm sm:text-base">
                  {profile.bio}
                </p>
              )}

              {profile.location_text && profile.location_is_public && (
                <p className="text-gray-500 mt-2 text-sm sm:text-base">
                  📍 {profile.location_text}
                </p>
              )}

              {/* Stats - Mobile Optimized */}
              <div className="mt-4 sm:mt-6 flex justify-center sm:justify-start gap-4 sm:gap-6">
                <div className="text-center">
                  <div className="font-bold text-lg sm:text-xl">{friendsCount}</div>
                  <div className="text-xs sm:text-sm text-gray-500">Friends</div>
                </div>
                {followersCount > 0 && (
                  <div className="text-center">
                    <div className="font-bold text-lg sm:text-xl">{followersCount}</div>
                    <div className="text-xs sm:text-sm text-gray-500">Followers</div>
                  </div>
                )}
              </div>

              {/* Action Buttons - Mobile Optimized */}
              <div className="mt-4 sm:mt-6 flex flex-wrap gap-2 sm:gap-3 justify-center sm:justify-start">
                {isOwnProfile ? (
                  <Link
                    href="/settings"
                    className="px-4 sm:px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm sm:text-base"
                  >
                    Edit Profile
                  </Link>
                ) : (
                  <>
                    {friendStatus === "none" && (
                      <button
                        onClick={sendFriendRequest}
                        className="px-4 sm:px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm sm:text-base"
                      >
                        Add Friend
                      </button>
                    )}
                    {friendStatus === "pending" && (
                      <button
                        disabled
                        className="px-4 sm:px-6 py-2 bg-gray-300 text-white rounded-lg cursor-not-allowed text-sm sm:text-base"
                      >
                        Request Sent
                      </button>
                    )}
                    {friendStatus === "friends" && (
                      <>
                        <button
                          className="px-4 sm:px-6 py-2 bg-green-600 text-white rounded-lg cursor-default text-sm sm:text-base"
                        >
                          ✓ Friends
                        </button>
                        <button
                          onClick={unfriend}
                          className="px-4 sm:px-6 py-2 bg-white text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm sm:text-base"
                        >
                          Unfriend
                        </button>
                      </>
                    )}
                    <Link
                      href={`/messages/${profileId}`}
                      className="px-4 sm:px-6 py-2 bg-white text-purple-600 border border-purple-600 rounded-lg hover:bg-purple-50 transition-colors text-sm sm:text-base"
                    >
                      Message
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Memories Banner - Mobile Optimized */}
      {showMemories && todayMemories.length > 0 && (
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-3 sm:p-4">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base sm:text-lg">🎉 Memories from Today!</h3>
                <p className="text-xs sm:text-sm opacity-90">
                  {todayMemories.length} {todayMemories.length === 1 ? 'memory' : 'memories'} from previous years
                </p>
              </div>
              <button
                onClick={() => setSelectedMemory(todayMemories[0])}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-colors text-sm"
              >
                View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs - Mobile Optimized with Horizontal Scroll */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-6 sm:space-x-8 overflow-x-auto">
            {['posts', 'photos', 'events', 'about'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-sm capitalize transition-colors whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'posts' && '📝'} 
                {tab === 'photos' && '📸'} 
                {tab === 'events' && '📅'} 
                {tab === 'about' && 'ℹ️'} 
                {!isMobile && ` ${tab}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content - Mobile Optimized */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'posts' && (
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Posts</h2>
            <PostComposer 
              mode="profile"
              userId={profileId}
              viewerUserId={currentUserId}
              showComposer={isOwnProfile}
            />
          </div>
        )}

        {activeTab === 'photos' && (
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Photos & Media</h2>
            <PostComposer 
              mode="profile"
              userId={profileId}
              viewerUserId={currentUserId}
              showComposer={isOwnProfile}
            />
          </div>
        )}

        {activeTab === 'events' && (
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Events</h2>
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <p className="text-gray-500 text-sm sm:text-base">
                {isOwnProfile ? 'Your events will appear here' : `${profile.full_name}'s events`}
              </p>
            </div>
          </div>
        )}

        {activeTab === 'about' && (
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">About</h2>
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <div className="space-y-4">
                {profile.bio && (
                  <div>
                    <h3 className="font-semibold text-gray-700 text-sm sm:text-base">Bio</h3>
                    <p className="text-gray-600 text-sm sm:text-base">{profile.bio}</p>
                  </div>
                )}
                {profile.location_text && profile.location_is_public && (
                  <div>
                    <h3 className="font-semibold text-gray-700 text-sm sm:text-base">Location</h3>
                    <p className="text-gray-600 text-sm sm:text-base">{profile.location_text}</p>
                  </div>
                )}
                {profile.business_name && (
                  <div>
                    <h3 className="font-semibold text-gray-700 text-sm sm:text-base">Business</h3>
                    <p className="text-gray-600 text-sm sm:text-base">{profile.business_name}</p>
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-gray-700 text-sm sm:text-base">Member Since</h3>
                  <p className="text-gray-600 text-sm sm:text-base">
                    {new Date(profile.created_at || '').toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Memory Lightbox - Mobile Optimized */}
      {selectedMemory && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedMemory(null)}
        >
          <div 
            className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold">
                    {new Date(selectedMemory.date).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </h3>
                  {selectedMemory.event_title && (
                    <p className="text-gray-600 text-sm sm:text-base">{selectedMemory.event_title}</p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedMemory(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              
              {selectedMemory.photo_url && (
                <img
                  src={selectedMemory.photo_url}
                  alt={selectedMemory.caption}
                  className="w-full rounded-lg mb-4"
                />
              )}
              
              {selectedMemory.caption && (
                <p className="text-gray-700 text-sm sm:text-base">{selectedMemory.caption}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
