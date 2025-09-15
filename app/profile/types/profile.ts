// app/profile/types/profile.ts
import type React from 'react';

export interface Profile {
  id: string;

  // Core fields
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location?: string | null;
  location_text?: string | null;
  location_is_public?: boolean | null;
  show_mutuals: boolean | null;

  // Display fields
  username?: string | null;
  cover_url?: string | null;
  tagline?: string | null;
  interests?: string[] | null;
  website_url?: string | null;
  social_links?: SocialLinks | null;
  languages?: string[] | null;

  // Privacy settings
  visibility?: 'public' | 'friends_only' | 'private' | null;
  discoverable?: boolean | null;
  allow_messages?: 'everyone' | 'friends' | 'no_one' | null;
  allow_tags?: 'auto' | 'review_required' | 'no_one' | null;
  allow_collaboration_on_posts?: 'friends' | 'invited_only' | 'off' | null;
  default_post_visibility?: 'public' | 'friends_only' | 'private' | null;
  show_online_status?: boolean | null;

  // Private fields
  phone?: string | null;
  birthday?: string | null;
  internal_notes?: string | null;

  // System fields
  verified?: boolean | null;
  friends_count?: number | null;
  posts_count?: number | null;
  collab_posts_count?: number | null;
  profile_views_30d?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  last_active_at?: string | null;
}

export interface SocialLinks {
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  youtube?: string | null;
  linkedin?: string | null;
  x?: string | null;
  threads?: string | null;
  discord?: string | null;
}

export interface ProfileStatus {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

export interface SocialPlatform {
  key: keyof SocialLinks;
  Icon: React.ComponentType<{ size?: number }>;
  placeholder: string;
}
