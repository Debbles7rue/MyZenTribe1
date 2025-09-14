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
            interests: profile.interests || null,
            website_url: profile.website_url?.trim() || null,
            social_links: profile.social_links || null,
            languages: profile.languages || null,
            visibility: profile.visibility || 'public',
            discoverable: profile.discoverable ?? true,
            allow_messages: profile.allow_messages || 'friends',
            allow_tags: profile.allow_tags || 'review_required',
            allow_collaboration_on_posts: profile.allow_collaboration_on_posts || 'friends',
            default_post_visibility: profile.default_post_visibility || 'public',
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
