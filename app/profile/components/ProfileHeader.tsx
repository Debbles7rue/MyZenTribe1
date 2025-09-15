// app/profile/components/ProfileHeader.tsx
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AvatarUploader from '@/components/AvatarUploader';
import type { Profile } from '../types/profile';
import { Camera } from 'lucide-react';

interface ProfileHeaderProps {
  profile: Profile | null;
  userId: string | null;
  friendsCount: number;
  editMode: boolean;
  isDesktop: boolean;
  onProfileChange: (profile: Profile) => void;
  onSave: () => void;
  saving: boolean;
}

// Animated Counter Component
function AnimatedCounter({ value, label, icon }: { value: number; label: string; icon?: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    if (value === 0) {
      setDisplayValue(0);
      return;
    }
    
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

export default function ProfileHeader({
  profile,
  userId,
  friendsCount,
  editMode,
  isDesktop,
  onProfileChange,
  onSave,
  saving
}: ProfileHeaderProps) {
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [inviteExpanded, setInviteExpanded] = useState(false);
  
  if (!profile) return null;
  
  const displayName = profile.full_name || "Member";

  const handleAvatarChange = async (url: string) => {
    onProfileChange({ ...profile, avatar_url: url });
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setCoverFile(file);
    // Create temporary URL for preview
    const tempUrl = URL.createObjectURL(file);
    onProfileChange({ ...profile, cover_url: tempUrl });
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setAvatarFile(file);
    const tempUrl = URL.createObjectURL(file);
    onProfileChange({ ...profile, avatar_url: tempUrl });
  };

  return (
    <div className="card profile-main-card">
      {/* Cover Image Section */}
      <div className="cover-section">
        {profile.cover_url ? (
          <img 
            src={coverFile ? URL.createObjectURL(coverFile) : profile.cover_url} 
            alt="Cover" 
            className="cover-image" 
          />
        ) : (
          <div className="cover-gradient" />
        )}
        
        {editMode && (
          <label className="cover-upload-btn">
            <Camera size={20} />
            <span>{isDesktop ? "Change Cover" : "Cover"}</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleCoverUpload}
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
                  src={avatarFile ? URL.createObjectURL(avatarFile) : (profile.avatar_url || "/default-avatar.png")}
                  alt="Profile"
                  className="avatar-image"
                  style={{ width: 160, height: 160 }}
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="file-input"
                  id="avatar-input"
                />
                <label htmlFor="avatar-input" className="file-label">Change Photo</label>
              </div>
            ) : (
              <AvatarUploader 
                userId={userId} 
                value={profile.avatar_url} 
                onChange={handleAvatarChange} 
                label="Profile photo" 
                size={160} 
              />
            )}
            <div className="avatar-badge">✨</div>
            {profile.verified && <div className="verified-badge">✓</div>}
          </div>
        </div>

        {/* Profile Info */}
        <div className="profile-info">
          <h2 className="profile-name">
            {displayName}
            {profile.username && <span className="username">@{profile.username}</span>}
          </h2>
          {profile.tagline && !editMode && (
            <p className="tagline">{profile.tagline}</p>
          )}
          
          {/* Stats Row */}
          <div className="stats-row">
            <div className="stats-grid">
              <AnimatedCounter value={0} label="Followers" />
              <AnimatedCounter value={0} label="Following" />
              <AnimatedCounter value={friendsCount} label="Friends" />
              {profile.posts_count && profile.posts_count > 0 && (
                <AnimatedCounter value={profile.posts_count} label="Posts" />
              )}
              {profile.collab_posts_count && profile.collab_posts_count > 0 && (
                <AnimatedCounter value={profile.collab_posts_count} label="Collabs" />
              )}
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
        </div>
      </div>

      <style jsx>{`
        .profile-main-card {
          padding: 0;
          margin-bottom: 1.5rem;
          background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,250,252,0.9));
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.6);
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
          overflow: hidden;
        }

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
          grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
          gap: 1rem;
          max-width: 30rem;
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

        @media (max-width: 640px) {
          .avatar-section {
            margin-top: -3rem;
          }
          
          .cover-section {
            height: 150px;
          }
          
          .profile-actions {
            justify-content: center;
            width: 100%;
          }
          
          .btn-compact {
            flex: 1;
            min-width: 0;
          }
        }
      `}</style>
    </div>
  );
}
