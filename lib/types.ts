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
