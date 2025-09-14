// app/profile/hooks/useProfileData.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Profile } from '../types/profile';

export function useProfileData(userId: string | null) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [friendsCount, setFriendsCount] = useState(0);

  const loadProfile = async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
        
      if (profileError) throw profileError;
      
      if (data) {
        setProfile({
          id: data.id,
          full_name: data.full_name ?? "",
          avatar_url: data.avatar_url ?? "",
          bio: data.bio ?? "",
          location: data.location ?? "",
          location_text: (data.location_text ?? data.location) ?? "",
          location_is_public: data.location_is_public ?? false,
          show_mutuals: data.show_mutuals ?? true,
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
      } else {
        // Create default profile
        setProfile({
          id: userId,
          full_name: "",
          avatar_url: "",
          bio: "",
          location: "",
          location_text: "",
          location_is_public: false,
          show_mutuals: true,
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
      }
      
      // Load friends count
      const { count } = await supabase
        .from("friendships")
        .select("*", { count: "exact", head: true })
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`);
        
      if (typeof count === "number") setFriendsCount(count);
      
    } catch (err: any) {
      console.error("Error loading profile:", err);
      setError(err.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [userId]);

  return {
    profile,
    setProfile,
    loading,
    error,
    friendsCount,
    reload: loadProfile
  };
}

// app/profile/hooks/useProfileSave.ts
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Profile, ProfileStatus } from '../types/profile';

export function useProfileSave() {
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<ProfileStatus | null>(null);

  const uploadImage = async (
    file: File,
    userId: string,
    bucket: 'avatars' | 'covers'
  ): Promise<string | null> => {
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      
      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          upsert: false,
          cacheControl: "3600",
          contentType: file.type || undefined,
        });
      
      if (error) throw error;
      
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return data.publicUrl;
    } catch (err: any) {
      console.error(`${bucket} upload failed:`, err);
      return null;
    }
  };

  const save = async (userId: string, profile: Profile | null): Promise<boolean> => {
    if (!userId || !profile) return false;
    
    setSaving(true);
    setStatus({ type: 'info', message: 'Saving...' });
    
    try {
      // First try RPC for basic fields
      const { error: rpcError } = await supabase.rpc("upsert_my_profile", {
        p_full_name: profile.full_name?.trim() || null,
        p_bio: profile.bio?.trim() || null,
        p_location_text: profile.location_text?.trim() || null,
        p_location_is_public: !!profile.location_is_public,
        p_show_mutuals: !!profile.show_mutuals,
        p_avatar_url: profile.avatar_url?.trim() || null
      });

      // Update extended fields directly
      if (!rpcError) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            username: profile.username?.trim() || null,
            cover_url: profile.cover_url?.trim() || null,
            tagline: profile.tagline?.trim() || null,
            interests: profile.interests || [],
            website_url: profile.website_url?.trim() || null,
            social_links: profile.social_links || {},
            languages: profile.languages || [],
            visibility: profile.visibility || "public",
            discoverable: profile.discoverable ?? true,
            allow_messages: profile.allow_messages || "friends",
            allow_tags: profile.allow_tags || "review_required",
            allow_collaboration_on_posts: profile.allow_collaboration_on_posts || "friends",
            default_post_visibility: profile.default_post_visibility || "public",
            show_online_status: profile.show_online_status ?? true,
            phone: profile.phone?.trim() || null,
            birthday: profile.birthday || null,
            internal_notes: profile.internal_notes?.trim() || null,
            updated_at: new Date().toISOString()
          })
          .eq("id", userId);
          
        if (updateError) throw updateError;
      }
      
      setStatus({ type: 'success', message: 'Profile saved successfully!' });
      setTimeout(() => setStatus(null), 3000);
      return true;
      
    } catch (e: any) {
      console.error("Save error:", e);
      setStatus({ type: 'error', message: `Save failed: ${e.message}` });
      setTimeout(() => setStatus(null), 5000);
      return false;
    } finally { 
      setSaving(false); 
    }
  };

  return {
    save,
    saving,
    status,
    uploadImage
  };
}

// app/profile/hooks/useIsDesktop.ts
import { useState, useEffect } from 'react';

export function useIsDesktop(minWidth = 1024) {
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
