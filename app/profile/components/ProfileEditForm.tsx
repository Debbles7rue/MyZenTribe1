// app/profile/components/ProfileEditForm.tsx
"use client";

import React, { useState } from "react";
import type { Profile } from "../types/profile";
import { Globe, Hash, Shield, Phone, StickyNote, Cake, Lock } from 'lucide-react';

export type ProfileEditFormProps = {
  profile: Profile;
  onChange: (updates: Partial<Profile>) => void;
  onSave: () => void;
  saving?: boolean;
  isDesktop?: boolean;
};

// Predefined interests
const PREDEFINED_INTERESTS = [
  "Meditation", "Yoga", "Reiki", "Nature", "Music", 
  "Art", "Travel", "Reading", "Cooking", "Photography",
  "Spirituality", "Wellness", "Fitness", "Technology", "Writing"
];

export default function ProfileEditForm({
  profile,
  onChange,
  onSave,
  saving = false,
  isDesktop = false,
}: ProfileEditFormProps) {
  const [customInterest, setCustomInterest] = useState("");
  
  // Helper functions for form updates
  const handleChange = (field: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    onChange({ [field]: e.target.value });
  };

  const handleBoolChange = (field: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ [field]: e.target.checked });
  };

  const toggleInterest = (interest: string) => {
    const interests = profile.interests || [];
    const updated = interests.includes(interest)
      ? interests.filter(i => i !== interest)
      : [...interests, interest];
    onChange({ interests: updated });
  };

  const addCustomInterest = () => {
    if (customInterest.trim()) {
      const interests = profile.interests || [];
      if (!interests.includes(customInterest.trim())) {
        onChange({ interests: [...interests, customInterest.trim()] });
      }
      setCustomInterest("");
    }
  };

  const handleLanguagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const languages = e.target.value.split(',').map(l => l.trim()).filter(Boolean);
    onChange({ languages });
  };

  return (
    <div className="edit-form">
      {/* Basic Information */}
      <div className="form-section">
        <h4 className="section-title">Basic Information</h4>
        
        <div className="form-field">
          <label className="form-label">Name</label>
          <input 
            className="form-input"
            value={profile.full_name || ""} 
            onChange={handleChange('full_name')} 
            placeholder="Your full name"
            autoComplete="name"
            inputMode="text"
          />
        </div>

        <div className="form-field">
          <label className="form-label">Username</label>
          <div className="username-input-group">
            <span className="username-prefix">@</span>
            <input 
              className="form-input"
              value={profile.username || ""} 
              onChange={(e) => {
                const username = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                onChange({ username });
              }} 
              placeholder="username"
              autoComplete="off"
              inputMode="text"
            />
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">Tagline</label>
          <input 
            className="form-input"
            value={profile.tagline || ""} 
            onChange={handleChange('tagline')} 
            placeholder="Short status or description"
            maxLength={100}
            autoComplete="off"
            inputMode="text"
          />
        </div>

        <div className={`form-row ${isDesktop ? 'desktop' : 'mobile'}`}>
          <div className="form-field flex-grow">
            <label className="form-label">Location</label>
            <input 
              className="form-input"
              value={profile.location_text || ""} 
              onChange={handleChange('location_text')} 
              placeholder="City, State" 
              autoComplete="address-level2"
              inputMode="text"
            />
          </div>
          <div className="form-field checkbox-field">
            <label className="checkbox-label compact">
              <input 
                type="checkbox"
                checked={!!profile.location_is_public} 
                onChange={handleBoolChange('location_is_public')} 
              />
              <span>Public</span>
            </label>
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">Bio</label>
          <textarea 
            className="form-input textarea"
            rows={3} 
            value={profile.bio || ""} 
            onChange={handleChange('bio')} 
            placeholder="Tell people about yourself..."
            inputMode="text"
          />
        </div>

        <div className="form-field">
          <label className="form-label">
            <Globe size={16} style={{ display: "inline", marginRight: "0.25rem" }} />
            Website
          </label>
          <input 
            className="form-input"
            type="url"
            value={profile.website_url || ""} 
            onChange={handleChange('website_url')} 
            placeholder="https://yourwebsite.com"
            autoComplete="url"
            inputMode="url"
          />
        </div>

        <div className="form-field">
          <label className="form-label">Languages</label>
          <input 
            className="form-input"
            value={profile.languages?.join(", ") || ""} 
            onChange={handleLanguagesChange} 
            placeholder="English, Spanish, French"
            autoComplete="off"
            inputMode="text"
          />
        </div>

        <div className="form-field">
          <label className="form-label">
            <Hash size={16} style={{ display: "inline", marginRight: "0.25rem" }} />
            Interests
          </label>
          <div className="interests-picker">
            {PREDEFINED_INTERESTS.map(interest => (
              <button
                key={interest}
                type="button"
                onClick={() => toggleInterest(interest)}
                className={`interest-chip ${profile.interests?.includes(interest) ? 'active' : ''}`}
              >
                {interest}
              </button>
            ))}
          </div>
          <div className="custom-interest-input">
            <input 
              className="form-input"
              placeholder="Add custom interest"
              value={customInterest}
              onChange={(e) => setCustomInterest(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCustomInterest();
                }
              }}
            />
            <button 
              type="button" 
              onClick={addCustomInterest}
              className="btn btn-sm"
            >
              Add
            </button>
          </div>
          {profile.interests && profile.interests.length > 0 && (
            <div className="selected-interests">
              <span className="selected-label">Selected:</span>
              {profile.interests.map(interest => (
                <span 
                  key={interest} 
                  className="selected-chip"
                  onClick={() => toggleInterest(interest)}
                >
                  {interest} ×
                </span>
              ))}
            </div>
          )}
        </div>

        <label className="checkbox-label">
          <input 
            type="checkbox"
            checked={!!profile.show_mutuals} 
            onChange={handleBoolChange('show_mutuals')} 
          />
          <span>Show mutual friends</span>
        </label>
      </div>

      {/* Private Information Section */}
      <div className="form-section private-section">
        <h4 className="section-title">
          <Lock size={16} style={{ display: "inline", marginRight: "0.25rem" }} />
          Private Information (only you see this)
        </h4>
        
        <div className="form-field">
          <label className="form-label">
            <StickyNote size={16} style={{ display: "inline", marginRight: "0.25rem" }} />
            Personal Notes
          </label>
          <textarea 
            className="form-input textarea"
            rows={2} 
            value={profile.internal_notes || ""} 
            onChange={handleChange('internal_notes')} 
            placeholder="Reminders, drafts, private thoughts..."
            inputMode="text"
          />
        </div>

        <div className="form-field">
          <label className="form-label">
            <Phone size={16} style={{ display: "inline", marginRight: "0.25rem" }} />
            Phone Number
          </label>
          <input 
            className="form-input"
            type="tel"
            value={profile.phone || ""} 
            onChange={handleChange('phone')} 
            placeholder="Your phone number"
            autoComplete="tel"
            inputMode="tel"
          />
        </div>

        <div className="form-field">
          <label className="form-label">
            <Cake size={16} style={{ display: "inline", marginRight: "0.25rem" }} />
            Birthday
          </label>
          <input 
            className="form-input"
            type="date"
            value={profile.birthday || ""} 
            onChange={handleChange('birthday')} 
          />
        </div>
      </div>

      <div className="form-actions">
        <button 
          className="btn btn-primary save-button"
          onClick={onSave} 
          disabled={saving}
        >
          {saving ? "💾 Saving..." : "✨ Save Changes"}
        </button>
      </div>

      <style jsx>{`
        .edit-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-section {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .section-title {
          font-size: 1rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 0.5rem 0;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .private-section {
          margin-top: 1rem;
          padding-top: 1.5rem;
          border-top: 2px dashed #e5e7eb;
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-row {
          display: grid;
          gap: 1rem;
        }

        .form-row.desktop {
          grid-template-columns: 1fr auto;
        }

        .form-row.mobile {
          grid-template-columns: 1fr;
        }

        .flex-grow {
          flex-grow: 1;
        }

        .checkbox-field {
          align-items: end;
        }

        .form-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
          display: flex;
          align-items: center;
          gap: 0.25rem;
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

        .form-input.textarea {
          resize: vertical;
          min-height: 3rem;
        }

        .username-input-group {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .username-prefix {
          color: #6b7280;
          font-size: 1rem;
        }

        .interests-picker {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .interest-chip {
          padding: 0.375rem 0.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 1rem;
          background: white;
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .interest-chip:hover {
          background: #f3f4f6;
        }

        .interest-chip.active {
          background: var(--brand);
          color: white;
          border-color: var(--brand);
        }

        .custom-interest-input {
          display: flex;
          gap: 0.5rem;
        }

        .custom-interest-input .form-input {
          flex: 1;
        }

        .selected-interests {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          align-items: center;
          margin-top: 0.5rem;
          padding: 0.75rem;
          background: #f9fafb;
          border-radius: 0.5rem;
        }

        .selected-label {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .selected-chip {
          padding: 0.25rem 0.75rem;
          background: linear-gradient(135deg, #ede9fe, #fce7f3);
          color: #7c3aed;
          border-radius: 1rem;
          font-size: 0.875rem;
          cursor: pointer;
        }

        .selected-chip:hover {
          background: linear-gradient(135deg, #ddd6fe, #fbcfe8);
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          font-size: 0.875rem;
          color: #374151;
        }

        .checkbox-label.compact {
          justify-content: center;
        }

        .checkbox-label input[type="checkbox"] {
          width: 1rem;
          height: 1rem;
          accent-color: var(--brand);
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          padding-top: 0.5rem;
        }

        .save-button {
          min-width: 8rem;
        }

        .btn {
          transition: all 0.2s ease;
          font-weight: 500;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.25rem;
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          cursor: pointer;
          border: none;
        }

        .btn-sm {
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }

        .btn-primary {
          background: linear-gradient(135deg, var(--brand), #8b5cf6);
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: linear-gradient(135deg, #7c3aed, #6d28d9);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(139,92,246,0.3);
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 640px) {
          .interests-picker {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
