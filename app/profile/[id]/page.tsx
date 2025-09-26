// app/profile/[id]/page.tsx - ENHANCED PUBLIC PROFILE VIEW WITH FIXES
"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ProfileViewer from "../components/ProfileViewer";
import PostsFeed from "@/components/PostsFeed";
import PhotoMemories from "../../(protected)/calendar/components/PhotoMemories";

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
  verified: boolean | null;
  memories_visibility: 'public' | 'friends' | 'private' | null;
  friends_count?: number | null;
  posts_count?: number | null;
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

type Photo = {
  id: string;
  user_id: string;
  image_url: string;
  caption?: string;
  created_at: string;
  visibility: 'public' | 'friends' | 'private';
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
};

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const profileId = params?.id as string;
  
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('none');
  const [friendStatus, setFriendStatus] = useState<"none" | "pending" | "friends">("none");
  const [isFollowing, setIsFollowing] = useState(false);
  const [friendsCount, setFriendsCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [mutualFriendsCount, setMutualFriendsCount] = useState(0);
  
  // New state for enhanced features
  const [showMemories, setShowMemories] = useState(false);
  const [todayMemories, setTodayMemories] = useState<Memory[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [memoriesLoading, setMemoriesLoading] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'events' | 'memories'>('posts');
  const [isMobile, setIsMobile] = useState(false);

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
      loadStats();
      loadPosts(); // Load actual posts from feed_posts
      loadEvents();
    }
    
    if (currentUserId && profileId) {
      checkRelationshipStatus();
      checkFollowStatus();
      loadMutualFriends();
      loadTodayMemories();
    }
  }, [profileId, currentUserId]);

  // FIXED: Load actual posts from feed_posts table
  async function loadPosts() {
    setPostsLoading(true);
    try {
      const { data, error } = await supabase
        .from("feed_posts")
        .select(`
          id, user_id, content, post_type, created_at,
          profiles:user_id (
            full_name, avatar_url, username
          )
        `)
        .eq("user_id", profileId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error && error.code !== 'PGRST116') {
        console.error("Error loading posts:", error);
        setPosts([]);
        return;
      }

      setPosts(data || []);
    } catch (err) {
      console.error("Error loading posts:", err);
      setPosts([]);
    } finally {
      setPostsLoading(false);
    }
  }

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
        memories_visibility: data.memories_visibility || 'private'
      });
    } catch (err) {
      console.error("Error loading profile:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      // Get friends count - FIXED query for friendships table
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
          image_url, max_attendees, visibility,
          event_attendees(count)
        `)
        .eq("host_id", profileId)
        .gte("start_date", new Date().toISOString())
        .order("start_date", { ascending: true })
        .limit(6);

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
        attendees_count: event.event_attendees?.[0]?.count || 0
      })));
    } catch (err) {
      console.error("Error loading events:", err);
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  }

  // FIXED: Check relationship status with correct database query
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

  // FIXED: Check follow status
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
      const visibleMemories = (data || []).filter(memory => {
        if (memory.visibility === 'public') return true;
        if (memory.visibility === 'friends' && relationshipType === 'friend') return true;
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

  // FIXED: Follow/unfollow functionality
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

  return (
    <div className="profile-page">
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

      {/* Enhanced Content Sections */}
      {(canViewFriendContent || profile.visibility === 'public') && (
        <div className="content-sections">
          {/* Tab Navigation - FIXED FUNCTIONALITY */}
          <div className="tabs-container">
            <div className="tabs">
              <button 
                className={`tab ${activeTab === 'posts' ? 'active' : ''}`}
                onClick={() => setActiveTab('posts')}
              >
                📝 Posts {posts.length > 0 && `(${posts.length})`}
              </button>
              <button 
                className={`tab ${activeTab === 'events' ? 'active' : ''}`}
                onClick={() => setActiveTab('events')}
              >
                🎉 Events {events.length > 0 && `(${events.length})`}
              </button>
              {canViewMemories && todayMemories.length > 0 && (
                <button 
                  className={`tab ${activeTab === 'memories' ? 'active' : ''}`}
                  onClick={() => setActiveTab('memories')}
                >
                  ✨ Memories ({todayMemories.length})
                </button>
              )}
            </div>
          </div>

          {/* Content based on active tab - FIXED TAB SWITCHING */}
          <div className="content-area">
            {activeTab === 'posts' && (
              <div className="posts-section">
                {postsLoading ? (
                  <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <span>Loading posts...</span>
                  </div>
                ) : posts.length > 0 ? (
                  <div className="posts-feed">
                    <PostsFeed 
                      posts={posts}
                      currentUserId={currentUserId}
                      onLike={() => {}}
                      onComment={() => {}}
                      onShare={() => {}}
                    />
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">📝</div>
                    <p className="empty-text">No posts yet</p>
                    <p className="empty-subtext">Posts will appear here when shared</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'events' && (
              <div className="events-section">
                {eventsLoading ? (
                  <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <span>Loading events...</span>
                  </div>
                ) : events.length > 0 ? (
                  <div className="events-grid">
                    {events.map(event => (
                      <div key={event.id} className="event-card">
                        {event.image_url && (
                          <img src={event.image_url} alt={event.title} className="event-image" />
                        )}
                        <div className="event-content">
                          <h3 className="event-title">{event.title}</h3>
                          {event.description && (
                            <p className="event-description">{event.description}</p>
                          )}
                          <div className="event-details">
                            <div className="event-date">
                              📅 {new Date(event.start_date).toLocaleDateString()}
                            </div>
                            {event.location && (
                              <div className="event-location">
                                📍 {event.location}
                              </div>
                            )}
                            <div className="event-attendees">
                              👥 {event.attendees_count} attending
                              {event.max_attendees && ` / ${event.max_attendees} max`}
                            </div>
                          </div>
                          <div className="event-actions">
                            <button className="btn btn-primary btn-sm">
                              RSVP
                            </button>
                            <button className="btn btn-secondary btn-sm">
                              Interested
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">🎪</div>
                    <p className="empty-text">No upcoming events</p>
                    <p className="empty-subtext">Events hosted by this user will appear here</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'memories' && canViewMemories && (
              <div className="memories-section">
                {memoriesLoading ? (
                  <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <span>Loading memories...</span>
                  </div>
                ) : todayMemories.length > 0 ? (
                  <>
                    <h3 className="section-title">Today in Past Years</h3>
                    <div className="memories-grid">
                      {todayMemories.map(memory => (
                        <div 
                          key={memory.id} 
                          className="memory-item"
                          onClick={() => setSelectedMemory(memory)}
                        >
                          <img src={memory.photo_url} alt={memory.caption} />
                          <div className="memory-overlay">
                            <p className="memory-caption">{memory.caption}</p>
                            <span className="memory-date">
                              {new Date(memory.date).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">✨</div>
                    <p className="empty-text">No memories for today</p>
                    <p className="empty-subtext">Past memories from this date will appear here</p>
                  </div>
                )}
              </div>
            )}
          </div>
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

        @media (max-width: 640px) {
          .profile-page {
            padding: 1rem 0.5rem;
          }
        }

        .content-sections {
          max-width: 800px;
          margin: 2rem auto 0;
        }

        .tabs-container {
          background: white;
          border-radius: 1rem 1rem 0 0;
          padding: 0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .tabs {
          display: flex;
          border-bottom: 1px solid #e5e7eb;
        }

        @media (max-width: 640px) {
          .tabs {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
        }

        .tab {
          flex: 1;
          min-width: fit-content;
          padding: 1rem 1.5rem;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          font-weight: 500;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.875rem;
          white-space: nowrap;
        }

        @media (max-width: 640px) {
          .tab {
            padding: 0.875rem 1rem;
            font-size: 0.8rem;
          }
        }

        .tab:hover {
          color: #8b5cf6;
          background: rgba(139,92,246,0.05);
        }

        .tab.active {
          color: #8b5cf6;
          border-bottom-color: #8b5cf6;
          background: rgba(139,92,246,0.05);
        }

        .content-area {
          background: white;
          border-radius: 0 0 1rem 1rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          min-height: 400px;
        }

        @media (max-width: 640px) {
          .content-area {
            padding: 1rem;
          }
        }

        /* Posts Section - IMPROVED */
        .posts-feed {
          /* PostsFeed component styles will be applied automatically */
        }

        /* Events Section */
        .events-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        @media (max-width: 640px) {
          .events-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
        }

        .event-card {
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
          background: white;
        }

        .event-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        }

        .event-image {
          width: 100%;
          height: 150px;
          object-fit: cover;
        }

        .event-content {
          padding: 1rem;
        }

        .event-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 0.5rem 0;
        }

        .event-description {
          color: #6b7280;
          font-size: 0.875rem;
          margin: 0 0 1rem 0;
          line-height: 1.5;
        }

        .event-details {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          margin-bottom: 1rem;
          font-size: 0.875rem;
          color: #4b5563;
        }

        .event-actions {
          display: flex;
          gap: 0.5rem;
        }

        .btn {
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          font-size: 0.875rem;
        }

        .btn-sm {
          padding: 0.375rem 0.75rem;
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

        /* Memories Section */
        .section-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 1rem 0;
        }

        .memories-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
        }

        @media (max-width: 640px) {
          .memories-grid {
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 0.75rem;
          }
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
          padding: 1.5rem 0.75rem 0.75rem;
        }

        .memory-caption {
          font-size: 0.875rem;
          margin: 0 0 0.25rem 0;
          font-weight: 500;
        }

        .memory-date {
          font-size: 0.75rem;
          opacity: 0.9;
        }

        /* Empty States and Loading */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 1rem;
          text-align: center;
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

        .loading-state {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 3rem;
        }

        .loading-spinner {
          width: 1.5rem;
          height: 1.5rem;
          border: 2px solid #e5e7eb;
          border-top: 2px solid #8b5cf6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Mobile optimizations */
        @media (max-width: 640px) {
          .btn {
            min-height: 44px;
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
          }
        }
      `}</style>
    </div>
  );
}
