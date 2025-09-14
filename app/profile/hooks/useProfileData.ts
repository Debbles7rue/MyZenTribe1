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
