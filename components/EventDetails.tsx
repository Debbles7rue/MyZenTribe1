// components/EventDetails.tsx
"use client";

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { DBEvent } from '@/lib/types';

interface Props {
  event: DBEvent | null;
  onClose: () => void;
  onEdit?: (event: DBEvent) => void;
  isOwner?: boolean;
}

export default function EventDetails({ event, onClose, onEdit, isOwner = false }: Props) {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (event) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [event, onClose]);

  if (!event) return null;

  // Format dates
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Get event type color and label
  const getEventTypeStyle = () => {
    switch (event.event_type) {
      case 'reminder':
        return {
          bg: 'bg-amber-100',
          text: 'text-amber-800',
          label: 'Reminder',
          icon: '⏰',
        };
      case 'todo':
        return {
          bg: 'bg-green-100',
          text: 'text-green-800',
          label: 'To-do',
          icon: '✓',
        };
      default:
        return {
          bg: 'bg-purple-100',
          text: 'text-purple-800',
          label: 'Event',
          icon: '📅',
        };
    }
  };

  const eventStyle = getEventTypeStyle();

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-slideUp">
        {/* Header with gradient */}
        <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 
                     transition-colors backdrop-blur-sm"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${eventStyle.bg} ${eventStyle.text}`}>
              <span className="text-2xl">{eventStyle.icon}</span>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">{event.title}</h2>
              <div className="flex items-center gap-3 text-white/90">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${eventStyle.bg} ${eventStyle.text}`}>
                  {eventStyle.label}
                </span>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-white/20">
                  {event.visibility}
                </span>
                {event.source === 'business' && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-white/20">
                    Business Event
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Date & Time */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Date & Time</h3>
            <div className="flex items-center gap-2 text-gray-800">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{formatDate(event.start_time)}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-800 mt-2">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{formatTime(event.start_time)} - {formatTime(event.end_time)}</span>
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Location</h3>
              <div className="flex items-center gap-2 text-gray-800">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{event.location}</span>
              </div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Description</h3>
              <p className="text-gray-800 whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          {/* Status */}
          {event.status && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Status</h3>
              <div className="flex items-center gap-2">
                {event.status === 'scheduled' && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                    Scheduled
                  </span>
                )}
                {event.status === 'completed' && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                    Completed
                  </span>
                )}
                {event.status === 'cancelled' && (
                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                    Cancelled
                  </span>
                )}
                {event.completed && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                    ✓ Done
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Image */}
          {event.image_path && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Event Image</h3>
              <img
                src={event.image_path}
                alt={event.title}
                className="rounded-lg max-h-64 w-auto object-cover shadow-md"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t p-4 bg-gray-50 flex justify-between items-center">
          <div className="flex gap-2">
            {/* Owner Actions */}
            {isOwner && (
              <>
                {onEdit && (
                  <button
                    onClick={() => onEdit(event)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 
                             transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Event
                  </button>
                )}
                <button
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 
                           transition-colors flex items-center gap-2"
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this event?')) {
                      // Handle delete
                      onClose();
                    }
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </>
            )}

            {/* Non-owner Actions */}
            {!isOwner && event.visibility === 'public' && (
              <>
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                           transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Add to Calendar
                </button>
                <button
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 
                           transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M5 13l4 4L19 7" />
                  </svg>
                  RSVP
                </button>
                <button
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 
                           transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.032 4.026a9.001 9.001 0 01-7.432 0m9.032-4.026A9.001 9.001 0 0112 3c-4.474 0-8.268 3.12-9.032 7.326m0 0A9.001 9.001 0 0012 21c4.474 0 8.268-3.12 9.032-7.326" />
                  </svg>
                  Share
                </button>
              </>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Animations */}
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

  // Portal render to body
  if (typeof window !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return null;
}
