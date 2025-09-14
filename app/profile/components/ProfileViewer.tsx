// app/profile/components/ProfileViewer.tsx
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Profile } from '../types/profile';

// SVG Icons for consistency
const MapPinIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

const GlobeIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);

const MessageCircleIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
  </svg>
);

const UsersIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const UserPlusIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="8.5" cy="7" r="4"/>
    <line x1="20" y1="8" x2="20" y2="14"/>
    <line x1="23" y1="11" x2="17" y2="11"/>
  </svg>
);

// Social platform icons
const InstagramIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>
);

const FacebookIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);

const TikTokIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.14 6.14 0 0 0-1-.05A6.14 6.14 0 0 0 5 20.2a6.15 6.15 0 0 0 8.47-5.7V8.69a8.08 8.08 0 0 0 4.73 1.51V6.69h-1.61z"/>
  </svg>
);

const SOCIAL_PLATFORMS = [
  { key: 'instagram', Icon: InstagramIcon },
  { key: 'facebook', Icon: FacebookIcon },
  { key: 'tiktok', Icon: TikTokIcon },
  // Add more as needed
];

interface ProfileViewerProps {
  profile: Profile;
  currentUserId?: string | null;
  relationshipType: 'friend' | 'acquaintance' | 'restricted' | 'none';
  mutualFriendsCount: number;
  onAddFriend?: () => void;
  onMessage?: () => void;
  onFollow?: () => void;
  isPending?: boolean;
}

