// app/profile/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabaseClient";
import ProfileHeader from "./components/ProfileHeader";
import ProfileEditForm from "./components/ProfileEditForm";
import ProfileAboutSection from "./components/ProfileAboutSection";
import ProfilePrivacySettings from "./components/ProfilePrivacySettings";
import ProfileSocialLinks from "./components/ProfileSocialLinks";
import ProfileAnalytics from "./components/ProfileAnalytics";
import { useProfileData } from "./hooks/useProfileData";
import { useProfileSave } from "./hooks/useProfileSave";
import type { Profile } from "./types/profile";

// Dynamic imports to prevent SSR issues
const ProfileInviteQR = dynamic(() => import("@/components/ProfileInviteQR"), {
  ssr: false,
  loading: () => <div>Loading...</div>
});

const ProfileCandleWidget = dynamic(() => import("@/components/ProfileCandleWidget"), {
  ssr: false,
  loading: () => <div>Loading candles...</div>
});

const PhotosFeed = dynamic(() => import("@/components/PhotosFeed"), {
  ssr: false,
  loading: () => <div>Loading photos...</div>
});

// Hook for desktop detection
function useIsDesktop(minWidth = 1024) {
  const [isDesktop, setIsDesktop] = useState<boolean>(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(min-width:${minWidth}px)`);
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [minWidth]);
  return isDesktop;
}

export default function ProfilePage() {
  // Core state
  const [userId, setUserId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [inviteExpanded, setInviteExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState<'about' | 'privacy' | 'social'>('about');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [tableMissing, setTableMissing] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const isDesktop = useIsDesktop(1024);
  
  // Ensure component is mounted before rendering client-side components
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Get current user
  useEffect(() => { 
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      setUserId(user?.id ?? null);
    });
  }, []);

  // Use custom hooks
  const { profile, setProfile, loading, error, friendsCount, reload } = useProfileData(userId);
  const { save: saveProfile, saving, uploadImage } = useProfileSave();

  // Check for table errors
  useEffect(() => {
    if (error && error.includes('relation') && error.includes('does not exist')) {
      setTableMissing(true);
    }
  }, [error]);

  // Initialize default profile if needed
  useEffect(() => {
    if (!loading && !profile && userId) {
      setProfile({
        id: userId,
        full_name: "",
        avatar_url: "",
        bio: "",
        location: "",
        location_text: "",
        location_is_public: false,
        show_mutuals: true,
        username: "",
        cover_url: "",
        tagline: "",
        interests: [],
        website_url: "",
        social_links: {},
        languages: [],
        visibility: "public",
        discoverable: true,
        allow_messages: "friends",
        allow_tags: "review_required",
        allow_collaboration_on_posts: "friends",
        default_post_visibility: "public",
        show_online_status: true,
        phone: "",
        birthday: "",
        internal_notes: "",
        verified: false,
        friends_count: 0,
        posts_count: 0,
        collab_posts_count: 0,
        profile_views_30d: 0
      });
    }
  }, [loading, profile, userId, setProfile]);

  const displayName = useMemo(() => profile?.full_name || "Member", [profile?.full_name]);

  // Handle profile updates
  const handleProfileChange = (updates: Partial<Profile>) => {
    if (profile) {
      setProfile({ ...profile, ...updates });
    }
  };

  // Handle save with image uploads
  const handleSave = async () => {
    if (!userId || !profile) return;
    
    setStatus("Saving…");
    
    try {
      let updatedProfile = { ...profile };
      
      // Upload avatar if changed
      if (avatarFile) {
        const avatarUrl = await uploadImage(avatarFile, userId, 'avatars');
        if (avatarUrl) {
          updatedProfile.avatar_url = avatarUrl;
        }
      }
      
      // Upload cover if changed
      if (coverFile) {
        const coverUrl = await uploadImage(coverFile, userId, 'covers');
        if (coverUrl) {
          updatedProfile.cover_url = coverUrl;
        }
      }
      
      // Save profile
      const success = await saveProfile(userId, updatedProfile);
      
      if (success) {
        setStatus("Saved ✅");
        setEditMode(false);
        setAvatarFile(null);
        setCoverFile(null);
        setProfile(updatedProfile);
        setTimeout(() => setStatus(null), 3000);
      } else {
        setStatus("Save failed. Please try again.");
        setTimeout(() => setStatus(null), 5000);
      }
    } catch (err: any) {
      console.error("Save error:", err);
      setStatus(`Error: ${err.message}`);
      setTimeout(() => setStatus(null), 5000);
    }
  };

  return (
    <div className="profile-page">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Your Profile</h1>
        <div className="header-controls">
          <Link href="/business" className="btn btn-neutral">Business Profile</Link>
          <button 
            className="btn btn-primary"
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? "✓ Done" : "✏️ Edit"}
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {status && (
        <div className={`status-message ${status.includes('failed') || status.includes('Error') ? 'error' : 'success'}`}>
          {status}
        </div>
      )}

      {/* Error State */}
      {tableMissing && (
        <div className="error-banner">
          <div className="error-title">Tables not found</div>
          <div className="error-message">Run the SQL migration, then reload.</div>
        </div>
      )}

      {/* Main Profile Header with Cover, Avatar, Stats */}
      <ProfileHeader
        profile={profile}
        userId={userId}
        friendsCount={friendsCount}
        editMode={editMode}
        isDesktop={isDesktop}
        onProfileChange={handleProfileChange}
        onSave={handleSave}
        saving={saving}
      />

      {/* Invite Friends Section */}
      {mounted && profile && userId && (
        <div className="card invite-card">
          <button
            onClick={() => setInviteExpanded(!inviteExpanded)}
            className="btn btn-special invite-button"
          >
            🎉 Invite Friends
            <span className={`invite-arrow ${inviteExpanded ? 'expanded' : ''}`}>▼</span>
          </button>
          
          {inviteExpanded && (
            <div className="invite-content">
              <ProfileInviteQR userId={userId} embed qrSize={180} />
            </div>
          )}
        </div>
      )}

      {/* Edit Mode */}
      {editMode && profile ? (
        <div className="card edit-card">
          <h3 className="card-title">
            <span className="title-icon">✏️</span>
            Edit Your Information
          </h3>
          
          {/* Mobile Tab Navigation */}
          {!isDesktop && (
            <div className="edit-tabs">
              <button
                className={`tab ${activeSection === 'about' ? 'active' : ''}`}
                onClick={() => setActiveSection('about')}
              >
                About
              </button>
              <button
                className={`tab ${activeSection === 'privacy' ? 'active' : ''}`}
                onClick={() => setActiveSection('privacy')}
              >
                Privacy
              </button>
              <button
                className={`tab ${activeSection === 'social' ? 'active' : ''}`}
                onClick={() => setActiveSection('social')}
              >
                Social
              </button>
            </div>
          )}
          
          {/* Edit Forms */}
          <div className="edit-sections">
            {(isDesktop || activeSection === 'about') && (
              <ProfileEditForm
                profile={profile}
                onChange={handleProfileChange}
                onSave={handleSave}
                saving={saving}
                isDesktop={isDesktop}
              />
            )}
            
            {(isDesktop || activeSection === 'privacy') && (
              <ProfilePrivacySettings
                profile={profile}
                onChange={handleProfileChange}
                isEditing={true}
              />
            )}
            
            {(isDesktop || activeSection === 'social') && (
              <ProfileSocialLinks
                profile={profile}
                onChange={handleProfileChange}
                isEditing={true}
              />
            )}
          </div>
        </div>
      ) : (
        /* View Mode */
        profile && (
          <>
            <ProfileAboutSection profile={profile} isOwner={true} />
            <ProfileSocialLinks profile={profile} onChange={handleProfileChange} isEditing={false} />
            <ProfileAnalytics profile={profile} isOwner={true} />
          </>
        )
      )}

      {/* Sacred Candles Widget */}
      {mounted && userId && <ProfileCandleWidget userId={userId} isOwner={true} />}

      {/* Sacred Candles Link Card */}
      <div className="card candles-card">
        <div className="candles-icon">🕯️</div>
        <h3 className="candles-title">My Sacred Candles</h3>
        <p className="candles-description">View your eternal memorials and prayer candles</p>
        <Link href="/profile/candles" className="btn btn-candles">
          View My Candles ✨
        </Link>
      </div>

      {/* Photos Feed */}
      {mounted && userId && <PhotosFeed userId={userId} />}

      {/* Loading State */}
      {loading && (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <span>Loading your amazing profile...</span>
        </div>
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
            radial-gradient(circle at 20% 30%, rgba(139,92,246,0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(245,158,11,0.08) 0%, transparent 50%),
            radial-gradient(circle at 40% 80%, rgba(16,185,129,0.06) 0%, transparent 50%);
          pointer-events: none;
          z-index: 0;
        }

        .profile-page > * {
          position: relative;
          z-index: 1;
        }

        .page-header {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        @media (min-width: 768px) {
          .page-header {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }
        }

        .page-title {
          font-size: 2rem;
          font-weight: 700;
          background: linear-gradient(135deg, var(--brand), #8b5cf6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0;
        }

        .header-controls {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          align-items: center;
        }

        .status-message {
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          margin-bottom: 1rem;
          font-weight: 500;
          text-align: center;
        }

        .status-message.success {
          background: #d1fae5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }

        .status-message.error {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }

        .error-banner {
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 0.75rem;
          padding: 1rem;
          margin-bottom: 1.5rem;
        }

        .error-title {
          font-weight: 600;
          color: #dc2626;
        }

        .error-message {
          color: #b91c1c;
          font-size: 0.875rem;
        }

        .card {
          background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,250,252,0.9));
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.6);
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
          border-radius: 0.75rem;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .invite-card {
          max-width: 20rem;
          margin: 0 auto 1.5rem;
        }

        .btn {
          transition: all 0.2s ease;
          font-weight: 500;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.25rem;
          font-size: 16px;
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          cursor: pointer;
        }

        .btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }

        .btn-primary {
          background: linear-gradient(135deg, var(--brand), #8b5cf6);
          color: white;
          border: none;
        }

        .btn-primary:hover {
          background: linear-gradient(135deg, #7c2d12, #6d28d9);
        }

        .btn-neutral {
          background: rgba(255,255,255,0.9);
          color: #374151;
          border: 1px solid rgba(139,92,246,0.2);
        }

        .btn-neutral:hover {
          background: white;
          border-color: rgba(139,92,246,0.3);
        }

        .btn.btn-special {
          background: linear-gradient(135deg, #c084fc, #a78bfa);
          color: white;
          border: none;
          width: 100%;
        }

        .btn.btn-special:hover {
          background: linear-gradient(135deg, #a78bfa, #9333ea);
          box-shadow: 0 4px 12px rgba(196,132,252,0.4);
        }

        .invite-arrow {
          transition: transform 0.2s ease;
          font-size: 0.75rem;
        }

        .invite-arrow.expanded {
          transform: rotate(180deg);
        }

        .invite-content {
          margin-top: 1rem;
          padding: 1rem;
          background: rgba(255,255,255,0.6);
          border: 1px solid rgba(255,255,255,0.8);
          border-radius: 0.75rem;
        }

        .card-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 1rem 0;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .title-icon {
          width: 1.75rem;
          height: 1.75rem;
          background: linear-gradient(135deg, var(--brand), #8b5cf6);
          border-radius: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 0.875rem;
        }

        .edit-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
          padding: 0.25rem;
          background: rgba(139,92,246,0.05);
          border-radius: 0.5rem;
        }

        .tab {
          flex: 1;
          padding: 0.5rem;
          border: none;
          background: transparent;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          color: #6b7280;
        }

        .tab.active {
          background: white;
          color: var(--brand);
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .candles-card {
          background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(254,243,199,0.1));
          border: 1px solid rgba(245,158,11,0.2);
          text-align: center;
          transition: all 0.3s ease;
        }

        .candles-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(245,158,11,0.15);
          background: linear-gradient(135deg, rgba(255,255,255,1), rgba(254,243,199,0.15));
        }

        .candles-icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
          animation: flicker 2s ease-in-out infinite;
        }

        @keyframes flicker {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }

        .candles-title {
          margin: 0 0 0.5rem 0;
          color: #78350f;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .candles-description {
          margin: 0 0 1rem 0;
          color: #92400e;
          opacity: 0.8;
          font-size: 0.875rem;
        }

        .btn-candles {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          font-weight: 500;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          text-decoration: none;
          font-size: 16px;
          border: none;
        }

        .btn-candles:hover {
          background: linear-gradient(135deg, #d97706, #b45309);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(245,158,11,0.3);
        }

        .loading-state {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 2rem 0;
          color: #6b7280;
        }

        .loading-spinner {
          width: 1.5rem;
          height: 1.5rem;
          border: 2px solid #e5e7eb;
          border-top: 2px solid var(--brand);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 640px) {
          .profile-page {
            padding: 1rem 0.5rem;
          }
          
          .invite-card {
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
