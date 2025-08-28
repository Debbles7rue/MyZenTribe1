// components/ModernCreateEventModal.tsx
"use client";

import React, { useState, useRef } from "react";
import { Dialog } from "@headlessui/react";
import type { Visibility } from "@/lib/types";

interface EventForm {
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

interface Friend {
  friend_id: string;
  name: string;
}

interface Community {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  sessionUser: string | null;
  value: EventForm;
  onChange: (updates: Partial<EventForm>) => void;
  onSave: () => void;
  friends?: Friend[];
  communities?: Community[];
}

export default function ModernCreateEventModal({
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <Dialog open={open} onClose={onClose} className="relative z-[999]">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-4 text-white">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Create Event</h2>
              <button 
                onClick={onClose}
                className="text-white/80 hover:text-white text-2xl font-light"
              >
                ×
              </button>
            </div>
            
            {/* Progress Steps */}
            <div className="flex items-center mt-4 space-x-4">
              {[1, 2, 3].map((num) => (
                <div key={num} className="flex items-center">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${step >= num ? 'bg-white text-violet-600' : 'bg-white/20 text-white/60'}
                  `}>
                    {num}
                  </div>
                  {num < 3 && (
                    <div className={`
                      w-12 h-0.5 mx-2
                      ${step > num ? 'bg-white' : 'bg-white/20'}
                    `} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6" style={{ minHeight: '400px' }}>
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Event Details</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Event Title *
                      </label>
                      <input
                        type="text"
                        value={value.title}
                        onChange={(e) => onChange({ title: e.target.value })}
                        placeholder="What's happening?"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        value={value.description}
                        onChange={(e) => onChange({ description: e.target.value })}
                        placeholder="Add details about your event..."
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Event Image (Optional)
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                        {imagePreview ? (
                          <div className="relative">
                            <img 
                              src={imagePreview} 
                              alt="Event preview" 
                              className="w-full h-32 object-cover rounded-lg"
                            />
                            <button
                              onClick={() => {
                                setImagePreview(null);
                                onChange({ image_path: '' });
                              }}
                              className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <div className="text-center">
                            <div className="text-gray-400 mb-2">📸</div>
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isUploading}
                              className="text-violet-600 hover:text-violet-700 font-medium"
                            >
                              {isUploading ? 'Uploading...' : 'Add a photo'}
                            </button>
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

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Event Type
                      </label>
                      <input
                        type="text"
                        value={value.event_type}
                        onChange={(e) => onChange({ event_type: e.target.value })}
                        placeholder="e.g., Workshop, Social, Meeting..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">When & Where</h3>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Start Time *
                        </label>
                        <input
                          type="datetime-local"
                          value={value.start}
                          onChange={(e) => onChange({ start: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          End Time (Optional)
                        </label>
                        <input
                          type="datetime-local"
                          value={value.end}
                          onChange={(e) => onChange({ end: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Location *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={value.location}
                          onChange={(e) => onChange({ location: e.target.value })}
                          placeholder="Where is this happening?"
                          className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        />
                        {value.location && (
                          <a
                            href={generateGoogleMapsUrl(value.location)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-500 hover:text-blue-600 text-xl"
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
                  <h3 className="text-lg font-semibold mb-4">Privacy & Sharing</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Who can see this event?
                      </label>
                      <div className="space-y-3">
                        <label className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="radio"
                            name="visibility"
                            value="private"
                            checked={value.visibility === 'private'}
                            onChange={(e) => onChange({ visibility: e.target.value as Visibility })}
                            className="mt-1"
                          />
                          <div>
                            <div className="font-medium">Private</div>
                            <div className="text-sm text-gray-500">Only you can see this event</div>
                          </div>
                        </label>

                        <label className="flex items-start space-x-3 p-3 border rounded-lg cur
