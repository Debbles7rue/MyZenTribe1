// components/CreateEventModal.tsx
"use client";

import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";

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
  sessionUser: string | null; // kept for API parity, not used here
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
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [selectedCommunities, setSelectedCommunities] = useState<string[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  const handleImageUpload = async (file: File) => {
    setIsUploading(true);
    try {
      // Replace with your actual image upload logic
      const formData = new FormData();
      formData.append('file', file);
      
      // Mock upload - replace with actual implementation
      const imageUrl = URL.createObjectURL(file);
      setImagePreview(imageUrl);
      onChange({ image_path: imageUrl });
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const generateGoogleMapsUrl = (location: string) => {
    if (!location) return '';
    return `https://www.google.com/maps/search/${encodeURIComponent(location)}`;
  };

  const isStepValid = (stepNum: number) => {
    switch (stepNum) {
      case 1: return value.title.trim().length > 0;
      case 2: return value.start && value.location;
      case 3: return true; // Privacy step is always valid
      default: return true;
    }
  };

  const nextStep = () => {
    if (isStepValid(step)) setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  const handleSave = () => {
    if (value.visibility === 'public' && (selectedFriends.length || selectedCommunities.length)) {
      // Handle sharing logic here
      console.log('Share with friends:', selectedFriends);
      console.log('Share with communities:', selectedCommunities);
    }
    onSave();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!open || !mounted) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={handleBackdropClick}
    >
      <div 
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-200"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '90vh' }}
      >
        {/* Header with Gradient */}
        <div 
          className="px-6 py-5 text-white relative"
          style={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #c084fc 100%)',
            boxShadow: '0 4px 20px rgba(124, 58, 237, 0.3)'
          }}
        >
          <div className="flex items-center justify-between relative z-10">
            <div>
              <h2 className="text-2xl font-bold mb-1">Create Event</h2>
              <p className="text-purple-100 text-sm">Share your event with the community</p>
            </div>
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all duration-200 backdrop-blur-sm"
              style={{ backdropFilter: 'blur(8px)' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center mt-6 space-x-3">
            {[1, 2, 3].map((num) => (
              <div key={num} className="flex items-center">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200
                  ${step >= num 
                    ? 'bg-white text-purple-600 shadow-lg transform scale-105' 
                    : 'bg-white/20 text-white/70 backdrop-blur-sm'
                  }
                `}>
                  {step > num ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    num
                  )}
                </div>
                {num < 3 && (
                  <div className={`
                    w-16 h-1 mx-2 rounded-full transition-all duration-300
                    ${step > num ? 'bg-white' : 'bg-white/20'}
                  `} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content Area with Scroll */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          <div className="px-6 py-6">
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">Event Details</h3>
                  <p className="text-gray-600 text-sm mb-6">Tell us what's happening</p>
                  
                  <div className="space-y-5">
                    {/* Event Title */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Event Title *
                      </label>
                      <input
                        type="text"
                        value={value.title}
                        onChange={(e) => onChange({ title: e.target.value })}
                        placeholder="What's happening?"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg transition-all duration-200 hover:border-gray-300"
                        style={{ fontSize: '16px' }}
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        value={value.description}
                        onChange={(e) => onChange({ description: e.target.value })}
                        placeholder="Add details about your event..."
                        rows={4}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 hover:border-gray-300 resize-none"
                        style={{ fontSize: '16px' }}
                      />
                    </div>

                    {/* Event Image */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Event Image (Optional)
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-gray-400 transition-colors duration-200">
                        {imagePreview ? (
                          <div className="relative">
                            <img 
                              src={imagePreview} 
                              alt="Event preview" 
                              className="w-full h-40 object-cover rounded-lg"
                            />
                            <button
                              onClick={() => {
                                setImagePreview(null);
                                onChange({ image_path: '' });
                              }}
                              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm transition-colors duration-200"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <div className="text-center">
                            <div className="text-4xl text-gray-400 mb-3">📸</div>
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isUploading}
                              className="text-purple-600 hover:text-purple-700 font-semibold text-sm px-4 py-2 rounded-lg border-2 border-purple-200 hover:border-purple-300 transition-all duration-200"
                            >
                              {isUploading ? 'Uploading...' : 'Add a photo'}
                            </button>
                            <p className="text-gray-500 text-xs mt-2">PNG, JPG up to 10MB</p>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUpload(file);
                              }}
                              className="hidden"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Event Type and Source */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Event Type
                        </label>
                        <input
                          type="text"
                          value={value.event_type}
                          onChange={(e) => onChange({ event_type: e.target.value })}
                          placeholder="e.g., Workshop, Social, Meeting"
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 hover:border-gray-300"
                          style={{ fontSize: '16px' }}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Source
                        </label>
                        <select
                          value={value.source}
                          onChange={(e) => onChange({ source: e.target.value as "personal" | "business" })}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 hover:border-gray-300"
                          style={{ fontSize: '16px' }}
                        >
                          <option value="personal">Personal</option>
                          <option value="business">Business</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">When & Where</h3>
                  <p className="text-gray-600 text-sm mb-6">Set the time and location</p>
                  
                  <div className="space-y-5">
                    {/* Start and End Time */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Start Time *
                        </label>
                        <input
                          type="datetime-local"
                          value={value.start}
                          onChange={(e) => onChange({ start: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 hover:border-gray-300"
                          style={{ fontSize: '16px' }}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          End Time (Optional)
                        </label>
                        <input
                          type="datetime-local"
                          value={value.end}
                          onChange={(e) => onChange({ end: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 hover:border-gray-300"
                          style={{ fontSize: '16px' }}
                        />
                      </div>
                    </div>

                    {/* Location */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Location *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={value.location}
                          onChange={(e) => onChange({ location: e.target.value })}
                          placeholder="Where is this happening?"
                          className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 hover:border-gray-300"
                          style={{ fontSize: '16px' }}
                        />
                        {value.location && (
                          <a
                            href={generateGoogleMapsUrl(value.location)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-500 hover:text-blue-600 text-xl transition-colors duration-200"
                            title="Open in Google Maps"
                          >
                            🗺️
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">Privacy & Sharing</h3>
                  <p className="text-gray-600 text-sm mb-6">Choose who can see this event</p>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="space-y-3">
                        {[
                          { value: 'private', title: 'Private', desc: 'Only you can see this event', icon: '🔒' },
                          { value: 'friends', title: 'Friends & Connections', desc: 'Your friends and connections can see this', icon: '👥' },
                          { value: 'public', title: 'Public', desc: 'Anyone can discover and join', icon: '🌍' },
                          { value: 'community', title: 'Community', desc: 'Share with specific communities', icon: '🏘️' }
                        ].map((option) => (
                          <label 
                            key={option.value}
                            className={`flex items-start space-x-4 p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                              value.visibility === option.value
                                ? 'border-purple-500 bg-purple-50 shadow-sm'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="radio"
                              name="visibility"
                              value={option.value}
                              checked={value.visibility === option.value}
                              onChange={(e) => onChange({ visibility: e.target.value as Visibility })}
                              className="mt-1 w-4 h-4"
                            />
                            <div className="text-2xl">{option.icon}</div>
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900">{option.title}</div>
                              <div className="text-sm text-gray-600 mt-1">{option.desc}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {value.visibility === 'community' && (
                      <div className="pl-6 border-l-4 border-purple-200 bg-purple-50 p-4 rounded-r-xl">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Community ID
                        </label>
                        <input
                          type="text"
                          value={value.community_id}
                          onChange={(e) => onChange({ community_id: e.target.value })}
                          placeholder="Enter community identifier"
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 hover:border-gray-300"
                          style={{ fontSize: '16px' }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
          <div className="flex space-x-3">
            {step > 1 && (
              <button
                onClick={prevStep}
                className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            )}
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-5 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors duration-200"
            >
              Cancel
            </button>
            
            {step < 3 ? (
              <button
                onClick={nextStep}
                disabled={!isStepValid(step)}
                className="flex items-center px-6 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Next
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <button
                onClick={handleSave}
                className="flex items-center px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Create Event
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
