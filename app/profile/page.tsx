// app/profile/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AvatarUploader from "@/components/AvatarUploader";
import PhotosFeed from "@/components/PhotosFeed";
import ProfileInviteQR from "@/components/ProfileInviteQR";
import ProfileCandleWidget from "@/components/ProfileCandleWidget";
import { 
  Camera, Globe, Hash, Shield, MessageCircle, 
  Instagram, Facebook, Youtube, Linkedin, Twitter, 
  Music, MessageSquare, Phone, Cake, StickyNote,
  MapPin, Languages, Users, Eye, Tag, Lock
} from "lucide-react";

// Social platforms configuration
const SOCIAL_PLATFORMS = [
  { key: "instagram", Icon: Instagram, placeholder: "instagram.com/username" },
  { key: "facebook", Icon: Facebook, placeholder: "facebook.com/username" },
  { key: "tiktok", Icon: Music, placeholder: "tiktok.com/@username" },
  { key: "youtube", Icon: Youtube, placeholder: "youtube.com/@channel" },
  { key: "linkedin", Icon: Linkedin, placeholder: "linkedin.com/in/username" },
  { key: "x", Icon: Twitter, placeholder: "x.com/username" },
  { key: "threads", Icon: MessageSquare, placeholder: "threads.net/@username" },
  { key: "discord", Icon: MessageCircle, placeholder: "discord username" },
];

// Enhanced Profile type with ALL fields
type Profile = {
  id: string;
  // EXISTING FIELDS - ALL KEPT
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location?: string | null;
  location_text?: string | null;
  location_is_public?: boolean | null;
  show_mutuals: boolean | null;
  
  // NEW FIELDS ADDED
  username?: string | null;
  cover_url?: string | null;
  tagline?: string | null;
  interests?: string[] | null;
  website_url?: string | null;
  social_links?: any | null;
  languages?: string[] | null;
  visibility?: string | null;
  discoverable?: boolean | null;
  allow_messages?: string | null;
  allow_tags?: string | null;
  allow_collaboration_on_posts?: string | null;
  default_post_visibility?: string | null;
  show_online_status?: boolean | null;
  phone?: string | null;
  birthday?: string | null;
  internal_notes?: string | null;
  verified?: boolean | null;
  friends_count?: number | null;
  posts_count?: number | null;
  collab_posts_count?: number | null;
  profile_views_30d?: number | null;
};

// KEEPING YOUR EXISTING HOOK
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

