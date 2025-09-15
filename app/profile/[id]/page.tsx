// app/profile/[id]/page.tsx - PUBLIC PROFILE VIEW
"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import PhotosFeed from "@/components/PhotosFeed";
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
      
      // Check if viewing own profile - redirect to /profile
      if (userId && userId === profileId) {
        window.location.href = "/profile";
      }
    });
  }, [profileId]);

  useEffect(() => {
    loadProfile();
    loadStats();
    if (currentUserId && profileId) {
      checkRelationshipStatus();
      loadTodayMemories();
    }
  }, [profileId, currentUserId]);

  async function loadProfile() {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, bio, location_text, location_is_public, business_name, memories_visibility")
        .eq("id", profileId)
        .single();

      if (error) throw error;

      setProfile({
        ...data,
        has_creator_profile: !!data.business_name,
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
      // Check relationship type (friend, acquaintance, restricted)
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

  async function loadTodayMemories() {
    if (!profileId) return;
    
    setMemoriesLoading(true);
    try {
      const today = new Date();
      const dayMonth = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      
      // Get memories for this day/month from any year
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

  // Determine what content to show based on relationship
  const canViewFriendContent = relationshipType === 'friend';
  const canViewAcquaintanceContent = relationshipType === 'friend' || relationshipType === 'acquaintance';
  const canViewMemories = 
    profile?.memories_visibility === 'public' ||
    (profile?.memories_visibility === 'friends' && canViewFriendContent) ||
    currentUserId === profileId;

  const showLocation = profile?.location_is_public && profile?.location_text;

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <span>Loading profile...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="error-container">
        <h2>Profile Not Found</h2>
        <p>This profile doesn't exist or has been removed.</p>
        <Link href="/" className="btn btn-primary">Go Home</Link>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* Simple Header */}
      <div className="page-header">
        <Link href="/" className="back-link">
          ← Back
        </Link>
      </div>

      {/* Main Profile Card */}
      <div className="card profile-main-card">
        <div className="profile-layout">
          {/* Avatar */}
          <div className="avatar-section">
            <img
              src={profile.avatar_url || "/default-avatar.png"}
              alt={profile.full_name || "Profile"}
              className="avatar-image"
            />
            {/* Online Status Indicator */}
            <div className="status-indicator"></div>
          </div>

          {/* Profile Info */}
          <div className="profile-info">
            <h1 className="profile-name">
              {profile.full_name || "Anonymous User"}
            </h1>
            
            {showLocation && (
              <p className="profile-location">📍 {profile.location_text}</p>
            )}

            {/* Stats */}
            <div className="stats-row">
              <div className="stat">
                <span className="stat-number">{friendsCount}</span>
                <span className="stat-label">Friends</span>
              </div>
              <div className="stat">
                <span className="stat-number">{followersCount}</span>
                <span className="stat-label">Followers</span>
              </div>
            </div>

            {/* Actions */}
            {currentUserId && currentUserId !== profileId && (
              <div className="action-buttons">
                {friendStatus === "none" && (
                  <button onClick={sendFriendRequest} className="btn btn-primary">
                    Add Friend
                  </button>
                )}
                {friendStatus === "pending" && (
                  <button className="btn btn-secondary" disabled>
                    Request Sent
                  </button>
                )}
                {friendStatus === "friends" && (
                  <button className="btn btn-success" disabled>
                    ✓ Friends
                  </button>
                )}
                <button onClick={followUser} className="btn btn-secondary">
                  Follow
                </button>
              </div>
            )}

            {/* Business Profile Link */}
            {profile.has_creator_profile && (
              <Link href={`/business/${profileId}`} className="business-link">
                View Business Profile →
              </Link>
            )}
          </div>
        </div>

        {/* Bio Section */}
        {profile.bio && (
          <div className="bio-section">
            <h3>About</h3>
            <p>{profile.bio}</p>
          </div>
        )}
      </div>

      {/* Memories Section */}
      {canViewMemories && todayMemories.length > 0 && (
        <div className="card memories-card">
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

      {/* Photos Feed */}
      {(canViewFriendContent || profile.id === currentUserId) && (
        <PhotosFeed userId={profile.id} />
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
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          padding: 1rem;
        }

        .page-header {
          margin-bottom: 1rem;
        }

        .back-link {
          color: #6b7280;
          text-decoration: none;
        }

        .card {
          background: white;
          border-radius: 0.75rem;
          padding: 1.5rem;
          margin-bottom: 1rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .profile-layout {
          display: flex;
          gap: 1.5rem;
          align-items: flex-start;
        }

        .avatar-section {
          position: relative;
        }

        .avatar-image {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          object-fit: cover;
        }

        .status-indicator {
          position: absolute;
          bottom: 8px;
          right: 8px;
          width: 20px;
          height: 20px;
          background: #10b981;
          border: 3px solid white;
          border-radius: 50%;
        }

        .profile-info {
          flex: 1;
        }

        .profile-name {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0 0 0.5rem 0;
        }

        .profile-location {
          color: #6b7280;
          margin: 0 0 1rem 0;
        }

        .stats-row {
          display: flex;
          gap: 2rem;
          margin-bottom: 1rem;
        }

        .stat {
          display: flex;
          flex-direction: column;
        }

        .stat-number {
          font-size: 1.25rem;
          font-weight: 600;
        }

        .stat-label {
          color: #6b7280;
          font-size: 0.875rem;
        }

        .action-buttons {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .btn {
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          border: none;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #8b5cf6;
          color: white;
        }

        .btn-secondary {
          background: #e5e7eb;
          color: #374151;
        }

        .btn-success {
          background: #10b981;
          color: white;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .business-link {
          color: #8b5cf6;
          text-decoration: none;
          font-weight: 500;
        }

        .bio-section {
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid #e5e7eb;
        }

        .bio-section h3 {
          margin: 0 0 0.5rem 0;
          color: #1f2937;
        }

        .memories-card h3 {
          margin: 0 0 1rem 0;
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
        }

        .memory-date {
          color: #6b7280;
          font-size: 0.75rem;
        }

        .loading-container,
        .error-container {
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

        @media (max-width: 640px) {
          .profile-layout {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .stats-row {
            justify-content: center;
          }

          .action-buttons {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
