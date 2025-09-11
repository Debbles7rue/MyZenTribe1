// lib/hooks/useFriends.ts
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export type Friend = {
  id: string;
  friend_id: string;
  name: string;
  full_name: string | null;
  avatar_url: string | null;
};

export function useFriends(userId?: string | null) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId === undefined) {
      // If userId is undefined, get current user
      loadFriendsForCurrentUser();
    } else if (userId) {
      // If userId is provided, load friends for that user
      loadFriends(userId);
    } else {
      // userId is null, no friends to load
      setLoading(false);
    }
  }, [userId]);

  async function loadFriendsForCurrentUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      await loadFriends(user.id);
    } catch (err) {
      console.error("Error getting current user:", err);
      setError("Failed to load user");
      setLoading(false);
    }
  }

  async function loadFriends(uid: string) {
    try {
      setError(null);
      
      // Get friendships where user is either the requester or the friend
      const { data: friendships1, error: error1 } = await supabase
        .from("friendships")
        .select("friend_id")
        .eq("user_id", uid)
        .eq("status", "accepted");

      const { data: friendships2, error: error2 } = await supabase
        .from("friendships")
        .select("user_id")
        .eq("friend_id", uid)
        .eq("status", "accepted");

      if (error1 || error2) {
        throw new Error("Failed to load friendships");
      }

      // Combine friend IDs from both directions
      const friendIds = [
        ...(friendships1 || []).map(f => f.friend_id),
        ...(friendships2 || []).map(f => f.user_id)
      ];

      if (friendIds.length === 0) {
        setFriends([]);
        setLoading(false);
        return;
      }

      // Get friend profiles
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", friendIds);

      if (profileError) {
        throw new Error("Failed to load friend profiles");
      }

      // Format friends data
      const formattedFriends: Friend[] = (profiles || []).map(profile => ({
        id: profile.id,
        friend_id: profile.id,
        name: profile.full_name || "Friend",
        full_name: profile.full_name,
        avatar_url: profile.avatar_url
      }));

      setFriends(formattedFriends);
    } catch (err) {
      console.error("Error loading friends:", err);
      setError(err instanceof Error ? err.message : "Failed to load friends");
    } finally {
      setLoading(false);
    }
  }

  async function refreshFriends() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await loadFriends(user.id);
    }
  }

  return {
    friends,
    loading,
    error,
    refreshFriends
  };
}
