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

type ProfileSocialLinksProps = {
  profile: Profile | null;
  onChange: (updates: Partial<Profile>) => void;
  isEditing: boolean;
};

const styles = {
  socialSettings: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
  },
  sectionSubtitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#1f2937',
    margin: '1.5rem 0 1rem 0',
    paddingTop: '1rem',
    borderTop: '1px solid #e5e7eb',
  },
  formField: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
  },
  formLabel: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#374151',
  },
  formInput: {
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.5rem',
    background: 'rgba(255,255,255,0.9)',
    transition: 'all 0.2s ease',
    fontSize: '16px',
  },
  socialLinksDisplay: {
    marginTop: '1rem',
    paddingTop: '1rem',
    borderTop: '1px solid #e5e7eb',
  },
  socialLinksList: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '0.5rem',
    flexWrap: 'wrap' as const,
  },
  socialLink: {
    padding: '0.375rem 0.75rem',
    background: 'rgba(139,92,246,0.1)',
    borderRadius: '1rem',
    color: 'var(--brand)',
    textDecoration: 'none',
    fontSize: '0.875rem',
    transition: 'all 0.2s',
  },
};

export default function ProfileSocialLinks({ profile, onChange, isEditing }: ProfileSocialLinksProps) {
  if (!profile) return null;

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
      <div style={styles.socialSettings}>
        <h4 style={styles.sectionSubtitle}>
          🌐 Social Links
        </h4>

        {SOCIAL_PLATFORMS.map(({ key, label, placeholder }) => (
          <div key={key} style={styles.formField}>
            <label style={styles.formLabel}>
              {label}
            </label>
            <input 
              style={styles.formInput}
              value={profile.social_links?.[key] ?? ""} 
              onChange={(e) => updateSocialLink(key, e.target.value)} 
              placeholder={placeholder}
              autoComplete="off"
              inputMode="url"
              onFocus={(e) => {
                e.currentTarget.style.outline = 'none';
                e.currentTarget.style.borderColor = 'var(--brand)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>
        ))}
      </div>
    );
  }

  // Display mode - show social links if they exist
  const activeSocials = profile.social_links ? 
    Object.entries(profile.social_links).filter(([_, value]) => value) : [];
  
  if (activeSocials.length === 0) return null;

  return (
    <div style={styles.socialLinksDisplay}>
      <strong>Connect:</strong>
      <div style={styles.socialLinksList}>
        {activeSocials.map(([key, value]) => (
          
            key={key}
            href={`https://${value}`}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.socialLink}
            title={key}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--brand)';
              e.currentTarget.style.color = 'white';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(139,92,246,0.1)';
              e.currentTarget.style.color = 'var(--brand)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {key}
          </a>
        ))}
      </div>
    </div>
  );
}
