// app/profile/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AvatarUploader from "@/components/AvatarUploader";

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location_text: string | null;
  location_is_public: boolean | null;
  show_mutuals: boolean | null;
};

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  // Load profile
  useEffect(() => {
    async function loadProfile() {
      if (!userId) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();
        
        if (data) {
          setProfile(data);
        } else {
          // Initialize empty profile
          setProfile({
            id: userId,
            full_name: "",
            avatar_url: "",
            bio: "",
            location_text: "",
            location_is_public: false,
            show_mutuals: true
          });
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    }
    
    loadProfile();
  }, [userId]);

  // Save profile
  async function handleSave() {
    if (!userId || !profile) return;
    
    setSaving(true);
    setStatus("Saving...");
    
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: userId,
          full_name: profile.full_name,
          bio: profile.bio,
          location_text: profile.location_text,
          location_is_public: profile.location_is_public,
          show_mutuals: profile.show_mutuals,
          avatar_url: profile.avatar_url,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      setStatus("Saved ✅");
      setEditMode(false);
      setTimeout(() => setStatus(null), 3000);
    } catch (err: any) {
      console.error("Save error:", err);
      setStatus("Save failed");
      setTimeout(() => setStatus(null), 3000);
    } finally {
      setSaving(false);
    }
  }

  // Update profile field
  function updateProfile(field: keyof Profile, value: any) {
    if (profile) {
      setProfile({ ...profile, [field]: value });
    }
  }

  if (loading) {
    return (
      <div className="profile-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <span>Loading profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Your Profile</h1>
        <div className="header-controls">
          <Link href="/business" className="btn btn-neutral">
            Business Profile
          </Link>
          <button
            className="btn btn-primary"
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? "✓ Done" : "✏️ Edit"}
          </button>
        </div>
      </div>

      {/* Status */}
      {status && (
        <div className={`status-message ${status.includes('failed') ? 'error' : 'success'}`}>
          {status}
        </div>
      )}

      {/* Main Profile Card */}
      {profile && (
        <div className="card profile-card">
          <div className="profile-layout">
            {/* Avatar */}
            <div className="avatar-section">
              <AvatarUploader
                userId={userId}
                value={profile.avatar_url}
                onChange={(url) => updateProfile('avatar_url', url)}
                label="Profile photo"
                size={150}
              />
            </div>

            {/* Profile Info */}
            <div className="profile-info">
              {editMode ? (
                <div className="edit-form">
                  <div className="form-field">
                    <label>Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={profile.full_name || ""}
                      onChange={(e) => updateProfile('full_name', e.target.value)}
                      placeholder="Your name"
                    />
                  </div>

                  <div className="form-field">
                    <label>Location</label>
                    <div className="location-row">
                      <input
                        type="text"
                        className="form-input"
                        value={profile.location_text || ""}
                        onChange={(e) => updateProfile('location_text', e.target.value)}
                        placeholder="City, State"
                      />
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={!!profile.location_is_public}
                          onChange={(e) => updateProfile('location_is_public', e.target.checked)}
                        />
                        <span>Public</span>
                      </label>
                    </div>
                  </div>

                  <div className="form-field">
                    <label>Bio</label>
                    <textarea
                      className="form-input textarea"
                      rows={3}
                      value={profile.bio || ""}
                      onChange={(e) => updateProfile('bio', e.target.value)}
                      placeholder="Tell people about yourself..."
                    />
                  </div>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={!!profile.show_mutuals}
                      onChange={(e) => updateProfile('show_mutuals', e.target.checked)}
                    />
                    <span>Show mutual friends</span>
                  </label>

                  <button
                    className="btn btn-primary save-button"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              ) : (
                <div className="profile-display">
                  <h2 className="profile-name">
                    {profile.full_name || "Member"}
                  </h2>
                  
                  {profile.location_is_public && profile.location_text && (
                    <p className="profile-location">📍 {profile.location_text}</p>
                  )}
                  
                  {profile.bio ? (
                    <p className="profile-bio">{profile.bio}</p>
                  ) : (
                    <p className="empty-state">Add a bio using the Edit button above.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Links */}
      <div className="action-cards">
        <Link href="/friends" className="card action-card">
          <span className="action-icon">👥</span>
          <span>Browse Friends</span>
        </Link>
        
        <Link href="/gratitude" className="card action-card">
          <span className="action-icon">🙏</span>
          <span>Gratitude Journal</span>
        </Link>
        
        <Link href="/messages" className="card action-card">
          <span className="action-icon">💬</span>
          <span>Messages</span>
        </Link>
        
        <Link href="/profile/candles" className="card action-card">
          <span className="action-icon">🕯️</span>
          <span>Sacred Candles</span>
        </Link>
      </div>

      <style jsx>{`
        .profile-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          padding: 2rem 1rem;
        }

        .page-header {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        @media (min-width: 768px) {
          .page-header {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }
        }

        .page-title {
          font-size: 2rem;
          font-weight: 700;
          background: linear-gradient(135deg, #7c3aed, #8b5cf6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0;
        }

        .header-controls {
          display: flex;
          gap: 0.75rem;
        }

        .btn {
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          font-weight: 500;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.25rem;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }

        .btn-primary {
          background: linear-gradient(135deg, #7c3aed, #8b5cf6);
          color: white;
        }

        .btn-neutral {
          background: white;
          color: #374151;
          border: 1px solid #e5e7eb;
        }

        .status-message {
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          margin-bottom: 1rem;
          font-weight: 500;
          text-align: center;
        }

        .status-message.success {
          background: #d1fae5;
          color: #065f46;
        }

        .status-message.error {
          background: #fef2f2;
          color: #dc2626;
        }

        .card {
          background: white;
          border-radius: 0.75rem;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .profile-layout {
          display: flex;
          gap: 2rem;
          align-items: flex-start;
        }

        @media (max-width: 640px) {
          .profile-layout {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
        }

        .avatar-section {
          flex-shrink: 0;
        }

        .profile-info {
          flex-grow: 1;
          min-width: 0;
        }

        .profile-name {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 0.5rem 0;
        }

        .profile-location {
          color: #6b7280;
          margin: 0 0 0.5rem 0;
        }

        .profile-bio {
          color: #374151;
          line-height: 1.6;
        }

        .empty-state {
          color: #9ca3af;
          font-style: italic;
        }

        .edit-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-field label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .form-input {
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          font-size: 16px;
        }

        .form-input:focus {
          outline: none;
          border-color: #7c3aed;
          box-shadow: 0 0 0 3px rgba(124,58,237,0.1);
        }

        .textarea {
          resize: vertical;
        }

        .location-row {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .location-row .form-input {
          flex: 1;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          font-size: 0.875rem;
        }

        .save-button {
          margin-top: 0.5rem;
        }

        .action-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
        }

        .action-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 1.5rem;
          text-decoration: none;
          color: #374151;
          transition: all 0.2s;
        }

        .action-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .action-icon {
          font-size: 2rem;
        }

        .loading-state {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 2rem;
        }

        .loading-spinner {
          width: 1.5rem;
          height: 1.5rem;
          border: 2px solid #e5e7eb;
          border-top: 2px solid #7c3aed;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
