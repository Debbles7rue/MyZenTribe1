<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EventDetails.tsx - Updated with Pre/Post Events and Comments</title>
</head>
<body>
<pre><code>// components/EventDetails.tsx
"use client";

import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ToastProvider";
import type { DBEvent } from "@/lib/types";

interface EventDetailsProps {
  event: DBEvent | null;
  onClose: () => void;
  onEdit?: (event: DBEvent) => void;
  onDelete?: (id: string) => void;
  currentUserId?: string | null;
  onOpenCarpool?: (event: DBEvent) => void;
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
  onOpenCarpool 
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
  const modalRef = useRef<HTMLDivElement>(null);

  // Fetch RSVP data
  useEffect(() => {
    if (event && event.allows_rsvp) {
      fetchRSVPData();
    }
    if (event) {
      fetchEventMedia();
      fetchComments();
    }
  }, [event]);

  // Subscribe to real-time comment updates
  useEffect(() => {
    if (!event?.id) return;

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
  }, [event?.id]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (event) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [event]);

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
        // Fallback to single image if no media entries
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
        // Remove RSVP
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
        // Update or create RSVP
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

  const copyEventLink = () => {
    const link = `${window.location.origin}/event/${event?.id}`;
    navigator.clipboard.writeText(link);
    showToast({ type: 'success', message: '🔗 Link copied to clipboard!' });
  };

  if (!event) return null;

  const isCreator = currentUserId && event.created_by === currentUserId;
  const eventType = (event as any).event_type;
  const isReminder = eventType === 'reminder';
  const isTodo = eventType === 'todo';
  const preEvent = (event as any).pre_event;
  const postEvent = (event as any).post_event;

