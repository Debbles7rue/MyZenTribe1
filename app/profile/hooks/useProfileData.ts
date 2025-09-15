import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Profile } from '../types/profile';

export function useProfileData(userId: string | null) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [friendsCount, setFriendsCount] = useState(0);

  const loadProfile = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    
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
        setProfile(data as Profile);
      }
      
      // Load friends count
      const { count } = await supabase
        .from("friendships")
        .select("*", { count: "exact", head: true })
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`);
        
      setFriendsCount(count || 0);
      
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