export default function ProfileViewer({
  profile,
  currentUserId,
  relationshipType,
  mutualFriendsCount,
  onAddFriend,
  onMessage,
  onFollow,
  isPending = false
}: ProfileViewerProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const displayName = profile.full_name || "Member";
  const isFriend = relationshipType === 'friend';
  const isRestricted = relationshipType === 'restricted';
  
  // Determine what content viewer can see
  const canViewFullProfile = isFriend || profile.visibility === 'public';
  const canViewLocation = profile.location_is_public && profile.location_text;
  const canMessage = profile.allow_messages === 'everyone' || 
    (profile.allow_messages === 'friends' && isFriend);

  return (
    <div className="profile-viewer">
      {/* Cover & Header Section */}
      <div className="viewer-header">
        {profile.cover_url ? (
          <img 
            src={profile.cover_url} 
            alt="Cover" 
            className="cover-image"
            onLoad={() => setImageLoading(false)}
          />
        ) : (
          <div className="cover-gradient" />
        )}
        
        {/* Gradient overlay for better text readability */}
        <div className="header-overlay" />
      </div>

      {/* Main Profile Info */}
      <div className="viewer-content">
        {/* Avatar & Name Section */}
        <div className="profile-identity">
          <div className="avatar-container">
            <img
              src={profile.avatar_url || "/default-avatar.png"}
              alt={displayName}
              className="avatar"
              loading="lazy"
            />
            {profile.verified && (
              <span className="verified-badge" aria-label="Verified">✓</span>
            )}
            {profile.show_online_status && (
              <span className="online-indicator" aria-label="Online" />
            )}
          </div>

          <div className="identity-info">
            <h1 className="display-name">{displayName}</h1>
            {profile.username && (
              <p className="username">@{profile.username}</p>
            )}
            {profile.tagline && (
              <p className="tagline">{profile.tagline}</p>
            )}
          </div>
        </div>

        {/* Relationship & Mutual Friends */}
        {relationshipType !== 'none' && (
          <div className="relationship-info">
            {isFriend && (
              <span className="relationship-badge friend">
                <UsersIcon size={14} />
                Friends
              </span>
            )}
            {relationshipType === 'acquaintance' && (
              <span className="relationship-badge acquaintance">
                Acquaintance
              </span>
            )}
            {isRestricted && (
              <span className="relationship-badge restricted">
                Restricted
              </span>
            )}
            {profile.show_mutuals && mutualFriendsCount > 0 && (
              <span className="mutual-friends">
                {mutualFriendsCount} mutual {mutualFriendsCount === 1 ? 'friend' : 'friends'}
              </span>
            )}
          </div>
        )}

        {/* Action Buttons - Mobile Optimized */}
        <div className="action-buttons">
          {relationshipType === 'none' && !isPending && (
            <button 
              className="btn btn-primary"
              onClick={onAddFriend}
              aria-label="Add Friend"
            >
              <UserPlusIcon size={isMobile ? 18 : 16} />
              <span>Add Friend</span>
            </button>
          )}
          
          {isPending && (
            <button className="btn btn-disabled" disabled aria-label="Request Pending">
              <span>⏳ Pending</span>
            </button>
          )}
          
          {canMessage && (
            <button 
              className="btn btn-secondary"
              onClick={onMessage}
              aria-label="Send Message"
            >
              <MessageCircleIcon size={isMobile ? 18 : 16} />
              <span>Message</span>
            </button>
          )}
          
          {!isFriend && (
            <button 
              className="btn btn-outline"
              onClick={onFollow}
              aria-label="Follow"
            >
              <span>Follow</span>
            </button>
          )}
        </div>

        {/* About Section - Respects Privacy */}
        {canViewFullProfile ? (
          <>
            {/* Bio */}
            {profile.bio && (
              <div className="section bio-section">
                <h2 className="section-title">About</h2>
                <p className="bio-text">{profile.bio}</p>
              </div>
            )}

            {/* Details Grid - Mobile Responsive */}
            <div className="details-grid">
              {canViewLocation && (
                <div className="detail-item">
                  <MapPinIcon size={16} />
                  <span>{profile.location_text}</span>
                </div>
              )}
              
              {profile.website_url && (
                <div className="detail-item">
                  <GlobeIcon size={16} />
                  <a 
                    href={profile.website_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="link"
                  >
                    {profile.website_url.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
              
              {profile.languages && profile.languages.length > 0 && (
                <div className="detail-item">
                  <span className="detail-label">Languages:</span>
                  <span>{profile.languages.join(', ')}</span>
                </div>
              )}
            </div>

            {/* Interests - Mobile Optimized Chips */}
            {profile.interests && profile.interests.length > 0 && (
              <div className="section interests-section">
                <h2 className="section-title">Interests</h2>
                <div className="interests-grid">
                  {profile.interests.map(interest => (
                    <span key={interest} className="interest-chip">
                      #{interest}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Social Links - Touch Friendly */}
            {profile.social_links && Object.keys(profile.social_links).some(k => profile.social_links![k]) && (
              <div className="section social-section">
                <h2 className="section-title">Connect</h2>
                <div className="social-links">
                  {SOCIAL_PLATFORMS.map(({ key, Icon }) => (
                    profile.social_links![key] && (
                      <a
                        key={key}
                        href={`https://${profile.social_links![key]}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="social-link"
                        aria-label={key}
                      >
                        <Icon size={isMobile ? 24 : 20} />
                      </a>
                    )
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Limited View for Non-Friends */
          <div className="limited-view">
            <div className="privacy-notice">
              <span className="notice-icon">🔒</span>
              <p>This profile is private. Connect as friends to see more.</p>
            </div>
            
            {isRestricted && (
              <div className="restriction-notice">
                <p>Your connection is restricted. Limited content is visible.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .profile-viewer {
          background: white;
          border-radius: 1rem;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          max-width: 800px;
          margin: 0 auto;
        }

        /* Header Section */
        .viewer-header {
          position: relative;
          height: 200px;
          background: #f3f4f6;
        }

        @media (max-width: 640px) {
          .viewer-header {
            height: 150px;
          }
        }

        .cover-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .cover-gradient {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #c4b5fd, #f0abfc, #fcd34d);
        }

        .header-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 60%;
          background: linear-gradient(to top, rgba(0,0,0,0.3), transparent);
          pointer-events: none;
        }

        /* Content Section */
        .viewer-content {
          padding: 1.5rem;
        }

        @media (max-width: 640px) {
          .viewer-content {
            padding: 1rem;
          }
        }

        /* Profile Identity */
        .profile-identity {
          display: flex;
          align-items: flex-start;
          gap: 1.5rem;
          margin-top: -3rem;
          margin-bottom: 1.5rem;
        }

        @media (max-width: 640px) {
          .profile-identity {
            flex-direction: column;
            align-items: center;
            text-align: center;
            margin-top: -2.5rem;
          }
        }

        .avatar-container {
          position: relative;
          flex-shrink: 0;
        }

        .avatar {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          border: 4px solid white;
          background: white;
          object-fit: cover;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        @media (max-width: 640px) {
          .avatar {
            width: 100px;
            height: 100px;
            border-width: 3px;
          }
        }

        .verified-badge {
          position: absolute;
          bottom: 5px;
          right: 5px;
          background: #3b82f6;
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
          border: 2px solid white;
        }

        .online-indicator {
          position: absolute;
          bottom: 8px;
          right: 8px;
          width: 16px;
          height: 16px;
          background: #10b981;
          border-radius: 50%;
          border: 3px solid white;
        }

        .identity-info {
          flex-grow: 1;
          min-width: 0;
        }

        .display-name {
          font-size: 1.875rem;
          font-weight: 700;
          color: #111827;
          margin: 0 0 0.25rem 0;
          line-height: 1.2;
        }

        @media (max-width: 640px) {
          .display-name {
            font-size: 1.5rem;
          }
        }

        .username {
          color: #6b7280;
          font-size: 1rem;
          margin: 0 0 0.5rem 0;
        }

        .tagline {
          color: #9ca3af;
          font-size: 0.875rem;
          margin: 0;
        }

        /* Relationship Info */
        .relationship-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }

        @media (max-width: 640px) {
          .relationship-info {
            justify-content: center;
          }
        }

        .relationship-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 500;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
        }

        .relationship-badge.friend {
          background: #dcfce7;
          color: #166534;
        }

        .relationship-badge.acquaintance {
          background: #fef3c7;
          color: #92400e;
        }

        .relationship-badge.restricted {
          background: #fee2e2;
          color: #991b1b;
        }

        .mutual-friends {
          color: #6b7280;
          font-size: 0.875rem;
        }

        /* Action Buttons - Mobile Optimized */
        .action-buttons {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }

        @media (max-width: 640px) {
          .action-buttons {
            gap: 0.5rem;
          }
        }

        .btn {
          padding: 0.625rem 1.25rem;
          border-radius: 0.5rem;
          font-weight: 500;
          font-size: 0.875rem;
          border: none;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.2s;
          min-height: 44px; /* Mobile touch target */
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }

        @media (max-width: 640px) {
          .btn {
            flex: 1;
            min-width: 0;
            justify-content: center;
            padding: 0.75rem 1rem;
          }
        }

        .btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .btn:active {
          transform: translateY(0);
        }

        .btn-primary {
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: white;
        }

        .btn-secondary {
          background: white;
          color: #374151;
          border: 1px solid #e5e7eb;
        }

        .btn-outline {
          background: transparent;
          color: #8b5cf6;
          border: 1px solid #8b5cf6;
        }

        .btn-disabled {
          background: #f3f4f6;
          color: #9ca3af;
          cursor: not-allowed;
          opacity: 0.6;
        }

        /* Content Sections */
        .section {
          margin-bottom: 1.5rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid #f3f4f6;
        }

        .section:last-child {
          border-bottom: none;
        }

        .section-title {
          font-size: 1rem;
          font-weight: 600;
          color: #374151;
          margin: 0 0 0.75rem 0;
        }

        .bio-text {
          color: #4b5563;
          line-height: 1.6;
          white-space: pre-wrap;
        }

        /* Details Grid - Mobile Responsive */
        .details-grid {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .detail-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #6b7280;
          font-size: 0.875rem;
        }

        .detail-label {
          font-weight: 500;
          color: #374151;
        }

        .link {
          color: #8b5cf6;
          text-decoration: none;
        }

        .link:hover {
          text-decoration: underline;
        }

        /* Interests - Mobile Optimized */
        .interests-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .interest-chip {
          padding: 0.375rem 0.75rem;
          background: linear-gradient(135deg, #ede9fe, #fce7f3);
          color: #7c3aed;
          border-radius: 999px;
          font-size: 0.875rem;
          white-space: nowrap;
        }

        @media (max-width: 640px) {
          .interest-chip {
            padding: 0.5rem 0.875rem;
            font-size: 0.8rem;
          }
        }

        /* Social Links - Touch Friendly */
        .social-links {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .social-link {
          width: 44px;
          height: 44px;
          background: #f3f4f6;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6b7280;
          transition: all 0.2s;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }

        .social-link:hover {
          background: #8b5cf6;
          color: white;
          transform: translateY(-2px);
        }

        .social-link:active {
          transform: translateY(0);
        }

        /* Limited View */
        .limited-view {
          padding: 2rem 1rem;
          text-align: center;
        }

        .privacy-notice, .restriction-notice {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 1rem;
          margin-bottom: 1rem;
        }

        .privacy-notice {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .restriction-notice {
          background: #fef2f2;
          border-color: #fecaca;
          color: #b91c1c;
        }

        .notice-icon {
          font-size: 1.25rem;
        }

        /* Mobile Touch Optimizations */
        @media (hover: none) and (pointer: coarse) {
          .btn, .social-link, .interest-chip {
            -webkit-tap-highlight-color: rgba(139, 92, 246, 0.1);
          }
        }

        /* Loading States */
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        .skeleton {
          background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
      `}</style>
    </div>
  );
}
