// app/profile/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AvatarUploader from "@/components/AvatarUploader";
import PhotosFeed from "@/components/PhotosFeed";
import ProfileInviteQR from "@/components/ProfileInviteQR";
import { getEmergencySettings, saveEmergencySettings } from "@/lib/sos";

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
      {icon && <span className="stat-icon">{icon}</span>}
      <div className="stat-number">{displayValue.toLocaleString()}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editPersonal, setEditPersonal] = useState(false);
  const [friendsCount, setFriendsCount] = useState<number>(0);
  const [inviteExpanded, setInviteExpanded] = useState(false);
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

  // Safety/SOS UI state
  const [editSafety, setEditSafety] = useState(false);
  const [sosEnabled, setSosEnabled] = useState(false);
  const [ecName, setEcName] = useState("");
  const [ecMethod, setEcMethod] = useState<"sms" | "email" | "">("");
  const [ecValue, setEcValue] = useState("");
  const [savingSafety, setSavingSafety] = useState(false);
  const [saveSafetyMsg, setSaveSafetyMsg] = useState<string | null>(null);

  useEffect(() => { 
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null)); 
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

  // Load emergency settings
  useEffect(() => {
    (async () => {
      const s = await getEmergencySettings();
      setSosEnabled(!!s.sos_enabled);
      setEcName(s.emergency_contact_name ?? "");
      setEcMethod((s.emergency_contact_method as "sms" | "email" | null) ?? "");
      setEcValue(s.emergency_contact_value ?? "");
    })();
  }, []);

  const displayName = useMemo(() => p.full_name || "Member", [p.full_name]);

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        full_name: p.full_name?.trim() || null,
        bio: p.bio?.trim() || null,
        location_text: p.location_text?.trim() || null,
        location_is_public: !!p.location_is_public,
        avatar_url: p.avatar_url?.trim() || null,
        show_mutuals: !!p.show_mutuals,
      }).eq("id", userId);
      if (error) throw error;
      
      // Show success message
      alert("✨ Profile saved successfully!");
      setEditPersonal(false);
    } catch (e: any) { 
      alert(e.message || "Save failed"); 
    } finally { 
      setSaving(false); 
    }
  };

  async function onAvatarChange(url: string) {
    setP(prev => ({ ...prev, avatar_url: url }));
    if (!userId) return;
    const { error } = await supabase.from("profiles").update({ avatar_url: url || null }).eq("id", userId);
    if (error) alert("Could not save photo: " + error.message);
  }

  async function saveSafety() {
    setSavingSafety(true);
    setSaveSafetyMsg(null);
    try {
      const { ok, error } = await saveEmergencySettings({
        sos_enabled: sosEnabled,
        emergency_contact_name: ecName?.trim() || null,
        emergency_contact_method: (ecMethod || null) as any,
        emergency_contact_value: ecValue?.trim() || null,
      });
      if (!ok) throw new Error(error || "Failed to save");
      setSaveSafetyMsg("✅ Safety settings saved!");
      setEditSafety(false);
    } catch (e: any) {
      setSaveSafetyMsg(e?.message || "Could not save settings. If columns are missing, run the migration.");
    } finally {
      setSavingSafety(false);
      setTimeout(() => setSaveSafetyMsg(null), 3000);
    }
  }

  const QuickActions = (
    <div className="quick-actions-container">
      {/* Friends */}
      <div className="card action-card">
        <div className="action-header">
          <div className="action-icon">👥</div>
          <h3 className="action-title">Friends</h3>
        </div>
        <p className="action-description">Browse, search, and add private notes about your connections.</p>
        <Link href="/friends" className="btn btn-primary action-button">
          Explore Friends
        </Link>
      </div>

      {/* Safety & SOS */}
      <div className="card action-card">
        <div className="action-header">
          <div className="action-icon">🛡️</div>
          <h3 className="action-title">Safety & SOS</h3>
          <span className={`status-badge ${sosEnabled ? 'enabled' : 'disabled'}`}>
            {sosEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        <p className="action-description">Configure your emergency contact and use the SOS button when needed.</p>
        
        {!editSafety ? (
          <div className="action-buttons">
            <button className="btn btn-primary" onClick={() => setEditSafety(true)}>
              Configure
            </button>
            <Link href="/safety" className="btn btn-neutral">
              Open Safety
            </Link>
          </div>
        ) : (
          <div className="safety-form">
            <div className="form-field">
              <label className="form-label">Contact name</label>
              <input 
                className="form-input"
                value={ecName} 
                onChange={(e) => setEcName(e.target.value)} 
                placeholder="e.g., Mom / Alex / Partner" 
              />
            </div>
            
            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Method</label>
                <select 
                  className="form-input"
                  value={ecMethod} 
                  onChange={(e) => setEcMethod(e.target.value as any)}
                >
                  <option value="">Select…</option>
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">
                  {ecMethod === "sms" ? "Phone (E.164)" : "Email"}
                </label>
                <input 
                  className="form-input"
                  value={ecValue} 
                  onChange={(e) => setEcValue(e.target.value)} 
                  placeholder={ecMethod === "sms" ? "+15551234567" : "name@example.com"} 
                />
              </div>
            </div>

            <label className="checkbox-label">
              <input 
                type="checkbox" 
                checked={sosEnabled} 
                onChange={(e) => setSosEnabled(e.target.checked)} 
              />
              <span>Enable SOS quick button</span>
            </label>

            <div className="form-actions">
              <button className="btn btn-neutral" onClick={() => setEditSafety(false)}>
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={saveSafety} 
                disabled={savingSafety}
              >
                {savingSafety ? "Saving…" : "Save Settings"}
              </button>
            </div>
            
            {saveSafetyMsg && (
              <div className={`form-message ${saveSafetyMsg.includes('✅') ? 'success' : 'error'}`}>
                {saveSafetyMsg}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Gratitude */}
      <div className="card action-card">
        <div className="action-header">
          <div className="action-icon">🙏</div>
          <h3 className="action-title">Gratitude Journal</h3>
        </div>
        <p className="action-description">Capture daily moments of gratitude and positive reflections.</p>
        <Link href="/gratitude" className="btn btn-primary action-button">
          Open Journal
        </Link>
      </div>

      {/* Messages */}
      <div className="card action-card">
        <div className="action-header">
          <div className="action-icon">💬</div>
          <h3 className="action-title">Messages</h3>
        </div>
        <p className="action-description">Private conversations and connections with your friends.</p>
        <Link href="/messages" className="btn btn-primary action-button">
          View Messages
        </Link>
      </div>
    </div>
  );

  return (
    <div className="profile-page">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Your Profile</h1>
        <div className="header-controls">
          <Link href="/business" className="btn btn-neutral">Business Profile</Link>
          <Link href="/friends" className="btn btn-neutral">Friends</Link>
          <Link href="/messages" className="btn btn-neutral">Messages</Link>
          <button 
            className="btn btn-primary"
            onClick={() => setEditPersonal(!editPersonal)}
          >
            {editPersonal ? "✓ Done" : "✏️ Edit"}
          </button>
        </div>
      </div>

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
              <AvatarUploader 
                userId={userId} 
                value={p.avatar_url} 
                onChange={onAvatarChange} 
                label="Profile photo" 
                size={160} 
              />
              <div className="avatar-badge">✨</div>
            </div>
          </div>

          {/* Profile Info */}
          <div className="profile-info">
            <h2 className="profile-name">{displayName}</h2>
            
            {/* Stats */}
            <div className="stats-grid">
              <AnimatedCounter value={0} label="Followers" icon="👤" />
              <AnimatedCounter value={0} label="Following" icon="➕" />
              <AnimatedCounter value={friendsCount} label="Friends" icon="🤝" />
            </div>

            {/* Invite Friends */}
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

      {/* Content Grid */}
      <div className={`content-grid ${isDesktop ? 'desktop' : 'mobile'}`}>
        {/* Main Content */}
        <div className="main-content">
          {/* Mobile Quick Actions */}
          {!isDesktop && (
            <div className="mobile-actions">
              <h3 className="section-title">Quick Actions</h3>
              {QuickActions}
            </div>
          )}

          {/* About Section */}
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
                    rows={4} 
                    value={p.bio ?? ""} 
                    onChange={(e) => setP({ ...p, bio: e.target.value })} 
                    placeholder="Tell people about yourself..."
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

          {/* Photos Feed */}
          <PhotosFeed userId={userId} />
        </div>

        {/* Desktop Sidebar */}
        {isDesktop && (
          <div className="sidebar">
            <h3 className="section-title">Quick Actions</h3>
            {QuickActions}
          </div>
        )}
      </div>

      {loading && (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <span>Loading your amazing profile...</span>
        </div>
      )}

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
          background: linear-gradient(135deg, var(--brand), #8b5cf6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0;
        }

        .header-controls {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
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
          margin-bottom: 2rem;
          background: linear-gradient(135deg, rgba(255,255,255,0.9), rgba(248,250,252,0.9));
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.5);
        }

        .profile-layout {
          display: flex;
          gap: 2rem;
          align-items: center;
        }

        .profile-layout.mobile {
          flex-direction: column;
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

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
          max-width: 24rem;
        }

        .stat-card {
          background: rgba(255,255,255,0.7);
          border: 1px solid rgba(255,255,255,0.8);
          border-radius: 0.75rem;
          padding: 1rem;
          text-align: center;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          background: rgba(255,255,255,0.9);
        }

        .stat-icon {
          font-size: 1.25rem;
          display: block;
          margin-bottom: 0.25rem;
        }

        .stat-number {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--brand);
          margin-bottom: 0.25rem;
        }

        .stat-label {
          font-size: 0.75rem;
          color: #6b7280;
          font-weight: 500;
        }

        .invite-section {
          max-width: 20rem;
        }

        .btn.btn-special {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
          border: none;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
        }

        .btn.btn-special:hover {
          background: linear-gradient(135deg, #d97706, #b45309);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(245,158,11,0.4);
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

        .content-grid {
          display: grid;
          gap: 2rem;
          align-items: start;
        }

        .content-grid.desktop {
          grid-template-columns: 2fr 1fr;
        }

        .content-grid.mobile {
          grid-template-columns: 1fr;
        }

        .main-content {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .mobile-actions {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .section-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 1rem 0;
        }

        .quick-actions-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .action-card {
          padding: 1.5rem;
          transition: all 0.2s ease;
          background: linear-gradient(135deg, rgba(255,255,255,0.8), rgba(248,250,252,0.8));
          backdrop-filter: blur(5px);
        }

        .action-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.1);
          background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,250,252,0.95));
        }

        .action-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }

        .action-icon {
          width: 2.5rem;
          height: 2.5rem;
          background: linear-gradient(135deg, var(--brand), #8b5cf6);
          border-radius: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.125rem;
          color: white;
          box-shadow: 0 2px 8px rgba(139,92,246,0.3);
        }

        .action-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
          flex-grow: 1;
        }

        .status-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 0.375rem;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .status-badge.enabled {
          background: #d1fae5;
          color: #065f46;
        }

        .status-badge.disabled {
          background: #f3f4f6;
          color: #6b7280;
        }

        .action-description {
          color: #6b7280;
          font-size: 0.875rem;
          line-height: 1.5;
          margin: 0 0 1rem 0;
        }

        .action-button {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .action-buttons {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .safety-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(0,0,0,0.1);
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
          grid-template-columns: 1fr 1fr;
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
        }

        .form-input:focus {
          outline: none;
          border-color: var(--brand);
          box-shadow: 0 0 0 3px rgba(139,92,246,0.1);
        }

        .form-input.textarea {
          resize: vertical;
          min-height: 4rem;
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
          gap: 0.75rem;
          padding-top: 0.5rem;
        }

        .form-message {
          padding: 0.75rem;
          border-radius: 0.5rem;
          font-size: 0.875rem;
        }

        .form-message.success {
          background: #d1fae5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }

        .form-message.error {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }

        .edit-card {
          padding: 1.5rem;
        }

        .about-card {
          padding: 1.5rem;
        }

        .card-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 1rem 0;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .title-icon {
          width: 2rem;
          height: 2rem;
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
          gap: 1.25rem;
        }

        .save-button {
          align-self: flex-end;
          min-width: 8rem;
        }

        .about-content {
          display: flex;
          flex-direction: column;
          gap: 1rem;
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

        .sidebar {
          position: sticky;
          top: 2rem;
        }

        .loading-state {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 3rem 0;
          color: #6b7280;
        }

        .loading-spinner {
          width: 2rem;
          height: 2rem;
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
          border: 1px solid rgba(0,0,0,0.1);
        }

        .btn-neutral:hover {
          background: white;
          border-color: rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  );
}
