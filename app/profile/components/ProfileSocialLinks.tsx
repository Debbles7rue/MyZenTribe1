// app/profile/components/ProfileSocialLinks.tsx
"use client";

import React from 'react';
import type { Profile, SocialLinks } from '../types/profile';
import { 
  Instagram, Facebook, Youtube, Linkedin, Twitter, 
  Music, MessageSquare, MessageCircle, Globe 
} from 'lucide-react';

// Complete list of social platforms with icons
const SOCIAL_PLATFORMS: Array<{
  key: keyof SocialLinks;
  label: string;
  Icon: React.ComponentType<{ size?: number }>;
  placeholder: string;
}> = [
  { key: "instagram", label: "Instagram", Icon: Instagram, placeholder: "instagram.com/username" },
  { key: "facebook", label: "Facebook", Icon: Facebook, placeholder: "facebook.com/username" },
  { key: "tiktok", label: "TikTok", Icon: Music, placeholder: "tiktok.com/@username" },
  { key: "youtube", label: "YouTube", Icon: Youtube, placeholder: "youtube.com/@channel" },
  { key: "linkedin", label: "LinkedIn", Icon: Linkedin, placeholder: "linkedin.com/in/username" },
  { key: "x", label: "X (Twitter)", Icon: Twitter, placeholder: "x.com/username" },
  { key: "threads", label: "Threads", Icon: MessageSquare, placeholder: "threads.net/@username" },
  { key: "discord", label: "Discord", Icon: MessageCircle, placeholder: "discord username" },
];

interface ProfileSocialLinksProps {
  profile: Profile | null;
  onChange: (updates: Partial<Profile>) => void;
  isEditing: boolean;
}

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

  // Edit Mode - Show all platforms with input fields
  if (isEditing) {
    return (
      <div className="social-settings">
        <h4 className="section-subtitle">
          <Globe size={16} style={{ display: "inline", marginRight: "0.25rem" }} />
          Social Links
        </h4>

        {SOCIAL_PLATFORMS.map(({ key, label, Icon, placeholder }) => (
          <div key={key} className="form-field">
            <label className="form-label social-label">
              <Icon size={16} />
              <span>{label}</span>
            </label>
            <input 
              className="form-input"
              type="url"
              value={profile.social_links?.[key] || ''} 
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
            display: flex;
            align-items: center;
            gap: 0.25rem;
          }
          
          .section-subtitle:first-child {
            border-top: none;
            padding-top: 0;
            margin-top: 0;
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
          
          .social-label {
            display: flex;
            align-items: center;
            gap: 0.5rem;
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

  // View Mode - Show active social links
  const activeSocials = SOCIAL_PLATFORMS.filter(
    platform => profile.social_links?.[platform.key]
  );

  if (activeSocials.length === 0) return null;

  return (
    <div className="card social-links-card">
      <h3 className="card-title">
        <span className="title-icon">🌐</span>
        Connect
      </h3>
      
      <div className="social-links-display">
        <div className="social-links-list">
          {activeSocials.map(({ key, Icon }) => {
            const url = profile.social_links![key];
            const fullUrl = url?.startsWith('http') ? url : `https://${url}`;
            
            return (
              <a
                key={key}
                href={fullUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="social-link"
                title={key}
              >
                <Icon size={20} />
              </a>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .social-links-card {
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
        
        .social-links-display {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        
        .social-links-list {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        
        .social-link {
          width: 2.5rem;
          height: 2.5rem;
          background: rgba(139,92,246,0.1);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--brand);
          transition: all 0.2s;
        }
        
        .social-link:hover {
          background: var(--brand);
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(139,92,246,0.3);
        }
        
        @media (max-width: 640px) {
          .social-links-list {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
