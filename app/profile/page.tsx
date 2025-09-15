// app/profile/page.tsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabaseClient";
import AvatarUploader from "@/components/AvatarUploader";

// Dynamic imports to prevent SSR issues
const ProfileInviteQR = dynamic(() => import("@/components/ProfileInviteQR"), {
  ssr: false
});

const ProfileCandleWidget = dynamic(() => import("@/components/ProfileCandleWidget"), {
  ssr: false
});

const PhotosFeed = dynamic(() => import("@/components/PhotosFeed"), {
  ssr: false
});

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location_text: string | null;
  location_is_public: boolean | null;
  show_mutuals: boolean | null;
};

// Animated Counter Component
function AnimatedCounter({ value, label }: { value: number; label: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    if (value === 0) return;
    let start = 0;
    const duration = 1000;
    const increment = value / (duration / 16);
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(start));
      }
    }, 16);
    
    return () => clearInterval(timer);
  }, [value]);

  return (
    <div className="stat-card">
      <div className="stat-number">{displayValue.toLocaleString()}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [inviteExpanded, setInviteExpanded] = useState(false);
  const [friendsCount, setFriendsCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  const displayName = useMemo(() => profile?.full_name || "Member", [profile?.full_name]);

  // Track when component is mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  // Load profile
  useEffect(() => {
    async function loadProfile() {
      if (!userId) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();
        
        if (data) {
          setProfile(data);
        } else {
          // Initialize empty profile
          setProfile({
            id: userId,
            full_name: "",
            avatar_url: "",
            bio: "",
            location_text: "",
            location_is_public: false,
            show_mutuals: true
          });
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    }
    
    loadProfile();
  }, [userId]);

  // Load friends count
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { count } = await supabase
        .from("friendships")
        .select("a", { count: "exact", head: true })
        .or(`a.eq.${userId},b.eq.${userId}`);
      if (typeof count === "number") setFriendsCount(count);
    })();
  }, [userId]);

  // Save profile
  async function handleSave() {
    if (!userId || !profile) return;
    
    setSaving(true);
    setStatus("Saving...");
    
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: userId,
          full_name: profile.full_name,
          bio: profile.bio,
          location_text: profile.location_text,
          location_is_public: profile.location_is_public,
          show_mutuals: profile.show_mutuals,
          avatar_url: profile.avatar_url,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      setStatus("Saved ✅");
      setEditMode(false);
      setTimeout(() => setStatus(null), 3000);
    } catch (err: any) {
      console.error("Save error:", err);
      setStatus("Save failed");
      setTimeout(() => setStatus(null), 3000);
    } finally {
      setSaving(false);
    }
  }

  // Update profile field
  function updateProfile(field: keyof Profile, value: any) {
    if (profile) {
      setProfile({ ...profile, [field]: value });
    }
  }

  if (loading) {
    return (
      <div className="profile-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <span>Loading your amazing profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Your Profile</h1>
        <div className="header-controls">
          <Link href="/business" className="btn btn-neutral">
            Business Profile
          </Link>
          <button
            className="btn btn-primary"
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? "✓ Done" : "✏️ Edit"}
          </button>
        </div>
      </div>

      {/* Status */}
      {status && (
        <div className={`status-message ${status.includes('failed') ? 'error' : 'success'}`}>
          {status}
        </div>
      )}

      {/* Main Profile Card */}
      {profile && (
        <div className="card profile-card">
          <div className="profile-layout">
            {/* Avatar */}
            <div className="avatar-section">
              <AvatarUploader
                userId={userId}
                value={profile.avatar_url}
                onChange={(url) => updateProfile('avatar_url', url)}
                label="Profile photo"
                size={150}
              />
            </div>

            {/* Profile Info */}
            <div className="profile-info">
              {editMode ? (
                <div className="edit-form">
                  <div className="form-field">
                    <label>Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={profile.full_name || ""}
                      onChange={(e) => updateProfile('full_name', e.target.value)}
                      placeholder="Your name"
                    />
                  </div>

                  <div className="form-field">
                    <label>Location</label>
                    <div className="location-row">
                      <input
                        type="text"
                        className="form-input"
                        value={profile.location_text || ""}
                        onChange={(e) => updateProfile('location_text', e.target.value)}
                        placeholder="City, State"
                      />
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={!!profile.location_is_public}
                          onChange={(e) => updateProfile('location_is_public', e.target.checked)}
                        />
                        <span>Public</span>
                      </label>
                    </div>
                  </div>

                  <div className="form-field">
                    <label>Bio</label>
                    <textarea
                      className="form-input textarea"
                      rows={3}
                      value={profile.bio || ""}
                      onChange={(e) => updateProfile('bio', e.target.value)}
                      placeholder="Tell people about yourself..."
                    />
                  </div>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={!!profile.show_mutuals}
                      onChange={(e) => updateProfile('show_mutuals', e.target.checked)}
                    />
                    <span>Show mutual friends</span>
                  </label>

                  <button
                    className="btn btn-primary save-button"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              ) : (
                <div className="profile-display">
                  <h2 className="profile-name">
                    {displayName}
                  </h2>
                  
                  {/* Stats Row */}
                  <div className="stats-row">
                    <div className="stats-grid">
                      <AnimatedCounter value={0} label="Followers" />
                      <AnimatedCounter value={0} label="Following" />
                      <AnimatedCounter value={friendsCount} label="Friends" />
                    </div>
                    
                    <div className="profile-actions">
                      <Link href="/friends" className="btn btn-compact">
                        👥 Browse Friends
                      </Link>
                      <Link href="/gratitude" className="btn btn-compact">
                        🙏 Gratitude
                      </Link>
                      <Link href="/messages" className="btn btn-compact">
                        💬 Messages
                      </Link>
                    </div>
                  </div>
                  
                  {profile.location_is_public && profile.location_text && (
                    <p className="profile-location">📍 {profile.location_text}</p>
                  )}
                  
                  {profile.bio ? (
                    <p className="profile-bio">{profile.bio}</p>
                  ) : (
                    <p className="empty-state">Add a bio using the Edit button above.</p>
                  )}

                  {/* Invite Friends Section - Only render when mounted and userId exists */}
                  {mounted && userId && (
                    <div className="invite-section">
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
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sacred Candles Widget - Only render when mounted and userId exists */}
      {mounted && userId && <ProfileCandleWidget userId={userId} isOwner={true} />}

      {/* Sacred Candles Card */}
      <div className="card candles-card">
        <div className="candles-icon">🕯️</div>
        <h3 className="candles-title">My Sacred Candles</h3>
        <p className="candles-description">View your eternal memorials and prayer candles</p>
        <Link href="/profile/candles" className="btn btn-candles">
          View My Candles ✨
        </Link>
      </div>

      {/* Photos Feed - Only render when mounted and userId exists */}
      {mounted && userId && <PhotosFeed userId={userId} />}

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
          gap: 0.75rem;
        }

        .btn {
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          font-weight: 500;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.25rem;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }

        .btn-primary {
          background: linear-gradient(135deg, var(--brand), #8b5cf6);
          color: white;
        }

        .btn-neutral {
          background: white;
          color: #374151;
          border: 1px solid #e5e7eb;
        }

        .btn-compact {
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          background: white;
          color: #374151;
          border: 1px solid #e5e7eb;
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
        }

        .status-message.error {
          background: #fef2f2;
          color: #dc2626;
        }

        .card {
          background: white;
          border-radius: 0.75rem;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
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

        .profile-info {
          flex-grow: 1;
          min-width: 0;
        }

        .profile-name {
          font-size: 1.875rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 0.5rem 0;
        }

        .stats-row {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        @media (min-width: 768px) {
          .stats-row {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          max-width: 20rem;
        }

        .stat-card {
          background: rgba(255,255,255,0.8);
          border: 1px solid rgba(139,92,246,0.2);
          border-radius: 0.75rem;
          padding: 0.75rem;
          text-align: center;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(139,92,246,0.2);
          background: rgba(255,255,255,0.95);
          border-color: rgba(139,92,246,0.3);
        }

        .stat-number {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--brand);
          margin-bottom: 0.25rem;
        }

        .stat-label {
          font-size: 0.75rem;
          color: #6b7280;
          font-weight: 500;
        }

        .profile-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .profile-location {
          color: #6b7280;
          margin: 0 0 0.5rem 0;
        }

        .profile-bio {
          color: #374151;
          line-height: 1.6;
        }

        .empty-state {
          color: #9ca3af;
          font-style: italic;
        }

        .invite-section {
          margin-top: 1.5rem;
          max-width: 20rem;
        }

        .btn.btn-special {
          background: linear-gradient(135deg, #c084fc, #a78bfa);
          color: white;
          border: none;
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          font-size: 0.875rem;
          padding: 0.75rem 1rem;
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

        .edit-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-field label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .form-input {
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          font-size: 16px;
        }

        .form-input:focus {
          outline: none;
          border-color: var(--brand);
          box-shadow: 0 0 0 3px rgba(139,92,246,0.1);
        }

        .textarea {
          resize: vertical;
        }

        .location-row {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .location-row .form-input {
          flex: 1;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          font-size: 0.875rem;
        }

        .save-button {
          margin-top: 0.5rem;
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
          padding: 2rem;
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
      `}</style>
    </div>
  );
}
