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
          full_name: data.full_name ?? null,
          avatar_url: data.avatar_url ?? null,
          bio: data.bio ?? null,
          location: data.location ?? null,
          location_text: (data.location_text ?? data.location) ?? null,
          location_is_public: data.location_is_public ?? false,
          show_mutuals: data.show_mutuals ?? true,
          username: data.username ?? null,
          cover_url: data.cover_url ?? null,
          tagline: data.tagline ?? null,
          interests: data.interests ?? null,
          website_url: data.website_url ?? null,
          social_links: data.social_links ?? null,
          languages: data.languages ?? null,
          visibility: data.visibility ?? 'public',
          discoverable: data.discoverable ?? true,
          allow_messages: data.allow_messages ?? 'friends',
          allow_tags: data.allow_tags ?? 'review_required',
          allow_collaboration_on_posts: data.allow_collaboration_on_posts ?? 'friends',
          default_post_visibility: data.default_post_visibility ?? 'public',
          show_online_status: data.show_online_status ?? true,
          phone: data.phone ?? null,
          birthday: data.birthday ?? null,
          internal_notes: data.internal_notes ?? null,
          verified: data.verified ?? false,
          friends_count: data.friends_count ?? 0,
          posts_count: data.posts_count ?? 0,
          collab_posts_count: data.collab_posts_count ?? 0,
          profile_views_30d: data.profile_views_30d ?? 0,
          created_at: data.created_at ?? null,
          updated_at: data.updated_at ?? null,
          last_active_at: data.last_active_at ?? null
        });
      } else {
        // Create default profile
        setProfile({
          id: userId,
          full_name: null,
          avatar_url: null,
          bio: null,
          location: null,
          location_text: null,
          location_is_public: false,
          show_mutuals: true,
          username: null,
          cover_url: null,
          tagline: null,
          interests: null,
          website_url: null,
          social_links: null,
          languages: null,
          visibility: 'public',
          discoverable: true,
          allow_messages: 'friends',
          allow_tags: 'review_required',
          allow_collaboration_on_posts: 'friends',
          default_post_visibility: 'public',
          show_online_status: true,
          phone: null,
          birthday: null,
          internal_notes: null,
          verified: false,
          friends_count: 0,
          posts_count: 0,
          collab_posts_count: 0,
          profile_views_30d: 0,
          created_at: null,
          updated_at: null,
          last_active_at: null
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
