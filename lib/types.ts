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
  host_business_id?: string | null; // NEW: For business-hosted events
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

/** Business Profile (app/business) - PRESERVING ORIGINAL + ADDING NEW FIELDS */
export type BusinessProfile = {
  id: string;
  name: string | null;                  // PRESERVED ORIGINAL
  logo_url: string | null;
  tagline: string | null;
  description: string | null;           // PRESERVED ORIGINAL
  cover_image_url?: string | null;      // PRESERVED ORIGINAL
  website_url?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  youtube_url?: string | null;
  tiktok_url?: string | null;
  booking_url?: string | null;
  phone_public?: boolean | null;
  phone_number?: string | null;         // PRESERVED ORIGINAL
  // simple gallery support
  gallery?: { url: string; alt?: string }[];
  created_at?: string;
  updated_at?: string;
  
  // NEW FIELDS ADDED (for database compatibility)
  display_name?: string | null;         // Used by components
  handle?: string | null;               // Used by components  
  bio?: string | null;                  // Used by components
  cover_url?: string | null;            // Used by components
  phone?: string | null;                // Used by components
  email?: string | null;
  email_public?: boolean | null;
  categories?: string[];
  services?: BusinessService[];
  hours?: BusinessHours;
  social_links?: Record<string, string> | null;
  visibility?: 'public' | 'private' | 'unlisted';
  verified?: boolean;
  follower_count?: number;
  verification_level?: 'none' | 'some' | 'verified';
};

/** NEW: Business Service Type */
export type BusinessService = {
  id: string;
  name: string;
  description?: string;
  price?: string;
  duration?: string;
  available: boolean;
};

/** NEW: Business Hours Type */
export type BusinessHours = {
  monday?: { open: string; close: string; closed?: boolean };
  tuesday?: { open: string; close: string; closed?: boolean };
  wednesday?: { open: string; close: string; closed?: boolean };
  thursday?: { open: string; close: string; closed?: boolean };
  friday?: { open: string; close: string; closed?: boolean };
  saturday?: { open: string; close: string; closed?: boolean };
  sunday?: { open: string; close: string; closed?: boolean };
};

/** NEW: Follow System Types */
export type FollowType = 'user' | 'business';

export type Follow = {
  id: string;
  follower_id: string;
  following_id: string;
  following_type: FollowType;
  created_at: string;
};

export type FollowStatus = {
  isFollowing: boolean;
  followerCount: number;
};

/** NEW: Verification Badge Types */
export type VerificationLevel = 'none' | 'some' | 'verified';

export type VerificationBadge = {
  level: VerificationLevel;
  icon: string;
  label: string;
  description: string;
};

/** NEW: Business Post Type */
export type BusinessPost = {
  id: string;
  author_id: string;
  business_id?: string;
  content: string;
  is_business_post: boolean;
  kind: 'discussion' | 'karma' | 'announcement';
  community_id?: string;
  is_anonymous: boolean;
  created_at: string;
};

/** NEW: Feed Integration Types */
export type FeedItem = {
  id: string;
  type: 'event' | 'post' | 'announcement';
  source: 'personal' | 'business' | 'community';
  business_id?: string;
  created_at: string;
  content: DBEvent | BusinessPost;
};


/** NEW: Feedback System Types */
export type FeedbackType = 'service' | 'event';
export type FeedbackRating = 'positive' | 'negative';
export type FeedbackModalStep = 'type' | 'explanation' | 'rating';

export type BusinessFeedback = {
  id: string;
  business_id: string;
  user_id: string;
  feedback_type: FeedbackType;
  rating: FeedbackRating;
  created_at: string;
  updated_at?: string;
};

export type FeedbackStats = {
  total: number;
  positive: number;
  negative: number;
  hasUserFeedback: boolean;
  userFeedback?: BusinessFeedback;
};

export type FeedbackFormData = {
  type: FeedbackType | null;
  rating: FeedbackRating | null;
};
