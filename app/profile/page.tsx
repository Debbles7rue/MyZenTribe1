// app/profile/page.tsx - FIXED BUILD ERROR
"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

// Import all the broken-down components  
import ProfileAboutSection from "./components/ProfileAboutSection";
import ProfilePrivacySettings from "./components/ProfilePrivacySettings";
import ProfileSocialLinks from "./components/ProfileSocialLinks";

// Import existing components that work well
import PhotosFeed from "@/components/PhotosFeed";
import ProfileInviteQR from "@/components/ProfileInviteQR";
import ProfileCandleWidget from "@/components/ProfileCandleWidget";
import AvatarUploader from "@/components/AvatarUploader";

// Import hooks
import { useProfileData } from "./hooks/useProfileData";
import { useProfileSave } from "./hooks/useProfileSave";
import { useIsDesktop } from "./hooks/useIsDesktop";

// Import types
import type { Profile } from "./types/profile";

// Animated counter component from original
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
  // Core state
  const [userId, setUserId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [activeSection, setActiveSection] = useState<'about' | 'privacy' | 'social'>('about');
  const [inviteExpanded, setInviteExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // File upload states
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  
  // Custom hooks - pass userId only after mounting
  const isDesktop = useIsDesktop(1024);
  const { profile, setProfile, loading, error, friendsCount, reload } = useProfileData(mounted ? userId : null);
  const { save, saving, status, uploadImage } = useProfileSave();

  // Get user on mount
  useEffect(() => {
    setMounted(true);
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      setUserId(user?.id ?? null);
    });
  }, []);

  const displayName = useMemo(() => profile?.full_name || "Member", [profile?.full_name]);

  // Handle profile updates
  const handleProfileChange = (updates: Partial<Profile>) => {
    if (profile) {
      setProfile({ ...profile, ...updates });
    }
  };

  // Toggle interest
  const toggleInterest = (interest: string) => {
    const interests = profile?.interests || [];
    const updated = interests.includes(interest)
      ? interests.filter(i => i !== interest)
      : [...interests, interest];
    handleProfileChange({ interests: updated });
  };

  // Handle save with image uploads
  const handleSave = async () => {
    if (!userId || !profile) return;
    
    let updatedProfile = { ...profile };
    
    // Upload avatar if changed
    if (avatarFile && userId) {
      const avatarUrl = await uploadImage(avatarFile, userId, 'avatars');
      if (avatarUrl) {
        updatedProfile.avatar_url = avatarUrl;
      }
    }
    
    // Upload cover if changed
    if (coverFile && userId) {
      const coverUrl = await uploadImage(coverFile, userId, 'covers');
      if (coverUrl) {
        updatedProfile.cover_url = coverUrl;
      }
    }
    
    const success = await save(userId, updatedProfile);
    if (success) {
      setEditMode(false);
      setAvatarFile(null);
      setCoverFile(null);
      setProfile(updatedProfile);
      reload();
    }
  };

  // Avatar change handler
  async function onAvatarChange(url: string) {
    handleProfileChange({ avatar_url: url });
  }

  // Don't render until mounted to avoid hydration issues
  if (!mounted) {
    return (
      <div className="profile-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  // Loading state
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

  // Error state
  if (error) {
    return (
      <div className="profile-page">
        <div className="error-banner">
          <div className="error-title">Error Loading Profile</div>
          <div className="error-message">{error}</div>
          <button onClick={reload} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Not logged in state
  if (!userId) {
    return (
      <div className="profile-page">
        <div className="error-banner">
          <div className="error-title">Not Logged In</div>
          <div className="error-message">Please log in to view your profile</div>
          <Link href="/auth/login" className="btn btn-primary">
            Log In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* Page Header */}
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

      {/* Status Messages */}
      {status && (
        <div className={`status-message ${status.type}`}>
          {status.message}
        </div>
      )}

      {/* Main Profile Card with Cover */}
      <div className="card profile-main-card">
        {/* Cover Image Section */}
        <div className="cover-section">
          {profile?.cover_url ? (
            <img src={profile.cover_url} alt="Cover" className="cover-image" />
          ) : (
            <div className="cover-gradient" />
          )}
          
          {editMode && (
            <label className="cover-upload-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
              <span>{isDesktop ? "Change Cover" : "Cover"}</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                style={{ display: "none" }}
              />
            </label>
          )}
        </div>

        <div className={`profile-layout ${isDesktop ? 'desktop' : 'mobile'}`}>
          {/* Avatar Section */}
          <div className="avatar-section">
            <div className="avatar-wrapper">
              {editMode ? (
                <div className="avatar-edit">
                  <img
                    src={avatarFile ? URL.createObjectURL(avatarFile) : (profile?.avatar_url || "/default-avatar.png")}
                    alt="Profile"
                    className="avatar-image"
                    style={{ width: 160, height: 160 }}
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                    className="file-input"
                    id="avatar-upload"
                  />
                  <label htmlFor="avatar-upload" className="file-label">Change Photo</label>
                </div>
              ) : userId ? (
                <AvatarUploader 
                  userId={userId} 
                  value={profile?.avatar_url || null} 
                  onChange={onAvatarChange} 
                  label="Profile photo" 
                  size={160} 
                />
              ) : (
                <img
                  src={profile?.avatar_url || "/default-avatar.png"}
                  alt="Profile"
                  className="avatar-image"
                  style={{ width: 160, height: 160 }}
                />
              )}
              <div className="avatar-badge">✨</div>
              {profile?.verified && <div className="verified-badge">✓</div>}
            </div>
          </div>

          {/* Profile Info */}
          <div className="profile-info">
            <h2 className="profile-name">
              {displayName}
              {profile?.username && <span className="username">@{profile.username}</span>}
            </h2>
            {profile?.tagline && !editMode && (
              <p className="tagline">{profile.tagline}</p>
            )}
            
            {/* Stats Row */}
            <div className="stats-row">
              <div className="stats-grid">
                <AnimatedCounter value={0} label="Followers" />
                <AnimatedCounter value={0} label="Following" />
                <AnimatedCounter value={friendsCount} label="Friends" />
              </div>
              
              {/* Action Buttons */}
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

            {/* Invite Friends */}
            <div className="invite-section">
              <button
                onClick={() => setInviteExpanded(!inviteExpanded)}
                className="btn btn-special invite-button"
              >
                🎉 Invite Friends
                <span className={`invite-arrow ${inviteExpanded ? 'expanded' : ''}`}>▼</span>
              </button>
              
              {inviteExpanded && userId && (
                <div className="invite-content">
                  <ProfileInviteQR userId={userId} embed qrSize={180} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Mode */}
      {editMode ? (
        <div className="card edit-card">
          <h3 className="card-title">
            <span className="title-icon">✏️</span>
            Edit Your Information
          </h3>
          
          {/* Tab navigation for mobile */}
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
          
          <div className="edit-form">
            {/* About Section */}
            {(isDesktop || activeSection === 'about') && (
              <>
                <div className="form-field">
                  <label className="form-label">Name</label>
                  <input 
                    className="form-input"
                    value={profile?.full_name || ""} 
                    onChange={(e) => handleProfileChange({ full_name: e.target.value })} 
                    placeholder="Your full name"
                    autoComplete="name"
                    inputMode="text"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">Username</label>
                  <div className="username-input-group">
                    <span className="username-prefix">@</span>
                    <input 
                      className="form-input"
                      value={profile?.username || ""} 
                      onChange={(e) => handleProfileChange({ username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })} 
                      placeholder="username"
                      autoComplete="off"
                      inputMode="text"
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label className="form-label">Tagline</label>
                  <input 
                    className="form-input"
                    value={profile?.tagline || ""} 
                    onChange={(e) => handleProfileChange({ tagline: e.target.value })} 
                    placeholder="Short status or description"
                    maxLength={100}
                    autoComplete="off"
                    inputMode="text"
                  />
                </div>

                <div className={`form-row ${isDesktop ? 'desktop' : 'mobile'}`}>
                  <div className="form-field flex-grow">
                    <label className="form-label">Location</label>
                    <input 
                      className="form-input"
                      value={profile?.location_text || ""} 
                      onChange={(e) => handleProfileChange({ location_text: e.target.value })} 
                      placeholder="City, State"
                      autoComplete="address-level2"
                      inputMode="text"
                    />
                  </div>
                  <div className="form-field checkbox-field">
                    <label className="checkbox-label compact">
                      <input 
                        type="checkbox"
                        checked={!!profile?.location_is_public} 
                        onChange={(e) => handleProfileChange({ location_is_public: e.target.checked })} 
                      />
                      <span>Public</span>
                    </label>
                  </div>
                </div>

                <div className="form-field">
                  <label className="form-label">Bio</label>
                  <textarea 
                    className="form-input textarea"
                    rows={3} 
                    value={profile?.bio || ""} 
                    onChange={(e) => handleProfileChange({ bio: e.target.value })} 
                    placeholder="Tell people about yourself..."
                    inputMode="text"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">
                    🌐 Website
                  </label>
                  <input 
                    className="form-input"
                    type="url"
                    value={profile?.website_url || ""} 
                    onChange={(e) => handleProfileChange({ website_url: e.target.value })} 
                    placeholder="https://yourwebsite.com"
                    autoComplete="url"
                    inputMode="url"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">Languages</label>
                  <input 
                    className="form-input"
                    value={profile?.languages?.join(", ") || ""} 
                    onChange={(e) => handleProfileChange({ languages: e.target.value.split(",").map(l => l.trim()).filter(Boolean) })} 
                    placeholder="English, Spanish, French"
                    autoComplete="off"
                    inputMode="text"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">
                    # Interests
                  </label>
                  <div className="interests-picker">
                    {["Meditation", "Yoga", "Reiki", "Nature", "Music", "Art", "Travel", "Reading", "Cooking", "Photography"].map(interest => (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => toggleInterest(interest)}
                        className={`interest-chip ${profile?.interests?.includes(interest) ? 'active' : ''}`}
                      >
                        {interest}
                      </button>
                    ))}
                  </div>
                  <input 
                    className="form-input"
                    placeholder="Add custom interests (comma separated)"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const input = e.currentTarget as HTMLInputElement;
                        const newInterests = input.value.split(',').map(i => i.trim()).filter(Boolean);
                        handleProfileChange({ interests: [...(profile?.interests || []), ...newInterests] });
                        input.value = '';
                      }
                    }}
                  />
                </div>

                <label className="checkbox-label">
                  <input 
                    type="checkbox"
                    checked={!!profile?.show_mutuals} 
                    onChange={(e) => handleProfileChange({ show_mutuals: e.target.checked })} 
                  />
                  <span>Show mutual friends</span>
                </label>

                {/* Private fields section */}
                <div className="private-section">
                  <h4 className="section-subtitle">
                    🔒 Private Information (only you see this)
                  </h4>
                  
                  <div className="form-field">
                    <label className="form-label">
                      📝 Personal Notes
                    </label>
                    <textarea 
                      className="form-input textarea"
                      rows={2} 
                      value={profile?.internal_notes || ""} 
                      onChange={(e) => handleProfileChange({ internal_notes: e.target.value })} 
                      placeholder="Reminders, drafts, private thoughts..."
                      inputMode="text"
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label">
                      📱 Phone Number
                    </label>
                    <input 
                      className="form-input"
                      type="tel"
                      value={profile?.phone || ""} 
                      onChange={(e) => handleProfileChange({ phone: e.target.value })} 
                      placeholder="Your phone number"
                      autoComplete="tel"
                      inputMode="tel"
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label">
                      🎂 Birthday
                    </label>
                    <input 
                      className="form-input"
                      type="date"
                      value={profile?.birthday || ""} 
                      onChange={(e) => handleProfileChange({ birthday: e.target.value })} 
                    />
                  </div>
                </div>
              </>
            )}

            {/* Privacy Settings */}
            {(isDesktop || activeSection === 'privacy') && profile && (
              <ProfilePrivacySettings
                profile={profile}
                onChange={handleProfileChange}
                isEditing={true}
              />
            )}

            {/* Social Links */}
            {(isDesktop || activeSection === 'social') && profile && (
              <ProfileSocialLinks
                profile={profile}
                onChange={handleProfileChange}
                isEditing={true}
              />
            )}

            <div className="form-actions">
              <button 
                className="btn btn-primary save-button"
                onClick={handleSave} 
                disabled={saving}
              >
                {saving ? "💾 Saving..." : "✨ Save Changes"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* View Mode */
        profile && <ProfileAboutSection profile={profile} isOwner={true} />
      )}

      {/* Candle Widget */}
      {userId && <ProfileCandleWidget userId={userId} isOwner={true} />}

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
      {userId && <PhotosFeed userId={userId} />}

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

        .status-message.info {
          background: #dbeafe;
          color: #1e40af;
          border: 1px solid #93c5fd;
        }

        .error-banner {
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 0.75rem;
          padding: 1rem;
          margin-bottom: 1.5rem;
          text-align: center;
        }

        .error-title {
          font-weight: 600;
          color: #dc2626;
          margin-bottom: 0.5rem;
        }

        .error-message {
          color: #b91c1c;
          font-size: 0.875rem;
          margin-bottom: 1rem;
        }

        .profile-main-card {
          padding: 0;
          margin-bottom: 1.5rem;
          background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,250,252,0.9));
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.6);
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
          overflow: hidden;
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

        /* Cover section styles */
        .cover-section {
          position: relative;
          height: 200px;
          width: 100%;
        }

        .cover-image, .cover-gradient {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .cover-gradient {
          background: linear-gradient(135deg, #c4b5fd, #f0abfc, #fcd34d);
        }

        .cover-upload-btn {
          position: absolute;
          bottom: 1rem;
          right: 1rem;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          transition: all 0.2s;
          border: 1px solid rgba(139,92,246,0.2);
        }

        .cover-upload-btn:hover {
          background: rgba(255, 255, 255, 1);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(139,92,246,0.2);
        }

        .profile-layout {
          display: flex;
          gap: 2rem;
          align-items: flex-start;
          padding: 2rem;
        }

        .profile-layout.mobile {
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .profile-layout.desktop {
          flex-direction: row;
          text-align: left;
        }

        .avatar-section {
          flex-shrink: 0;
          position: relative;
          margin-top: -4rem;
        }

        .avatar-wrapper {
          position: relative;
          display: inline-block;
        }

        .avatar-edit {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .avatar-image {
          border-radius: 50%;
          object-fit: cover;
          border: 4px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .file-input {
          position: absolute;
          opacity: 0;
          width: 1px;
          height: 1px;
        }

        .file-label {
          padding: 0.5rem 1rem;
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: white;
          border-radius: 0.5rem;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .avatar-badge {
          position: absolute;
          bottom: -0.5rem;
          right: -0.5rem;
          width: 2rem;
          height: 2rem;
          background: linear-gradient(135deg, var(--brand), #8b5cf6);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.875rem;
          color: white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }

        .verified-badge {
          position: absolute;
          top: 0;
          right: 0;
          width: 1.5rem;
          height: 1.5rem;
          background: #3b82f6;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: bold;
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
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .username {
          font-size: 1rem;
          font-weight: 400;
          color: #6b7280;
        }

        .tagline {
          font-size: 0.875rem;
          color: #9ca3af;
          margin: 0 0 1rem 0;
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

        .btn-compact {
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          border-radius: 0.5rem;
        }

        .invite-section {
          max-width: 20rem;
        }

        .btn.btn-special {
          background: linear-gradient(135deg, #c084fc, #a78bfa);
          color: white;
          border: none;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          font-size: 0.875rem;
          padding: 0.75rem 1rem;
        }

        .btn.btn-special:hover {
          background: linear-gradient(135deg, #a78bfa, #9333ea);
          transform: translateY(-1px);
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

        .edit-card {
          padding: 1.5rem;
          margin-bottom: 1.5rem;
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
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(254,243,199,0.1));
          backdrop-filter: blur(5px);
          border: 1px solid rgba(245,158,11,0.2);
          border-radius: 0.75rem;
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

        .form-row {
          display: grid;
          gap: 1rem;
        }

        .form-row.desktop {
          grid-template-columns: 1fr auto;
        }

        .form-row.mobile {
          grid-template-columns: 1fr;
        }

        .flex-grow {
          flex-grow: 1;
        }

        .checkbox-field {
          align-items: end;
        }

        .form-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .form-input {
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          background: rgba(255,255,255,0.9);
          transition: all 0.2s ease;
          font-size: 16px;
          min-height: 44px;
        }

        .form-input:focus {
          outline: none;
          border-color: var(--brand);
          box-shadow: 0 0 0 3px rgba(139,92,246,0.1);
        }

        .form-input.textarea {
          resize: vertical;
          min-height: 3rem;
        }

        .username-input-group {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .username-prefix {
          color: #6b7280;
          font-size: 1rem;
        }

        .interests-picker {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .interest-chip {
          padding: 0.375rem 0.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 1rem;
          background: white;
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s;
          min-height: 44px;
          display: flex;
          align-items: center;
        }

        .interest-chip:hover {
          background: #f3f4f6;
        }

        .interest-chip.active {
          background: var(--brand);
          color: white;
          border-color: var(--brand);
        }

        .section-subtitle {
          font-size: 1rem;
          font-weight: 600;
          color: #1f2937;
          margin: 1.5rem 0 1rem 0;
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .section-subtitle:first-child {
          border-top: none;
          padding-top: 0;
          margin-top: 0;
        }

        .private-section {
          margin-top: 1.5rem;
          padding-top: 1rem;
          border-top: 2px dashed #e5e7eb;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          font-size: 0.875rem;
          color: #374151;
          min-height: 44px;
        }

        .checkbox-label.compact {
          justify-content: center;
        }

        .checkbox-label input[type="checkbox"] {
          width: 1rem;
          height: 1rem;
          accent-color: var(--brand);
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          padding-top: 0.5rem;
        }

        .save-button {
          min-width: 8rem;
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

        /* Button styles */
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
          min-height: 44px;
          cursor: pointer;
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

        /* Mobile optimizations */
        @media (max-width: 640px) {
          .profile-page {
            padding: 1rem 0.5rem;
          }
          
          .form-input {
            font-size: 16px;
            min-height: 44px;
          }
          
          .profile-actions {
            justify-content: center;
            width: 100%;
          }
          
          .btn-compact {
            flex: 1;
            min-width: 0;
          }
          
          .avatar-section {
            margin-top: -3rem;
          }
          
          .cover-section {
            height: 150px;
          }
          
          .interests-picker {
            justify-content: center;
          }
          
          .btn {
            min-height: 44px;
          }
        }
      `}</style>
    </div>
  );
}
