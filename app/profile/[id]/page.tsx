// app/profile/[id]/page.tsx - UNIFIED FEED VERSION (NO TABS) + WALL POSTS
"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ProfileViewer from "../components/ProfileViewer";
import PostsFeed from "@/components/PostsFeed";
import PhotoMemories from "../../(protected)/calendar/components/PhotoMemories";
import ProfilePostComposer from "@/components/ProfilePostComposer";

type PublicProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location_text: string | null;
  location_is_public: boolean | null;
  username: string | null;
  cover_url: string | null;
  tagline: string | null;
  interests: string[] | null;
  website_url: string | null;
  social_links: any | null;
  languages: string[] | null;
  visibility: 'public' | 'friends_only' | 'private' | null;
  allow_messages: 'everyone' | 'friends' | 'no_one' | null;
  show_online_status: boolean | null;
  show_mutuals: boolean | null;
  show_business_link: boolean | null;
  verified: boolean | null;
  memories_visibility: 'public' | 'friends' | 'private' | null;
  friends_count?: number | null;
  posts_count?: number | null;
};

type BusinessProfile = {
  id: string;
  handle: string;
  display_name: string;
  visibility: string;
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

type Event = {
  id: string;
  host_id: string;
  title: string;
  description?: string;
  start_date: string;
  location?: string;
  image_url?: string;
  attendees_count: number;
  max_attendees?: number;
  visibility: 'public' | 'friends' | 'private';
  created_at: string;
  type: 'event';
};

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const profileId = params?.id as string;
  
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('none');
  const [friendStatus, setFriendStatus] = useState<"none" | "pending" | "friends">("none");
  const [isFollowing, setIsFollowing] = useState(false);
  const [friendsCount, setFriendsCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [mutualFriendsCount, setMutualFriendsCount] = useState(0);
  
  // Enhanced features
  const [showMemories, setShowMemories] = useState(false);
  const [todayMemories, setTodayMemories] = useState<Memory[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [memoriesLoading, setMemoriesLoading] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [feedKey, setFeedKey] = useState(0); // For refreshing feed after wall post

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Get current user and check if viewing own profile
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const userId = data.user?.id ?? null;
      setCurrentUserId(userId);
      
      if (userId && userId === profileId) {
        router.push("/profile");
      }
    });
  }, [profileId, router]);

  // Load all data when profileId or currentUserId changes
  useEffect(() => {
    if (profileId) {
      loadProfile();
      loadBusinessProfile();
      loadStats();
      loadEvents();
    }
    
    if (currentUserId && profileId) {
      checkRelationshipStatus();
      checkFollowStatus();
      loadMutualFriends();
      loadTodayMemories();
    }
  }, [profileId, currentUserId]);

  async function loadProfile() {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profileId)
        .single();

      if (error) throw error;

      setProfile({
        ...data,
        memories_visibility: data.memories_visibility || 'private',
        show_business_link: data.show_business_link ?? true
      });
    } catch (err) {
      console.error("Error loading profile:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadBusinessProfile() {
    if (!profileId) return;
    
    try {
      const { data } = await supabase
        .from("business_profiles")
        .select("id, handle, display_name, visibility")
        .eq("user_id", profileId)
        .eq("visibility", "public")
        .maybeSingle();
      
      if (data) {
        setBusinessProfile(data);
      }
    } catch (err) {
      console.error("Error loading business profile:", err);
    }
  }

  async function loadStats() {
    try {
      // Get friends count
      const { count: friends } = await supabase
        .from("friendships")
        .select("*", { count: "exact", head: true })
        .or(`user_id.eq.${profileId},friend_id.eq.${profileId}`)
        .eq('status', 'accepted');
      
      setFriendsCount(friends || 0);

      // Get followers count
      const { count: followers } = await supabase
        .from("followers")
        .select("*", { count: "exact", head: true })
        .eq("following_id", profileId);
      
      setFollowersCount(followers || 0);
    } catch (err) {
      console.error("Error loading stats:", err);
    }
  }

  async function loadEvents() {
    setEventsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from("events")
        .select(`
          id, host_id, title, description, start_date, location, 
          image_url, max_attendees, visibility, created_at,
          event_attendees(count)
        `)
        .eq("host_id", profileId)
        .gte("start_date", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.log("Events query error:", error);
        setEvents([]);
        return;
      }

      // Filter based on visibility and relationship
      const visibleEvents = (data || []).filter(event => {
        if (event.visibility === 'public') return true;
        if (event.visibility === 'friends' && relationshipType === 'friend') return true;
        if (currentUserId === profileId) return true;
        return false;
      });

      setEvents(visibleEvents.map(event => ({
        ...event,
        attendees_count: event.event_attendees?.[0]?.count || 0,
        type: 'event' as const
      })));
    } catch (err) {
      console.error("Error loading events:", err);
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  }

  // Check relationship status with correct database query
  async function checkRelationshipStatus() {
    if (!currentUserId || !profileId) return;

    try {
      // Check if friends - using friendships table with status = 'accepted'
      const { data: friendships } = await supabase
        .from("friendships")
        .select("status, relationship_type")
        .or(`and(user_id.eq.${currentUserId},friend_id.eq.${profileId}),and(user_id.eq.${profileId},friend_id.eq.${currentUserId})`)
        .eq('status', 'accepted');

      if (friendships && friendships.length > 0) {
        setFriendStatus("friends");
        setRelationshipType(friendships[0].relationship_type || 'friend');
      } else {
        // Check for pending request
        const { data: pending } = await supabase
          .from("friend_requests")
          .select("*")
          .or(`and(from_user.eq.${currentUserId},to_user.eq.${profileId}),and(from_user.eq.${profileId},to_user.eq.${currentUserId})`);

        if (pending && pending.length > 0) {
          setFriendStatus("pending");
        } else {
          setFriendStatus("none");
        }
        setRelationshipType('none');
      }
    } catch (err) {
      console.error("Error checking relationship:", err);
    }
  }

  // Check follow status
  async function checkFollowStatus() {
    if (!currentUserId || !profileId) return;

    try {
      const { data } = await supabase
        .from("followers")
        .select("id")
        .eq("follower_id", currentUserId)
        .eq("following_id", profileId)
        .single();

      setIsFollowing(!!data);
    } catch (err) {
      // Not following or error - default to false
      setIsFollowing(false);
    }
  }

  async function loadMutualFriends() {
    if (!currentUserId || !profileId) return;

    try {
      const { data: myFriends } = await supabase
        .from("friendships")
        .select("user_id, friend_id")
        .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`)
        .eq('status', 'accepted');

      const { data: theirFriends } = await supabase
        .from("friendships")
        .select("user_id, friend_id")
        .or(`user_id.eq.${profileId},friend_id.eq.${profileId}`)
        .eq('status', 'accepted');

      if (myFriends && theirFriends) {
        const myFriendIds = myFriends.map(f => 
          f.user_id === currentUserId ? f.friend_id : f.user_id
        );
        const theirFriendIds = theirFriends.map(f => 
          f.user_id === profileId ? f.friend_id : f.user_id
        );

        const mutuals = myFriendIds.filter(id => theirFriendIds.includes(id));
        setMutualFriendsCount(mutuals.length);
      }
    } catch (err) {
      console.error("Error loading mutual friends:", err);
    }
  }

  async function loadTodayMemories() {
    if (!profileId) return;
    
    setMemoriesLoading(true);
    try {
      const today = new Date();
      const dayMonth = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      
      const { data, error } = await supabase
        .from("memories")
        .select("*")
        .eq("user_id", profileId)
        .like("date", `%${dayMonth}`)
        .order("date", { ascending: false });

      if (error && error.code !== 'PGRST116') {
        console.log("Memories query error:", error);
        setTodayMemories([]);
        return;
      }

      // Filter based on visibility and relationship
      const canViewFriendContent = relationshipType === 'friend';
      const visibleMemories = (data || []).filter(memory => {
        if (memory.visibility === 'public') return true;
        if (memory.visibility === 'friends' && canViewFriendContent) return true;
        if (currentUserId === profileId) return true;
        return false;
      });

      setTodayMemories(visibleMemories);
      if (visibleMemories.length > 0) {
        setShowMemories(true);
      }
    } catch (err) {
      console.error("Error loading memories:", err);
      setTodayMemories([]);
    } finally {
      setMemoriesLoading(false);
    }
  }

  async function sendFriendRequest() {
    if (!currentUserId || !profileId) return;

    try {
      const { error } = await supabase
        .from("friend_requests")
        .insert({
          from_user: currentUserId,
          to_user: profileId,
        });

      if (!error) {
        setFriendStatus("pending");
      }
    } catch (err) {
      console.error("Error sending friend request:", err);
    }
  }

  async function sendMessage() {
    if (!currentUserId || !profileId) return;
    router.push(`/messages?user=${profileId}`);
  }

  // Follow/unfollow functionality
  async function handleFollow() {
    if (!currentUserId || !profileId) return;

    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from("followers")
          .delete()
          .eq("follower_id", currentUserId)
          .eq("following_id", profileId);

        if (!error) {
          setIsFollowing(false);
          setFollowersCount(prev => Math.max(0, prev - 1));
        }
      } else {
        // Follow
        const { error } = await supabase
          .from("followers")
          .insert({
            follower_id: currentUserId,
            following_id: profileId,
          });

        if (!error) {
          setIsFollowing(true);
          setFollowersCount(prev => prev + 1);
        }
      }
    } catch (err) {
      console.error("Error following/unfollowing user:", err);
    }
  }

  function handlePostCreated() {
    // Refresh the feed by incrementing the key
    setFeedKey(prev => prev + 1);
  }

  // Loading state
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <span>Loading profile...</span>
        <style jsx>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            gap: 1rem;
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 20%, #f1f5f9 40%, #e0e7ff 60%, #f3e8ff 80%, #fdf4ff 100%);
          }
          .loading-spinner {
            width: 3rem;
            height: 3rem;
            border: 3px solid #e5e7eb;
            border-top: 3px solid #8b5cf6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Error state - profile not found
  if (!profile) {
    return (
      <div className="error-container">
        <h2>Profile Not Found</h2>
        <p>This profile doesn't exist or has been removed.</p>
        <button onClick={() => router.push("/")} className="btn btn-primary">
          Go Home
        </button>
        <style jsx>{`
          .error-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            gap: 1rem;
            text-align: center;
            padding: 2rem;
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 20%, #f1f5f9 40%, #e0e7ff 60%, #f3e8ff 80%, #fdf4ff 100%);
          }
          .btn {
            padding: 0.75rem 1.5rem;
            background: linear-gradient(135deg, #8b5cf6, #7c3aed);
            color: white;
            border: none;
            border-radius: 0.5rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            min-height: 44px;
          }
          .btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(139,92,246,0.3);
          }
        `}</style>
      </div>
    );
  }

  // Determine what content viewer can see
  const canViewFriendContent = relationshipType === 'friend';
  const canViewMemories = 
    profile?.memories_visibility === 'public' ||
    (profile?.memories_visibility === 'friends' && canViewFriendContent) ||
    currentUserId === profileId;

  // Check if business link should be shown
  const showBusinessLink = businessProfile && profile.show_business_link !== false;

  return (
    <div className="profile-page">
      {/* Business Page Button - Shows if user has public business and enabled the link */}
      {showBusinessLink && (
        <div className="business-button-container">
          <a 
            href={`/business/@${businessProfile.handle}`}
            className="business-page-button"
          >
            <span className="business-icon">🏢</span>
            <span>Business Page</span>
          </a>
        </div>
      )}

      {/* Main Profile Display */}
      <ProfileViewer
        profile={profile}
        currentUserId={currentUserId}
        relationshipType={relationshipType}
        mutualFriendsCount={mutualFriendsCount}
        onAddFriend={sendFriendRequest}
        onMessage={sendMessage}
        onFollow={handleFollow}
        isPending={friendStatus === "pending"}
        isFollowing={isFollowing}
      />

      {/* Today's Memories Section (if available) */}
      {canViewMemories && todayMemories.length > 0 && (
        <div className="memories-section">
          <div className="section-header">
            <h3 className="section-title">✨ Today in Past Years</h3>
          </div>
          <div className="memories-grid">
            {todayMemories.slice(0, 4).map(memory => (
              <div 
                key={memory.id} 
                className="memory-item"
                onClick={() => setSelectedMemory(memory)}
              >
                <img src={memory.photo_url} alt={memory.caption} />
                <div className="memory-overlay">
                  <p className="memory-caption">{memory.caption}</p>
                  <span className="memory-date">
                    {new Date(memory.date).getFullYear()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Wall Post Composer - Only show to friends */}
      {relationshipType === 'friend' && currentUserId && (
        <div className="wall-post-section">
          <ProfilePostComposer
            profileUserId={profileId}
            currentUserId={currentUserId}
            profileUserName={profile.full_name || 'this user'}
            onPostCreated={handlePostCreated}
          />
        </div>
      )}

      {/* Unified Posts and Events Feed */}
      {(canViewFriendContent || profile.visibility === 'public') && (
        <div className="unified-feed">
          {/* Posts Feed - Displayed as continuous feed */}
          <div className="posts-feed-section">
            <PostsFeed 
              key={feedKey}
              userId={profileId}
              viewerUserId={currentUserId}
              maxPosts={20}
            />
          </div>

          {/* Events interspersed (if you want them mixed in later) */}
          {events.length > 0 && (
            <div className="events-feed-section">
              <div className="section-header">
                <h3 className="section-title">🎉 Upcoming Events</h3>
              </div>
              {events.map(event => (
                <div key={event.id} className="event-feed-item">
                  {event.image_url && (
                    <img src={event.image_url} alt={event.title} className="event-image" />
                  )}
                  <div className="event-content">
                    <h4 className="event-title">{event.title}</h4>
                    {event.description && (
                      <p className="event-description">{event.description}</p>
                    )}
                    <div className="event-details">
                      <span className="event-date">
                        📅 {new Date(event.start_date).toLocaleDateString()}
                      </span>
                      {event.location && (
                        <span className="event-location">
                          📍 {event.location}
                        </span>
                      )}
                      <span className="event-attendees">
                        👥 {event.attendees_count} attending
                      </span>
                    </div>
                    <div className="event-actions">
                      <button className="btn btn-primary btn-sm">RSVP</button>
                      <button className="btn btn-secondary btn-sm">Interested</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state if no events (PostsFeed handles its own empty state) */}
          {events.length === 0 && (
            <div className="empty-events-message">
              <p className="text-gray-500 text-sm text-center py-4">
                No upcoming events
              </p>
            </div>
          )}
        </div>
      )}

      {/* Memory Modal */}
      {selectedMemory && (
        <PhotoMemories
          memories={[selectedMemory]}
          onClose={() => setSelectedMemory(null)}
          isMobile={isMobile}
        />
      )}

      <style jsx>{`
        .profile-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 20%, #f1f5f9 40%, #e0e7ff 60%, #f3e8ff 80%, #fdf4ff 100%);
          padding: 2rem 1rem;
          position: relative;
        }

        .profile-page::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 
            radial-gradient(circle at 20% 30%, rgba(139,92,246,0.08) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(245,158,11,0.06) 0%, transparent 50%);
          pointer-events: none;
          z-index: 0;
        }

        .profile-page > * {
          position: relative;
          z-index: 1;
        }

        /* Business Page Button */
        .business-button-container {
          max-width: 800px;
          margin: 0 auto 1.5rem;
        }

        .business-page-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.875rem 1.25rem;
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: white;
          border: none;
          border-radius: 0.75rem;
          font-weight: 600;
          font-size: 0.95rem;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(139,92,246,0.3);
          min-height: 48px;
        }

        .business-page-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(139,92,246,0.4);
          background: linear-gradient(135deg, #7c3aed, #6d28d9);
        }

        .business-page-button:active {
          transform: translateY(0);
        }

        .business-icon {
          font-size: 1.25rem;
        }

        /* Wall Post Section */
        .wall-post-section {
          max-width: 800px;
          margin: 2rem auto 0;
        }

        @media (max-width: 640px) {
          .profile-page {
            padding: 1rem 0.5rem;
          }

          .business-button-container {
            margin-bottom: 1rem;
          }

          .business-page-button {
            padding: 0.75rem 1rem;
            font-size: 0.875rem;
            min-height: 44px;
          }

          .business-icon {
            font-size: 1.1rem;
          }

          .wall-post-section {
            margin: 1.5rem auto 0;
          }
        }

        /* Memories Section */
        .memories-section {
          max-width: 800px;
          margin: 2rem auto 0;
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .section-header {
          margin-bottom: 1rem;
        }

        .section-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
        }

        .memories-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
        }

        .memory-item {
          position: relative;
          aspect-ratio: 1;
          border-radius: 0.75rem;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.2s;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .memory-item:hover {
          transform: scale(1.02);
        }

        .memory-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .memory-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(transparent, rgba(0,0,0,0.8));
          color: white;
          padding: 1rem 0.75rem 0.75rem;
        }

        .memory-caption {
          font-size: 0.875rem;
          margin: 0 0 0.25rem 0;
          font-weight: 500;
          line-height: 1.2;
        }

        .memory-date {
          font-size: 0.75rem;
          opacity: 0.9;
        }

        /* Unified Feed Section */
        .unified-feed {
          max-width: 800px;
          margin: 2rem auto 0;
        }

        .posts-feed-section {
          /* PostsFeed component will handle its own styling */
        }

        .events-feed-section {
          margin-top: 2rem;
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .event-feed-item {
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          overflow: hidden;
          margin-bottom: 1.5rem;
          transition: transform 0.2s, box-shadow 0.2s;
          background: white;
        }

        .event-feed-item:last-child {
          margin-bottom: 0;
        }

        .event-feed-item:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .event-image {
          width: 100%;
          height: 200px;
          object-fit: cover;
        }

        .event-content {
          padding: 1.25rem;
        }

        .event-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 0.75rem 0;
          line-height: 1.3;
        }

        .event-description {
          color: #6b7280;
          font-size: 0.875rem;
          margin: 0 0 1rem 0;
          line-height: 1.5;
        }

        .event-details {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 1.25rem;
          font-size: 0.875rem;
          color: #4b5563;
        }

        @media (max-width: 640px) {
          .event-details {
            flex-direction: column;
            gap: 0.5rem;
          }
        }

        .event-actions {
          display: flex;
          gap: 0.75rem;
        }

        @media (max-width: 640px) {
          .event-actions {
            flex-direction: column;
          }
        }

        .btn {
          padding: 0.625rem 1.25rem;
          border-radius: 0.5rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          font-size: 0.875rem;
          min-height: 44px;
          touch-action: manipulation;
        }

        .btn-sm {
          padding: 0.5rem 1rem;
          font-size: 0.8rem;
        }

        .btn-primary {
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: white;
        }

        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(139,92,246,0.3);
        }

        .btn-secondary {
          background: white;
          color: #8b5cf6;
          border: 1px solid #8b5cf6;
        }

        .btn-secondary:hover {
          background: #8b5cf6;
          color: white;
        }

        /* Empty States */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 1rem;
          text-align: center;
          background: white;
          border-radius: 1rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .empty-text {
          font-size: 1.125rem;
          font-weight: 600;
          color: #4b5563;
          margin: 0 0 0.5rem 0;
        }

        .empty-subtext {
          color: #9ca3af;
          margin: 0;
        }

        /* Mobile optimizations */
        @media (max-width: 640px) {
          .memories-section,
          .events-feed-section {
            padding: 1rem;
          }

          .event-content {
            padding: 1rem;
          }

          .btn {
            -webkit-tap-highlight-color: transparent;
          }
        }
      `}</style>
    </div>
  );
}
