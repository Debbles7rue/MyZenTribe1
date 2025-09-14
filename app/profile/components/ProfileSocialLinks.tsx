// app/profile/components/ProfileSocialLinks.tsx
"use client";

import React from 'react';
import type { Profile, SocialLinks } from '../types/profile';

const SOCIAL_PLATFORMS: Array<{
  key: keyof SocialLinks;
  label: string;
  placeholder: string;
}> = [
  { key: "instagram", label: "Instagram", placeholder: "instagram.com/username" },
  { key: "facebook", label: "Facebook", placeholder: "facebook.com/username" },
  { key: "tiktok", label: "TikTok", placeholder: "tiktok.com/@username" },
  { key: "youtube", label: "YouTube", placeholder: "youtube.com/@channel" },
  { key: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/in/username" },
  { key: "x", label: "X (Twitter)", placeholder: "x.com/username" },
  { key: "threads", label: "Threads", placeholder: "threads.net/@username" },
  { key: "discord", label: "Discord", placeholder: "discord username" },
];

interface ProfileSocialLinksProps {
  profile: Profile | null;
  onChange: (updates: Partial<Profile>) => void;
  isEditing: boolean;
}

function ProfileSocialLinks({ profile, onChange, isEditing }: ProfileSocialLinksProps) {
  if (!profile) {
    return null;
  }

  const updateSocialLink = (key: keyof SocialLinks, value: string) => {
    onChange({
      social_links: {
        ...profile.social_links,
        [key]: value || null
      }
    });
  };

  if (isEditing) {
    return (
      <div className="social-settings">
        <h4 className="section-subtitle">
          🌐 Social Links
        </h4>
        {SOCIAL_PLATFORMS.map(({ key, label, placeholder }) => {
          return (
            <div key={key} className="form-field">
              <label className="form-label">
                {label}
              </label>
              <input 
                className="form-input"
                type="url"
                value={profile.social_links?.[key] ?? ""} 
                onChange={(e) => updateSocialLink(key, e.target.value)} 
                placeholder={placeholder}
                autoComplete="off"
                inputMode="url"
              />
            </div>
          );
        })}
      </div>
    );
  }

  const activeSocials: Array<[string, string]> = [];
  
  if (profile.social_links) {
    Object.entries(profile.social_links).forEach(([key, value]) => {
      if (value) {
        activeSocials.push([key, value]);
      }
    });
  }
  
  if (activeSocials.length === 0) {
    return null;
  }

  const socialLinksElement = (
    <div className="social-links-display">
      <strong>Connect:</strong>
      <div className="social-links-list">
        {activeSocials.map(([key, value]) => {
          return (
            
              key={key}
              href={`https://${value}`}
              target="_blank"
              rel="noopener noreferrer"
              className="social-link"
              title={key}
            >
              {key}
            </a>
          );
        })}
      </div>
    </div>
  );

  return socialLinksElement;
}

export default ProfileSocialLinks;
