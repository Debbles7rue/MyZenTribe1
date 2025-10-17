// File: components/EventDetails.tsx
"use client";

import TemplateDetails from "./TemplateDetails";
import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ToastProvider";
import FriendSelector from "@/components/FriendSelector";
import type { DBEvent } from "@/lib/types";
import { createNotification } from "@/lib/notifications";

interface EventDetailsProps {
  event: DBEvent | null;
  onClose: () => void;
  onEdit?: (event: DBEvent) => void;
  onDelete?: (id: string) => void;
  currentUserId?: string | null;
  onOpenCarpool?: (event: DBEvent) => void;
  onCelebrateHoliday?: (event: DBEvent) => void;
}

interface RSVPData {
  going: number;
  interested: number;
  userStatus: 'yes' | 'interested' | null;
}

interface Comment {
  id: string;
  event_id: string;
  user_id: string;
  body: string;
  created_at: string;
  user?: {
    full_name?: string;
    avatar_url?: string;
  };
}

interface Attendee {
  id: string;
  full_name?: string;
  avatar_url?: string;
}

interface SatelliteProposal {
  id: string;
  event_id: string;
  proposer_id: string;
  title: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time?: string;
  type: 'pre_event' | 'post_event';
  created_at: string;
  proposer?: {
    full_name?: string;
    avatar_url?: string;
  };
  rsvp_count?: number;
  user_rsvp?: boolean;
}

