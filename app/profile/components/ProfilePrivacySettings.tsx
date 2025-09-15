// app/profile/components/ProfilePrivacySettings.tsx
"use client";

import React from 'react';
import type { Profile } from '../types/profile';
import { Shield } from 'lucide-react';

type ProfilePrivacySettingsProps = {
  profile: Profile | null;
  onChange: (updates: Partial<Profile>) => void;
  isEditing: boolean;
};

export default function ProfilePrivacySettings({ profile, onChange, isEditing }: ProfilePrivacySettingsProps) {
  if (!profile || !isEditing) return null;

  return (
    <div className="privacy-settings">
      <h4 className="section-subtitle">
        <Shield size={16} style={{ display: "inline", marginRight: "0.25rem" }} />
        Privacy & Safety Settings
      </h4>

      <div className="form-field">
        <label className="form-label">Profile Visibility</label>
        <select 
          className="form-input"
          value={profile.visibility ?? "public"} 
          onChange={(e) => onChange({ visibility: e.target.value as Profile['visibility'] })}
        >
          <option value="public">Public - Anyone can see</option>
          <option value="friends_only">Friends Only</option>
          <option value="private">Private - Only you</option>
        </select>
      </div>

      <label className="checkbox-label">
        <input 
          type="checkbox"
          checked={!!profile.discoverable} 
          onChange={(e) => onChange({ discoverable: e.target.checked })} 
        />
        <span>Include me in search & friend suggestions</span>
      </label>

      <div className="form-field">
        <label className="form-label">Who can message me</label>
        <select 
          className="form-input"
          value={profile.allow_messages ?? "friends"} 
          onChange={(e) => onChange({ allow_messages: e.target.value as Profile['allow_messages'] })}
        >
          <option value="everyone">Everyone</option>
          <option value="friends">Friends Only</option>
          <option value="no_one">No One</option>
        </select>
      </div>

      <div className="form-field">
        <label className="form-label">When friends tag me</label>
        <select 
          className="form-input"
          value={profile.allow_tags ?? "review_required"} 
          onChange={(e) => onChange({ allow_tags: e.target.value as Profile['allow_tags'] })}
        >
          <option value="auto">Auto-approve tags</option>
          <option value="review_required">Review required</option>
          <option value="no_one">Don't allow tags</option>
        </select>
      </div>

      <div className="form-field">
        <label className="form-label">Post collaboration</label>
        <select 
          className="form-input"
          value={profile.allow_collaboration_on_posts ?? "friends"} 
          onChange={(e) => onChange({ allow_collaboration_on_posts: e.target.value as Profile['allow_collaboration_on_posts'] })}
        >
          <option value="friends">Friends can collaborate</option>
          <option value="invited_only">Only people I invite</option>
          <option value="off">No collaboration</option>
        </select>
      </div>

      <div className="form-field">
        <label className="form-label">Default post visibility</label>
        <select 
          className="form-input"
          value={profile.default_post_visibility ?? "public"} 
          onChange={(e) => onChange({ default_post_visibility: e.target.value as Profile['default_post_visibility'] })}
        >
          <option value="public">Public</option>
          <option value="friends_only">Friends Only</option>
          <option value="private">Private</option>
        </select>
      </div>

      <label className="checkbox-label">
        <input 
          type="checkbox"
          checked={!!profile.show_online_status} 
          onChange={(e) => onChange({ show_online_status: e.target.checked })} 
        />
        <span>Show when I'm online</span>
      </label>

      <style jsx>{`
        .privacy-settings {
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
        
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          font-size: 0.875rem;
          color: #374151;
        }
        
        .checkbox-label input[type="checkbox"] {
          width: 1rem;
          height: 1rem;
          accent-color: var(--brand);
        }
      `}</style>
    </div>
  );
}
