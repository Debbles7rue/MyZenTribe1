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

export default function ProfileSocialLinks({ profile, onChange, isEditing }: ProfileSocialLinksProps): JSX.Element | null {
  if (!profile) {
    return null;
  }

  const updateSocialLink = (key: keyof SocialLinks, value: string): void => {
    onChange({
      social_links: {
        ...profile.social_links,
        [key]: value || null
      }
    });
  };

  if (isEditing) {
    return React.createElement('div', { className: 'social-settings' },
      React.createElement('h4', { className: 'section-subtitle' }, '🌐 Social Links'),
      SOCIAL_PLATFORMS.map(({ key, label, placeholder }) =>
        React.createElement('div', { key, className: 'form-field' },
          React.createElement('label', { className: 'form-label' }, label),
          React.createElement('input', {
            className: 'form-input',
            type: 'url',
            value: profile.social_links?.[key] ?? '',
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => updateSocialLink(key, e.target.value),
            placeholder,
            autoComplete: 'off',
            inputMode: 'url'
          })
        )
      )
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

  return React.createElement('div', { className: 'social-links-display' },
    React.createElement('strong', null, 'Connect:'),
    React.createElement('div', { className: 'social-links-list' },
      activeSocials.map(([key, value]) =>
        React.createElement('a', {
          key,
          href: `https://${value}`,
          target: '_blank',
          rel: 'noopener noreferrer',
          className: 'social-link',
          title: key
        }, key)
      )
    )
  );
}
