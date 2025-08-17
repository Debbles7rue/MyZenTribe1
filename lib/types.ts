export type Visibility = 'public' | 'friends' | 'private' | 'community';

export type DBEvent = {
  id: string;
  title: string;
  description: string | null;
  start_time: string; // ISO
  end_time: string;   // ISO
  visibility: Visibility;
  created_by: string;
  location: string | null;
  latitude?: number | null;
  longitude?: number | null;
  rrule?: string | null;
  event_type?: string | null;
  rsvp_public?: boolean | null;
  community_id?: string | null;
  created_at?: string;

  image_path: string | null;
  source?: 'personal' | 'business' | null;

  status?: 'scheduled' | 'cancelled' | null;
  cancellation_reason?: string | null;
};

/** Personal Profile (app/profile) */
export type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location?: string | null;            // legacy
  location_text?: string | null;       // preferred
  location_is_public?: boolean | null; // preferred
  show_mutuals: boolean | null;
};

/** Business Profile (app/business) */
export type BusinessProfile = {
  id: string;
  name: string | null;
  logo_url: string | null;
  tagline: string | null;
  description: string | null;

  cover_image_url?: string | null;

  website_url?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  youtube_url?: string | null;
  tiktok_url?: string | null;

  booking_url?: string | null;

  phone_public?: boolean | null;
  phone_number?: string | null;

  // simple gallery support
  gallery?: { url: string; alt?: string }[];

  created_at?: string;
  updated_at?: string;
};
