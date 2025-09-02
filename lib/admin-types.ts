// lib/admin-types.ts
// Copy this entire file to lib/admin-types.ts in your project

export type AdminPermission = 
  | 'manage_users'
  | 'manage_content'
  | 'manage_communities'
  | 'manage_reports'
  | 'manage_admins'
  | 'view_analytics'
  | 'manage_donations';

export type InboxMessageType = 'contact' | 'suggestion' | 'report';
export type InboxStatus = 'unread' | 'read' | 'responded' | 'archived';
export type Priority = 'low' | 'normal' | 'high' | 'urgent';

export type ContentType = 'user' | 'event' | 'post' | 'comment' | 'community' | 'message' | 'profile';
export type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'violence' | 'false_info' | 'hate_speech' | 'other';
export type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed';

export type ModerationAction = 'warning' | 'mute' | 'suspend' | 'ban' | 'restrict';

export interface AdminProfile {
  id: string;
  email?: string;
  full_name?: string | null;
  avatar_url?: string | null;
  is_app_admin: boolean;
  admin_granted_at?: string | null;
  admin_granted_by?: string | null;
  permissions?: AdminPermission[];
}

export interface InboxMessage {
  id: string;
  type: InboxMessageType;
  sender_id?: string | null;
  sender_email?: string | null;
  sender_name?: string | null;
  subject?: string | null;
  message: string;
  status: InboxStatus;
  priority: Priority;
  assigned_to?: string | null;
  response?: string | null;
  responded_at?: string | null;
  responded_by?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ContentReport {
  id: string;
  reporter_id?: string | null;
  content_type: ContentType;
  content_id: string;
  reason: ReportReason;
  description?: string | null;
  status: ReportStatus;
  resolution?: string | null;
  resolved_at?: string | null;
  resolved_by?: string | null;
  created_at: string;
  // Joined data
  reporter?: {
    full_name?: string | null;
    avatar_url?: string | null;
  };
}

export interface UserModeration {
  id: string;
  user_id: string;
  action: ModerationAction;
  reason?: string | null;
  duration_hours?: number | null;
  expires_at?: string | null;
  issued_by?: string | null;
  issued_at: string;
  lifted_at?: string | null;
  lifted_by?: string | null;
  notes?: string | null;
  is_active: boolean;
  // Joined data
  user?: {
    full_name?: string | null;
    avatar_url?: string | null;
    email?: string | null;
  };
}

export interface CommunityInboxMessage {
  id: string;
  community_id: string;
  type: 'report' | 'suggestion' | 'announcement';
  sender_id?: string | null;
  subject?: string | null;
  message: string;
  status: 'unread' | 'read' | 'resolved' | 'archived';
  resolved_by?: string | null;
  resolved_at?: string | null;
  created_at: string;
  // Joined data
  sender?: {
    full_name?: string | null;
    avatar_url?: string | null;
  };
  community?: {
    name?: string | null;
  };
}

export interface AdminLog {
  id: string;
  admin_id?: string | null;
  action: string;
  target_type?: string | null;
  target_id?: string | null;
  details?: Record<string, any>;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
  // Joined data
  admin?: {
    full_name?: string | null;
    email?: string | null;
  };
}

export interface AdminStats {
  totalUsers: number;
  totalEvents: number;
  totalCommunities: number;
  totalReports: number;
  pendingReports: number;
  unreadMessages: number;
  activeModeration: number;
  todaySignups: number;
}
