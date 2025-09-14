// app/profile/components/ProfileSocialLinks.tsx
"use client";

import React from 'react';
import type { Profile } from '../types/profile';

const SOCIAL_PLATFORMS = [
  { key: "instagram", label: "Instagram", placeholder: "instagram.com/username" },
  { key: "facebook", label: "Facebook", placeholder: "facebook.com/username" },
  { key: "tiktok", label: "TikTok", placeholder: "tiktok.com/@username" },
  { key: "youtube", label: "YouTube", placeholder: "youtube.com/@channel" },
  { key: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/in/username" },
  { key: "x", label: "X (Twitter)", placeholder: "x.com/username" },
  { key: "threads", label: "Threads", placeholder: "threads.net/@username" },
  { key: "discord", label: "Discord", placeholder: "discord username" },
];

type ProfileSocialLinksProps = {
  profile: Profile | null;
  onChange: (updates: Partial<Profile>) => void;
  isEditing: boolean;
};

export default function ProfileSocialLinks({ profile, onChange, isEditing }: ProfileSocialLinksProps) {
  if (!profile) return null;

  const updateSocialLink = (key: string, value: string) => {
    onChange({
      social_links: {
        ...profile.social_links,
        [key]: value
      }
    });
  };

  if (isEditing) {
    return (
      <div className="social-settings">
        <h4 className="section-subtitle">
          🌐 Social Links
        </h4>

        {SOCIAL_PLATFORMS.map(({ key, label, placeholder }) => (
          <div key={key} className="form-field">
            <label className="form-label">
              {label}
            </label>
            <input 
              className="form-input"
              value={profile.social_links?.[key] ?? ""} 
              onChange={(e) => updateSocialLink(key, e.target.value)} 
              placeholder={placeholder}
              autoComplete="off"
              inputMode="url"
            />
          </div>
        ))}

        <style jsx>{`
          .social-settings {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }
          
          .section-subtitle {
            font-size: 1rem;
            font-weight: 600;
            color: #1f2937;
            margin: 1.5rem 0 1rem 0;
            padding-top: 1rem;
            border-top: 1px solid #e5e7eb;
          }
          
          .form-field {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }
          
          .form-label {
            font-size: 0.875rem;
            font-weight: 500;
            color: #374151;
          }
          
          .form-input {
            padding: 0.75rem;
            border: 1px solid #d1d5db;
            border-radius: 0.5rem;
            background: rgba(255,255,255,0.9);
            transition: all 0.2s ease;
            font-size: 16px;
          }
          
          .form-input:focus {
            outline: none;
            border-color: var(--brand);
            box-shadow: 0 0 0 3px rgba(139,92,246,0.1);
          }
        `}</style>
      </div>
    );
  }

  // Display mode - show social links if they exist
  const activeSocials = Object.entries(profile.social_links || {}).filter(([_, value]) => value);
  
  if (activeSocials.length === 0) return null;

  return (
    <div className="social-links-display">
      <strong>Connect:</strong>
      <div className="social-links-list">
        {activeSocials.map(([key, value]) => (
          
            key={key}
            href={`https://${value}`}
            target="_blank"
            rel="noopener noreferrer"
            className="social-link"
            title={key}
          >
            {key}
          </a>
        ))}
      </div>

      <style jsx>{`
        .social-links-display {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
        }
        
        .social-links-list {
          display: flex;
          gap: 0.75rem;
          margin-top: 0.5rem;
          flex-wrap: wrap;
        }
        
        .social-link {
          padding: 0.375rem 0.75rem;
          background: rgba(139,92,246,0.1);
          border-radius: 1rem;
          color: var(--brand);
          text-decoration: none;
          font-size: 0.875rem;
          transition: all 0.2s;
        }
        
        .social-link:hover {
          background: var(--brand);
          color: white;
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
}
