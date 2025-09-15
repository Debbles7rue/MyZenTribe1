// app/profile/components/ProfileAboutSection.tsx
"use client";

import React from 'react';
import type { Profile } from '../types/profile';
import { MapPin, Globe, Languages, Users, Eye, Tag } from 'lucide-react';

type ProfileAboutSectionProps = {
  profile: Profile | null;
  isOwner: boolean;
};

export default function ProfileAboutSection({ profile, isOwner }: ProfileAboutSectionProps) {
  if (!profile) return null;

  const hasContent = profile.bio || profile.location_text || profile.website_url || 
                     profile.languages?.length || profile.interests?.length ||
                     profile.profile_views_30d || profile.collab_posts_count;

  if (!hasContent && !isOwner) return null;

  return (
    <div className="card about-card">
      <h3 className="card-title">
        <span className="title-icon">👤</span>
        About
      </h3>
      
      <div className="about-content">
        {/* Location */}
        {profile.location_is_public && profile.location_text && (
          <div className="about-item">
            <MapPin size={16} className="about-icon" />
            <span><strong>Location:</strong> {profile.location_text}</span>
          </div>
        )}
        
        {/* Website */}
        {profile.website_url && (
          <div className="about-item">
            <Globe size={16} className="about-icon" />
            <span>
              <strong>Website:</strong>{" "}
              <a 
                href={profile.website_url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="link"
              >
                {profile.website_url.replace(/^https?:\/\//, "")}
              </a>
            </span>
          </div>
        )}
        
        {/* Languages */}
        {profile.languages && profile.languages.length > 0 && (
          <div className="about-item">
            <Languages size={16} className="about-icon" />
            <span><strong>Languages:</strong> {profile.languages.join(", ")}</span>
          </div>
        )}
        
        {/* Bio */}
        {profile.bio ? (
          <div className="bio-text">{profile.bio}</div>
        ) : (
          isOwner && (
            <div className="empty-state">Add a bio and location using the Edit button above.</div>
          )
        )}
        
        {/* Interests */}
        {profile.interests && profile.interests.length > 0 && (
          <div className="interests-display">
            <strong>Interests:</strong>
            <div className="interests-list">
              {profile.interests.map(interest => (
                <span key={interest} className="interest-tag">
                  #{interest}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Privacy Note */}
        {!profile.location_is_public && profile.location_text && isOwner && (
          <div className="privacy-note">
            <span>🔒</span>
            <span>Location is private (only visible to you)</span>
          </div>
        )}
        
        {/* Profile Analytics (owner only) */}
        {isOwner && (profile.profile_views_30d || profile.collab_posts_count) && (
          <div className="analytics-display">
            {profile.profile_views_30d !== undefined && profile.profile_views_30d > 0 && (
              <div className="analytics-item">
                <Eye size={16} />
                <span>{profile.profile_views_30d} profile views (30 days)</span>
              </div>
            )}
            {profile.collab_posts_count && profile.collab_posts_count > 0 && (
              <div className="analytics-item">
                <Users size={16} />
                <span>{profile.collab_posts_count} collaborative posts</span>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .about-card {
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          background: linear-gradient(135deg, rgba(255,255,255,0.9), rgba(248,250,252,0.8));
          backdrop-filter: blur(5px);
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

        .about-content {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .about-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #374151;
        }

        .about-icon {
          color: var(--brand);
          flex-shrink: 0;
        }

        .bio-text {
          color: #374151;
          line-height: 1.6;
          white-space: pre-wrap;
          padding: 0.75rem 0;
        }

        .empty-state {
          color: #9ca3af;
          font-style: italic;
        }

        .interests-display {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
        }

        .interests-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .interest-tag {
          padding: 0.25rem 0.75rem;
          background: linear-gradient(135deg, #ede9fe, #fce7f3);
          color: #7c3aed;
          border-radius: 1rem;
          font-size: 0.875rem;
        }

        .privacy-note {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          color: #9ca3af;
          font-size: 0.875rem;
          padding: 0.5rem 0.75rem;
          background: rgba(139,92,246,0.05);
          border-radius: 0.5rem;
        }

        .analytics-display {
          margin-top: 1rem;
          padding: 0.75rem;
          background: rgba(139,92,246,0.05);
          border-left: 3px solid var(--brand);
          border-radius: 0.25rem;
        }

        .analytics-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #6b7280;
          font-size: 0.875rem;
        }

        .analytics-item + .analytics-item {
          margin-top: 0.5rem;
        }

        .link {
          color: var(--brand);
          text-decoration: none;
        }

        .link:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
