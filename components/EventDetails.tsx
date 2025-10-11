// components/EventDetails.tsx
"use client";

import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ToastProvider";
import FriendSelector from "@/components/FriendSelector";
import type { DBEvent } from "@/lib/types";

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
  userStatus: 'going' | 'interested' | null;
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
    }
    if (event && !isHoliday && !isSimpleEvent) {
      fetchEventMedia();
      fetchComments();
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
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showFriendSelector) {
          setShowFriendSelector(false);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, showFriendSelector]);

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
      const { data: rsvps } = await supabase
        .from("event_rsvps")
        .select("status, user_id")
        .eq("event_id", event.id);

      if (rsvps) {
        const going = rsvps.filter(r => r.status === 'going').length;
        const interested = rsvps.filter(r => r.status === 'interested').length;
        const userRsvp = currentUserId ? rsvps.find(r => r.user_id === currentUserId) : null;

        setRsvpData({
          going,
          interested,
          userStatus: userRsvp?.status as 'going' | 'interested' | null
        });
      }
    } catch (error) {
      console.error("Error fetching RSVP data:", error);
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

      if (!error && data) {
        setComments(data as any);
      }
    } catch (err) {
      console.error('Error loading comments:', err);
    } finally {
      setIsLoadingComments(false);
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

      if (!error) {
        setNewComment('');
        showToast({ type: 'success', message: 'Comment posted!' });
      }
    } catch (err) {
      console.error('Error sending comment:', err);
      showToast({ type: 'error', message: 'Failed to post comment' });
    } finally {
      setIsSendingComment(false);
    }
  };

  const handleRSVP = async (status: 'going' | 'interested') => {
    if (!event || !currentUserId) {
      showToast({ type: 'warning', message: 'Please sign in to RSVP' });
      return;
    }

    setLoading(true);
    try {
      if (rsvpData.userStatus === status) {
        await supabase
          .from("event_rsvps")
          .delete()
          .eq("event_id", event.id)
          .eq("user_id", currentUserId);

        setRsvpData(prev => ({
          ...prev,
          [status]: prev[status] - 1,
          userStatus: null
        }));

        showToast({ type: 'success', message: 'RSVP removed' });
      } else {
        await supabase
          .from("event_rsvps")
          .upsert({
            event_id: event.id,
            user_id: currentUserId,
            status
          });

        setRsvpData(prev => ({
          going: status === 'going' 
            ? prev.going + (prev.userStatus === 'interested' ? 0 : 1)
            : prev.going - (prev.userStatus === 'going' ? 1 : 0),
          interested: status === 'interested'
            ? prev.interested + (prev.userStatus === 'going' ? 0 : 1)
            : prev.interested - (prev.userStatus === 'interested' ? 1 : 0),
          userStatus: status
        }));

        showToast({ 
          type: 'success', 
          message: status === 'going' ? "✅ You're going!" : "⭐ Marked as interested" 
        });
      }
    } catch (error) {
      console.error("Error updating RSVP:", error);
      showToast({ type: 'error', message: 'Failed to update RSVP' });
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

  // FIXED: Format duration helper
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

  const isCreator = currentUserId && event.created_by === currentUserId;
  const eventType = (event as any).event_type;
  const isReminder = eventType === 'reminder';
  const isTodo = eventType === 'todo';
  const preEvent = (event as any).pre_event;
  const postEvent = (event as any).post_event;

  const getHeaderColor = () => {
    if (isHoliday) return 'from-yellow-500 to-orange-600';
    if (isReminder) return 'from-amber-500 to-orange-600';
    if (isTodo) return 'from-green-500 to-emerald-600';
    if ((event as any).source === 'business') return 'from-purple-700 to-pink-700';
    return 'from-purple-600 to-blue-600';
  };

  // HOLIDAY SPECIAL VIEW (unchanged)
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

  // REGULAR EVENT VIEW - FIXED FOR SIMPLE EVENTS
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
          className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-slideUp"
        >
          {/* Header */}
          <div className={`bg-gradient-to-r ${getHeaderColor()} text-white p-6`}>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h2 id="event-title" className="text-2xl font-bold mb-2">
                  {isReminder && '🔔 '}
                  {isTodo && '✅ '}
                  {event.title}
                </h2>
                {event.start_time && (
                  <div className="flex items-center gap-4 text-sm opacity-90">
                    <span>📅 {new Date(event.start_time).toLocaleDateString()}</span>
                    <span>⏰ {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                )}
                {(event as any).source === 'business' && (
                  <span className="inline-block mt-2 bg-white/20 px-2 py-1 rounded text-xs">BUSINESS EVENT</span>
                )}
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors" aria-label="Close">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {event.allows_rsvp && (event as any).rsvp_count_visible && (
              <div className="mt-4 flex items-center gap-4 text-sm">
                <span className="bg-white/20 px-3 py-1 rounded-full">✓ {rsvpData.going} going</span>
                <span className="bg-white/20 px-3 py-1 rounded-full">☆ {rsvpData.interested} interested</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
            <div className="p-6 space-y-6">
              
              {/* FIXED: Always show When section with proper formatting */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-lg">When</h3>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Starts:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {event.start_time ? new Date(event.start_time).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'Not set'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Ends:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {event.end_time ? new Date(event.end_time).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'Not set'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Duration:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {event.start_time && event.end_time ? formatDuration(event.start_time, event.end_time) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {event.description && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Description</h3>
                  <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{event.description}</p>
                </div>
              )}

              {event.location && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Location</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">📍</span>
                    <p className="text-gray-600 dark:text-gray-400">{event.location}</p>
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Visibility</h3>
                <div className="inline-flex items-center gap-2 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full text-sm">
                  <span>
                    {event.visibility === 'private' && '🔒 Private'}
                    {event.visibility === 'friends' && '👥 Friends'}
                    {event.visibility === 'everyone' && '🌍 Everyone'}
                  </span>
                </div>
              </div>

              {/* FIXED: Only show comments for complex events, not simple ones */}
              {!isSimpleEvent && (
                <div className="border-t dark:border-gray-700 pt-6">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    💬 Comments & Discussion
                    {comments.length > 0 && (
                      <span className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full font-normal">{comments.length}</span>
                    )}
                  </h3>

                  <div className="space-y-3 mb-4" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {isLoadingComments ? (
                      <div className="text-center py-4 text-gray-500">Loading comments...</div>
                    ) : comments.length > 0 ? (
                      comments.map((comment) => (
                        <div key={comment.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                          <div className="flex items-start gap-3">
                            {comment.user?.avatar_url ? (
                              <img src={comment.user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center text-xs">👤</div>
                            )}
                            <div className="flex-1">
                              <div className="flex items-baseline gap-2">
                                <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{comment.user?.full_name || 'Anonymous'}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {new Date(comment.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{comment.body}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <p>No comments yet</p>
                        <p className="text-sm mt-1">Be the first to comment!</p>
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
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        disabled={isSendingComment}
                      />
                      <button
                        onClick={handleSendComment}
                        disabled={!newComment.trim() || isSendingComment}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                      >
                        {isSendingComment ? '...' : 'Post'}
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-gray-600 dark:text-gray-400">Please sign in to comment</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-t dark:border-gray-700">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                {event.allows_rsvp && !isCreator && (
                  <>
                    <button
                      onClick={() => handleRSVP('going')}
                      disabled={loading}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        rsvpData.userStatus === 'going' ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
                      } disabled:opacity-50`}
                    >
                      {rsvpData.userStatus === 'going' ? '✓ Going' : 'Going'}
                    </button>
                    <button
                      onClick={() => handleRSVP('interested')}
                      disabled={loading}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        rsvpData.userStatus === 'interested' ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
                      } disabled:opacity-50`}
                    >
                      {rsvpData.userStatus === 'interested' ? '☆ Interested' : 'Interested'}
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isCreator && onEdit && (
                  <button 
                    onClick={() => {
                      console.log('✏️ Edit button clicked for event:', event.id);
                      onEdit(event);
                    }} 
                    className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 font-medium transition-colors"
                  >
                    ✏️ Edit
                  </button>
                )}
                
                {isCreator && onDelete && (
                  <button 
                    onClick={handleDelete} 
                    className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 font-medium transition-colors"
                  >
                    🗑️ Delete
                  </button>
                )}
                
                <button 
                  onClick={onClose} 
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

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
