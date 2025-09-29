// app/profile/page.tsx
"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AvatarUploader from "@/components/AvatarUploader";
import PostComposer from "@/components/PostComposer";
import PostCard from "@/components/PostCard";
import { Post } from "@/lib/posts";

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location_text: string | null;
  location_is_public: boolean | null;
  show_mutuals: boolean | null;
};

// Animated Counter Component
function AnimatedCounter({ value, label }: { value: number; label: string }) {
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

// Lazy load components with error boundaries
const LazyProfileInviteQR = React.lazy(() => 
  import("@/components/ProfileInviteQR").catch(() => ({
    default: () => <div>QR component could not load</div>
  }))
);

const LazyProfileCandleWidget = React.lazy(() => 
  import("@/components/ProfileCandleWidget").catch(() => ({
    default: () => null
  }))
);

const LazyPhotosFeed = React.lazy(() => 
  import("@/components/PhotosFeed").catch(() => ({
    default: () => null
  }))
);

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [inviteExpanded, setInviteExpanded] = useState(false);
  const [friendsCount, setFriendsCount] = useState(0);
  const [componentsReady, setComponentsReady] = useState(false);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);

  const displayName = useMemo(() => profile?.full_name || "Member", [profile?.full_name]);

  // Delay loading of complex components
  useEffect(() => {
    const timer = setTimeout(() => {
      setComponentsReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

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

  // Load friends count
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const { count } = await supabase
          .from("friendships")
          .select("*", { count: "exact", head: true })
          .or(`user_id.eq.${userId},friend_id.eq.${userId}`);
        
        if (typeof count === "number") {
          setFriendsCount(count);
        }
      } catch (err) {
        console.error("Error loading friends count:", err);
      }
    })();
  }, [userId]);

  // Load user posts - including co-creator posts
  async function loadUserPosts() {
    if (!userId) return;
    
    setPostsLoading(true);
    try {
      // Get posts where user is creator OR co-creator
      const { data: posts, error } = await supabase
        .from('posts')
        .select('*')
        .or(`user_id.eq.${userId},co_creators.cs.{${userId}}`)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Posts query error:', error);
        return;
      }

      if (!posts || posts.length === 0) {
        setUserPosts([]);
        return;
      }

      // Get all unique author IDs
      const authorIds = [...new Set(posts.map(p => p.user_id))];
      
      // Get author profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", authorIds);

      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

      // Get co-creator profiles
      const allCoCreatorIds = posts
        .filter(p => p.co_creators && p.co_creators.length > 0)
        .flatMap(p => p.co_creators);
      
      let coCreatorProfiles: any[] = [];
      if (allCoCreatorIds.length > 0) {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", allCoCreatorIds);
        coCreatorProfiles = data || [];
      }
      
      const coCreatorMap = Object.fromEntries(
        coCreatorProfiles.map(p => [p.id, p])
      );

      // Get likes and comments
      const postIds = posts.map(p => p.id);
      let likeCountBy: Record<string, number> = {};
      let myLikeSet = new Set<string>();
      let commentCountBy: Record<string, number> = {};

      try {
        const [{ data: likeCounts }, { data: myLikes }, { data: commentCounts }] = await Promise.all([
          supabase.from("post_likes").select("post_id").in("post_id", postIds),
          supabase.from("post_likes").select("post_id").eq("user_id", userId).in("post_id", postIds),
          supabase.from("post_comments").select("post_id").in("post_id", postIds),
        ]);

        // Count likes
        const likesPerPost: Record<string, number> = {};
        (likeCounts || []).forEach(like => {
          likesPerPost[like.post_id] = (likesPerPost[like.post_id] || 0) + 1;
        });
        likeCountBy = likesPerPost;
        
        myLikeSet = new Set((myLikes ?? []).map(r => r.post_id));
        
        // Count comments
        const commentsPerPost: Record<string, number> = {};
        (commentCounts || []).forEach(comment => {
          commentsPerPost[comment.post_id] = (commentsPerPost[comment.post_id] || 0) + 1;
        });
        commentCountBy = commentsPerPost;
      } catch (e) {
        console.log("Error loading engagement data");
      }

      // Get additional media
      let mediaByPost: Record<string, any[]> = {};
      try {
        const { data: media } = await supabase
          .from("post_media")
          .select("post_id, storage_path, type")
          .in("post_id", postIds);
        
        if (media) {
          media.forEach(m => {
            if (!mediaByPost[m.post_id]) mediaByPost[m.post_id] = [];
            
            // Get public URL
            const bucketName = m.type === 'video' ? 'post-videos' : 'post-images';
            const { data: { publicUrl } } = supabase.storage
              .from(bucketName)
              .getPublicUrl(m.storage_path);
            
            mediaByPost[m.post_id].push({ url: publicUrl, type: m.type });
          });
        }
      } catch (e) {
        console.log("Error loading media");
      }

      // Format posts
      const formattedPosts: Post[] = posts.map(p => ({
        id: p.id,
        user_id: p.user_id,
        body: p.body,
        image_url: p.image_url || null,
        video_url: p.video_url || null,
        privacy: p.visibility || p.privacy || 'public',
        created_at: p.created_at,
        allow_share: p.allow_share ?? true,
        co_creators: p.co_creators || null,
        author: profileMap[p.user_id] || null,
        additional_media: mediaByPost[p.id] || [],
        co_creators_info: p.co_creators?.map((id: string) => coCreatorMap[id]).filter(Boolean) || [],
        like_count: likeCountBy[p.id] ?? 0,
        liked_by_me: myLikeSet.has(p.id),
        comment_count: commentCountBy[p.id] ?? 0,
      }));

      setUserPosts(formattedPosts);
    } catch (err) {
      console.error('Error loading posts:', err);
      setUserPosts([]);
    } finally {
      setPostsLoading(false);
    }
  }

  // Load posts when userId is available
  useEffect(() => {
    if (userId) {
      loadUserPosts();
    }
  }, [userId]);

  // Save profile - FIXED to preserve admin status
  async function handleSave() {
    if (!userId || !profile) return;
    
    setSaving(true);
    setStatus("Saving...");
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          bio: profile.bio,
          location_text: profile.location_text,
          location_is_public: profile.location_is_public,
          show_mutuals: profile.show_mutuals,
          avatar_url: profile.avatar_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
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
          <span>Loading your amazing profile...</span>
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
                    {displayName}
                  </h2>
                  
                  {/* Stats Row */}
                  <div className="stats-row">
                    <div className="stats-grid">
                      <AnimatedCounter value={0} label="Followers" />
                      <AnimatedCounter value={0} label="Following" />
                      <AnimatedCounter value={friendsCount} label="Friends" />
                    </div>
                    
                    <div className="profile-actions">
                      <Link href="/friends" className="btn btn-compact">
                        👥 Browse Friends
                      </Link>
                      <Link href="/gratitude" className="btn btn-compact">
                        🙏 Gratitude
                      </Link>
                      <Link href="/gifts" className="btn btn-compact btn-gifts">
                        🎁 Gifts
                      </Link>
                      <Link href="/messages" className="btn btn-compact">
                        💬 Messages
                      </Link>
                    </div>
                  </div>
                  
                  {profile.location_is_public && profile.location_text && (
                    <p className="profile-location">📍 {profile.location_text}</p>
                  )}
                  
                  {profile.bio ? (
                    <p className="profile-bio">{profile.bio}</p>
                  ) : (
                    <p className="empty-state">Add a bio using the Edit button above.</p>
                  )}

                  {/* Invite Friends Section */}
                  <div className="invite-section">
                    <button
                      onClick={() => setInviteExpanded(!inviteExpanded)}
                      className="btn btn-special invite-button"
                    >
                      🎉 Invite Friends
                      <span className={`invite-arrow ${inviteExpanded ? 'expanded' : ''}`}>▼</span>
                    </button>
                    
                    {inviteExpanded && userId && componentsReady && (
                      <div className="invite-content">
                        <Suspense fallback={<div>Loading QR code...</div>}>
                          <LazyProfileInviteQR userId={userId} embed qrSize={180} />
                        </Suspense>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sacred Candles Widget */}
      {componentsReady && userId && (
        <Suspense fallback={null}>
          <LazyProfileCandleWidget userId={userId} isOwner={true} />
        </Suspense>
      )}

      {/* Post Composer and Posts Feed Section */}
      {userId && (
        <div className="posts-section">
          <div className="card">
            <h3 className="section-title">Share a Moment</h3>
            <PostComposer 
              onPostCreated={loadUserPosts}
              className="composer-wrapper"
            />
          </div>

          {/* Album Creator Button */}
          <div className="card">
            <Link 
              href="/albums/create" 
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'center',
                padding: '1rem 1.5rem',
                background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                color: 'white',
                borderRadius: '0.5rem',
                fontWeight: '600',
                textDecoration: 'none',
                transition: 'opacity 0.2s'
              }}
            >
              📸 Create Photo Album
            </Link>
          </div>

          {/* View Albums Button */}
          <div className="card">
            <Link 
              href="/albums" 
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'center',
                padding: '1rem 1.5rem',
                background: 'white',
                color: '#8b5cf6',
                border: '2px solid #8b5cf6',
                borderRadius: '0.5rem',
                fontWeight: '600',
                textDecoration: 'none',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#8b5cf6';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.color = '#8b5cf6';
              }}
            >
              📚 View My Albums
            </Link>
          </div>

          <div className="card">
            <h3 className="section-title">Your Posts</h3>
            {postsLoading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <span>Loading your posts...</span>
              </div>
            ) : userPosts.length > 0 ? (
              <div className="posts-feed">
                {userPosts.map((post) => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    onChanged={loadUserPosts}
                    currentUserId={userId}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-posts">
                <div className="empty-icon">📝</div>
                <p className="empty-text">No posts yet</p>
                <p className="empty-subtext">Share your first moment above!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Photos Feed */}
      {componentsReady && userId && (
        <Suspense fallback={null}>
          <LazyPhotosFeed userId={userId} />
        </Suspense>
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
          background: linear-gradient(135deg, var(--brand), #8b5cf6);
          color: white;
        }

        .btn-neutral {
          background: white;
          color: #374151;
          border: 1px solid #e5e7eb;
        }

        .btn-compact {
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          background: white;
          color: #374151;
          border: 1px solid #e5e7eb;
        }

        .btn-gifts {
          background: linear-gradient(135deg, #f59e0b, #f97316);
          color: white;
          border: none;
          box-shadow: 0 2px 4px rgba(245,158,11,0.3);
        }

        .btn-gifts:hover {
          background: linear-gradient(135deg, #d97706, #ea580c);
          box-shadow: 0 4px 12px rgba(245,158,11,0.4);
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
          font-size: 1.875rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 0.5rem 0;
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

        .profile-location {
          color: #6b7280;
          margin: 0 0 0.5rem 0;
        }

        .profile-bio {
          color: #374151;
          line-height: 1.6;
        }

        .empty-state {
          color: #6b7280;
          font-style: italic;
        }

        .invite-section {
          margin-top: 1.5rem;
          max-width: 20rem;
        }

        .btn.btn-special {
          background: linear-gradient(135deg, #c084fc, #a78bfa);
          color: white;
          border: none;
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          font-size: 0.875rem;
          padding: 0.75rem 1rem;
        }

        .btn.btn-special:hover {
          background: linear-gradient(135deg, #a78bfa, #9333ea);
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
          color: #1f2937;
          background: white;
        }

        .form-input::placeholder {
          color: #9ca3af;
        }

        .form-input:focus {
          outline: none;
          border-color: var(--brand);
          box-shadow: 0 0 0 3px rgba(139,92,246,0.1);
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
          color: #374151;
        }

        .save-button {
          margin-top: 0.5rem;
        }

        .posts-section {
          margin-top: 2rem;
        }

        .section-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 1rem 0;
        }

        .composer-wrapper {
          margin-bottom: 0;
        }

        .posts-feed {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .empty-posts {
          text-align: center;
          padding: 2rem 1rem;
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: 0.5rem;
        }

        .empty-text {
          font-size: 1.125rem;
          font-weight: 600;
          color: #4b5563;
          margin: 0 0 0.5rem 0;
        }

        .empty-subtext {
          color: #9ca3af;
          margin: 0;
        }

        .loading-state {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 2rem;
          color: #374151;
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
      `}</style>
    </div>
  );
}