// KEEPING YOUR ANIMATED COUNTER
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
  // KEEPING ALL YOUR EXISTING STATE
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editPersonal, setEditPersonal] = useState(false);
  const [friendsCount, setFriendsCount] = useState<number>(0);
  const [inviteExpanded, setInviteExpanded] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const isDesktop = useIsDesktop(1024);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  
  // NEW STATE FOR ADDITIONAL FEATURES
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [activeSection, setActiveSection] = useState<'about' | 'privacy' | 'social'>('about');
  const [expandedSections, setExpandedSections] = useState({
    details: true,
    interests: true,
    privacy: false,
    social: false
  });

  // ENHANCED PROFILE STATE WITH ALL FIELDS
  const [p, setP] = useState<Profile>({
    id: "",
    // Existing fields
    full_name: "",
    avatar_url: "",
    bio: "",
    location: "",
    location_text: "",
    location_is_public: false,
    show_mutuals: true,
    // New fields
    username: "",
    cover_url: "",
    tagline: "",
    interests: [],
    website_url: "",
    social_links: {},
    languages: [],
    visibility: "public",
    discoverable: true,
    allow_messages: "friends",
    allow_tags: "review_required",
    allow_collaboration_on_posts: "friends",
    default_post_visibility: "public",
    show_online_status: true,
    phone: "",
    birthday: "",
    internal_notes: "",
    verified: false,
    friends_count: 0,
    posts_count: 0,
    collab_posts_count: 0,
    profile_views_30d: 0
  });

  // KEEPING YOUR EXISTING AUTH CHECK
  useEffect(() => { 
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      setUserId(user?.id ?? null);
    });
  }, []);

  // ENHANCED PROFILE LOAD WITH ALL FIELDS
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
            // Existing fields
            full_name: data.full_name ?? "",
            avatar_url: data.avatar_url ?? "",
            bio: data.bio ?? "",
            location: data.location ?? "",
            location_text: (data.location_text ?? data.location) ?? "",
            location_is_public: data.location_is_public ?? false,
            show_mutuals: data.show_mutuals ?? true,
            // New fields
            username: data.username ?? "",
            cover_url: data.cover_url ?? "",
            tagline: data.tagline ?? "",
            interests: data.interests ?? [],
            website_url: data.website_url ?? "",
            social_links: data.social_links ?? {},
            languages: data.languages ?? [],
            visibility: data.visibility ?? "public",
            discoverable: data.discoverable ?? true,
            allow_messages: data.allow_messages ?? "friends",
            allow_tags: data.allow_tags ?? "review_required",
            allow_collaboration_on_posts: data.allow_collaboration_on_posts ?? "friends",
            default_post_visibility: data.default_post_visibility ?? "public",
            show_online_status: data.show_online_status ?? true,
            phone: data.phone ?? "",
            birthday: data.birthday ?? "",
            internal_notes: data.internal_notes ?? "",
            verified: data.verified ?? false,
            friends_count: data.friends_count ?? 0,
            posts_count: data.posts_count ?? 0,
            collab_posts_count: data.collab_posts_count ?? 0,
            profile_views_30d: data.profile_views_30d ?? 0
          });
        } else setP(prev => ({ ...prev, id: userId }));
      } catch { setTableMissing(true); }
      finally { setLoading(false); }
    };
    load();
  }, [userId]);

  // KEEPING YOUR EXISTING FRIENDS COUNT
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { count } = await supabase.from("friendships").select("a", { count: "exact", head: true }).or(`a.eq.${userId},b.eq.${userId}`);
      if (typeof count === "number") setFriendsCount(count);
    })();
  }, [userId]);

  const displayName = useMemo(() => p.full_name || "Member", [p.full_name]);

  // KEEPING YOUR EXISTING AVATAR UPLOAD
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

  // NEW: Cover upload function
  async function uploadCover() {
    if (!coverFile || !userId) return p.cover_url;
    
    setUploadingCover(true);
    try {
      const ext = (coverFile.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      
      const { error } = await supabase.storage.from("covers").upload(path, coverFile, {
        upsert: false,
        cacheControl: "3600",
        contentType: coverFile.type || undefined,
      });
      
      if (error) throw error;
      
      const { data } = supabase.storage.from("covers").getPublicUrl(path);
      return data.publicUrl;
    } catch (err: any) {
      throw new Error(`Cover upload failed: ${err.message}`);
    } finally {
      setUploadingCover(false);
    }
  }

  // ENHANCED SAVE WITH ALL FIELDS - KEEPING YOUR RPC APPROACH
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
      
      // Upload cover if changed
      let coverUrl = p.cover_url;
      if (coverFile) {
        coverUrl = await uploadCover();
      }

      // First try RPC with your existing parameters
      const { error: rpcError } = await supabase.rpc("upsert_my_profile", {
        p_full_name: p.full_name?.trim() || null,
        p_bio: p.bio?.trim() || null,
        p_location_text: p.location_text?.trim() || null,
        p_location_is_public: !!p.location_is_public,
        p_show_mutuals: !!p.show_mutuals,
        p_avatar_url: avatarUrl?.trim() || null
      });

      // If RPC doesn't support new fields, update directly
      if (!rpcError) {
        // Update new fields directly
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            username: p.username?.trim() || null,
            cover_url: coverUrl?.trim() || null,
            tagline: p.tagline?.trim() || null,
            interests: p.interests || [],
            website_url: p.website_url?.trim() || null,
            social_links: p.social_links || {},
            languages: p.languages || [],
            visibility: p.visibility || "public",
            discoverable: p.discoverable ?? true,
            allow_messages: p.allow_messages || "friends",
            allow_tags: p.allow_tags || "review_required",
            allow_collaboration_on_posts: p.allow_collaboration_on_posts || "friends",
            default_post_visibility: p.default_post_visibility || "public",
            show_online_status: p.show_online_status ?? true,
            phone: p.phone?.trim() || null,
            birthday: p.birthday || null,
            internal_notes: p.internal_notes?.trim() || null
          })
          .eq("id", userId);
          
        if (updateError) throw updateError;
      }
      
      setStatus("Saved ✅");
      setAvatarFile(null);
      setCoverFile(null);
      setP(prev => ({ ...prev, avatar_url: avatarUrl, cover_url: coverUrl }));
      setEditPersonal(false);
      
      setTimeout(() => setStatus(null), 3000);
      
    } catch (e: any) {
      console.error("Save error:", e);
      setStatus(`Save failed: ${e.message}`);
      setTimeout(() => setStatus(null), 5000);
    } finally { 
      setSaving(false); 
    }
  };

  // KEEPING YOUR EXISTING AVATAR CHANGE
  async function onAvatarChange(url: string) {
    setP(prev => ({ ...prev, avatar_url: url }));
  }

  // NEW: Helper functions for new features
  function toggleInterest(interest: string) {
    const interests = p.interests || [];
    const updated = interests.includes(interest)
      ? interests.filter(i => i !== interest)
      : [...interests, interest];
    setP(prev => ({ ...prev, interests: updated }));
  }

  return (
    <div className="profile-page">
      {/* KEEPING YOUR EXISTING HEADER */}
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
        </div>
      </div>

      {/* KEEPING YOUR STATUS MESSAGES */}
      {status && (
        <div className={`status-message ${status.includes('failed') || status.includes('ERROR') ? 'error' : 'success'}`}>
          {status}
        </div>
      )}

      {/* KEEPING YOUR ERROR STATE */}
      {tableMissing && (
        <div className="error-banner">
          <div className="error-title">Tables not found</div>
          <div className="error-message">Run the SQL migration, then reload.</div>
        </div>
      )}

      {/* ENHANCED MAIN PROFILE CARD WITH COVER */}
      <div className="card profile-main-card">
        {/* NEW: Cover Image Section */}
        <div className="cover-section">
          {p.cover_url ? (
            <img src={p.cover_url} alt="Cover" className="cover-image" />
          ) : (
            <div className="cover-gradient" />
          )}
          
          {editPersonal && (
            <label className="cover-upload-btn">
              <Camera size={20} />
              <span>{isDesktop ? "Change Cover" : "Cover"}</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                style={{ display: "none" }}
              />
            </label>
          )}
        </div>

        <div className={`profile-layout ${isDesktop ? 'desktop' : 'mobile'}`}>
          {/* KEEPING YOUR AVATAR SECTION EXACTLY AS IS */}
          <div className="avatar-section">
            <div className="avatar-wrapper">
              {editPersonal ? (
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
              {p.verified && <div className="verified-badge">✓</div>}
            </div>
          </div>

          {/* ENHANCED PROFILE INFO */}
          <div className="profile-info">
            <h2 className="profile-name">
              {displayName}
              {p.username && <span className="username">@{p.username}</span>}
            </h2>
            {p.tagline && !editPersonal && (
              <p className="tagline">{p.tagline}</p>
            )}
            
            {/* KEEPING YOUR STATS ROW */}
            <div className="stats-row">
              <div className="stats-grid">
                <AnimatedCounter value={0} label="Followers" />
                <AnimatedCounter value={0} label="Following" />
                <AnimatedCounter value={friendsCount} label="Friends" />
              </div>
              
              {/* KEEPING YOUR ACTION BUTTONS */}
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

            {/* KEEPING YOUR INVITE FRIENDS */}
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

      {/* ENHANCED EDIT SECTION WITH TABS FOR MOBILE */}
      {editPersonal ? (
        <div className="card edit-card">
          <h3 className="card-title">
            <span className="title-icon">✏️</span>
            Edit Your Information
          </h3>
          
          {/* Tab navigation for mobile */}
          {!isDesktop && (
            <div className="edit-tabs">
              <button
                className={`tab ${activeSection === 'about' ? 'active' : ''}`}
                onClick={() => setActiveSection('about')}
              >
                About
              </button>
              <button
                className={`tab ${activeSection === 'privacy' ? 'active' : ''}`}
                onClick={() => setActiveSection('privacy')}
              >
                Privacy
              </button>
              <button
                className={`tab ${activeSection === 'social' ? 'active' : ''}`}
                onClick={() => setActiveSection('social')}
              >
                Social
              </button>
            </div>
          )}
          
          <div className="edit-form">
            {/* ABOUT SECTION */}
            {(isDesktop || activeSection === 'about') && (
              <>
                {/* KEEPING YOUR EXISTING FIELDS */}
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

                {/* NEW: Username field */}
                <div className="form-field">
                  <label className="form-label">Username</label>
                  <div className="username-input-group">
                    <span className="username-prefix">@</span>
                    <input 
                      className="form-input"
                      value={p.username ?? ""} 
                      onChange={(e) => setP({ ...p, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })} 
                      placeholder="username"
                      autoComplete="off"
                      inputMode="text"
                    />
                  </div>
                </div>

                {/* NEW: Tagline */}
                <div className="form-field">
                  <label className="form-label">Tagline</label>
                  <input 
                    className="form-input"
                    value={p.tagline ?? ""} 
                    onChange={(e) => setP({ ...p, tagline: e.target.value })} 
                    placeholder="Short status or description"
                    maxLength={100}
                    autoComplete="off"
                    inputMode="text"
                  />
                </div>

                {/* KEEPING YOUR EXISTING LOCATION */}
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

                {/* KEEPING YOUR EXISTING BIO */}
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

                {/* NEW: Website */}
                <div className="form-field">
                  <label className="form-label">
                    <Globe size={16} style={{ display: "inline", marginRight: "0.25rem" }} />
                    Website
                  </label>
                  <input 
                    className="form-input"
                    type="url"
                    value={p.website_url ?? ""} 
                    onChange={(e) => setP({ ...p, website_url: e.target.value })} 
                    placeholder="https://yourwebsite.com"
                    autoComplete="url"
                    inputMode="url"
                  />
                </div>

                {/* NEW: Languages */}
                <div className="form-field">
                  <label className="form-label">Languages</label>
                  <input 
                    className="form-input"
                    value={p.languages?.join(", ") ?? ""} 
                    onChange={(e) => setP({ ...p, languages: e.target.value.split(",").map(l => l.trim()).filter(Boolean) })} 
                    placeholder="English, Spanish, French"
                    autoComplete="off"
                    inputMode="text"
                  />
                </div>

                {/* NEW: Interests */}
                <div className="form-field">
                  <label className="form-label">
                    <Hash size={16} style={{ display: "inline", marginRight: "0.25rem" }} />
                    Interests
                  </label>
                  <div className="interests-picker">
                    {["Meditation", "Yoga", "Reiki", "Nature", "Music", "Art", "Travel", "Reading", "Cooking", "Photography"].map(interest => (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => toggleInterest(interest)}
                        className={`interest-chip ${p.interests?.includes(interest) ? 'active' : ''}`}
                      >
                        {interest}
                      </button>
                    ))}
                  </div>
                  <input 
                    className="form-input"
                    placeholder="Add custom interests (comma separated)"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const input = e.currentTarget as HTMLInputElement;
                        const newInterests = input.value.split(',').map(i => i.trim()).filter(Boolean);
                        setP({ ...p, interests: [...(p.interests || []), ...newInterests] });
                        input.value = '';
                      }
                    }}
                  />
                </div>

                {/* KEEPING YOUR EXISTING MUTUAL FRIENDS */}
                <label className="checkbox-label">
                  <input 
                    type="checkbox"
                    checked={!!p.show_mutuals} 
                    onChange={(e) => setP({ ...p, show_mutuals: e.target.checked })} 
                  />
                  <span>Show mutual friends</span>
                </label>

                {/* NEW: Private fields section */}
                <div className="private-section">
                  <h4 className="section-subtitle">
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
                      value={p.internal_notes ?? ""} 
                      onChange={(e) => setP({ ...p, internal_notes: e.target.value })} 
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
                      value={p.phone ?? ""} 
                      onChange={(e) => setP({ ...p, phone: e.target.value })} 
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
                      value={p.birthday ?? ""} 
                      onChange={(e) => setP({ ...p, birthday: e.target.value })} 
                    />
                  </div>
                </div>
              </>
            )}

            {/* PRIVACY SECTION */}
            {(isDesktop || activeSection === 'privacy') && (
              <div className="privacy-settings">
                <h4 className="section-subtitle">
                  <Shield size={16} style={{ display: "inline", marginRight: "0.25rem" }} />
                  Privacy & Safety Settings
                </h4>

                <div className="form-field">
                  <label className="form-label">Profile Visibility</label>
                  <select 
                    className="form-input"
                    value={p.visibility ?? "public"} 
                    onChange={(e) => setP({ ...p, visibility: e.target.value })}
                  >
                    <option value="public">Public - Anyone can see</option>
                    <option value="friends_only">Friends Only</option>
                    <option value="private">Private - Only you</option>
                  </select>
                </div>

                <label className="checkbox-label">
                  <input 
                    type="checkbox"
                    checked={!!p.discoverable} 
                    onChange={(e) => setP({ ...p, discoverable: e.target.checked })} 
                  />
                  <span>Include me in search & friend suggestions</span>
                </label>

                <div className="form-field">
                  <label className="form-label">Who can message me</label>
                  <select 
                    className="form-input"
                    value={p.allow_messages ?? "friends"} 
                    onChange={(e) => setP({ ...p, allow_messages: e.target.value })}
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
                    value={p.allow_tags ?? "review_required"} 
                    onChange={(e) => setP({ ...p, allow_tags: e.target.value })}
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
                    value={p.allow_collaboration_on_posts ?? "friends"} 
                    onChange={(e) => setP({ ...p, allow_collaboration_on_posts: e.target.value })}
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
                    value={p.default_post_visibility ?? "public"} 
                    onChange={(e) => setP({ ...p, default_post_visibility: e.target.value })}
                  >
                    <option value="public">Public</option>
                    <option value="friends_only">Friends Only</option>
                    <option value="private">Private</option>
                  </select>
                </div>

                <label className="checkbox-label">
                  <input 
                    type="checkbox"
                    checked={!!p.show_online_status} 
                    onChange={(e) => setP({ ...p, show_online_status: e.target.checked })} 
                  />
                  <span>Show when I'm online</span>
                </label>
              </div>
            )}

            {/* SOCIAL SECTION */}
            {(isDesktop || activeSection === 'social') && (
              <div className="social-settings">
                <h4 className="section-subtitle">
                  <Globe size={16} style={{ display: "inline", marginRight: "0.25rem" }} />
                  Social Links
                </h4>

                {SOCIAL_PLATFORMS.map(({ key, Icon, placeholder }) => (
                  <div key={key} className="form-field">
                    <label className="form-label social-label">
                      <Icon size={16} />
                      <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                    </label>
                    <input 
                      className="form-input"
                      value={p.social_links?.[key] ?? ""} 
                      onChange={(e) => setP({ 
                        ...p, 
                        social_links: { 
                          ...p.social_links, 
                          [key]: e.target.value 
                        } 
                      })} 
                      placeholder={placeholder}
                      autoComplete="off"
                      inputMode="url"
                    />
                  </div>
                ))}
              </div>
            )}

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
        /* ENHANCED ABOUT SECTION WHEN NOT EDITING */
        <div className="card about-card">
          <h3 className="card-title">
            <span className="title-icon">👤</span>
            About
          </h3>
          
          <div className="about-content">
            {/* KEEPING YOUR EXISTING LOCATION */}
            {p.location_is_public && p.location_text && (
              <div className="about-item">
                <span className="about-icon">📍</span>
                <span><strong>Location:</strong> {p.location_text}</span>
              </div>
            )}
            
            {/* NEW: Website */}
            {p.website_url && (
              <div className="about-item">
                <span className="about-icon">🌐</span>
                <span>
                  <strong>Website:</strong>{" "}
                  <a href={p.website_url} target="_blank" rel="noopener noreferrer" className="link">
                    {p.website_url.replace(/^https?:\/\//, "")}
                  </a>
                </span>
              </div>
            )}
            
            {/* NEW: Languages */}
            {p.languages && p.languages.length > 0 && (
              <div className="about-item">
                <span className="about-icon">💬</span>
                <span><strong>Languages:</strong> {p.languages.join(", ")}</span>
              </div>
            )}
            
            {/* KEEPING YOUR EXISTING BIO */}
            {p.bio ? (
              <div className="bio-text">{p.bio}</div>
            ) : (
              <div className="empty-state">Add a bio and location using the Edit button above.</div>
            )}
            
            {/* NEW: Interests */}
            {p.interests && p.interests.length > 0 && (
              <div className="interests-display">
                <strong>Interests:</strong>
                <div className="interests-list">
                  {p.interests.map(interest => (
                    <span key={interest} className="interest-tag">
                      #{interest}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* NEW: Social Links */}
            {p.social_links && Object.keys(p.social_links).filter(k => p.social_links[k]).length > 0 && (
              <div className="social-links-display">
                <strong>Social:</strong>
                <div className="social-links-list">
                  {SOCIAL_PLATFORMS.map(({ key, Icon }) => (
                    p.social_links[key] && (
                      <a
                        key={key}
                        href={`https://${p.social_links[key]}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="social-link"
                        title={key}
                      >
                        <Icon size={20} />
                      </a>
                    )
                  ))}
                </div>
              </div>
            )}
            
            {/* KEEPING YOUR EXISTING PRIVACY NOTE */}
            {!p.location_is_public && p.location_text && (
              <div className="privacy-note">
                <span>🔒</span>
                <span>Location is private</span>
              </div>
            )}
            
            {/* NEW: Profile Analytics (creator only) */}
            {p.profile_views_30d !== undefined && p.profile_views_30d > 0 && (
              <div className="analytics-display">
                <div className="analytics-item">
                  <Eye size={16} />
                  <span>{p.profile_views_30d} profile views (30 days)</span>
                </div>
                {p.collab_posts_count > 0 && (
                  <div className="analytics-item">
                    <Users size={16} />
                    <span>{p.collab_posts_count} collaborative posts</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* NEW: Integrated Candle Widget - Smaller and cleaner */}
      {userId && <ProfileCandleWidget userId={userId} isOwner={true} />}

      {/* KEEPING YOUR SACRED CANDLES LINK - Now as fallback if widget doesn't load */}
      <div className="card candles-card">
        <div className="candles-icon">🕯️</div>
        <h3 className="candles-title">My Sacred Candles</h3>
        <p className="candles-description">View your eternal memorials and prayer candles</p>
        <Link href="/profile/candles" className="btn btn-candles">
          View My Candles ✨
        </Link>
      </div>

      {/* KEEPING YOUR PHOTOS FEED EXACTLY AS IS */}
      <PhotosFeed userId={userId} />

      {/* KEEPING YOUR LOADING STATE */}
      {loading && (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <span>Loading your amazing profile...</span>
        </div>
      )}

      <style jsx>{`
        /* KEEPING ALL YOUR EXISTING STYLES */
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
          padding: 0;
          margin-bottom: 1.5rem;
          background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,250,252,0.9));
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.6);
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
          overflow: hidden;
        }

        /* NEW: Cover section styles */
        .cover-section {
          position: relative;
          height: 200px;
          width: 100%;
        }

        .cover-image, .cover-gradient {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .cover-gradient {
          background: linear-gradient(135deg, #c4b5fd, #f0abfc, #fcd34d);
        }

        .cover-upload-btn {
          position: absolute;
          bottom: 1rem;
          right: 1rem;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          transition: all 0.2s;
          border: 1px solid rgba(139,92,246,0.2);
        }

        .cover-upload-btn:hover {
          background: rgba(255, 255, 255, 1);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(139,92,246,0.2);
        }

        .profile-layout {
          display: flex;
          gap: 2rem;
          align-items: flex-start;
          padding: 2rem;
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
          margin-top: -4rem;
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
          border: 4px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
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

        /* NEW: Verified badge */
        .verified-badge {
          position: absolute;
          top: 0;
          right: 0;
          width: 1.5rem;
          height: 1.5rem;
          background: #3b82f6;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: bold;
        }

        .profile-info {
          flex-grow: 1;
          min-width: 0;
        }

        .profile-name {
          font-size: 1.875rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 0.5rem 0;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        /* NEW: Username and tagline styles */
        .username {
          font-size: 1rem;
          font-weight: 400;
          color: #6b7280;
        }

        .tagline {
          font-size: 0.875rem;
          color: #9ca3af;
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

        /* NEW: Edit tabs for mobile */
        .edit-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
          padding: 0.25rem;
          background: rgba(139,92,246,0.05);
          border-radius: 0.5rem;
        }

        .tab {
          flex: 1;
          padding: 0.5rem;
          border: none;
          background: transparent;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          color: #6b7280;
        }

        .tab.active {
          background: white;
          color: var(--brand);
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        /* Sacred Candles Card Styles - KEEPING YOUR EXISTING */
        .candles-card {
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(254,243,199,0.1));
          backdrop-filter: blur(5px);
          border: 1px solid rgba(245,158,11,0.2);
          border-radius: 0.75rem;
          text-align: center;
          transition: all 0.3s ease;
        }

        .candles-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(245,158,11,0.15);
          background: linear-gradient(135deg, rgba(255,255,255,1), rgba(254,243,199,0.15));
        }

        .candles-icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
          animation: flicker 2s ease-in-out infinite;
        }

        @keyframes flicker {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }

        .candles-title {
          margin: 0 0 0.5rem 0;
          color: #78350f;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .candles-description {
          margin: 0 0 1rem 0;
          color: #92400e;
          opacity: 0.8;
          font-size: 0.875rem;
        }

        .btn-candles {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          font-weight: 500;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          text-decoration: none;
          font-size: 16px;
          border: none;
        }

        .btn-candles:hover {
          background: linear-gradient(135deg, #d97706, #b45309);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(245,158,11,0.3);
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

        /* NEW: Username input group */
        .username-input-group {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .username-prefix {
          color: #6b7280;
          font-size: 1rem;
        }

        /* NEW: Interests picker */
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

        /* NEW: Section styles */
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

        .private-section {
          margin-top: 1.5rem;
          padding-top: 1rem;
          border-top: 2px dashed #e5e7eb;
        }

        /* NEW: Social label */
        .social-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
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

        /* NEW: Interests display */
        .interests-display {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
        }

        .interests-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .interest-tag {
          padding: 0.25rem 0.75rem;
          background: linear-gradient(135deg, #ede9fe, #fce7f3);
          color: #7c3aed;
          border-radius: 1rem;
          font-size: 0.875rem;
        }

        /* NEW: Social links display */
        .social-links-display {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
        }

        .social-links-list {
          display: flex;
          gap: 0.75rem;
          margin-top: 0.5rem;
          flex-wrap: wrap;
        }

        .social-link {
          width: 2rem;
          height: 2rem;
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
        }

        /* NEW: Analytics display */
        .analytics-display {
          margin-top: 1rem;
          padding: 0.75rem;
          background: rgba(139,92,246,0.05);
          border-left: 3px solid var(--brand);
          border-radius: 0.25rem;
        }

        .analytics-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #6b7280;
          font-size: 0.875rem;
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

        /* Enhanced button styles - KEEPING YOUR EXISTING */
        .btn {
          transition: all 0.2s ease;
          font-weight: 500;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.25rem;
          font-size: 16px;
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

        .link {
          color: var(--brand);
          text-decoration: none;
        }

        .link:hover {
          text-decoration: underline;
        }

        /* Mobile optimizations - KEEPING YOUR EXISTING */
        @media (max-width: 640px) {
          .profile-page {
            padding: 1rem 0.5rem;
          }
          
          .form-input {
            font-size: 16px;
          }
          
          .profile-actions {
            justify-content: center;
            width: 100%;
          }
          
          .btn-compact {
            flex: 1;
            min-width: 0;
          }
          
          .avatar-section {
            margin-top: -3rem;
          }
          
          .cover-section {
            height: 150px;
          }
          
          .interests-picker {
            justify-content: center;
          }
          
          .social-links-list {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
