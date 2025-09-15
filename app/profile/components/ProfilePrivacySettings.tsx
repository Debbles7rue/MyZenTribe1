// app/profile/components/ProfilePrivacySettings.tsx
"use client";

import React from 'react';
import type { Profile } from '../types/profile';

interface ProfilePrivacySettingsProps {
  profile: Profile | null;
  onChange: (updates: Partial<Profile>) => void;
  isEditing: boolean;
}

export default function ProfilePrivacySettings({ 
  profile, 
  onChange, 
  isEditing 
}: ProfilePrivacySettingsProps) {
  if (!profile || !isEditing) return null;

  return (
    <div className="privacy-settings">
      <h4 className="section-subtitle">
        🛡️ Privacy & Safety Settings
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
          onChange={(e) => onChange({ allow_messages: e.target.value })}
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
          onChange={(e) => onChange({ allow_tags: e.target.value })}
        >
          <option value="auto">Auto-approve tags</option>
          <option value="review_required">Review required</option>
          <option value="no_one">Don't allow tags</option>
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
          margin-bottom: 1rem;
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
          font-size: 16px;
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
        }
      `}</style>
    </div>
  );
}
