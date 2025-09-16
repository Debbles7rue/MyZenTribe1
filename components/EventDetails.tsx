// components/EventDetails.tsx
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
  const modalRef = useRef<HTMLDivElement>(null);

  // Fetch RSVP data
  useEffect(() => {
    if (event && event.allows_rsvp) {
      fetchRSVPData();
    }
    if (event) {
      fetchEventMedia();
    }
  }, [event]);

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
      }
    } catch (error) {
      console.error("Error fetching media:", error);
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

  // Determine background colors based on event type
  const getHeaderColor = () => {
    if (isReminder) return 'from-amber-500 to-orange-600';
    if (isTodo) return 'from-green-500 to-emerald-600';
    if ((event as any).source === 'business') return 'from-gray-800 to-purple-900';
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
              {/* Image Gallery */}
              {imageUrls.length > 0 && (
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
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">
                      {(() => {
                        try {
                          const start = new Date(event.start_time);
                          const end = new Date(event.end_time);
                          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                            const minutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
                            if (minutes < 60) return `${minutes} minutes`;
                            const hours = Math.floor(minutes / 60);
                            const mins = minutes % 60;
                            return mins > 0 ? `${hours}h ${mins}m` : `${hours} hour${hours !== 1 ? 's' : ''}`;
                          }
                        } catch {
                          // Fallback if date parsing fails
                        }
                        return 'N/A';
                      })()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Visibility */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Visibility</h3>
                <div className="inline-flex items-center gap-2 bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm">
                  <span>
                    {event.visibility === 'private' && '🔒 Private'}
                    {event.visibility === 'friends' && '👥 Friends'}
                    {event.visibility === 'everyone' && '🌍 Everyone'}
                  </span>
                </div>
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
