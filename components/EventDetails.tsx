// components/EventDetails.tsx
"use client";
import React from "react";
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

export default function EventDetails({
  event,
  onClose,
}: {
  event: DBEvent | null;
  onClose: () => void;
}) {
  // Simple null check to prevent freezing
  if (!event) return null;

  const start = getDate(event, ["start_time", "start_at", "starts_at"]) || new Date();
  const end = getDate(event, ["end_time", "end_at", "ends_at"]) || start;
  const location = getField(event, ["location"]);
  const visibility = getField(event, ["visibility"]) ?? (getField(event, ["is_public"]) ? "public" : "private");
  const eventType = getField(event, ["event_type"]);
  const description = getField(event, ["description", "notes"]);

  // Simple backdrop click handler
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
      onClick={handleBackdropClick}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              {eventType && (
                <div style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '4px'
                }}>
                  {eventType}
                </div>
              )}
              <h3 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#111827',
                margin: 0,
                lineHeight: '1.4'
              }}>
                {(event as any).title || "Event"}
              </h3>
            </div>
            <button
              onClick={onClose}
              style={{
                padding: '8px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#f3f4f6',
                color: '#6b7280',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Event Image */}
        {(event as any).image_path && (
          <div style={{ width: '100%', height: '200px', overflow: 'hidden' }}>
            <img
              src={(event as any).image_path}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        )}

        {/* Content */}
        <div style={{ padding: '20px 24px' }}>
          {/* Date & Time */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
              When
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              {start.toLocaleDateString()} at {start.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
              {end.getTime() !== start.getTime() && (
                <> - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>
              )}
            </div>
          </div>

          {/* Location */}
          {location && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                Location
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                {location}
              </div>
            </div>
          )}

          {/* Visibility */}
          {visibility && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                Visibility
              </div>
              <div style={{ 
                fontSize: '14px', 
                color: '#6b7280',
                textTransform: 'capitalize'
              }}>
                {String(visibility)}
              </div>
            </div>
          )}

          {/* Description */}
          {description && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                Details
              </div>
              <div style={{ 
                fontSize: '14px', 
                color: '#6b7280',
                whiteSpace: 'pre-wrap',
                lineHeight: '1.5'
              }}>
                {description}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#7c3aed',
              color: 'white',
              fontWeight: '500',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
