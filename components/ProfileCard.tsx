// components/ProfileCard.tsx - UPGRADED VERSION OF YOUR EXISTING FILE
"use client";

import AvatarUploader from "@/components/AvatarUploader";
import { useState } from "react";
import { Camera, MapPin, Globe, Hash, Shield, MessageCircle, Users, Edit3, Check, X } from "lucide-react";

export type ProfileCardProps = {
  userId: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  location_text?: string | null;
  location_is_public?: boolean | null;
  show_mutuals?: boolean | null;
  
  // NEW FIELDS ADDED
  username?: string | null;
  cover_url?: string | null;
  tagline?: string | null;
  interests?: string[] | null;
  website_url?: string | null;
  social_links?: any | null;
  languages?: string[] | null;
  visibility?: string | null;
  allow_messages?: string | null;
  allow_tags?: string | null;
  verified?: boolean | null;

  followersCount?: number;
  followingCount?: number;
  friendsCount?: number;

  editable?: boolean;
  onNameChange?: (v: string) => void;
  onBioChange?: (v: string) => void;
  onLocationChange?: (v: string) => void;
  onLocationPublicChange?: (v: boolean) => void;
  onShowMutualsChange?: (v: boolean) => void;
  onAvatarChange?: (url: string) => void;
  
  // NEW HANDLERS ADDED
  onUsernameChange?: (v: string) => void;
  onCoverChange?: (url: string) => void;
  onTaglineChange?: (v: string) => void;
  onInterestsChange?: (v: string[]) => void;
  onWebsiteChange?: (v: string) => void;
  onSocialLinksChange?: (v: any) => void;
  onLanguagesChange?: (v: string[]) => void;
  onVisibilityChange?: (v: string) => void;
  onAllowMessagesChange?: (v: string) => void;

  onSave?: () => Promise<void> | void;
  saving?: boolean;
  editMode?: boolean;
  setEditMode?: (v: boolean) => void;
};

