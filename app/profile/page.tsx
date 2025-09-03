// app/profile/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AvatarUploader from "@/components/AvatarUploader";
import PhotosFeed from "@/components/PhotosFeed";
import ProfileInviteQR from "@/components/ProfileInviteQR";

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location?: string | null;
  location_text?: string | null;
  location_is_public?: boolean | null;
  show_mutuals: boolean | null;
};

function useIsDesktop(minWidth = 1024) {
  const [isDesktop, setIsDesktop] = useState<boolean>(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(min-width:${minWidth}px)`);
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [minWidth]);
  return isDesktop;
}

// Animated Counter Component
function AnimatedCounter({ value, label, icon }: { value: number; label: string; icon?: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    if (value === 0) return;
    let start = 0;
    const duration = 1000;
    const increment = value / (duration / 16);
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(start));
      }
    }, 16);
    
    return () => clearInterval(timer);
  }, [value]);

  return (
    <div className="stat-card">
      <div className="stat-number">{displayValue.toLocaleString()}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionExp, setSessionExp] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editPersonal, setEditPersonal] = useState(false);
  const [friendsCount, setFriendsCount] = useState<number>(0);
  const [inviteExpanded, setInviteExpanded] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const isDesktop = useIsDesktop(1024);

  const [p, setP] = useState<Profile>({
    id: "",
    full_name: "",
    avatar_url: "",
    bio: "",
    location: "",
    location_text: "",
    location_is_public: false,
    show_mutuals: true,
  });

  // Mobile-safe avatar upload state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // Mobile-safe session refresh
  async function refreshSession() {
    const { data } = await supabase.auth.refreshSession();
    if (data?.session) {
      setUserId(data.session.user?.id ?? null);
      setSessionExp(
        data.session.expires_at 
          ? new Date(data.session.expires_at * 1000).toISOString() 
          : null
      );
    }
  }

  useEffect(() => { 
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      setUserId(user?.id ?? null);
    });
    
    // Also get session expiry for mobile debugging
    supabase.auth.getSession().then(({ data }) => {
      setSessionExp(
        data.session?.expires_at 
          ? new Date(data.session.expires_at * 1000).toISOString()
          : null
      );
    });
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
        if (error) throw error;
        if (data) {
          setP({
            id: data.id,
            full_name: data.full_name ?? "",
            avatar_url: data.avatar_url ?? "",
            bio: data.bio ?? "",
            location: data.location ?? "",
            location_text: (data.location_text ?? data.location) ?? "",
            location_is_public: data.location_is_public ?? false,
            show_mutuals: data.show_mutuals ?? true,
          });
        } else setP(prev => ({ ...prev, id: userId }));
      } catch { setTableMissing(true); }
      finally { setLoading(false); }
    };
    load();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { count } = await supabase.from("friendships").select("a", { count: "exact", head: true }).or(`a.eq.${userId},b.eq.${userId}`);
      if (typeof count === "number") setFriendsCount(count);
    })();
  }, [userId]);

  const displayName = useMemo(() => p.full_name || "Member", [p.full_name]);

  // Mobile-safe avatar upload
  async function uploadAvatar() {
    if (!avatarFile || !userId) return p.avatar_url;
    
    try {
      const ext = (avatarFile.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      
      const { error } = await supabase.storage.from("avatars").upload(path, avatarFile, {
        upsert: false,
        cacheControl: "3600",
        contentType: avatarFile.type || undefined,
      });
      
      if (error) throw error;
      
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      return data.publicUrl;
    } catch (err: any) {
      throw new Error(`Avatar upload failed: ${err.message}`);
    }
  }

  // Mobile-safe profile save using RPC with CORRECT parameter names
  const save = async () => {
    if (!userId) return;
    setSaving(true);
    setStatus("Saving…");
    
    try {
      // Upload avatar if changed
      let avatarUrl = p.avatar_url;
      if (avatarFile) {
        avatarUrl = await uploadAvatar();
      }

      // Use RPC function with CORRECT parameter names matching the SQL function
      const { error } = await supabase.rpc("upsert_my_profile", {
        p_full_name: p.full_name?.trim() || null,
        p_bio: p.bio?.trim() || null,
        p_location_text: p.location_text?.trim() || null,
        p_location_is_public: !!p.location_is_public,
        p_show_mutuals: !!p.show_mutuals,
        p_avatar_url: avatarUrl?.trim() || null
      });

      if (error) throw error;
      
      setStatus("Saved ✅");
      setAvatarFile(null);
      setP(prev => ({ ...prev, avatar_url: avatarUrl }));
      setEditPersonal(false);
      
      // Clear status after 3 seconds
      setTimeout(() => setStatus(null), 3000);
      
    } catch (e: any) {
      console.error("Save error:", e);
      setStatus(`Save failed: ${e.message}`);
      // Clear error after 5 seconds  
      setTimeout(() => setStatus(null), 5000);
    } finally { 
      setSaving(false); 
    }
  };

  async function onAvatarChange(url: string) {
    setP(prev => ({ ...prev, avatar_url: url }));
  }

  return (
    <div className="profile-page">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Your Profile</h1>
        <div className="header-controls">
          <Link href="/business" className="btn btn-neutral">Business Profile</Link>
          <button 
            className="btn btn-primary"
            onClick={() => setEditPersonal(!editPersonal)}
          >
            {editPersonal ? "✓ Done" : "✏️ Edit"}
          </button>
          {/* Mobile debug info - remove in production */}
          {!isDesktop && (
            <button 
              className="btn btn-neutral text-xs"
              onClick={refreshSession}
              title="Refresh session"
            >
              🔄
            </button>
          )}
        </div>
      </div>

      {/* Status Messages */}
      {status && (
        <div className={`status-message ${status.includes('failed') || status.includes('ERROR') ? 'error' : 'success'}`}>
          {status}
        </div>
      )}

      {/* Session Debug Info (Mobile) */}
      {!isDesktop && userId && (
        <div className="mobile-debug">
          <div className="debug-row">
            <span>User ID:</span> 
            <code>{userId.substring(0, 8)}...</code>
          </div>
          {sessionExp && (
            <div className="debug-row">
              <span>Session expires:</span>
              <code>{new Date(sessionExp).toLocaleTimeString()}</code>
            </div>
          )}
        </div>
      )}

      {/* Error State */}
      {tableMissing && (
        <div className="error-banner">
          <div className="error-title">Tables not found</div>
          <div className="error-message">Run the SQL migration, then reload.</div>
        </div>
      )}

      {/* Main Profile Card */}
      <div className="card profile-main-card">
        <div className={`profile-layout ${isDesktop ? 'desktop' : 'mobile'}`}>
          {/* Avatar Section */}
          <div className="avatar-section">
            <div className="avatar-wrapper">
              {editPersonal ? (
                // Mobile-safe file input for editing
                <div className="avatar-edit">
                  <img
                    src={avatarFile ? URL.createObjectURL(avatarFile) : (p.avatar_url || "/default-avatar.png")}
                    alt="Profile"
                    className="avatar-image"
                    style={{ width: 160, height: 160 }}
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                    className="file-input"
                  />
                  <label className="file-label">Change Photo</label>
                </div>
              ) : (
                <AvatarUploader 
                  userId={userId} 
                  value={p.avatar_url} 
                  onChange={onAvatarChange} 
                  label="Profile photo" 
                  size={160} 
                />
              )}
              <div className="avatar-badge">✨</div>
            </div>
          </div>

          {/* Profile Info */}
          <div className="profile-info">
            <h2 className="profile-name">{displayName}</h2>
            
            {/* Stats Row */}
            <div className="stats-row">
              <div className="stats-grid">
                <AnimatedCounter value={0} label="Followers" />
                <AnimatedCounter value={0} label="Following" />
                <AnimatedCounter value={friendsCount} label="Friends" />
              </div>
              
              {/* Action Buttons - Right next to stats */}
              <div className="profile-actions">
                <Link href="/friends" className="btn btn-compact">
                  👥 Browse Friends
                </Link>
                <Link href="/gratitude" className="btn btn-compact">
                  🙏 Gratitude
                </Link>
                <Link href="/messages" className="btn btn-compact">
                  💬 Messages
                </Link>
              </div>
            </div>

            {/* Invite Friends - Compact */}
            <div className="invite-section">
              <button
                onClick={() => setInviteExpanded(!inviteExpanded)}
                className="btn btn-special invite-button"
              >
                🎉 Invite Friends
                <span className={`invite-arrow ${inviteExpanded ? 'expanded' : ''}`}>▼</span>
              </button>
              
              {inviteExpanded && (
                <div className="invite-content">
                  <ProfileInviteQR userId={userId} embed qrSize={180} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* About Section - Short and Sweet */}
      {editPersonal ? (
        <div className="card edit-card">
          <h3 className="card-title">
            <span className="title-icon">✏️</span>
            Edit Your Information
          </h3>
          
          <div className="edit-form">
            <div className="form-field">
              <label className="form-label">Name</label>
              <input 
                className="form-input"
                value={p.full_name ?? ""} 
                onChange={(e) => setP({ ...p, full_name: e.target.value })} 
                placeholder="Your full name"
                autoComplete="name"
                inputMode="text"
              />
            </div>

            <div className={`form-row ${isDesktop ? 'desktop' : 'mobile'}`}>
              <div className="form-field flex-grow">
                <label className="form-label">Location</label>
                <input 
                  className="form-input"
                  value={p.location_text ?? ""} 
                  onChange={(e) => setP({ ...p, location_text: e.target.value })} 
                  placeholder="City, State" 
                  autoComplete="address-level2"
                  inputMode="text"
                />
              </div>
              <div className="form-field checkbox-field">
                <label className="checkbox-label compact">
                  <input 
                    type="checkbox"
                    checked={!!p.location_is_public} 
                    onChange={(e) => setP({ ...p, location_is_public: e.target.checked })} 
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
                value={p.bio ?? ""} 
                onChange={(e) => setP({ ...p, bio: e.target.value })} 
                placeholder="Tell people about yourself..."
                inputMode="text"
              />
            </div>

            <label className="checkbox-label">
              <input 
                type="checkbox"
                checked={!!p.show_mutuals} 
                onChange={(e) => setP({ ...p, show_mutuals: e.target.checked })} 
              />
              <span>Show mutual friends</span>
            </label>

            <div className="form-actions">
              <button 
                className="btn btn-primary save-button"
                onClick={save} 
                disabled={saving}
              >
                {saving ? "💾 Saving..." : "✨ Save Changes"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="card about-card">
          <h3 className="card-title">
            <span className="title-icon">👤</span>
            About
          </h3>
          
          <div className="about-content">
            {p.location_is_public && p.location_text && (
              <div className="about-item">
                <span className="about-icon">📍</span>
                <span><strong>Location:</strong> {p.location_text}</span>
              </div>
            )}
            
            {p.bio ? (
              <div className="bio-text">{p.bio}</div>
            ) : (
              <div className="empty-state">Add a bio and location using the Edit button above.</div>
            )}
            
            {!p.location_is_public && p.location_text && (
              <div className="privacy-note">
                <span>🔒</span>
                <span>Location is private</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Photos Feed - This is the main content! */}
      <PhotosFeed userId={userId} />

      {loading && (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <span>Loading your amazing profile...</span>
        </div>
      )}

      <style jsx>{`
        .profile-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 20%, #f1f5f9 40%, #e0e7ff 60%, #f3e8ff 80%, #fdf4ff 100%);
          padding: 2rem 1rem;
          position: relative;
        }

        .profile-page::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 
            radial-gradient(circle at 20% 30%, rgba(139,92,246,0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(245,158,11,0.08) 0%, transparent 50%),
            radial-gradient(circle at 40% 80%, rgba(16,185,129,0.06) 0%, transparent 50%);
          pointer-events: none;
          z-index: 0;
        }

        .profile-page > * {
          position: relative;
          z-index: 1;
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
          background: linear-gradient(135deg, var(--brand), #8b5cf6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0;
        }

        .header-controls {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          align-items: center;
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
          border: 1px solid #a7f3d0;
        }

        .status-message.error {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }

        .mobile-debug {
          background: rgba(255,255,255,0.8);
          border-radius: 0.5rem;
          padding: 0.75rem;
          margin-bottom: 1rem;
          font-size: 0.75rem;
        }

        .debug-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.25rem;
        }

        .debug-row code {
          font-family: monospace;
          background: rgba(0,0,0,0.1);
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
        }

        .error-banner {
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 0.75rem;
          padding: 1rem;
          margin-bottom: 1.5rem;
        }

        .error-title {
          font-weight: 600;
          color: #dc2626;
        }

        .error-message {
          color: #b91c1c;
          font-size: 0.875rem;
        }

        .profile-main-card {
          padding: 2rem;
          margin-bottom: 1.5rem;
          background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,250,252,0.9));
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.6);
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }

        .profile-layout {
          display: flex;
          gap: 2rem;
          align-items: flex-start;
        }

        .profile-layout.mobile {
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .profile-layout.desktop {
          flex-direction: row;
          text-align: left;
        }

        .avatar-section {
          flex-shrink: 0;
          position: relative;
        }

        .avatar-wrapper {
          position: relative;
          display: inline-block;
        }

        .avatar-edit {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .avatar-image {
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid rgba(139,92,246,0.2);
        }

        .file-input {
          position: absolute;
          opacity: 0;
          width: 1px;
          height: 1px;
        }

        .file-label {
          padding: 0.5rem 1rem;
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: white;
          border-radius: 0.5rem;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .avatar-badge {
          position: absolute;
          bottom: -0.5rem;
          right: -0.5rem;
          width: 2rem;
          height: 2rem;
          background: linear-gradient(135deg, var(--brand), #8b5cf6);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.875rem;
          color: white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }

        .profile-info {
          flex-grow: 1;
          min-width: 0;
        }

        .profile-name {
          font-size: 1.875rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 1rem 0;
        }

        .stats-row {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        @media (min-width: 768px) {
          .stats-row {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          max-width: 20rem;
        }

        .stat-card {
          background: rgba(255,255,255,0.8);
          border: 1px solid rgba(139,92,246,0.2);
          border-radius: 0.75rem;
          padding: 0.75rem;
          text-align: center;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(139,92,246,0.2);
          background: rgba(255,255,255,0.95);
          border-color: rgba(139,92,246,0.3);
        }

        .stat-number {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--brand);
          margin-bottom: 0.25rem;
        }

        .stat-label {
          font-size: 0.75rem;
          color: #6b7280;
          font-weight: 500;
        }

        .profile-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .btn-compact {
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          border-radius: 0.5rem;
        }

        .invite-section {
          max-width: 20rem;
        }

        .btn.btn-special {
          background: linear-gradient(135deg, #c084fc, #a78bfa);
          color: white;
          border: none;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          font-size: 0.875rem;
          padding: 0.75rem 1rem;
        }

        .btn.btn-special:hover {
          background: linear-gradient(135deg, #a78bfa, #9333ea);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(196,132,252,0.4);
        }

        .invite-arrow {
          transition: transform 0.2s ease;
          font-size: 0.75rem;
        }

        .invite-arrow.expanded {
          transform: rotate(180deg);
        }

        .invite-content {
          margin-top: 1rem;
          padding: 1rem;
          background: rgba(255,255,255,0.6);
          border: 1px solid rgba(255,255,255,0.8);
          border-radius: 0.75rem;
        }

        .edit-card, .about-card {
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          background: linear-gradient(135deg, rgba(255,255,255,0.9), rgba(248,250,252,0.8));
          backdrop-filter: blur(5px);
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
        }

        .form-input {
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          background: rgba(255,255,255,0.9);
          transition: all 0.2s ease;
          font-size: 16px; /* Prevents zoom on iOS */
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

        .about-content {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .about-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #374151;
        }

        .about-icon {
          color: var(--brand);
        }

        .bio-text {
          color: #374151;
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .empty-state {
          color: #9ca3af;
          font-style: italic;
        }

        .privacy-note {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          color: #9ca3af;
          font-size: 0.875rem;
        }

        .loading-state {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 2rem 0;
          color: #6b7280;
        }

        .loading-spinner {
          width: 1.5rem;
          height: 1.5rem;
          border: 2px solid #e5e7eb;
          border-top: 2px solid var(--brand);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Enhanced button styles */
        .btn {
          transition: all 0.2s ease;
          font-weight: 500;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.25rem;
          font-size: 16px; /* Prevents zoom on iOS */
        }

        .btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }

        .btn-primary {
          background: linear-gradient(135deg, var(--brand), #8b5cf6);
          color: white;
          border: none;
        }

        .btn-primary:hover {
          background: linear-gradient(135deg, #7c2d12, #6d28d9);
        }

        .btn-neutral {
          background: rgba(255,255,255,0.9);
          color: #374151;
          border: 1px solid rgba(139,92,246,0.2);
        }

        .btn-neutral:hover {
          background: white;
          border-color: rgba(139,92,246,0.3);
        }

        /* Mobile optimizations */
        @media (max-width: 640px) {
          .profile-page {
            padding: 1rem 0.5rem;
          }
          
          .form-input {
            font-size: 16px; /* Critical for iOS - prevents zoom */
          }
          
          .profile-actions {
            justify-content: center;
            width: 100%;
          }
          
          .btn-compact {
            flex: 1;
            min-width: 0;
          }
        }
      `}</style>
    </div>
  );
}
