// components/ModernCreateEventModal.tsx
"use client";

import React, { useState, useRef } from "react";
import Link from "next/link"; // Added for profile links
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
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white">
            <Dialog.Title className="text-xl font-semibold">
              Create New Event
            </Dialog.Title>
            
            {/* Step Indicator */}
            <div className="flex items-center mt-4 space-x-2">
              {[1, 2, 3].map((stepNum) => (
                <React.Fragment key={stepNum}>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                    step >= stepNum 
                      ? 'bg-white text-violet-600 border-white' 
                      : 'border-white/50 text-white/70'
                  }`}>
                    {stepNum}
                  </div>
                  {stepNum < 3 && (
                    <div className={`flex-1 h-1 ${
                      step > stepNum ? 'bg-white' : 'bg-white/30'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
            
            <div className="flex mt-2 text-sm">
              <div className="flex-1">Basic Info</div>
              <div className="flex-1 text-center">Details</div>
              <div className="flex-1 text-right">Privacy</div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
            {/* Step 1: Basic Info */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Title *
                  </label>
                  <input
                    type="text"
                    value={value.title}
                    onChange={(e) => onChange({ title: e.target.value })}
                    placeholder="Give your event a name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={value.description}
                    onChange={(e) => onChange({ description: e.target.value })}
                    placeholder="What's happening at this event?"
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Type
                  </label>
                  <select
                    value={value.event_type}
                    onChange={(e) => onChange({ event_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  >
                    <option value="">Select type</option>
                    <option value="gathering">Social Gathering</option>
                    <option value="meditation">Meditation</option>
                    <option value="workshop">Workshop</option>
                    <option value="retreat">Retreat</option>
                    <option value="ceremony">Ceremony</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Image
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    {imagePreview ? (
                      <div className="relative">
                        <img src={imagePreview} alt="Event" className="w-full h-48 object-cover rounded" />
                        <button
                          onClick={() => {
                            setImagePreview(null);
                            onChange({ image_path: '' });
                          }}
                          className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
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
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                          disabled={isUploading}
                        >
                          {isUploading ? 'Uploading...' : '📷 Upload Image'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Details */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={value.start}
                      onChange={(e) => onChange({ start: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={value.end}
                      onChange={(e) => onChange({ end: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location *
                  </label>
                  <input
                    type="text"
                    value={value.location}
                    onChange={(e) => onChange({ location: e.target.value })}
                    placeholder="Where is this happening?"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  />
                  {value.location && (
                    <a
                      href={generateGoogleMapsUrl(value.location)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-violet-600 hover:text-violet-700 mt-1 inline-block"
                    >
                      View on Google Maps →
                    </a>
                  )}
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <span className="text-amber-500">ℹ️</span>
                    <div className="text-sm text-amber-800">
                      <p className="font-medium mb-1">Location Privacy</p>
                      <p>You can choose to hide the exact address until people RSVP in the next step.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Privacy & Sharing */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Who can see this event?
                  </label>
                  
                  <div className="space-y-3">
                    <div className="border rounded-lg p-3 hover:bg-gray-50">
                      <label className="flex items-start cursor-pointer">
                        <input
                          type="radio"
                          value="private"
                          checked={value.visibility === 'private'}
                          onChange={(e) => onChange({ visibility: e.target.value as Visibility })}
                          className="mt-1 mr-3"
                        />
                        <div>
                          <div className="font-medium">🔒 Private</div>
                          <div className="text-sm text-gray-600">Only you can see this event</div>
                        </div>
                      </label>
                    </div>

                    <div className="border rounded-lg p-3 hover:bg-gray-50">
                      <label className="flex items-start cursor-pointer">
                        <input
                          type="radio"
                          value="friends"
                          checked={value.visibility === 'friends'}
                          onChange={(e) => onChange({ visibility: e.target.value as Visibility })}
                          className="mt-1 mr-3"
                        />
                        <div>
                          <div className="font-medium">👥 Friends Only</div>
                          <div className="text-sm text-gray-600">Only your friends can see this event</div>
                        </div>
                      </label>
                    </div>

                    <div className="border rounded-lg p-3 hover:bg-gray-50">
                      <label className="flex items-start cursor-pointer">
                        <input
                          type="radio"
                          value="public"
                          checked={value.visibility === 'public'}
                          onChange={(e) => onChange({ visibility: e.target.value as Visibility })}
                          className="mt-1 mr-3"
                        />
                        <div>
                          <div className="font-medium">🌍 Public</div>
                          <div className="text-sm text-gray-600">Anyone can discover and join</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {value.visibility === 'public' && (
                    <div className="space-y-4 pl-6 border-l-2 border-violet-200 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Share with specific people
                        </label>
                        
                        {friends.length > 0 && (
                          <div className="mb-4">
                            <div className="text-sm font-medium text-gray-700 mb-2">Friends</div>
                            <div className="max-h-32 overflow-y-auto border rounded-lg p-2">
                              {friends.map((friend) => (
                                <div key={friend.friend_id} className="flex items-center justify-between p-1 hover:bg-gray-50 rounded">
                                  <label className="flex items-center space-x-2 flex-1 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={selectedFriends.includes(friend.friend_id)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedFriends([...selectedFriends, friend.friend_id]);
                                        } else {
                                          setSelectedFriends(selectedFriends.filter(id => id !== friend.friend_id));
                                        }
                                      }}
                                    />
                                    <span className="text-sm">{friend.name}</span>
                                  </label>
                                  {/* Added profile link for friends */}
                                  <Link
                                    href={`/profile/${friend.friend_id}`}
                                    className="text-xs text-purple-600 hover:text-purple-700 hover:underline ml-2"
                                    onClick={(e) => e.stopPropagation()} // Prevent checkbox toggle when clicking link
                                  >
                                    View Profile
                                  </Link>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {communities.length > 0 && (
                          <div>
                            <div className="text-sm font-medium text-gray-700 mb-2">Communities</div>
                            <div className="max-h-32 overflow-y-auto border rounded-lg p-2">
                              {communities.map((community) => (
                                <label key={community.id} className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={selectedCommunities.includes(community.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedCommunities([...selectedCommunities, community.id]);
                                      } else {
                                        setSelectedCommunities(selectedCommunities.filter(id => id !== community.id));
                                      }
                                    }}
                                  />
                                  <span className="text-sm">{community.name}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="flex items-center space-x-2">
                          <input type="checkbox" defaultChecked />
                          <span className="text-sm text-gray-700">Allow comments on this event</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 flex items-center justify-between">
            <div className="flex space-x-2">
              {step > 1 && (
                <button
                  onClick={prevStep}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                >
                  Back
                </button>
              )}
            </div>

            <div className="flex space-x-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                Cancel
              </button>
              
              {step < 3 ? (
                <button
                  onClick={nextStep}
                  disabled={!isStepValid(step)}
                  className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 font-medium"
                >
                  Create Event
                </button>
              )}
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
