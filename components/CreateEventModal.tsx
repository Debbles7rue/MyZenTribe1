// components/CreateEventModal.tsx
"use client";

import React, { useState, useEffect } from "react";

// Keep it local so we don't depend on other type files
type Visibility = "public" | "friends" | "private" | "community";

type FormValue = {
  title: string;
  description: string;
  location: string;
  start: string; // ISO string (yyyy-MM-ddTHH:mm)
  end: string;   // ISO string (yyyy-MM-ddTHH:mm)
  visibility: Visibility;
  event_type: string;
  community_id: string;
  source: "personal" | "business";
  image_path: string; // public URL
};

interface Friend {
  friend_id: string;
  name: string;
}

interface Community {
  id: string;
  name: string;
}

type Props = {
  open: boolean;
  onClose: () => void;
  sessionUser: string | null;
  value: FormValue;
  onChange: (patch: Partial<FormValue>) => void;
  onSave: () => void;
  friends?: Friend[];
  communities?: Community[];
};

export default function CreateEventModal({
  open,
  onClose,
  sessionUser,
  value,
  onChange,
  onSave,
  friends = [],
  communities = []
}: Props) {
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      setStep(1); // Reset step when modal closes
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  if (!open) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const isStepValid = (stepNum: number) => {
    switch (stepNum) {
      case 1: return value.title.trim().length > 0;
      case 2: return value.start && value.location;
      case 3: return true;
      default: return true;
    }
  };

  const nextStep = () => {
    if (isStepValid(step)) setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

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
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
          color: 'white',
          padding: '24px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, marginBottom: '4px' }}>
                Create Event
              </h2>
              <p style={{ fontSize: '14px', opacity: 0.9, margin: 0 }}>
                Share your event with the community
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                width: '32px',
                height: '32px',
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

          {/* Progress Steps */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {[1, 2, 3].map((num) => (
              <React.Fragment key={num}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: step >= num ? 'white' : 'rgba(255, 255, 255, 0.3)',
                  color: step >= num ? '#7c3aed' : 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: '600',
                }}>
                  {num}
                </div>
                {num < 3 && (
                  <div style={{
                    width: '40px',
                    height: '2px',
                    backgroundColor: step > num ? 'white' : 'rgba(255, 255, 255, 0.3)',
                  }} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', maxHeight: '400px', overflowY: 'auto' }}>
          {step === 1 && (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
                Event Details
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                    Event Title *
                  </label>
                  <input
                    type="text"
                    value={value.title}
                    onChange={(e) => onChange({ title: e.target.value })}
                    placeholder="What's happening?"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '16px',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#7c3aed'}
                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                    Description
                  </label>
                  <textarea
                    value={value.description}
                    onChange={(e) => onChange({ description: e.target.value })}
                    placeholder="Add details about your event..."
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '16px',
                      outline: 'none',
                      resize: 'vertical',
                      minHeight: '100px',
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#7c3aed'}
                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                      Event Type
                    </label>
                    <input
                      type="text"
                      value={value.event_type}
                      onChange={(e) => onChange({ event_type: e.target.value })}
                      placeholder="Workshop, Social..."
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '16px',
                        outline: 'none',
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#7c3aed'}
                      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                      Source
                    </label>
                    <select
                      value={value.source}
                      onChange={(e) => onChange({ source: e.target.value as "personal" | "business" })}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '16px',
                        outline: 'none',
                        backgroundColor: 'white',
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#7c3aed'}
                      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                    >
                      <option value="personal">Personal</option>
                      <option value="business">Business</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
                When & Where
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                      Start Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={value.start}
                      onChange={(e) => onChange({ start: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '16px',
                        outline: 'none',
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#7c3aed'}
                      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                      End Time
                    </label>
                    <input
                      type="datetime-local"
                      value={value.end}
                      onChange={(e) => onChange({ end: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '16px',
                        outline: 'none',
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#7c3aed'}
                      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                    Location *
                  </label>
                  <input
                    type="text"
                    value={value.location}
                    onChange={(e) => onChange({ location: e.target.value })}
                    placeholder="Where is this happening?"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '16px',
                      outline: 'none',
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#7c3aed'}
                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
                Privacy & Sharing
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { value: 'private', title: 'Private', desc: 'Only you can see this event' },
                  { value: 'friends', title: 'Friends', desc: 'Your friends and connections can see this' },
                  { value: 'public', title: 'Public', desc: 'Anyone can discover and join' },
                  { value: 'community', title: 'Community', desc: 'Share with specific communities' }
                ].map((option) => (
                  <label
                    key={option.value}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      border: value.visibility === option.value ? '2px solid #7c3aed' : '2px solid #e5e7eb',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: value.visibility === option.value ? '#f3f4f6' : 'white',
                    }}
                  >
                    <input
                      type="radio"
                      name="visibility"
                      value={option.value}
                      checked={value.visibility === option.value}
                      onChange={(e) => onChange({ visibility: e.target.value as Visibility })}
                      style={{ marginRight: '12px' }}
                    />
                    <div>
                      <div style={{ fontWeight: '500', fontSize: '14px', color: '#111827' }}>
                        {option.title}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {option.desc}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              {value.visibility === 'community' && (
                <div style={{ marginTop: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                    Community ID
                  </label>
                  <input
                    type="text"
                    value={value.community_id}
                    onChange={(e) => onChange({ community_id: e.target.value })}
                    placeholder="Enter community identifier"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '16px',
                      outline: 'none',
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#7c3aed'}
                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            {step > 1 && (
              <button
                onClick={prevStep}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#6b7280',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                ← Back
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'transparent',
                color: '#6b7280',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Cancel
            </button>

            {step < 3 ? (
              <button
                onClick={nextStep}
                disabled={!isStepValid(step)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: isStepValid(step) ? '#7c3aed' : '#d1d5db',
                  color: 'white',
                  cursor: isStepValid(step) ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                Next →
              </button>
            ) : (
              <button
                onClick={onSave}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#7c3aed',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                Create Event
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
