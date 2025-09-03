// app/profile/[id]/page.tsx - PUBLIC PROFILE VIEW
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import PhotosFeed from "@/components/PhotosFeed";

type PublicProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location_text: string | null;
  location_is_public: boolean | null;
  business_name: string | null;
  has_creator_profile: boolean;
};

export default function PublicProfilePage() {
  const params = useParams();
  const profileId = params?.id as string;
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [friendStatus, setFriendStatus] = useState<"none" | "pending" | "friends">("none");
  const [friendsCount, setFriendsCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);

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
    if (currentUserId) checkFriendStatus();
  }, [profileId, currentUserId]);

  async function loadProfile() {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, bio, location_text, location_is_public, business_name")
        .eq("id", profileId)
        .single();

      if (error) throw error;

      setProfile({
        ...data,
        has_creator_profile: !!data.business_name,
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
      .or(`a.eq.${profileId},b.eq.${profileId}`);
    
    setFriendsCount(friends || 0);

    // Get followers count (if you have a followers table)
    // const { count: followers } = await supabase...
    // setFollowersCount(followers || 0);
  }

  async function checkFriendStatus() {
    if (!currentUserId || !profileId) return;

    const { data } = await supabase
      .from("friendships")
      .select("*")
      .or(`and(a.eq.${currentUserId},b.eq.${profileId}),and(a.eq.${profileId},b.eq.${currentUserId})`)
      .single();

    if (data) {
      setFriendStatus("friends");
    } else {
      // Check for pending request
      const { data: pending } = await supabase
        .from("friend_requests")
        .select("*")
        .or(`and(from_user.eq.${currentUserId},to_user.eq.${profileId}),and(from_user.eq.${profileId},to_user.eq.${currentUserId})`)
        .single();

      if (pending) setFriendStatus("pending");
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
      const { error } = await supabase
        .from("friendships")
        .delete()
        .or(`and(a.eq.${currentUserId},b.eq.${profileId}),and(a.eq.${profileId},b.eq.${currentUserId})`);

      if (!error) {
        setFriendStatus("none");
      }
    } catch (err) {
      console.error("Error removing friend:", err);
    }
  }

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

  const showLocation = profile.location_is_public && profile.location_text;

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
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
              {friendStatus === "none" && (
                <button 
                  className="btn btn-primary"
                  onClick={sendFriendRequest}
                >
                  <span className="btn-icon">➕</span>
                  Add Friend
                </button>
              )}
              
              {friendStatus === "pending" && (
                <button className="btn btn-neutral" disabled>
                  <span className="btn-icon">⏳</span>
                  Request Pending
                </button>
              )}
              
              {friendStatus === "friends" && (
                <button 
                  className="btn btn-danger"
                  onClick={removeFriend}
                >
                  <span className="btn-icon">👥</span>
                  Friends ✓
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

      {/* About Section */}
      {profile.bio && (
        <div className="card about-card">
          <h3 className="card-title">About</h3>
          <p className="bio-text">{profile.bio}</p>
        </div>
      )}

      {/* Public Posts */}
      <div className="posts-section">
        <h3 className="section-title">Posts</h3>
        <PhotosFeed userId={profileId} viewerUserId={currentUserId} isPublicView={true} />
      </div>

      <style jsx>{`
        .profile-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 20%, #f1f5f9 40%, #e0e7ff 60%, #f3e8ff 80%, #fdf4ff 100%);
          padding: 2rem 1rem;
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
          }
        }

        .avatar-section {
          flex-shrink: 0;
        }

        .avatar-image {
          width: 150px;
          height: 150px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid rgba(139,92,246,0.2);
        }

        .profile-info {
          flex-grow: 1;
        }

        .profile-name {
          font-size: 2rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 0.5rem 0;
        }

        .location {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          color: #6b7280;
          margin-bottom: 1rem;
        }

        .location-icon {
          font-size: 0.875rem;
        }

        .stats-row {
          display: flex;
          gap: 2rem;
          margin-bottom: 1.5rem;
        }

        .stat {
          display: flex;
          flex-direction: column;
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

        .btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .btn-primary {
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
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

        .btn-danger {
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

        .about-card {
          padding: 1.5rem;
        }

        .card-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 1rem 0;
        }

        .bio-text {
          color: #4b5563;
          line-height: 1.6;
        }

        .posts-section {
          max-width: 800px;
          margin: 0 auto;
        }

        .section-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 1rem;
        }
      `}</style>
    </div>
  );
}
