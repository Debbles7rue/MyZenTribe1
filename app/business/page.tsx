// app/business/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AvatarUploader from "@/components/AvatarUploader";
import ProfileInviteQR from "@/components/ProfileInviteQR";
import BusinessProfilePanel from "@/components/BusinessProfilePanel";

type CreatorFields = {
  business_name: string | null;
  business_logo_url: string | null;
  business_bio: string | null;
  business_location_text: string | null;
  business_location_is_public: boolean | null;
  creator_type: "business" | "event_host" | "both" | null;
};

const CreatorProfilePage: React.FC = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [profileType, setProfileType] = useState<"business" | "event_host" | "both">("event_host");

  const [c, setC] = useState<CreatorFields>({
    business_name: "",
    business_logo_url: "",
    business_bio: "",
    business_location_text: "",
    business_location_is_public: false,
    creator_type: null,
  });

  const [detailsLoading, setDetailsLoading] = useState<boolean>(true);
  const [detailsSaving, setDetailsSaving] = useState<boolean>(false);
  const [detailsUnavailable, setDetailsUnavailable] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    (async () => {
      if (!userId) return;
      setError(null);
      setDetailsLoading(true);
      setDetailsUnavailable(false);

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "business_name, business_logo_url, business_bio, business_location_text, business_location_is_public"
        )
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        const msg = String(error.message || "").toLowerCase();
        if (msg.includes("column") && msg.includes("does not exist")) {
          setDetailsUnavailable(true);
        } else {
          setError(error.message);
        }
      } else if (data) {
        setC({
          business_name: data.business_name ?? "",
          business_logo_url: data.business_logo_url ?? "",
          business_bio: data.business_bio ?? "",
          business_location_text: data.business_location_text ?? "",
          business_location_is_public: !!data.business_location_is_public,
          creator_type: data.creator_type || "event_host",
        });
        setProfileType(data.creator_type || "event_host");
      }

      setDetailsLoading(false);
    })();
  }, [userId]);

  const displayName = useMemo(() => {
    if (c.business_name) return c.business_name;
    return profileType === "business" ? "Your Business Name" : "Your Creator Name";
  }, [c.business_name, profileType]);

  const showLoc = !!c.business_location_is_public && !!c.business_location_text;

  async function saveDetails() {
    if (!userId) return;
    setDetailsSaving(true);
    setError(null);
    setSaveSuccess(false);
    
    try {
      const payload = {
        business_name: c.business_name?.trim() || null,
        business_logo_url: c.business_logo_url?.trim() || null,
        business_bio: c.business_bio?.trim() || null,
        business_location_text: c.business_location_text?.trim() || null,
        business_location_is_public: !!c.business_location_is_public,
        creator_type: profileType,
      };
      const { error } = await supabase.from("profiles").update(payload).eq("id", userId);
      if (error) throw error;
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      setError(e?.message || "Could not save details.");
    } finally {
      setDetailsSaving(false);
    }
  }

  const getTypeIcon = () => {
    switch(profileType) {
      case "business": return "💼";
      case "event_host": return "✨";
      case "both": return "🌟";
      default: return "✨";
    }
  };

  const getTypeLabel = () => {
    switch(profileType) {
      case "business": return "Service Provider";
      case "event_host": return "Event Host";
      case "both": return "Service Provider & Event Host";
      default: return "Creator";
    }
  };

  return (
    <div className="creator-page">
      <div className="page-container">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">
            <span className="title-icon">{getTypeIcon()}</span>
            Creator Profile
          </h1>
          <div className="header-controls">
            <Link href="/profile" className="btn btn-neutral">
              <span className="btn-icon">👤</span>
              Personal Profile
            </Link>
            <Link href="/messages" className="btn btn-neutral">
              <span className="btn-icon">💬</span>
              Messages
            </Link>
          </div>
        </div>

        {/* Status Messages */}
        {saveSuccess && (
          <div className="status-message success">
            <span className="status-icon">✅</span>
            Profile saved successfully!
          </div>
        )}
        
        {error && (
          <div className="status-message error">
            <span className="status-icon">⚠️</span>
            {error}
          </div>
        )}

        {/* Profile Type Selector */}
        <div className="type-selector-card">
          <h3 className="selector-title">I am a...</h3>
          <div className="type-buttons">
            <button
              className={`type-btn ${profileType === "event_host" ? "active" : ""}`}
              onClick={() => setProfileType("event_host")}
            >
              <span className="type-btn-icon">✨</span>
              <span className="type-btn-label">Event Host</span>
              <span className="type-btn-desc">I organize gatherings, circles, workshops</span>
            </button>
            <button
              className={`type-btn ${profileType === "business" ? "active" : ""}`}
              onClick={() => setProfileType("business")}
            >
              <span className="type-btn-icon">💼</span>
              <span className="type-btn-label">Service Provider</span>
              <span className="type-btn-desc">I offer professional services</span>
            </button>
            <button
              className={`type-btn ${profileType === "both" ? "active" : ""}`}
              onClick={() => setProfileType("both")}
            >
              <span className="type-btn-icon">🌟</span>
              <span className="type-btn-label">Both!</span>
              <span className="type-btn-desc">I do both services and events</span>
            </button>
          </div>
        </div>

        {/* Profile Preview Card */}
        <section className="preview-card">
          <div className="preview-header">
            <h2 className="preview-title">Profile Preview</h2>
            <span className="preview-badge">{getTypeLabel()}</span>
          </div>
          
          <div className="preview-content">
            <div className="preview-avatar">
              {c.business_logo_url ? (
                <img
                  src={c.business_logo_url}
                  alt="Profile"
                  className="avatar-image"
                />
              ) : (
                <div className="avatar-placeholder">
                  <span className="placeholder-icon">📸</span>
                  <span className="placeholder-text">Add your photo</span>
                </div>
              )}
            </div>

            <div className="preview-info">
              <h3 className="preview-name">{displayName}</h3>
              {showLoc && (
                <div className="preview-location">
                  <span className="location-icon">📍</span>
                  {c.business_location_text}
                </div>
              )}
              {c.business_bio ? (
                <p className="preview-bio">{c.business_bio}</p>
              ) : (
                <p className="preview-bio placeholder">
                  {profileType === "event_host" 
                    ? "Tell people about the events you host..."
                    : "Describe what you offer..."}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Two Column Layout */}
        <div className="content-grid">
          {/* LEFT: Profile Editor */}
          <div className="left-column">
            {/* Details Section */}
            <section id="edit-details" className="card edit-card">
              <h2 className="card-title">
                <span className="title-icon">✏️</span>
                Profile Details
              </h2>

              {detailsUnavailable ? (
                <div className="setup-notice">
                  <p className="notice-text">Database setup needed. Run this SQL in Supabase:</p>
                  <pre className="sql-code">
{`ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS business_name text,
  ADD COLUMN IF NOT EXISTS business_logo_url text,
  ADD COLUMN IF NOT EXISTS business_bio text,
  ADD COLUMN IF NOT EXISTS business_location_text text,
  ADD COLUMN IF NOT EXISTS business_location_is_public boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS creator_type text DEFAULT 'event_host';`}
                  </pre>
                </div>
              ) : detailsLoading ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <span>Loading your profile...</span>
                </div>
              ) : (
                <div className="edit-form">
                  {/* Avatar Upload */}
                  <div className="form-section avatar-section">
                    <AvatarUploader
                      key={`creator-${userId ?? "anon"}`}
                      userId={userId}
                      value={c.business_logo_url ?? ""}
                      onChange={(url) => setC((prev) => ({ ...prev, business_logo_url: url }))}
                      label={profileType === "business" ? "Logo or Photo" : "Your Photo"}
                      size={160}
                    />
                  </div>

                  {/* Form Fields */}
                  <div className="form-fields">
                    <div className="form-field">
                      <label className="field-label">
                        {profileType === "business" ? "Business Name" : "Name / Title"}
                        <span className="optional-tag">(optional)</span>
                      </label>
                      <input
                        className="field-input"
                        value={c.business_name ?? ""}
                        onChange={(e) => setC({ ...c, business_name: e.target.value })}
                        placeholder={
                          profileType === "business" 
                            ? "The Healing Space" 
                            : "Sacred Drum Circle"
                        }
                      />
                    </div>

                    <div className="location-row">
                      <div className="form-field flex-grow">
                        <label className="field-label">
                          Location
                          <span className="optional-tag">(optional)</span>
                        </label>
                        <input
                          className="field-input"
                          value={c.business_location_text ?? ""}
                          onChange={(e) => setC({ ...c, business_location_text: e.target.value })}
                          placeholder="City, State"
                        />
                      </div>

                      <label className="checkbox-label location-public">
                        <input
                          type="checkbox"
                          checked={!!c.business_location_is_public}
                          onChange={(e) =>
                            setC({ ...c, business_location_is_public: e.target.checked })
                          }
                        />
                        <span>Show publicly</span>
                      </label>
                    </div>

                    <div className="form-field">
                      <label className="field-label">
                        {profileType === "event_host" ? "About Your Events" : "About Your Offerings"}
                        <span className="optional-tag">(optional)</span>
                      </label>
                      <textarea
                        className="field-input textarea"
                        rows={4}
                        value={c.business_bio ?? ""}
                        onChange={(e) => setC({ ...c, business_bio: e.target.value })}
                        placeholder={
                          profileType === "event_host"
                            ? "I host weekly drum circles focused on community connection and rhythm healing..."
                            : "I offer sound healing, Reiki sessions, and energy work..."
                        }
                      />
                    </div>

                    <div className="form-actions">
                      <button 
                        className="btn btn-primary save-button" 
                        onClick={saveDetails} 
                        disabled={detailsSaving}
                      >
                        {detailsSaving ? (
                          <>
                            <span className="saving-spinner"></span>
                            Saving...
                          </>
                        ) : (
                          <>
                            <span className="btn-icon">💾</span>
                            Save Profile
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* What I Offer Section */}
            <section className="offerings-section">
              <BusinessProfilePanel userId={userId} />
            </section>
          </div>

          {/* RIGHT: Quick Actions */}
          <div className="right-column">
            {/* Messages Card */}
            <section className="card action-card">
              <div className="action-icon">💬</div>
              <h3 className="action-title">Messages</h3>
              <p className="action-desc">Connect with your community</p>
              <Link href="/messages" className="btn btn-primary btn-full">
                Open Messages
              </Link>
            </section>

            {/* Create Event Card */}
            <section className="card action-card">
              <div className="action-icon">🎉</div>
              <h3 className="action-title">Host an Event</h3>
              <p className="action-desc">Share your next gathering</p>
              <Link href="/events/create" className="btn btn-primary btn-full">
                Create Event
              </Link>
            </section>

            {/* Share Profile Card */}
            <section className="card action-card">
              <h3 className="action-title">
                <span className="share-icon">🔗</span>
                Share Your Profile
              </h3>
              <ProfileInviteQR 
                userId={userId} 
                embed 
                context="creator" 
                qrSize={180} 
              />
            </section>

            {/* Testimonials Preview */}
            <section className="card testimonials-card">
              <h3 className="card-title">
                <span className="title-icon">💝</span>
                Testimonials
              </h3>
              <p className="testimonials-desc">
                Coming soon! Collect kind words from your community.
              </p>
            </section>
          </div>
        </div>
      </div>

      <style jsx>{`
        .creator-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 20%, #f1f5f9 40%, #e0e7ff 60%, #f3e8ff 80%, #fdf4ff 100%);
          padding: 2rem 1rem;
          position: relative;
        }

        .creator-page::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 
            radial-gradient(circle at 20% 30%, rgba(139,92,246,0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(196,181,253,0.08) 0%, transparent 50%),
            radial-gradient(circle at 40% 80%, rgba(167,139,250,0.06) 0%, transparent 50%);
          pointer-events: none;
          z-index: 0;
        }

        .page-container {
          position: relative;
          z-index: 1;
          max-width: 1200px;
          margin: 0 auto;
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
          color: #1f2937;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .title-icon {
          font-size: 1.5rem;
        }

        .header-controls {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .status-message {
          padding: 1rem;
          border-radius: 0.75rem;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .status-message.success {
          background: linear-gradient(135deg, #d1fae5, #a7f3d0);
          color: #065f46;
          border: 1px solid #6ee7b7;
        }

        .status-message.error {
          background: linear-gradient(135deg, #fef2f2, #fecaca);
          color: #dc2626;
          border: 1px solid #fca5a5;
        }

        .status-icon {
          font-size: 1.125rem;
        }

        .type-selector-card {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          margin-bottom: 2rem;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        .selector-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 1rem 0;
        }

        .type-buttons {
          display: grid;
          gap: 1rem;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        }

        .type-btn {
          background: linear-gradient(135deg, #f9fafb, #f3f4f6);
          border: 2px solid #e5e7eb;
          border-radius: 0.75rem;
          padding: 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
        }

        .type-btn:hover {
          background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(139,92,246,0.2);
        }

        .type-btn.active {
          background: linear-gradient(135deg, #ede9fe, #ddd6fe);
          border-color: #8b5cf6;
          box-shadow: 0 0 0 3px rgba(139,92,246,0.1);
        }

        .type-btn-icon {
          display: block;
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        .type-btn-label {
          display: block;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 0.25rem;
        }

        .type-btn-desc {
          display: block;
          font-size: 0.75rem;
          color: #6b7280;
        }

        .preview-card {
          background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,250,252,0.9));
          border-radius: 1rem;
          padding: 1.5rem;
          margin-bottom: 2rem;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(139,92,246,0.2);
          box-shadow: 0 8px 24px rgba(0,0,0,0.08);
        }

        .preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .preview-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
        }

        .preview-badge {
          background: linear-gradient(135deg, #c084fc, #a78bfa);
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .preview-content {
          display: flex;
          gap: 1.5rem;
          align-items: flex-start;
        }

        @media (max-width: 640px) {
          .preview-content {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
        }

        .preview-avatar {
          flex-shrink: 0;
        }

        .avatar-image {
          width: 120px;
          height: 120px;
          border-radius: 1rem;
          object-fit: cover;
          border: 2px solid rgba(139,92,246,0.2);
        }

        .avatar-placeholder {
          width: 120px;
          height: 120px;
          border-radius: 1rem;
          background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
          border: 2px dashed #d1d5db;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.25rem;
        }

        .placeholder-icon {
          font-size: 2rem;
          opacity: 0.5;
        }

        .placeholder-text {
          font-size: 0.75rem;
          color: #9ca3af;
        }

        .preview-info {
          flex-grow: 1;
          min-width: 0;
        }

        .preview-name {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 0.5rem 0;
        }

        .preview-location {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          color: #8b5cf6;
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: 0.75rem;
        }

        .location-icon {
          font-size: 0.875rem;
        }

        .preview-bio {
          color: #4b5563;
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .preview-bio.placeholder {
          color: #9ca3af;
          font-style: italic;
        }

        .content-grid {
          display: grid;
          gap: 2rem;
        }

        @media (min-width: 768px) {
          .content-grid {
            grid-template-columns: 1fr 320px;
          }
        }

        .left-column {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .right-column {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .card {
          background: white;
          border-radius: 1rem;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        .edit-card {
          padding: 1.5rem;
        }

        .card-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 1.5rem 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .setup-notice {
          background: #fef3c7;
          border: 1px solid #fcd34d;
          border-radius: 0.5rem;
          padding: 1rem;
        }

        .notice-text {
          color: #92400e;
          font-size: 0.875rem;
          margin-bottom: 0.75rem;
        }

        .sql-code {
          background: #1f2937;
          color: #10b981;
          padding: 1rem;
          border-radius: 0.5rem;
          font-size: 0.75rem;
          overflow-x: auto;
          font-family: monospace;
        }

        .loading-state {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 2rem 0;
          justify-content: center;
          color: #6b7280;
        }

        .loading-spinner {
          width: 1.5rem;
          height: 1.5rem;
          border: 2px solid #e5e7eb;
          border-top: 2px solid #8b5cf6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .saving-spinner {
          display: inline-block;
          width: 1rem;
          height: 1rem;
          border: 2px solid rgba(255,255,255,0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .edit-form {
          display: grid;
          gap: 1.5rem;
        }

        @media (min-width: 768px) {
          .edit-form {
            grid-template-columns: 200px 1fr;
          }
        }

        .form-section {
          display: flex;
          justify-content: center;
        }

        .form-fields {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .form-field {
          display: flex;
          flex-direction: column;
        }

        .field-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .optional-tag {
          font-size: 0.75rem;
          color: #9ca3af;
          font-weight: 400;
        }

        .field-input {
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          background: #f9fafb;
          transition: all 0.2s ease;
          font-size: 16px; /* Prevents zoom on iOS */
        }

        .field-input:focus {
          outline: none;
          border-color: #8b5cf6;
          background: white;
          box-shadow: 0 0 0 3px rgba(139,92,246,0.1);
        }

        .field-input.textarea {
          resize: vertical;
          min-height: 6rem;
        }

        .location-row {
          display: grid;
          gap: 1rem;
          grid-template-columns: 1fr auto;
          align-items: end;
        }

        .flex-grow {
          flex-grow: 1;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          font-size: 0.875rem;
          color: #374151;
        }

        .checkbox-label.location-public {
          margin-bottom: 0.5rem;
        }

        .checkbox-label input[type="checkbox"] {
          width: 1rem;
          height: 1rem;
          accent-color: #8b5cf6;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          padding-top: 0.5rem;
        }

        .save-button {
          min-width: 10rem;
        }

        .action-card {
          padding: 1.5rem;
          text-align: center;
          transition: all 0.2s ease;
        }

        .action-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.12);
        }

        .action-icon {
          font-size: 3rem;
          margin-bottom: 0.75rem;
        }

        .action-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 0.5rem 0;
        }

        .share-icon {
          font-size: 1.25rem;
          margin-right: 0.25rem;
        }

        .action-desc {
          color: #6b7280;
          font-size: 0.875rem;
          margin: 0 0 1rem 0;
        }

        .testimonials-card {
          padding: 1.5rem;
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          border: 1px solid #fbbf24;
        }

        .testimonials-desc {
          color: #78350f;
          font-size: 0.875rem;
          margin: 0;
        }

        .btn {
          padding: 0.75rem 1.25rem;
          border-radius: 0.5rem;
          border: none;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-size: 16px; /* Prevents zoom on iOS */
        }

        .btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .btn-primary {
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: white;
        }

        .btn-primary:hover {
          background: linear-gradient(135deg, #7c3aed, #6d28d9);
        }

        .btn-neutral {
          background: white;
          color: #374151;
          border: 1px solid #e5e7eb;
        }

        .btn-neutral:hover {
          background: #f9fafb;
          border-color: #d1d5db;
        }

        .btn-full {
          width: 100%;
        }

        .btn-icon {
          font-size: 0.875rem;
        }

        .offerings-section {
          /* BusinessProfilePanel styles will handle this */
        }

        /* Mobile optimizations */
        @media (max-width: 640px) {
          .creator-page {
            padding: 1rem 0.5rem;
          }
          
          .type-buttons {
            grid-template-columns: 1fr;
          }
          
          .location-row {
            grid-template-columns: 1fr;
          }
          
          .checkbox-label.location-public {
            margin-top: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default CreatorProfilePage;
