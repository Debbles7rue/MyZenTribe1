// components/CreateEventModal.tsx
"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

type Visibility = "public" | "friends" | "private" | "community";

interface FormValue {
  title: string;
  description: string;
  location: string;
  start: string;
  end: string;
  visibility: Visibility;
  event_type: string;
  community_id: string;
  source: "personal" | "business";
  image_path: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  sessionUser: string | null;
  value: FormValue;
  onChange: (updates: Partial<FormValue>) => void;
  onSave: () => void;
  isEdit?: boolean;
}

const eventTypes = [
  { value: '', label: 'Regular Event', icon: '📅' },
  { value: 'reminder', label: 'Reminder', icon: '⏰' },
  { value: 'todo', label: 'To-do', icon: '✓' },
  { value: 'meditation', label: 'Meditation', icon: '🧘' },
  { value: 'drum_circle', label: 'Drum Circle', icon: '🥁' },
  { value: 'sound_bath', label: 'Sound Bath', icon: '🔔' },
  { value: 'yoga', label: 'Yoga', icon: '🧘‍♀️' },
  { value: 'qi_gong', label: 'Qi Gong', icon: '☯️' },
  { value: 'zen_tangle', label: 'Zen Tangle', icon: '🎨' },
];

export default function CreateEventModal({
  open,
  onClose,
  sessionUser,
  value,
  onChange,
  onSave,
  isEdit = false,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      setCurrentStep(1); // Reset to first step when closing
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  if (!open) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    if (!sessionUser) return;

    setUploading(true);
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${sessionUser}-${Date.now()}.${fileExt}`;
    const filePath = `events/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('event-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from('event-photos')
        .getPublicUrl(filePath);

      onChange({ image_path: publicData.publicUrl });
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return value.title.trim().length > 0 && value.start && value.end;
      case 2:
        return true; // Optional fields
      case 3:
        return true; // Review step
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (isStepValid(currentStep) && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleQuickSave = () => {
    if (value.title && value.start && value.end) {
      onSave();
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Basic Information</h3>
            
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event Title *
              </label>
              <input
                type="text"
                value={value.title}
                onChange={(e) => onChange({ title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 
                         focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter event title..."
                autoFocus
              />
            </div>

            {/* Event Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {eventTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => onChange({ event_type: type.value })}
                    className={`p-2 rounded-lg border-2 transition-all ${
                      value.event_type === type.value
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-xl mb-1">{type.icon}</div>
                      <div className="text-xs">{type.label}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={value.start}
                  onChange={(e) => onChange({ start: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 
                           focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={value.end}
                  onChange={(e) => onChange({ end: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 
                           focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Details & Privacy</h3>
            
            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={value.description}
                onChange={(e) => onChange({ description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 
                         focus:ring-purple-500 focus:border-transparent resize-none"
                rows={4}
                placeholder="Add event details..."
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                value={value.location}
                onChange={(e) => onChange({ location: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 
                         focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter location..."
              />
            </div>

            {/* Visibility */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Who can see this event?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onChange({ visibility: 'private' })}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    value.visibility === 'private'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔒</span>
                    <div className="text-left">
                      <div className="font-medium">Private</div>
                      <div className="text-xs text-gray-600">Only you</div>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onChange({ visibility: 'friends' })}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    value.visibility === 'friends'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👥</span>
                    <div className="text-left">
                      <div className="font-medium">Friends</div>
                      <div className="text-xs text-gray-600">Your friends</div>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onChange({ visibility: 'public' })}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    value.visibility === 'public'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🌍</span>
                    <div className="text-left">
                      <div className="font-medium">Public</div>
                      <div className="text-xs text-gray-600">Everyone</div>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onChange({ visibility: 'community' })}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    value.visibility === 'community'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🏘️</span>
                    <div className="text-left">
                      <div className="font-medium">Community</div>
                      <div className="text-xs text-gray-600">Community members</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event Image
              </label>
              {value.image_path ? (
                <div className="relative">
                  <img
                    src={value.image_path}
                    alt="Event"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => onChange({ image_path: '' })}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full 
                             hover:bg-red-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <label className="block">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center 
                                hover:border-purple-500 hover:bg-purple-50 transition-all cursor-pointer">
                    {uploading ? (
                      <div className="text-gray-600">Uploading...</div>
                    ) : (
                      <>
                        <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <div className="text-sm text-gray-600">Click to upload image</div>
                      </>
                    )}
                  </div>
                </label>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Review Your Event</h3>
            
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div>
                <span className="text-sm text-gray-600">Title:</span>
                <p className="font-semibold">{value.title || 'Untitled Event'}</p>
              </div>
              
              {value.event_type && (
                <div>
                  <span className="text-sm text-gray-600">Type:</span>
                  <p className="font-medium">
                    {eventTypes.find(t => t.value === value.event_type)?.label || value.event_type}
                  </p>
                </div>
              )}
              
              <div>
                <span className="text-sm text-gray-600">When:</span>
                <p className="font-medium">
                  {value.start && new Date(value.start).toLocaleString()}
                  {' - '}
                  {value.end && new Date(value.end).toLocaleString()}
                </p>
              </div>
              
              {value.location && (
                <div>
                  <span className="text-sm text-gray-600">Where:</span>
                  <p className="font-medium">{value.location}</p>
                </div>
              )}
              
              {value.description && (
                <div>
                  <span className="text-sm text-gray-600">Description:</span>
                  <p className="text-sm mt-1">{value.description}</p>
                </div>
              )}
              
              <div>
                <span className="text-sm text-gray-600">Visibility:</span>
                <p className="font-medium capitalize">{value.visibility}</p>
              </div>
              
              {value.image_path && (
                <div>
                  <span className="text-sm text-gray-600">Image:</span>
                  <img
                    src={value.image_path}
                    alt="Event preview"
                    className="mt-2 w-32 h-20 object-cover rounded-lg"
                  />
                </div>
              )}
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                {isEdit 
                  ? "Review your changes and click 'Update Event' to save."
                  : "Everything look good? Click 'Create Event' to add it to your calendar."}
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              {isEdit ? 'Edit Event' : 'Create New Event'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 mt-4">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`flex-1 h-2 rounded-full transition-all ${
                  step <= currentStep ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50 flex justify-between items-center">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className={`px-4 py-2 rounded-lg transition-colors ${
              currentStep === 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Back
          </button>

          <div className="flex gap-2">
            {/* Quick Save (skip steps) */}
            {currentStep < totalSteps && (
              <button
                onClick={handleQuickSave}
                disabled={!value.title || !value.start || !value.end}
                className="px-4 py-2 text-purple-600 hover:text-purple-700 transition-colors"
              >
                Skip & Save
              </button>
            )}

            {currentStep < totalSteps ? (
              <button
                onClick={handleNext}
                disabled={!isStepValid(currentStep)}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  isStepValid(currentStep)
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                Next
              </button>
            ) : (
              <button
                onClick={onSave}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white 
                         rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 
                         transition-all transform hover:scale-105"
              >
                {isEdit ? 'Update Event' : 'Create Event'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