export default function EventDetails({ 
  event, 
  onClose, 
  onEdit, 
  onDelete,
  currentUserId,
  onOpenCarpool,
  onCelebrateHoliday
}: EventDetailsProps) {
  const { showToast } = useToast();
  const [rsvpData, setRsvpData] = useState<RSVPData>({
    going: 0,
    interested: 0,
    userStatus: null
  });
  const [loading, setLoading] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showFriendSelector, setShowFriendSelector] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [canCarpool, setCanCarpool] = useState(false);
  const [attendees, setAttendees] = useState<{going: Attendee[], interested: Attendee[]}>({going: [], interested: []});
  const [satelliteProposals, setSatelliteProposals] = useState<SatelliteProposal[]>([]);
  const [showProposalForm, setShowProposalForm] = useState<'pre_event' | 'post_event' | null>(null);
  const [proposalFormData, setProposalFormData] = useState({
    title: '',
    description: '',
    location: '',
    start_time: '',
    end_time: ''
  });
  const modalRef = useRef<HTMLDivElement>(null);

  const isHoliday = (event as any)?.event_type === 'holiday';
  const isSimpleEvent = event?.source === 'personal' && !(event as any)?.allows_rsvp;

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (event && event.allows_rsvp) {
      fetchRSVPData();
      if ((event as any).rsvp_count_visible) {
        fetchAttendees();
      }
    }
    if (event && !isHoliday && !isSimpleEvent) {
      fetchEventMedia();
      fetchComments();
      fetchSatelliteProposals();
    }
    if (event && currentUserId && event.created_by !== currentUserId) {
      checkCarpoolEligibility();
    }
  }, [event, isHoliday, isSimpleEvent, currentUserId]);

  useEffect(() => {
    if (!event?.id || isHoliday || isSimpleEvent) return;

    const channel = supabase
      .channel(`event-comments-${event.id}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'event_comments', 
          filter: `event_id=eq.${event.id}` 
        },
        () => fetchComments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [event?.id, isHoliday, isSimpleEvent]);

  useEffect(() => {
    if (!event?.id || !event.allows_rsvp) return;

    const channel = supabase
      .channel(`event-rsvps-${event.id}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'event_rsvps', 
          filter: `event_id=eq.${event.id}` 
        },
        () => {
          fetchRSVPData();
          if ((event as any).rsvp_count_visible) {
            fetchAttendees();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [event?.id, event?.allows_rsvp]);

  useEffect(() => {
    if (!event?.id) return;

    const channel = supabase
      .channel(`event-satellites-${event.id}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'event_satellite_proposals', 
          filter: `event_id=eq.${event.id}` 
        },
        () => fetchSatelliteProposals()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [event?.id]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showProposalForm) {
          setShowProposalForm(null);
        } else if (showFriendSelector) {
          setShowFriendSelector(false);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, showFriendSelector, showProposalForm]);

  useEffect(() => {
    if (event) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [event]);

  const checkCarpoolEligibility = async () => {
    if (!event || !currentUserId) return;

    try {
      const { data } = await supabase
        .from('friendships')
        .select('safe_to_carpool')
        .or(`and(user_id.eq.${currentUserId},friend_id.eq.${event.created_by}),and(user_id.eq.${event.created_by},friend_id.eq.${currentUserId})`)
        .eq('status', 'accepted')
        .single();

      setCanCarpool(data?.safe_to_carpool === true);
    } catch (error) {
      console.error('Error checking carpool eligibility:', error);
      setCanCarpool(false);
    }
  };

  const fetchRSVPData = async () => {
    if (!event) return;

    try {
      const { data: rsvps, error } = await supabase
        .from("event_rsvps")
        .select("status, user_id")
        .eq("event_id", event.id);

      if (error) {
        console.error("Error fetching RSVP data:", error);
        return;
      }

      if (rsvps) {
        const going = rsvps.filter(r => r.status === 'yes').length;
        const interested = rsvps.filter(r => r.status === 'interested').length;
        const userRsvp = currentUserId ? rsvps.find(r => r.user_id === currentUserId) : null;

        setRsvpData({
          going,
          interested,
          userStatus: userRsvp?.status as 'yes' | 'interested' | null
        });
      }
    } catch (error) {
      console.error("Error fetching RSVP data:", error);
    }
  };

  const fetchAttendees = async () => {
    if (!event?.id || !event.allows_rsvp) return;

    try {
      const { data, error } = await supabase
        .from('event_rsvps')
        .select(`
          status,
          user:profiles!event_rsvps_user_id_fkey(id, full_name, avatar_url)
        `)
        .eq('event_id', event.id);

      if (error) {
        console.error('Error fetching attendees:', error);
        return;
      }

      if (data) {
        setAttendees({
          going: data.filter(r => r.status === 'yes').map(r => r.user).filter(Boolean) as Attendee[],
          interested: data.filter(r => r.status === 'interested').map(r => r.user).filter(Boolean) as Attendee[]
        });
      }
    } catch (err) {
      console.error('Error fetching attendees:', err);
    }
  };

  const fetchEventMedia = async () => {
    if (!event) return;

    try {
      const { data: media } = await supabase
        .from("event_media")
        .select("media_url")
        .eq("event_id", event.id);

      if (media && media.length > 0) {
        const urls = await Promise.all(
          media.map(async (m) => {
            const { data } = supabase.storage
              .from("event-photos")
              .getPublicUrl(m.media_url);
            return data.publicUrl;
          })
        );
        setImageUrls(urls);
      } else if ((event as any).image_path || (event as any).cover_photo) {
        setImageUrls([(event as any).image_path || (event as any).cover_photo]);
      }
    } catch (error) {
      console.error("Error fetching media:", error);
    }
  };

  const fetchComments = async () => {
    if (!event?.id) return;

    setIsLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from('event_comments')
        .select(`
          *,
          user:profiles!event_comments_user_id_fkey(full_name, avatar_url)
        `)
        .eq('event_id', event.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading comments:', error);
        showToast({ type: 'error', message: 'Failed to load comments' });
        return;
      }

      if (data) {
        setComments(data as any);
      }
    } catch (err) {
      console.error('Error loading comments:', err);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const fetchSatelliteProposals = async () => {
    if (!event?.id) return;

    try {
      const { data, error } = await supabase
        .from('event_satellite_proposals')
        .select(`
          *,
          proposer:profiles!event_satellite_proposals_proposer_id_fkey(full_name, avatar_url)
        `)
        .eq('event_id', event.id)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching satellite proposals:', error);
        return;
      }

      if (data) {
        const proposalsWithRsvps = await Promise.all(
          data.map(async (proposal) => {
            const { data: rsvps } = await supabase
              .from('event_satellite_rsvps')
              .select('user_id')
              .eq('proposal_id', proposal.id);

            const userRsvp = currentUserId 
              ? rsvps?.some(r => r.user_id === currentUserId)
              : false;

            return {
              ...proposal,
              rsvp_count: rsvps?.length || 0,
              user_rsvp: userRsvp
            };
          })
        );

        setSatelliteProposals(proposalsWithRsvps);
      }
    } catch (err) {
      console.error('Error fetching satellite proposals:', err);
    }
  };

  const handleSendComment = async () => {
    if (!currentUserId || !event?.id || !newComment.trim()) return;

    setIsSendingComment(true);
    try {
      const { error } = await supabase
        .from('event_comments')
        .insert({
          event_id: event.id,
          user_id: currentUserId,
          body: newComment.trim()
        });

      if (error) {
        console.error('Error sending comment:', error);
        showToast({ type: 'error', message: 'Failed to post comment' });
        return;
      }

      setNewComment('');
      showToast({ type: 'success', message: '💬 Comment posted!' });

      // Send notification to event creator (if not commenting on own event)
      if (event.created_by && event.created_by !== currentUserId) {
        try {
          // Get commenter's name
          const { data: commenterProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', currentUserId)
            .single();

          const commenterName = commenterProfile?.full_name || 'Someone';

          await createNotification({
            recipient_id: event.created_by,
            type: 'event.comment',
            title: 'New Event Comment',
            body: `${commenterName} commented on your event "${event.title}"`,
            target_url: `/event/${event.id}`,
            entity_table: 'events',
            entity_id: event.id,
            actor_id: currentUserId
          });
        } catch (notifError) {
          console.error('Error sending comment notification:', notifError);
          // Don't fail the comment if notification fails
        }
      }
    } catch (err) {
      console.error('Error sending comment:', err);
      showToast({ type: 'error', message: 'Failed to post comment' });
    } finally {
      setIsSendingComment(false);
    }
  };

  const handleRSVP = async (status: 'yes' | 'interested') => {
    if (!event || !currentUserId) {
      showToast({ type: 'warning', message: 'Please sign in to RSVP' });
      return;
    }

    setLoading(true);
    try {
      const wasRemoving = rsvpData.userStatus === status;
      
      if (wasRemoving) {
        // Remove RSVP
        const { error } = await supabase
          .from("event_rsvps")
          .delete()
          .eq("event_id", event.id)
          .eq("user_id", currentUserId);

        if (error) throw error;
        showToast({ type: 'success', message: '❌ RSVP removed' });
      } else {
        // Add/update RSVP
        const { error } = await supabase
          .from("event_rsvps")
          .upsert({
            event_id: event.id,
            user_id: currentUserId,
            status
          }, {
            onConflict: 'event_id,user_id'
          });

        if (error) throw error;
        showToast({ 
          type: 'success', 
          message: status === 'yes' ? "✅ You're going!" : "⭐ Marked as interested" 
        });

        // Send notification to event creator (if not RSVPing to own event)
        if (event.created_by && event.created_by !== currentUserId) {
          try {
            // Get RSVP user's name
            const { data: rsvpUserProfile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', currentUserId)
              .single();

            const rsvpUserName = rsvpUserProfile?.full_name || 'Someone';
            const statusText = status === 'yes' ? 'is going to' : 'is interested in';

            await createNotification({
              recipient_id: event.created_by,
              type: 'event.rsvp',
              title: 'New RSVP',
              body: `${rsvpUserName} ${statusText} your event "${event.title}"`,
              target_url: `/event/${event.id}`,
              entity_table: 'events',
              entity_id: event.id,
              actor_id: currentUserId
            });
          } catch (notifError) {
            console.error('Error sending RSVP notification:', notifError);
            // Don't fail the RSVP if notification fails
          }
        }
      }
      
      // Refetch RSVP data after successful update
      await fetchRSVPData();
      if ((event as any).rsvp_count_visible) {
        await fetchAttendees();
      }
    } catch (error: any) {
      console.error("Error updating RSVP:", error);
      showToast({ type: 'error', message: error.message || 'Failed to update RSVP' });
    } finally {
      setLoading(false);
    }
  };

  const handleSatelliteRSVP = async (proposalId: string, currentStatus: boolean) => {
    if (!currentUserId) {
      showToast({ type: 'warning', message: 'Please sign in to RSVP' });
      return;
    }

    try {
      if (currentStatus) {
        // Remove RSVP
        const { error } = await supabase
          .from('event_satellite_rsvps')
          .delete()
          .eq('proposal_id', proposalId)
          .eq('user_id', currentUserId);

        if (error) throw error;
        showToast({ type: 'success', message: 'RSVP removed' });
      } else {
        // Add RSVP
        const { error } = await supabase
          .from('event_satellite_rsvps')
          .insert({
            proposal_id: proposalId,
            user_id: currentUserId
          });

        if (error) throw error;
        showToast({ type: 'success', message: "✅ You're in!" });
      }

      // Refetch proposals
      await fetchSatelliteProposals();
    } catch (error: any) {
      console.error('Error updating satellite RSVP:', error);
      showToast({ type: 'error', message: error.message || 'Failed to update RSVP' });
    }
  };

  const handleCreateProposal = async () => {
    if (!currentUserId || !event?.id || !showProposalForm) return;

    if (!proposalFormData.title.trim() || !proposalFormData.start_time) {
      showToast({ type: 'warning', message: 'Please fill in required fields' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('event_satellite_proposals')
        .insert({
          event_id: event.id,
          proposer_id: currentUserId,
          title: proposalFormData.title.trim(),
          description: proposalFormData.description.trim() || null,
          location: proposalFormData.location.trim() || null,
          start_time: proposalFormData.start_time,
          end_time: proposalFormData.end_time || null,
          type: showProposalForm
        });

      if (error) throw error;

      showToast({ type: 'success', message: '🎉 Proposal created!' });
      setShowProposalForm(null);
      setProposalFormData({
        title: '',
        description: '',
        location: '',
        start_time: '',
        end_time: ''
      });
      await fetchSatelliteProposals();
    } catch (error: any) {
      console.error('Error creating proposal:', error);
      showToast({ type: 'error', message: error.message || 'Failed to create proposal' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!event || !onDelete) return;

    if (confirm(`Are you sure you want to delete "${event.title}"?`)) {
      try {
        const { error } = await supabase
          .from("events")
          .delete()
          .eq("id", event.id);

        if (error) throw error;

        showToast({ type: 'success', message: '🗑️ Event deleted' });
        onDelete(event.id);
        onClose();
      } catch (error) {
        console.error("Error deleting event:", error);
        showToast({ type: 'error', message: 'Failed to delete event' });
      }
    }
  };

  const handleShareWithFriends = async () => {
    if (!event || !currentUserId || selectedFriends.length === 0) {
      showToast({ type: 'warning', message: 'Please select at least one friend' });
      return;
    }

    setLoading(true);
    try {
      const { data: userData } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', currentUserId)
        .single();

      const senderName = userData?.full_name || 'A friend';
      const holidayEmoji = event.title.match(/[\u{1F300}-\u{1F9FF}]/u)?.[0] || '🎉';
      const holidayName = event.title.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
      const eventDate = new Date(event.start_time).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });

      try {
        const { error: rpcError } = await supabase.rpc('share_holiday_with_friends', {
          p_friend_ids: selectedFriends,
          p_event_id: event.id,
          p_holiday_name: holidayName,
          p_holiday_emoji: holidayEmoji,
          p_holiday_date: eventDate,
          p_sender_name: senderName,
          p_sender_avatar: userData?.avatar_url || ''
        });

        if (!rpcError) {
          showToast({ 
            type: 'success', 
            message: `🎉 Shared with ${selectedFriends.length} friend${selectedFriends.length > 1 ? 's' : ''}!` 
          });
          setShowFriendSelector(false);
          setSelectedFriends([]);
          setShowShareMenu(false);
          setLoading(false);
          return;
        }
      } catch (rpcError) {
        console.log('Database function not found, using direct insert');
      }

      const notifications = selectedFriends.map(friendId => ({
        user_id: friendId,
        recipient_id: friendId,
        actor_id: currentUserId,
        type: 'holiday_share',
        kind: 'celebration',
        title: `${holidayEmoji} ${holidayName}!`,
        body: `${senderName} wants to celebrate ${holidayName} with you!`,
        entity_table: 'events',
        entity_id: event.id,
        metadata: {
          holiday_name: holidayName,
          holiday_emoji: holidayEmoji,
          holiday_date: eventDate,
          from_user_name: senderName,
          from_user_avatar: userData?.avatar_url,
          event_id: event.id
        },
        is_read: false,
        created_at: new Date().toISOString()
      }));

      const { error, data } = await supabase
        .from('notifications')
        .insert(notifications)
        .select();

      if (error) {
        console.error('Notification insert error:', error);
        showToast({ 
          type: 'error', 
          message: `Failed to share: ${error.message}` 
        });
        return;
      }

      showToast({ 
        type: 'success', 
        message: `🎉 Shared with ${selectedFriends.length} friend${selectedFriends.length > 1 ? 's' : ''}!` 
      });
      
      setShowFriendSelector(false);
      setSelectedFriends([]);
      setShowShareMenu(false);
    } catch (error: any) {
      console.error('Error sharing with friends:', error);
      showToast({ 
        type: 'error', 
        message: `Failed to share: ${error.message || 'Unknown error'}` 
      });
    } finally {
      setLoading(false);
    }
  };

  const shareToFacebook = () => {
    const url = `${window.location.origin}/event/${event?.id}`;
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
    showToast({ type: 'success', message: '📱 Opening Facebook...' });
    setShowShareMenu(false);
  };

  const shareViaText = () => {
    const eventDate = new Date(event?.start_time || '').toLocaleDateString();
    const eventTime = new Date(event?.start_time || '').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const message = `Check out this event: ${event?.title}\n📅 ${eventDate} at ${eventTime}\n📍 ${event?.location || 'Location TBA'}\n\n${window.location.origin}/event/${event?.id}`;
    
    const smsUrl = `sms:?body=${encodeURIComponent(message)}`;
    window.location.href = smsUrl;
    showToast({ type: 'success', message: '💬 Opening messages...' });
    setShowShareMenu(false);
  };

  const shareViaEmail = () => {
    const eventDate = new Date(event?.start_time || '').toLocaleDateString();
    const eventTime = new Date(event?.start_time || '').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const subject = `Event Invitation: ${event?.title}`;
    const body = `You're invited to ${event?.title}!\n\n📅 When: ${eventDate} at ${eventTime}\n📍 Where: ${event?.location || 'Location TBA'}\n\n${event?.description || ''}\n\nRSVP here: ${window.location.origin}/event/${event?.id}`;
    
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    showToast({ type: 'success', message: '📧 Opening email...' });
    setShowShareMenu(false);
  };

  const copyEventLink = () => {
    const link = `${window.location.origin}/event/${event?.id}`;
    navigator.clipboard.writeText(link);
    showToast({ type: 'success', message: '🔗 Link copied!' });
    setShowShareMenu(false);
  };

  const copyEventDetails = () => {
    const eventDate = new Date(event?.start_time || '').toLocaleDateString();
    const eventTime = new Date(event?.start_time || '').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const details = `${event?.title}\n📅 ${eventDate} at ${eventTime}\n📍 ${event?.location || 'Location TBA'}\n\n${event?.description || ''}`;
    
    navigator.clipboard.writeText(details);
    showToast({ type: 'success', message: '📋 Event details copied!' });
    setShowShareMenu(false);
  };

  const formatDuration = (startTime: string, endTime: string): string => {
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return 'Invalid time';
      }
      
      const minutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
      
      if (minutes < 0) return 'Invalid duration';
      if (minutes < 60) return `${minutes} minutes`;
      
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      
      if (mins === 0) return `${hours} hour${hours !== 1 ? 's' : ''}`;
      return `${hours}h ${mins}m`;
    } catch (error) {
      console.error('Error formatting duration:', error);
      return 'N/A';
    }
  };

  if (!event) return null;

// NEW CODE - Route templates to TemplateDetails
if ((event as any).event_type === 'template') {
  // Import at top of file if needed, or use dynamic import
  const TemplateDetails = require('./TemplateDetails').default;
  return <TemplateDetails event={event} onClose={onClose} onDelete={onDelete} currentUserId={currentUserId} />;
}

const isCreator = currentUserId && event.created_by === currentUserId;

  const isCreator = currentUserId && event.created_by === currentUserId;
  const eventType = (event as any).event_type;
  const isReminder = eventType === 'reminder';
  const isTodo = eventType === 'todo';

  const getHeaderColor = () => {
    if (isHoliday) return 'from-yellow-500 to-orange-600';
    if (isReminder) return 'from-amber-500 to-orange-600';
    if (isTodo) return 'from-green-500 to-emerald-600';
    if ((event as any).source === 'business') return 'from-purple-700 to-pink-700';
    return 'from-purple-600 to-blue-600';
  };

  // HOLIDAY SPECIAL VIEW
  if (isHoliday) {
    return ReactDOM.createPortal(
      <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
        <div className="flex items-center justify-center min-h-screen p-4">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fadeIn"
            onClick={onClose}
            aria-hidden="true"
          />

          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full animate-slideUp">
            <div className={`bg-gradient-to-r ${getHeaderColor()} text-white p-8 text-center`}>
              <div className="text-6xl mb-4">
                {event.title.match(/[\u{1F300}-\u{1F9FF}]/u)?.[0] || '🎉'}
              </div>
              <h2 className="text-3xl font-bold mb-2">
                {event.title.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim()}
              </h2>
              <p className="text-lg opacity-90">
                {new Date(event.start_time).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {event.description && (
                <p className="text-gray-600 text-center text-lg">{event.description}</p>
              )}

              <div className="space-y-3 pt-4">
                {onCelebrateHoliday && (
                  <button
                    onClick={() => {
                      onCelebrateHoliday(event);
                      onClose();
                    }}
                    className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 font-semibold text-lg shadow-lg transform hover:scale-105 transition-all flex items-center justify-center gap-2"
                  >
                    <span className="text-2xl">🎉</span>
                    <span>Want to Celebrate?</span>
                  </button>
                )}

                {currentUserId && (
                  <button
                    onClick={() => setShowFriendSelector(true)}
                    className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 font-medium flex items-center justify-center gap-2 transition-all shadow-md"
                  >
                    <span className="text-xl">👥</span>
                    <span>Share with Friends</span>
                  </button>
                )}

                <button
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="w-full px-6 py-3 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <span className="text-xl">📤</span>
                  <span>More Share Options</span>
                </button>

                {isCreator && onDelete && (
                  <button
                    onClick={() => {
                      onDelete(event.id);
                      onClose();
                    }}
                    className="w-full px-6 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <span className="text-xl">🗑️</span>
                    <span>Remove from Calendar</span>
                  </button>
                )}
              </div>

              {showShareMenu && (
                <div className="border-t pt-4 space-y-2 animate-slideIn">
                  <p className="text-sm font-medium text-gray-700 mb-2">Share externally via:</p>
                  <button onClick={shareToFacebook} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2">
                    📱 Facebook
                  </button>
                  <button onClick={shareViaText} className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2">
                    💬 Text Message
                  </button>
                  <button onClick={shareViaEmail} className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2">
                    📧 Email
                  </button>
                  <button onClick={copyEventLink} className="w-full px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 flex items-center justify-center gap-2">
                    🔗 Copy Link
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {showFriendSelector && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-black/40"
              onClick={() => setShowFriendSelector(false)}
            />
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slideUp">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">Share Holiday</h3>
                <button
                  onClick={() => setShowFriendSelector(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <p className="text-gray-600 mb-4">
                Select friends to share this holiday celebration with:
              </p>

              <FriendSelector
                value={selectedFriends}
                onChange={setSelectedFriends}
                multiple={true}
                placeholder="Search friends..."
              />

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowFriendSelector(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleShareWithFriends}
                  disabled={selectedFriends.length === 0 || loading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                >
                  {loading ? 'Sharing...' : `Share with ${selectedFriends.length || 0}`}
                </button>
              </div>
            </div>
          </div>
        )}

        <style jsx>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes slideIn {
            from { opacity: 0; height: 0; }
            to { opacity: 1; height: auto; }
          }
          .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
          .animate-slideUp { animation: slideUp 0.3s ease-out; }
          .animate-slideIn { animation: slideIn 0.3s ease-out; }
        `}</style>
      </div>,
      document.body
    );
  }

  // REGULAR EVENT VIEW
  const modalContent = (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-title"
    >
      <div className="flex items-center justify-center min-h-screen p-4">
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fadeIn"
          onClick={onClose}
          aria-hidden="true"
        />

        <div 
          ref={modalRef}
          className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden animate-slideUp"
        >
          {/* Header */}
          <div className={`bg-gradient-to-r ${getHeaderColor()} text-white p-6`}>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h2 id="event-title" className="text-2xl md:text-3xl font-bold mb-2">
                  {isReminder && '🔔 '}
                  {isTodo && '✅ '}
                  {event.title}
                </h2>
                {event.start_time && (
                  <div className="flex flex-wrap items-center gap-3 md:gap-4 text-sm opacity-90">
                    <span className="flex items-center gap-1">
                      📅 {new Date(event.start_time).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      ⏰ {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {event.end_time && (
                      <span className="flex items-center gap-1">
                        ⏱️ {formatDuration(event.start_time, event.end_time)}
                      </span>
                    )}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  {(event as any).source === 'business' && (
                    <span className="inline-block bg-white/20 px-2 py-1 rounded text-xs font-medium">BUSINESS EVENT</span>
                  )}
                  <span className="inline-block bg-white/20 px-2 py-1 rounded text-xs font-medium">
                    {event.visibility === 'private' && '🔒 Private'}
                    {event.visibility === 'friends' && '👥 Friends'}
                    {event.visibility === 'everyone' && '🌍 Public'}
                  </span>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors ml-4" aria-label="Close">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {event.allows_rsvp && (event as any).rsvp_count_visible && (
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                <span className="bg-white/20 px-3 py-1.5 rounded-full font-medium">
                  ✓ {rsvpData.going} going
                </span>
                <span className="bg-white/20 px-3 py-1.5 rounded-full font-medium">
                  ☆ {rsvpData.interested} interested
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
            <div className="p-6 space-y-6">
              
              {/* When Section */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-lg flex items-center gap-2">
                  📅 When
                </h3>
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 rounded-xl p-4 space-y-3 border border-gray-200 dark:border-gray-600">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400 font-medium">Starts:</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {event.start_time ? new Date(event.start_time).toLocaleString([], {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'Not set'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400 font-medium">Ends:</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {event.end_time ? new Date(event.end_time).toLocaleString([], {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'Not set'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-300 dark:border-gray-600">
                    <span className="text-gray-600 dark:text-gray-400 font-medium">Duration:</span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">
                      {event.start_time && event.end_time ? formatDuration(event.start_time, event.end_time) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              {event.description && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-lg flex items-center gap-2">
                    📝 Description
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{event.description}</p>
                  </div>
                </div>
              )}

              {/* Location */}
              {event.location && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-lg flex items-center gap-2">
                    📍 Location
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">📍</span>
                      <div className="flex-1">
                        <p className="text-gray-700 dark:text-gray-300 font-medium">{event.location}</p>
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 text-sm hover:underline mt-1 inline-block"
                        >
                          Open in Maps →
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Attendees List */}
              {event.allows_rsvp && (event as any).rsvp_count_visible && (attendees.going.length > 0 || attendees.interested.length > 0) && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-lg flex items-center gap-2">
                    👥 Attendees
                  </h3>
                  <div className="space-y-4">
                    {attendees.going.length > 0 && (
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                        <p className="font-medium text-green-800 dark:text-green-300 mb-3 flex items-center gap-2">
                          ✅ Going ({attendees.going.length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {attendees.going.map((attendee) => (
                            <div key={attendee.id} className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-full px-3 py-1.5 border border-green-200 dark:border-green-700">
                              {attendee.avatar_url ? (
                                <img src={attendee.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                              ) : (
                                <div className="w-6 h-6 bg-green-200 dark:bg-green-700 rounded-full flex items-center justify-center text-xs">
                                  {attendee.full_name?.charAt(0) || '?'}
                                </div>
                              )}
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {attendee.full_name || 'Anonymous'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {attendees.interested.length > 0 && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                        <p className="font-medium text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
                          ⭐ Interested ({attendees.interested.length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {attendees.interested.map((attendee) => (
                            <div key={attendee.id} className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-full px-3 py-1.5 border border-blue-200 dark:border-blue-700">
                              {attendee.avatar_url ? (
                                <img src={attendee.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                              ) : (
                                <div className="w-6 h-6 bg-blue-200 dark:bg-blue-700 rounded-full flex items-center justify-center text-xs">
                                  {attendee.full_name?.charAt(0) || '?'}
                                </div>
                              )}
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {attendee.full_name || 'Anonymous'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Satellite Events (Pre/Post Activities) */}
              {!isSimpleEvent && currentUserId && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg flex items-center gap-2">
                      🎯 Pre/Post Activities
                    </h3>
                    {!isCreator && event.allows_rsvp && rsvpData.userStatus === 'yes' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowProposalForm('pre_event')}
                          className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 text-sm font-medium transition-colors"
                        >
                          + Before
                        </button>
                        <button
                          onClick={() => setShowProposalForm('post_event')}
                          className="px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 text-sm font-medium transition-colors"
                        >
                          + After
                        </button>
                      </div>
                    )}
                  </div>

                  {satelliteProposals.length > 0 ? (
                    <div className="space-y-3">
                      {satelliteProposals.map((proposal) => (
                        <div key={proposal.id} className={`rounded-lg p-4 border ${
                          proposal.type === 'pre_event' 
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
                            : 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
                        }`}>
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg">
                                  {proposal.type === 'pre_event' ? '⏰' : '🎉'}
                                </span>
                                <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                                  {proposal.title}
                                </h4>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  proposal.type === 'pre_event'
                                    ? 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200'
                                    : 'bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200'
                                }`}>
                                  {proposal.type === 'pre_event' ? 'Before' : 'After'}
                                </span>
                              </div>
                              
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                Proposed by {proposal.proposer?.full_name || 'Anonymous'}
                              </p>

                              {proposal.description && (
                                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{proposal.description}</p>
                              )}

                              <div className="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400">
                                <span className="flex items-center gap-1">
                                  ⏰ {new Date(proposal.start_time).toLocaleString([], {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                                {proposal.location && (
                                  <span className="flex items-center gap-1">
                                    📍 {proposal.location}
                                  </span>
                                )}
                                <span className="flex items-center gap-1 font-medium">
                                  👥 {proposal.rsvp_count || 0} interested
                                </span>
                              </div>
                            </div>

                            <button
                              onClick={() => handleSatelliteRSVP(proposal.id, proposal.user_rsvp || false)}
                              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
                                proposal.user_rsvp
                                  ? 'bg-green-500 text-white hover:bg-green-600'
                                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                              }`}
                            >
                              {proposal.user_rsvp ? '✓ In' : 'Join'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6 text-center border border-gray-200 dark:border-gray-600">
                      <p className="text-gray-500 dark:text-gray-400 text-sm">
                        {!isCreator && event.allows_rsvp && rsvpData.userStatus === 'yes' ? (
                          <>No pre/post activities yet. Want to grab dinner before or drinks after? Click + to propose one!</>
                        ) : (
                          <>No pre/post activities proposed yet</>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Comments Section */}
              {!isSimpleEvent && (
                <div className="border-t dark:border-gray-700 pt-6">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 text-lg flex items-center gap-2">
                    💬 Comments & Discussion
                    {comments.length > 0 && (
                      <span className="text-sm bg-gray-200 dark:bg-gray-700 px-2.5 py-1 rounded-full font-normal">
                        {comments.length}
                      </span>
                    )}
                  </h3>

                  <div className="space-y-3 mb-4" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {isLoadingComments ? (
                      <div className="text-center py-8 text-gray-500">
                        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                        Loading comments...
                      </div>
                    ) : comments.length > 0 ? (
                      comments.map((comment) => (
                        <div key={comment.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-700 transition-colors">
                          <div className="flex items-start gap-3">
                            {comment.user?.avatar_url ? (
                              <img src={comment.user.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600" />
                            ) : (
                              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-semibold">
                                {comment.user?.full_name?.charAt(0) || '?'}
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="flex items-baseline gap-2 mb-1">
                                <span className="font-semibold text-gray-900 dark:text-gray-100">
                                  {comment.user?.full_name || 'Anonymous'}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {new Date(comment.created_at).toLocaleString([], { 
                                    month: 'short', 
                                    day: 'numeric',
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </span>
                              </div>
                              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{comment.body}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/30 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                        <div className="text-4xl mb-3">💬</div>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">No comments yet</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Be the first to start the conversation!</p>
                      </div>
                    )}
                  </div>

                  {currentUserId ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendComment();
                          }
                        }}
                        placeholder="Write a comment..."
                        className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
                        disabled={isSendingComment}
                      />
                      <button
                        onClick={handleSendComment}
                        disabled={!newComment.trim() || isSendingComment}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all shadow-md hover:shadow-lg"
                      >
                        {isSendingComment ? '...' : 'Post'}
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                      <p className="text-gray-600 dark:text-gray-400 font-medium">Please sign in to comment</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-t dark:border-gray-700">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                {event.allows_rsvp && !isCreator && (
                  <>
                    <button
                      onClick={() => handleRSVP('yes')}
                      disabled={loading}
                      className={`px-5 py-2.5 rounded-lg font-semibold transition-all shadow-sm hover:shadow-md ${
                        rsvpData.userStatus === 'yes' 
                          ? 'bg-green-500 text-white hover:bg-green-600 ring-2 ring-green-300' 
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {rsvpData.userStatus === 'yes' ? '✓ Going' : 'Going'}
                    </button>
                    <button
                      onClick={() => handleRSVP('interested')}
                      disabled={loading}
                      className={`px-5 py-2.5 rounded-lg font-semibold transition-all shadow-sm hover:shadow-md ${
                        rsvpData.userStatus === 'interested' 
                          ? 'bg-blue-500 text-white hover:bg-blue-600 ring-2 ring-blue-300' 
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {rsvpData.userStatus === 'interested' ? '☆ Interested' : 'Interested'}
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {isCreator && onEdit && (
                  <button 
                    onClick={() => {
                      console.log('✏️ Edit button clicked for event:', event.id);
                      onEdit(event);
                    }} 
                    className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 font-medium transition-colors shadow-sm"
                  >
                    ✏️ Edit
                  </button>
                )}
                
                {isCreator && onDelete && (
                  <button 
                    onClick={handleDelete} 
                    className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 font-medium transition-colors shadow-sm"
                  >
                    🗑️ Delete
                  </button>
                )}
                
                <button 
                  onClick={onClose} 
                  className="px-5 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-colors shadow-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Proposal Form Modal */}
      {showProposalForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowProposalForm(null)}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slideUp">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {showProposalForm === 'pre_event' ? '⏰ Propose Pre-Event' : '🎉 Propose Post-Event'}
              </h3>
              <button
                onClick={() => setShowProposalForm(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={proposalFormData.title}
                  onChange={(e) => setProposalFormData({...proposalFormData, title: e.target.value})}
                  placeholder={showProposalForm === 'pre_event' ? 'e.g., Dinner before the show' : 'e.g., Drinks after'}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={proposalFormData.description}
                  onChange={(e) => setProposalFormData({...proposalFormData, description: e.target.value})}
                  placeholder="Add details..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={proposalFormData.location}
                  onChange={(e) => setProposalFormData({...proposalFormData, location: e.target.value})}
                  placeholder="Where?"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Time *
                </label>
                <input
                  type="datetime-local"
                  value={proposalFormData.start_time}
                  onChange={(e) => setProposalFormData({...proposalFormData, start_time: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Time (optional)
                </label>
                <input
                  type="datetime-local"
                  value={proposalFormData.end_time}
                  onChange={(e) => setProposalFormData({...proposalFormData, end_time: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowProposalForm(null)}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateProposal}
                  disabled={!proposalFormData.title.trim() || !proposalFormData.start_time || loading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all"
                >
                  {loading ? 'Creating...' : 'Create Proposal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .animate-slideUp { animation: slideUp 0.3s ease-out; }
      `}</style>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}