  // Determine background colors based on event type
  const getHeaderColor = () => {
    if (isReminder) return 'from-amber-500 to-orange-600';
    if (isTodo) return 'from-green-500 to-emerald-600';
    if ((event as any).source === 'business') return 'from-purple-700 to-pink-700';
    return 'from-purple-600 to-blue-600';
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-title"
    >
      <div className="flex items-center justify-center min-h-screen p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fadeIn"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal */}
        <div 
          ref={modalRef}
          className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-slideUp"
        >
          {/* Header with gradient */}
          <div className={`bg-gradient-to-r ${getHeaderColor()} text-white p-6`}>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h2 id="event-title" className="text-2xl font-bold mb-2">
                  {isReminder && '🔔 '}
                  {isTodo && '✅ '}
                  {event.title}
                </h2>
                <div className="flex items-center gap-4 text-sm opacity-90">
                  {event.start_time && (
                    <>
                      <span>📅 {(() => {
                        try {
                          return new Date(event.start_time).toLocaleDateString();
                        } catch {
                          return 'Date unavailable';
                        }
                      })()}</span>
                      <span>
                        ⏰ {(() => {
                          try {
                            return new Date(event.start_time).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            });
                          } catch {
                            return 'Time unavailable';
                          }
                        })()}
                      </span>
                    </>
                  )}
                  {(event as any).source === 'business' && (
                    <span className="bg-white/20 px-2 py-1 rounded text-xs">
                      BUSINESS EVENT
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                aria-label="Close modal"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* RSVP Stats */}
            {event.allows_rsvp && event.rsvp_count_visible && (
              <div className="mt-4 flex items-center gap-4 text-sm">
                <span className="bg-white/20 px-3 py-1 rounded-full">
                  ✓ {rsvpData.going} going
                </span>
                <span className="bg-white/20 px-3 py-1 rounded-full">
                  ☆ {rsvpData.interested} interested
                </span>
              </div>
            )}
          </div>

          {/* Body - Scrollable content */}
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
            <div className="p-6 space-y-6">
              
              {/* Pre-Event Gathering */}
              {preEvent && preEvent.title && (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-orange-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🍽️</span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-orange-900 mb-1">Pre-Event Gathering</h3>
                      <p className="font-medium text-orange-800">{preEvent.title}</p>
                      <div className="mt-2 space-y-1 text-sm text-orange-700">
                        <div className="flex items-center gap-2">
                          <span>📅</span>
                          <span>
                            {new Date(preEvent.time).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        {preEvent.location && (
                          <div className="flex items-center gap-2">
                            <span>📍</span>
                            <span>{preEvent.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Image Gallery */}
              {imageUrls.length > 0 && imageUrls[0] && (
                <div className="grid grid-cols-2 gap-2">
                  {imageUrls.map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt={`Event image ${index + 1}`}
                      className="w-full h-40 object-cover rounded-lg hover:opacity-90 cursor-pointer transition-opacity"
                      onClick={() => window.open(url, '_blank')}
                    />
                  ))}
                </div>
              )}

              {/* Description */}
              {event.description && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">About this event</h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{event.description}</p>
                </div>
              )}

              {/* Location */}
              {event.location && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Location</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">📍</span>
                    <div>
                      <p className="text-gray-600">{event.location}</p>
                      {event.hide_address_until_rsvp && rsvpData.userStatus !== 'going' && (
                        <p className="text-sm text-gray-400 mt-1">
                          Full address visible after RSVP
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Time Details */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">When</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Starts:</span>
                    <span className="font-medium">
                      {event.start_time ? (() => {
                        try {
                          return new Date(event.start_time).toLocaleString();
                        } catch {
                          return 'Date unavailable';
                        }
                      })() : 'Not specified'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ends:</span>
                    <span className="font-medium">
                      {event.end_time ? (() => {
                        try {
                          return new Date(event.end_time).toLocaleString();
                        } catch {
                          return 'Date unavailable';
                        }
                      })() : 'Not specified'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Post-Event Gathering */}
              {postEvent && postEvent.title && (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">☕</span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-purple-900 mb-1">Post-Event Gathering</h3>
                      <p className="font-medium text-purple-800">{postEvent.title}</p>
                      <div className="mt-2 space-y-1 text-sm text-purple-700">
                        <div className="flex items-center gap-2">
                          <span>📅</span>
                          <span>
                            {new Date(postEvent.time).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        {postEvent.location && (
                          <div className="flex items-center gap-2">
                            <span>📍</span>
                            <span>{postEvent.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Comments Section */}
              <div className="border-t pt-6">
                <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  💬 Comments & Discussion
                  {comments.length > 0 && (
                    <span className="text-sm bg-gray-100 px-2 py-1 rounded-full font-normal">
                      {comments.length}
                    </span>
                  )}
                </h3>

                {/* Comments List */}
                <div className="space-y-3 mb-4" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {isLoadingComments ? (
                    <div className="text-center py-4 text-gray-500">
                      Loading comments...
                    </div>
                  ) : comments.length > 0 ? (
                    comments.map((comment) => (
                      <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-start gap-3">
                          {comment.user?.avatar_url ? (
                            <img
                              src={comment.user.avatar_url}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs">
                              👤
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-baseline gap-2">
                              <span className="font-medium text-sm text-gray-900">
                                {comment.user?.full_name || 'Anonymous'}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(comment.created_at).toLocaleString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-gray-700">{comment.body}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No comments yet</p>
                      <p className="text-sm mt-1">Be the first to comment!</p>
                    </div>
                  )}
                </div>

                {/* Comment Input */}
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
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                  <div className="text-center py-4 bg-gray-50 rounded-lg text-gray-600">
                    Please sign in to comment
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer - Action buttons */}
          <div className="bg-gray-50 px-6 py-4 border-t">
            <div className="flex items-center justify-between">
              {/* Left side - RSVP buttons */}
              <div className="flex items-center gap-2">
                {event.allows_rsvp && !isCreator && (
                  <>
                    <button
                      onClick={() => handleRSVP('going')}
                      disabled={loading}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        rsvpData.userStatus === 'going'
                          ? 'bg-green-500 text-white hover:bg-green-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      } disabled:opacity-50`}
                    >
                      {rsvpData.userStatus === 'going' ? '✓ Going' : 'Going'}
                    </button>
                    <button
                      onClick={() => handleRSVP('interested')}
                      disabled={loading}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        rsvpData.userStatus === 'interested'
                          ? 'bg-blue-500 text-white hover:bg-blue-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      } disabled:opacity-50`}
                    >
                      {rsvpData.userStatus === 'interested' ? '☆ Interested' : 'Interested'}
                    </button>
                  </>
                )}

                {/* Carpool button */}
                {onOpenCarpool && !isReminder && !isTodo && (
                  <button
                    onClick={() => onOpenCarpool(event)}
                    className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium transition-colors flex items-center gap-2"
                  >
                    <span>🚗</span>
                    <span>Carpool</span>
                  </button>
                )}
              </div>

              {/* Right side - Action buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={copyEventLink}
                  className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
                  title="Copy link"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>

                {isCreator && (
                  <>
                    {onEdit && (
                      <button
                        onClick={() => onEdit(event)}
                        className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium transition-colors"
                      >
                        Edit
                      </button>
                    )}
                    <button
                      onClick={handleDelete}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium transition-colors"
                    >
                      Delete
                    </button>
                  </>
                )}

                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );

  // Portal render to document.body
  return ReactDOM.createPortal(modalContent, document.body);
}
</code></pre>
</body>
</html>