export default function ProfileCard({
  userId,
  full_name,
  avatar_url,
  bio,
  location_text,
  location_is_public,
  show_mutuals,
  
  // New fields
  username,
  cover_url,
  tagline,
  interests = [],
  website_url,
  social_links = {},
  languages = [],
  visibility = "public",
  allow_messages = "friends",
  allow_tags = "review_required",
  verified = false,

  followersCount = 0,
  followingCount = 0,
  friendsCount = 0,

  editable = false,
  onNameChange,
  onBioChange,
  onLocationChange,
  onLocationPublicChange,
  onShowMutualsChange,
  onAvatarChange,
  
  // New handlers
  onUsernameChange,
  onCoverChange,
  onTaglineChange,
  onInterestsChange,
  onWebsiteChange,
  onSocialLinksChange,
  onLanguagesChange,
  onVisibilityChange,
  onAllowMessagesChange,

  onSave,
  saving,
  editMode = false,
  setEditMode,
}: ProfileCardProps) {
  const displayName = full_name?.trim() || "Member";
  const [uploadingCover, setUploadingCover] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !onCoverChange) return;
    
    setUploadingCover(true);
    // TODO: Add your upload logic here
    // const url = await uploadToSupabase(file);
    // onCoverChange(url);
    setUploadingCover(false);
  }

  function toggleInterest(interest: string) {
    if (!onInterestsChange) return;
    const updated = interests?.includes(interest)
      ? interests.filter(i => i !== interest)
      : [...(interests || []), interest];
    onInterestsChange(updated);
  }

  return (
    <div className="profile-card-enhanced">
      {/* ENHANCED HEADER WITH COVER IMAGE */}
      <div className="relative">
        {/* Cover Image */}
        <div className="cover-image-container">
          {cover_url ? (
            <img src={cover_url} alt="Cover" className="cover-image" />
          ) : (
            <div className="cover-gradient" />
          )}
          
          {editable && editMode && (
            <label className="cover-upload-btn">
              <Camera size={16} />
              <span>Change Cover</span>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleCoverUpload}
                disabled={uploadingCover}
              />
            </label>
          )}
        </div>

        {/* Profile Info Bar */}
        <div className="profile-info-bar">
          <div className="profile-main-content">
            {/* Avatar with Upload */}
            <div className="avatar-section">
              <AvatarUploader
                userId={userId}
                value={avatar_url || ""}
                onChange={(url) => onAvatarChange?.(url)}
                label="Profile photo"
                size={120}
                editable={editable && editMode}
              />
              {verified && (
                <div className="verified-badge">
                  <Check size={14} />
                </div>
              )}
            </div>

            {/* Name, Username, and Basic Info */}
            <div className="profile-details">
              {editMode && editable ? (
                <div className="edit-fields">
                  <input
                    className="input-name"
                    value={full_name || ""}
                    onChange={(e) => onNameChange?.(e.target.value)}
                    placeholder="Your name"
                  />
                  <div className="username-field">
                    <span className="at-symbol">@</span>
                    <input
                      className="input-username"
                      value={username || ""}
                      onChange={(e) => onUsernameChange?.(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      placeholder="username"
                    />
                  </div>
                  <input
                    className="input-tagline"
                    value={tagline || ""}
                    onChange={(e) => onTaglineChange?.(e.target.value)}
                    placeholder="Short tagline (optional)"
                    maxLength={100}
                  />
                </div>
              ) : (
                <>
                  <h2 className="profile-name">{displayName}</h2>
                  {username && <p className="profile-username">@{username}</p>}
                  {tagline && <p className="profile-tagline">{tagline}</p>}
                </>
              )}

              {/* Stats */}
              <div className="profile-stats">
                <div className="stat">
                  <strong>{followersCount}</strong> <span>Followers</span>
                </div>
                <div className="stat">
                  <strong>{followingCount}</strong> <span>Following</span>
                </div>
                <div className="stat">
                  <strong>{friendsCount}</strong> <span>Friends</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {editable && (
              <div className="action-buttons">
                {editMode ? (
                  <>
                    <button
                      className="btn btn-primary"
                      onClick={() => onSave?.()}
                      disabled={!!saving}
                    >
                      <Check size={16} />
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setEditMode?.(false)}
                      disabled={!!saving}
                    >
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <button 
                    className="btn btn-primary"
                    onClick={() => setEditMode?.(true)}
                  >
                    <Edit3 size={16} />
                    Edit Profile
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ENHANCED BODY SECTIONS */}
      <div className="profile-sections">
        {/* About Section */}
        <div className="section">
          <h3 className="section-title">About</h3>
          {editMode && editable ? (
            <textarea
              className="input-bio"
              rows={4}
              value={bio || ""}
              onChange={(e) => onBioChange?.(e.target.value)}
              placeholder="Tell people about yourself..."
            />
          ) : (
            <p className="bio-text">{bio || "No bio yet"}</p>
          )}
        </div>

        {/* Location & Website */}
        <div className="section">
          <h3 className="section-title">Details</h3>
          <div className="details-grid">
            {/* Location */}
            <div className="detail-row">
              <MapPin size={18} className="icon" />
              {editMode && editable ? (
                <div className="location-edit">
                  <input
                    className="input-location"
                    value={location_text || ""}
                    onChange={(e) => onLocationChange?.(e.target.value)}
                    placeholder="City, State"
                  />
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={!!location_is_public}
                      onChange={(e) => onLocationPublicChange?.(e.target.checked)}
                    />
                    Public
                  </label>
                </div>
              ) : location_is_public && location_text ? (
                <span>{location_text}</span>
              ) : (
                <span className="muted">Location hidden</span>
              )}
            </div>

            {/* Website */}
            <div className="detail-row">
              <Globe size={18} className="icon" />
              {editMode && editable ? (
                <input
                  className="input-website"
                  type="url"
                  value={website_url || ""}
                  onChange={(e) => onWebsiteChange?.(e.target.value)}
                  placeholder="https://yourwebsite.com"
                />
              ) : website_url ? (
                <a href={website_url} target="_blank" rel="noopener noreferrer" className="link">
                  {website_url.replace(/^https?:\/\//, "")}
                </a>
              ) : (
                <span className="muted">No website</span>
              )}
            </div>

            {/* Languages */}
            {(languages?.length > 0 || editMode) && (
              <div className="detail-row">
                <Hash size={18} className="icon" />
                {editMode && editable ? (
                  <input
                    className="input-languages"
                    value={languages?.join(", ") || ""}
                    onChange={(e) => onLanguagesChange?.(
                      e.target.value.split(",").map(l => l.trim()).filter(Boolean)
                    )}
                    placeholder="English, Spanish, French"
                  />
                ) : (
                  <div className="tags-list">
                    {languages?.map(lang => (
                      <span key={lang} className="tag">{lang}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Interests Section */}
        {(interests?.length > 0 || editMode) && (
          <div className="section">
            <h3 className="section-title">Interests</h3>
            {editMode && editable ? (
              <div className="interests-edit">
                <div className="interests-grid">
                  {["Meditation", "Yoga", "Reiki", "Nature", "Music", "Art", "Travel", "Reading"].map(interest => (
                    <button
                      key={interest}
                      onClick={() => toggleInterest(interest)}
                      className={`interest-btn ${interests?.includes(interest) ? 'active' : ''}`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
                <input
                  className="input-custom-interests"
                  placeholder="Add custom interests (comma separated)"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && onInterestsChange) {
                      const input = e.currentTarget;
                      const newInterests = input.value.split(',').map(i => i.trim()).filter(Boolean);
                      onInterestsChange([...(interests || []), ...newInterests]);
                      input.value = '';
                    }
                  }}
                />
              </div>
            ) : (
              <div className="tags-list">
                {interests?.map(interest => (
                  <span key={interest} className="tag tag-interest">#{interest}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Privacy Settings (Only in Edit Mode) */}
        {editMode && editable && (
          <div className="section">
            <h3 className="section-title">
              <Shield size={18} className="inline mr-2" />
              Privacy Settings
            </h3>
            <div className="privacy-grid">
              <label className="privacy-row">
                <span>Profile Visibility</span>
                <select
                  value={visibility}
                  onChange={(e) => onVisibilityChange?.(e.target.value)}
                  className="select-privacy"
                >
                  <option value="public">Public</option>
                  <option value="friends_only">Friends Only</option>
                  <option value="private">Private</option>
                </select>
              </label>
              
              <label className="privacy-row">
                <span>Who can message me</span>
                <select
                  value={allow_messages}
                  onChange={(e) => onAllowMessagesChange?.(e.target.value)}
                  className="select-privacy"
                >
                  <option value="everyone">Everyone</option>
                  <option value="friends">Friends Only</option>
                  <option value="no_one">No One</option>
                </select>
              </label>
              
              <label className="privacy-row">
                <span>Show mutual friends</span>
                <input
                  type="checkbox"
                  checked={!!show_mutuals}
                  onChange={(e) => onShowMutualsChange?.(e.target.checked)}
                />
              </label>
            </div>
          </div>
        )}

        {/* Social Links (if any) */}
        {Object.keys(social_links || {}).length > 0 && (
          <div className="section">
            <h3 className="section-title">Social Links</h3>
            <div className="social-links">
              {Object.entries(social_links).map(([platform, url]) => (
                url && (
                  <a
                    key={platform}
                    href={`https://${url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-link"
                    title={platform}
                  >
                    {platform[0].toUpperCase()}
                  </a>
                )
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .profile-card-enhanced {
          background: rgba(245, 243, 255, 0.4);
          border: 1px solid rgba(196, 181, 253, 0.7);
          border-radius: 1rem;
          overflow: hidden;
        }

        .cover-image-container {
          position: relative;
          height: 200px;
          background: linear-gradient(135deg, #c4b5fd, #f0abfc, #fbbf24);
        }

        .cover-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .cover-gradient {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #8b5cf6, #ec4899, #fbbf24);
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
        }

        .cover-upload-btn:hover {
          background: rgba(255, 255, 255, 1);
          transform: translateY(-1px);
        }

        .profile-info-bar {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(10px);
          padding: 1rem;
          margin: -3rem 1rem 0;
          border-radius: 1rem;
          position: relative;
          z-index: 1;
        }

        .profile-main-content {
          display: flex;
          gap: 1.5rem;
          align-items: flex-start;
        }

        .avatar-section {
          position: relative;
          margin-top: -4rem;
        }

        .verified-badge {
          position: absolute;
          top: 0;
          right: 0;
          background: #3b82f6;
          color: white;
          padding: 0.25rem;
          border-radius: 50%;
        }

        .profile-details {
          flex: 1;
          min-width: 0;
        }

        .profile-name {
          font-size: 1.5rem;
          font-weight: bold;
          margin: 0;
        }

        .profile-username {
          color: #6b7280;
          margin: 0.25rem 0;
        }

        .profile-tagline {
          color: #9ca3af;
          font-size: 0.875rem;
          margin: 0.5rem 0;
        }

        .edit-fields {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .input-name, .input-username, .input-tagline {
          padding: 0.5rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          background: white;
        }

        .username-field {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .at-symbol {
          color: #6b7280;
        }

        .profile-stats {
          display: flex;
          gap: 1.5rem;
          margin-top: 1rem;
        }

        .stat {
          display: flex;
          gap: 0.25rem;
          font-size: 0.875rem;
        }

        .stat strong {
          font-weight: 600;
        }

        .stat span {
          color: #6b7280;
        }

        .action-buttons {
          display: flex;
          gap: 0.5rem;
        }

        .btn {
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #8b5cf6;
          color: white;
        }

        .btn-primary:hover {
          background: #7c3aed;
        }

        .btn-secondary {
          background: #e5e7eb;
          color: #374151;
        }

        .btn-secondary:hover {
          background: #d1d5db;
        }

        .profile-sections {
          padding: 1.5rem;
        }

        .section {
          margin-bottom: 1.5rem;
        }

        .section-title {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 0.75rem;
        }

        .bio-text {
          white-space: pre-wrap;
          color: #374151;
        }

        .input-bio {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          resize: vertical;
        }

        .details-grid {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .detail-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .icon {
          color: #6b7280;
          flex-shrink: 0;
        }

        .location-edit {
          display: flex;
          gap: 0.5rem;
          flex: 1;
        }

        .input-location, .input-website, .input-languages {
          flex: 1;
          padding: 0.375rem 0.5rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.375rem;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.875rem;
        }

        .tags-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .tag {
          padding: 0.25rem 0.75rem;
          background: #ede9fe;
          color: #7c3aed;
          border-radius: 1rem;
          font-size: 0.875rem;
        }

        .tag-interest {
          background: linear-gradient(135deg, #ede9fe, #fce7f3);
        }

        .interests-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .interest-btn {
          padding: 0.375rem 0.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 1rem;
          background: white;
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .interest-btn:hover {
          background: #f3f4f6;
        }

        .interest-btn.active {
          background: #8b5cf6;
          color: white;
          border-color: #8b5cf6;
        }

        .input-custom-interests {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
        }

        .privacy-grid {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .privacy-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .select-privacy {
          padding: 0.375rem 0.5rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.375rem;
          background: white;
        }

        .social-links {
          display: flex;
          gap: 0.5rem;
        }

        .social-link {
          width: 2rem;
          height: 2rem;
          background: #ede9fe;
          color: #7c3aed;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.2s;
        }

        .social-link:hover {
          background: #7c3aed;
          color: white;
          transform: translateY(-2px);
        }

        .muted {
          color: #9ca3af;
        }

        .link {
          color: #8b5cf6;
          text-decoration: none;
        }

        .link:hover {
          text-decoration: underline;
        }

        @media (max-width: 640px) {
          .profile-main-content {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .avatar-section {
            margin-top: -3rem;
          }

          .profile-stats {
            justify-content: center;
          }

          .action-buttons {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
