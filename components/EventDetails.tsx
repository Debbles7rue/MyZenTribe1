// components/EventDetails.tsx
"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { DBEvent } from "@/lib/types";

// Safely read a date from any supported column name
function getDate(e: any, keys: string[]) {
  for (const k of keys) {
    if (e?.[k]) return new Date(e[k]);
  }
  return null;
}

function getField(e: any, keys: string[]) {
  for (const k of keys) {
    if (e?.[k] !== undefined && e?.[k] !== null) return e[k];
  }
  return null;
}

// Format date range nicely
function formatDateRange(start: Date, end: Date) {
  const sameDay = start.toDateString() === end.toDateString();
  
  if (sameDay) {
    return `${start.toLocaleDateString()} • ${start.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })} - ${end.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })}`;
  } else {
    return `${start.toLocaleDateString()} ${start.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })} - ${end.toLocaleDateString()} ${end.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })}`;
  }
}

export default function EventDetails({
  event,
  onClose,
}: {
  event: DBEvent | null;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (event) {
      // Small delay to trigger enter animation
      setTimeout(() => setIsVisible(true), 10);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      setIsVisible(false);
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [event]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && event) {
        handleClose();
      }
    };

    if (event) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [event]);

  const handleClose = () => {
    setIsVisible(false);
    // Delay the actual close to allow exit animation
    setTimeout(() => {
      onClose();
    }, 200);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!event || !mounted) return null;

  const start = getDate(event, ["start_time", "start_at", "starts_at"]) || new Date();
  const end = getDate(event, ["end_time", "end_at", "ends_at"]) || start;
  const location = getField(event, ["location"]);
  const visibility = getField(event, ["visibility"]) ?? (getField(event, ["is_public"]) ? "public" : "private");
  const eventType = getField(event, ["event_type"]);
  const description = getField(event, ["description", "notes"]);

  // Get event type styling
  const getEventTypeStyle = () => {
    switch (eventType) {
      case "reminder":
        return {
          bg: "bg-amber-50",
          border: "border-amber-200",
          text: "text-amber-800",
          icon: "⏰"
        };
      case "todo":
        return {
          bg: "bg-emerald-50",
          border: "border-emerald-200", 
          text: "text-emerald-800",
          icon: "✓"
        };
      default:
        return {
          bg: "bg-blue-50",
          border: "border-blue-200",
          text: "text-blue-800", 
          icon: "📅"
        };
    }
  };

  const typeStyle = getEventTypeStyle();

  const modalContent = (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-300 ease-out ${
        isVisible 
          ? 'bg-black/50 backdrop-blur-sm opacity-100' 
          : 'bg-black/0 backdrop-blur-none opacity-0 pointer-events-none'
      }`}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-title"
      style={{
        // Ensure this is always on top
        position: 'fixed',
        zIndex: 9999,
        isolation: 'isolate',
      }}
    >
      <div
        className={`w-full max-w-lg mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden transform transition-all duration-300 ease-out max-h-[90vh] ${
          isVisible 
            ? 'scale-100 translate-y-0 opacity-100' 
            : 'scale-95 translate-y-4 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b border-gray-100 ${typeStyle.bg} ${typeStyle.border}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{typeStyle.icon}</span>
                {eventType && (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeStyle.bg} ${typeStyle.text} border ${typeStyle.border}`}>
                    {eventType}
                  </span>
                )}
              </div>
              <h3 
                id="event-title"
                className={`text-xl font-semibold ${typeStyle.text} pr-2`}
                style={{ lineHeight: '1.3' }}
              >
                {(event as any).title || "Event"}
              </h3>
            </div>
            <button
              onClick={handleClose}
              className="flex-shrink-0 w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center transition-colors duration-200 shadow-sm"
              aria-label="Close event details"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Event Image */}
        {(event as any).image_path && (
          <div className="w-full h-48 bg-gray-100 overflow-hidden">
            <img
              src={(event as any).image_path}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}

        {/* Content */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto max-h-96">
          {/* Date & Time */}
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-violet-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">When</div>
              <div className="text-sm text-gray-600 mt-1">
                {formatDateRange(start, end)}
              </div>
            </div>
          </div>

          {/* Location */}
          {location && (
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">Location</div>
                <div className="text-sm text-gray-600 mt-1">{location}</div>
              </div>
            </div>
          )}

          {/* Visibility */}
          {visibility && (
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                  {visibility === 'private' ? (
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  ) : (
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  )}
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">Visibility</div>
                <div className="text-sm text-gray-600 mt-1 capitalize">{String(visibility)}</div>
              </div>
            </div>
          )}

          {/* Description */}
          {description && (
            <div className="pt-2 border-t border-gray-100">
              <div className="text-sm font-medium text-gray-900 mb-2">Details</div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {description}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
          <div className="flex justify-end gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200"
            >
              Close
            </button>
            <button
              onClick={handleClose}
              className="px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-[1.02]"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Use portal to render outside normal DOM hierarchy
  return createPortal(modalContent, document.body);
}
