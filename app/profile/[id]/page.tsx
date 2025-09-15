// app/profile/[id]/page.tsx - PUBLIC PROFILE VIEW (COMBINED VERSION)
"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ProfileViewer from "../components/ProfileViewer";
import PhotosFeed from "@/components/PhotosFeed";
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
  const router = useRouter();
  const profileId = params?.id as string;
  
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('none');
  const [friendStatus, setFriendStatus] = useState<"none" | "pending" | "friends">("none");
  const [friendsCount, setFriendsCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [mutualFriendsCount, setMutualFriendsCount] = useState(0);
  const [showMemories, setShowMemories] = useState(false);
  const [todayMemories, setTodayMemories] = useState<Memory[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [memoriesLoading, setMemoriesLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
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
      
      // If viewing own profile, redirect to /profile
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
    }
    
    if (currentUserId && profileId) {
      checkRelationshipStatus();
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
        memories_visibility: data.memories_visibility || 'private'
      });
    } catch (err) {
      console.error("Error loading profile:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    // Get friends count
    const { count: friends } = await supabase
      .from("friendships")
      .select("*", { count: "exact", head: true })
      .or(`user_id.eq.${profileId},friend_id.eq.${profileId}`);
    
    setFriendsCount(friends || 0);

    // Get followers count
    const { count: followers } = await supabase
      .from("followers")
      .select("*", { count: "exact", head: true })
      .eq("following_id", profileId);
    
    setFollowersCount(followers || 0);
  }

  async function checkRelationshipStatus() {
    if (!currentUserId || !profileId) return;

    // Check if friends
    const { data: friendship } = await supabase
      .from("friendships")
      .select("relationship")
      .or(`and(user_id.eq.${currentUserId},friend_id.eq.${profileId}),and(user_id.eq.${profileId},friend_id.eq.${currentUserId})`)
      .single();

    if (friendship) {
      setFriendStatus("friends");
      setRelationshipType(friendship.relationship || 'friend');
    } else {
      // Check for pending request
      const { data: pending } = await supabase
        .from("friend_requests")
        .select("*")
        .or(`and(from_user.eq.${currentUserId},to_user.eq.${profileId}),and(from_user.eq.${profileId},to_user.eq.${currentUserId})`)
        .single();

      if (pending) {
        setFriendStatus("pending");
      }
      setRelationshipType('none');
    }
  }

  async function loadMutualFriends() {
    if (!currentUserId || !profileId) return;

    try {
      // Get current user's friends
      const { data: myFriends } = await supabase
        .from("friendships")
        .select("user_id, friend_id")
        .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`);

      // Get profile user's friends
      const { data: theirFriends } = await supabase
        .from("friendships")
        .select("user_id, friend_id")
        .or(`user_id.eq.${profileId},friend_id.eq.${profileId}`);

      if (myFriends && theirFriends) {
        // Extract friend IDs
        const myFriendIds = myFriends.map(f => 
          f.user_id === currentUserId ? f.friend_id : f.user_id
        );
        const theirFriendIds = theirFriends.map(f => 
          f.user_id === profileId ? f.friend_id : f.user_id
        );

        // Find mutual friends
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

      if (error) throw error;

      // Filter based on visibility and relationship
      const visibleMemories = data?.filter(memory => {
        if (memory.visibility === 'public') return true;
        if (memory.visibility === 'friends' && relationshipType === 'friend') return true;
        if (currentUserId === profileId) return true;
        return false;
      }) || [];

      setTodayMemories(visibleMemories);
      if (visibleMemories.length > 0) {
        setShowMemories(true);
      }
    } catch (err) {
      console.error("Error loading memories:", err);
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
    // Navigate to messages with this user
    router.push(`/messages?user=${profileId}`);
  }

  async function followUser() {
    if (!currentUserId || !profileId) return;

    try {
      const { error } = await supabase
        .from("followers")
        .insert({
          follower_id: currentUserId,
          following_id: profileId,
        });

      if (!error) {
        setFollowersCount(prev => prev + 1);
      }
    } catch (err) {
      console.error("Error following user:", err);
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
      {/* Use the ProfileViewer component for the main display */}
      <ProfileViewer
        profile={profile}
        currentUserId={currentUserId}
        relationshipType={relationshipType}
        mutualFriendsCount={mutualFriendsCount}
        onAddFriend={sendFriendRequest}
        onMessage={sendMessage}
        onFollow={followUser}
        isPending={friendStatus === "pending"}
      />

      {/* Memories Section - if applicable */}
      {canViewMemories && todayMemories.length > 0 && (
        <div className="memories-section">
          <h3>Today in Past Years</h3>
          <div className="memories-grid">
            {todayMemories.map(memory => (
              <div 
                key={memory.id} 
                className="memory-item"
                onClick={() => setSelectedMemory(memory)}
              >
                <img src={memory.photo_url} alt={memory.caption} />
                <p>{memory.caption}</p>
                <span className="memory-date">
                  {new Date(memory.date).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Photos Feed - if friend or public */}
      {(canViewFriendContent || profile.visibility === 'public') && (
        <div className="photos-section">
          <PhotosFeed userId={profile.id} />
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
        }

        @media (max-width: 640px) {
          .profile-page {
            padding: 1rem 0.5rem;
          }
        }

        .memories-section {
          max-width: 800px;
          margin: 2rem auto;
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .memories-section h3 {
          margin: 0 0 1rem 0;
          color: #1f2937;
        }

        .memories-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 1rem;
        }

        .memory-item {
          cursor: pointer;
          transition: transform 0.2s;
        }

        .memory-item:hover {
          transform: scale(1.05);
        }

        .memory-item img {
          width: 100%;
          height: 150px;
          object-fit: cover;
          border-radius: 0.5rem;
        }

        .memory-item p {
          margin: 0.5rem 0 0.25rem 0;
          font-size: 0.875rem;
          color: #374151;
        }

        .memory-date {
          color: #6b7280;
          font-size: 0.75rem;
        }

        .photos-section {
          max-width: 800px;
          margin: 2rem auto;
        }
      `}</style>
    </div>
  );
}
