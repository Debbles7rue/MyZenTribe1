// app/profile/components/ProfileAboutSection.tsx
"use client";

import React from 'react';
import type { Profile } from '../types/profile';

type ProfileAboutSectionProps = {
  profile: Profile | null;
  isOwner: boolean;
};

export default function ProfileAboutSection({ profile, isOwner }: ProfileAboutSectionProps) {
  if (!profile) return null;

  return (
    <div className="card about-card">
      <h3 className="card-title">
        <span className="title-icon">👤</span>
        About
      </h3>
      
      <div className="about-content">
        {profile.location_is_public && profile.location_text && (
          <div className="about-item">
            <span className="about-icon">📍</span>
            <span><strong>Location:</strong> {profile.location_text}</span>
          </div>
        )}
        
        {profile.website_url && (
          <div className="about-item">
            <span className="about-icon">🌐</span>
            <span>
              <strong>Website:</strong>{" "}
              <a href={profile.website_url} target="_blank" rel="noopener noreferrer" className="link">
                {profile.website_url.replace(/^https?:\/\//, "")}
              </a>
            </span>
          </div>
        )}
        
        {profile.languages && profile.languages.length > 0 && (
          <div className="about-item">
            <span className="about-icon">💬</span>
            <span><strong>Languages:</strong> {profile.languages.join(", ")}</span>
          </div>
        )}
        
        {profile.bio ? (
          <div className="bio-text">{profile.bio}</div>
        ) : (
          isOwner && (
            <div className="empty-state">Add a bio and location using the Edit button above.</div>
          )
        )}
        
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
      </div>

      <style jsx>{`
        .card {
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
        }
        
        .bio-text {
          color: #374151;
          line-height: 1.6;
          white-space: pre-wrap;
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
