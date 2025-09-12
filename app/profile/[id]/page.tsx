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
    // Get friends count - FIXED: Changed from a.eq/b.eq to user_id.eq/friend_id.eq
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

    // Check if friends - FIXED: Changed from a.eq/b.eq to user_id.eq/friend_id.eq
    // FIXED: Changed from relationship_type to relationship (to match your DB column)
    const { data: friendship } = await supabase
      .from("friendships")
      .select("relationship")
      .or(`and(user_id.eq.${currentUserId},friend_id.eq.${profileId}),and(user_id.eq.${profileId},friend_id.eq.${currentUserId})`)
      .single();

    if (friendship) {
      setFriendStatus("friends");
      // Check relationship type (friend, acquaintance, restricted)
      // FIXED: Changed from relationship_type to relationship
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
      const todayMonth = today.getMonth() + 1;
      const todayDay = today.getDate();

      // Get memories from this day in previous years
      const { data, error } = await supabase
        .from("memories")
        .select("*")
        .eq("user_id", profileId)
        .eq("memory_month", todayMonth)
        .eq("memory_day", todayDay)
        .order("memory_year", { ascending: false });

      if (error) throw error;

      // Filter based on visibility and relationship
      const visibleMemories = data?.filter(memory => {
        if (memory.visibility === 'public') return true;
        if (memory.visibility === 'friends' && relationshipType === 'friend') return true;
        if (currentUserId === profileId) return true; // Own memories
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

  async function removeFriend() {
    if (!currentUserId || !profileId) return;

    try {
      // FIXED: Changed from a.eq/b.eq to user_id.eq/friend_id.eq
      const { error } = await supabase
        .from("friendships")
        .delete()
        .or(`and(user_id.eq.${currentUserId},friend_id.eq.${profileId}),and(user_id.eq.${profileId},friend_id.eq.${currentUserId})`);

      if (!error) {
        setFriendStatus("none");
        setRelationshipType('none');
      }
    } catch (err) {
      console.error("Error removing friend:", err);
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
            <h1 className="profile-name">{profile.full_name || "Member"}</h1>
            
            {showLocation && (
              <div className="location">
                <span className="location-icon">📍</span>
                {profile.location_text}
              </div>
            )}

            {/* Relationship Badge */}
            {relationshipType !== 'none' && (
              <div className="relationship-badge">
                {relationshipType === 'friend' && <span className="badge friend">👥 Friend</span>}
                {relationshipType === 'acquaintance' && <span className="badge acquaintance">🤝 Acquaintance</span>}
                {relationshipType === 'restricted' && <span className="badge restricted">🔒 Restricted</span>}
              </div>
            )}

            {/* Stats */}
            <div className="stats-row">
              <div className="stat">
                <span className="stat-number">{followersCount}</span>
                <span className="stat-label">Followers</span>
              </div>
              <div className="stat">
                <span className="stat-number">{friendsCount}</span>
                <span className="stat-label">Friends</span>
              </div>
              {canViewMemories && todayMemories.length > 0 && (
                <div className="stat clickable" onClick={() => setShowMemories(true)}>
                  <span className="stat-number">{todayMemories.length}</span>
                  <span className="stat-label">Today's Memories</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
              {friendStatus === "none" && (
                <>
                  <button 
                    className="btn btn-primary"
                    onClick={sendFriendRequest}
                  >
                    <span className="btn-icon">➕</span>
                    Add Friend
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={followUser}
                  >
                    <span className="btn-icon">👁️</span>
                    Follow
                  </button>
                </>
              )}
              
              {friendStatus === "pending" && (
                <button className="btn btn-neutral" disabled>
                  <span className="btn-icon">⏳</span>
                  Request Pending
                </button>
              )}
              
              {friendStatus === "friends" && (
                <button 
                  className="btn btn-success"
                  onClick={removeFriend}
                >
                  <span className="btn-icon">✓</span>
                  Friends
                </button>
              )}

              <Link 
                href={`/messages/chat/${profileId}`}
                className="btn btn-neutral"
              >
                <span className="btn-icon">💬</span>
                Message
              </Link>

              {profile.has_creator_profile && (
                <Link 
                  href={`/business/${profile.id}`}
                  className="btn btn-special"
                >
                  <span className="btn-icon">✨</span>
                  Creator Profile
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Memories Section - Only show if allowed */}
      {canViewMemories && todayMemories.length > 0 && (
        <div className="card memories-card">
          <div className="card-header">
            <h3 className="card-title">
              <span className="title-icon">📸</span>
              Memories from Today
            </h3>
            <button 
              className="view-all-btn"
              onClick={() => setShowMemories(true)}
            >
              View All
            </button>
          </div>
          
          <div className="memories-preview">
            {todayMemories.slice(0, isMobile ? 2 : 4).map((memory) => (
              <div 
                key={memory.id}
                className="memory-thumbnail"
                onClick={() => setSelectedMemory(memory)}
              >
                <img 
                  src={memory.photo_url} 
                  alt={memory.caption}
                  className="memory-image"
                />
                <div className="memory-overlay">
                  <span className="memory-year">
                    {new Date(memory.date).getFullYear()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* About Section */}
      {profile.bio && (
        <div className="card about-card">
          <h3 className="card-title">
            <span className="title-icon">👤</span>
            About
          </h3>
          <p className="bio-text">{profile.bio}</p>
        </div>
      )}

      {/* Posts Section with Proper Visibility */}
      <div className="posts-section">
        <h3 className="section-title">
          <span className="title-icon">📝</span>
          Posts
        </h3>
        
        {/* Privacy Notice */}
        {relationshipType === 'none' && (
          <div className="privacy-notice">
            <span className="notice-icon">🔒</span>
            <span>You can only see public posts. Connect as friends to see more.</span>
          </div>
        )}
        
        {relationshipType === 'restricted' && (
          <div className="privacy-notice restricted">
            <span className="notice-icon">🚫</span>
            <span>Limited content visibility due to restricted connection.</span>
          </div>
        )}

        <PhotosFeed 
          userId={profileId} 
          viewerUserId={currentUserId} 
          isPublicView={true}
          relationshipType={relationshipType}
        />
      </div>

      {/* Full Memories Modal */}
      {showMemories && (
        <PhotoMemories 
          date={new Date()} 
          onClose={() => setShowMemories(false)}
          userId={profileId}
        />
      )}

      {/* Memory Detail Modal */}
      {selectedMemory && (
        <div className="memory-modal" onClick={() => setSelectedMemory(null)}>
          <div className="memory-modal-content" onClick={(e) => e.stopPropagation()}>
            <button 
              className="modal-close"
              onClick={() => setSelectedMemory(null)}
            >
              ✕
            </button>
            <img 
              src={selectedMemory.photo_url} 
              alt={selectedMemory.caption}
              className="modal-image"
            />
            <div className="modal-info">
              <div className="modal-date">
                {new Date(selectedMemory.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
              {selectedMemory.event_title && (
                <h4 className="modal-title">{selectedMemory.event_title}</h4>
              )}
              <p className="modal-caption">{selectedMemory.caption}</p>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .profile-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 20%, #f1f5f9 40%, #e0e7ff 60%, #f3e8ff 80%, #fdf4ff 100%);
          padding: 2rem 1rem;
          padding-bottom: 4rem;
        }

        .loading-container, .error-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 50vh;
          gap: 1rem;
        }

        .loading-spinner {
          width: 2rem;
          height: 2rem;
          border: 3px solid #e5e7eb;
          border-top: 3px solid #8b5cf6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .page-header {
          max-width: 800px;
          margin: 0 auto 2rem;
        }

        .back-link {
          color: #6b7280;
          text-decoration: none;
          font-size: 0.875rem;
          transition: color 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
        }

        .back-link:hover {
          color: #8b5cf6;
        }

        .card {
          background: white;
          border-radius: 1rem;
          padding: 2rem;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          max-width: 800px;
          margin: 0 auto 1.5rem;
        }

        @media (max-width: 640px) {
          .card {
            padding: 1.5rem;
            border-radius: 0.75rem;
          }
        }

        .profile-layout {
          display: flex;
          gap: 2rem;
          align-items: flex-start;
        }

        @media (max-width: 640px) {
          .profile-layout {
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 1.5rem;
          }
        }

        .avatar-section {
          flex-shrink: 0;
          position: relative;
        }

        .avatar-image {
          width: 150px;
          height: 150px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid rgba(139,92,246,0.2);
        }

        @media (max-width: 640px) {
          .avatar-image {
            width: 120px;
            height: 120px;
          }
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
          flex-grow: 1;
          min-width: 0;
        }

        .profile-name {
          font-size: 2rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 0.5rem 0;
        }

        @media (max-width: 640px) {
          .profile-name {
            font-size: 1.5rem;
          }
        }

        .location {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          color: #6b7280;
          margin-bottom: 0.75rem;
          font-size: 0.875rem;
        }

        .location-icon {
          font-size: 0.75rem;
        }

        .relationship-badge {
          margin-bottom: 1rem;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.75rem;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .badge.friend {
          background: #dcfce7;
          color: #166534;
        }

        .badge.acquaintance {
          background: #fef3c7;
          color: #92400e;
        }

        .badge.restricted {
          background: #fee2e2;
          color: #991b1b;
        }

        .stats-row {
          display: flex;
          gap: 2rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }

        @media (max-width: 640px) {
          .stats-row {
            gap: 1.5rem;
            justify-content: center;
          }
        }

        .stat {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .stat.clickable {
          cursor: pointer;
          transition: all 0.2s;
        }

        .stat.clickable:hover {
          transform: translateY(-2px);
        }

        .stat-number {
          font-size: 1.25rem;
          font-weight: 700;
          color: #8b5cf6;
        }

        .stat-label {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .action-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        @media (max-width: 640px) {
          .action-buttons {
            justify-content: center;
            width: 100%;
          }
        }

        .btn {
          padding: 0.75rem 1.25rem;
          border-radius: 0.5rem;
          border: none;
          cursor: pointer;
          font-weight: 500;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.2s;
          font-size: 16px;
        }

        @media (max-width: 640px) {
          .btn {
            padding: 0.625rem 1rem;
            font-size: 14px;
            flex: 1;
            min-width: 0;
            justify-content: center;
          }
        }

        .btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .btn-primary {
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: white;
        }

        .btn-secondary {
          background: linear-gradient(135deg, #6b7280, #4b5563);
          color: white;
        }

        .btn-neutral {
          background: white;
          color: #374151;
          border: 1px solid #e5e7eb;
        }

        .btn-special {
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          color: white;
        }

        .btn-success {
          background: #10b981;
          color: white;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-icon {
          font-size: 0.875rem;
        }

        /* Memories Card */
        .memories-card {
          padding: 1.5rem;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .card-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .title-icon {
          font-size: 1rem;
        }

        .view-all-btn {
          padding: 0.375rem 0.75rem;
          background: #f3f4f6;
          color: #6b7280;
          border: none;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .view-all-btn:hover {
          background: #e5e7eb;
          color: #4b5563;
        }

        .memories-preview {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 1rem;
        }

        @media (max-width: 640px) {
          .memories-preview {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.75rem;
          }
        }

        .memory-thumbnail {
          position: relative;
          aspect-ratio: 1;
          border-radius: 0.5rem;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .memory-thumbnail:hover {
          transform: scale(1.05);
        }

        .memory-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .memory-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.7), transparent);
          padding: 0.5rem;
          color: white;
        }

        .memory-year {
          font-size: 0.75rem;
          font-weight: 500;
        }

        /* About Card */
        .about-card {
          padding: 1.5rem;
        }

        .bio-text {
          color: #4b5563;
          line-height: 1.6;
          white-space: pre-wrap;
        }

        /* Posts Section */
        .posts-section {
          max-width: 800px;
          margin: 0 auto;
        }

        .section-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .privacy-notice {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 1rem;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #6b7280;
          font-size: 0.875rem;
        }

        .privacy-notice.restricted {
          background: #fef2f2;
          border-color: #fecaca;
          color: #b91c1c;
        }

        .notice-icon {
          font-size: 1rem;
        }

        /* Memory Modal */
        .memory-modal {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .memory-modal-content {
          background: white;
          border-radius: 1rem;
          max-width: 600px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
        }

        @media (max-width: 640px) {
          .memory-modal-content {
            border-radius: 0.75rem;
            max-height: 85vh;
          }
        }

        .modal-close {
          position: absolute;
          top: 1rem;
          right: 1rem;
          width: 2rem;
          height: 2rem;
          background: white;
          border: none;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 1.25rem;
          z-index: 1;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .modal-image {
          width: 100%;
          aspect-ratio: 4/3;
          object-fit: cover;
          border-radius: 1rem 1rem 0 0;
        }

        .modal-info {
          padding: 1.5rem;
        }

        .modal-date {
          color: #6b7280;
          font-size: 0.875rem;
          margin-bottom: 0.5rem;
        }

        .modal-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 0.75rem 0;
        }

        .modal-caption {
          color: #4b5563;
          line-height: 1.6;
        }

        /* Mobile Touch Optimizations */
        @media (max-width: 640px) {
          .btn, .view-all-btn, .memory-thumbnail {
            -webkit-tap-highlight-color: rgba(139, 92, 246, 0.1);
          }
          
          .memory-thumbnail {
            touch-action: manipulation;
          }
        }
      `}</style>
    </div>
  );
}
