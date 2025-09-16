// components/CreateEventModal.tsx
"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ToastProvider";
import type { Visibility } from "@/lib/types";

interface CreateEventModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  form: {
    title: string;
    description: string;
    start: string;
    end: string;
    location: string;
    visibility: Visibility;
    allows_rsvp: boolean;
    hide_address_until_rsvp: boolean;
    rsvp_count_visible: boolean;
    media_files: File[];
    selected_friends: string[];
  };
  setForm: React.Dispatch<React.SetStateAction<any>>;
  onSuccess: () => void;
  currentUserId: string;
  onOpenCarpool?: (event: any) => void;
}

interface Friend {
  friend_id: string;
  name: string;
  avatar_url?: string;
}

export default function CreateEventModal({
  open,
  setOpen,
  form,
  setForm,
  onSuccess,
  currentUserId,
  onOpenCarpool
}: CreateEventModalProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [enableCarpool, setEnableCarpool] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[]>([]);

  const totalSteps = 3;

  // Fetch friends when modal opens
  useEffect(() => {
    if (open && currentUserId) {
      fetchFriends();
    }
  }, [open, currentUserId]);

  // Handle image preview
  useEffect(() => {
    if (form.media_files?.length > 0) {
      const urls = form.media_files.map(file => URL.createObjectURL(file));
      setPreviewImages(urls);
      return () => urls.forEach(url => URL.revokeObjectURL(url));
    }
  }, [form.media_files]);

  const fetchFriends = async () => {
    try {
      const { data } = await supabase
        .from("friends")
        .select("friend_id, profiles!friends_friend_id_fkey(name, avatar_url)")
        .eq("user_id", currentUserId)
        .eq("status", "accepted");

      if (data) {
        setFriends(data.map((f: any) => ({
          friend_id: f.friend_id,
          name: f.profiles?.name || "Friend",
          avatar_url: f.profiles?.avatar_url
        })));
      }
    } catch (error) {
      console.error("Error fetching friends:", error);
    }
  };

  const handleSubmit = async () => {
    if (!form.title || !form.start || !form.end) {
      showToast({ type: 'warning', message: 'Please fill in all required fields' });
      return;
    }

    setLoading(true);
    try {
      // Create event
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .insert({
          created_by: currentUserId,
          title: form.title,
          description: form.description,
          start_time: new Date(form.start).toISOString(),
          end_time: new Date(form.end).toISOString(),
          location: form.location,
          visibility: form.visibility,
          allows_rsvp: form.allows_rsvp,
          hide_address_until_rsvp: form.hide_address_until_rsvp,
          rsvp_count_visible: form.rsvp_count_visible,
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Upload media files if any
      if (form.media_files?.length > 0) {
        for (const file of form.media_files) {
          const fileName = `${eventData.id}/${Date.now()}_${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from("event-photos")
            .upload(fileName, file);

          if (!uploadError) {
            await supabase
              .from("event_media")
              .insert({
                event_id: eventData.id,
                media_url: fileName,
                media_type: file.type.startsWith('image/') ? 'image' : 'video'
              });
          }
        }
      }

      // Create invites for selected friends
      if (form.selected_friends?.length > 0) {
        const invites = form.selected_friends.map(friend_id => ({
          event_id: eventData.id,
          user_id: friend_id,
          invited_by: currentUserId
        }));

        await supabase.from("event_invites").insert(invites);
      }

      showToast({ 
        type: 'success', 
        message: `🎉 Event "${form.title}" created successfully!` 
      });

      // If carpool is enabled, open carpool modal with the new event
      if (enableCarpool && onOpenCarpool) {
        onOpenCarpool(eventData);
      }

      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error("Error creating event:", error);
      showToast({ 
        type: 'error', 
        message: 'Failed to create event. Please try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setEnableCarpool(false);
    setPreviewImages([]);
    setForm({
      title: "",
      description: "",
      start: "",
      end: "",
      location: "",
      visibility: "friends" as Visibility,
      allows_rsvp: false,
      hide_address_until_rsvp: false,
      rsvp_count_visible: false,
      media_files: [],
      selected_friends: [],
    });
    setOpen(false);
  };

  const nextStep = () => {
    if (currentStep < totalSteps) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setForm(prev => ({ ...prev, media_files: [...prev.media_files, ...files] }));
  };

  const removeFile = (index: number) => {
    setForm(prev => ({
      ...prev,
      media_files: prev.media_files.filter((_, i) => i !== index)
    }));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Create Event</h2>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Progress Steps */}
            <div className="mt-6 flex items-center justify-between">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center font-semibold
                    ${currentStep >= step ? 'bg-white text-purple-600' : 'bg-purple-500 text-purple-200'}
                  `}>
                    {step}
                  </div>
                  {step < 3 && (
                    <div className={`w-24 h-1 mx-2 ${currentStep > step ? 'bg-white' : 'bg-purple-500'}`} />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span className={currentStep >= 1 ? 'text-white' : 'text-purple-200'}>Basic Info</span>
              <span className={currentStep >= 2 ? 'text-white' : 'text-purple-200'}>Details</span>
              <span className={currentStep >= 3 ? 'text-white' : 'text-purple-200'}>Sharing</span>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 280px)' }}>
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Event Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Morning Meditation Circle"
                    className="w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="What's this event about?"
                    rows={4}
                    className="w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Start Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={form.start}
                      onChange={(e) => setForm(prev => ({ ...prev, start: e.target.value }))}
                      className="w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      End Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={form.end}
                      onChange={(e) => setForm(prev => ({ ...prev, end: e.target.value }))}
                      className="w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Where is this happening?"
                    className="w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Event Details */}
            {currentStep === 2 && (
              <div className="space-y-6">
                {/* Media Upload */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Event Photos/Videos
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 transition-colors">
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <div className="text-gray-400">
                        <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="mt-2">Click to upload or drag and drop</p>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF, MP4 up to 10MB</p>
                      </div>
                    </label>
                  </div>

                  {/* Preview uploaded files */}
                  {previewImages.length > 0 && (
                    <div className="mt-4 grid grid-cols-4 gap-2">
                      {previewImages.map((url, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={url}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-20 object-cover rounded-lg"
                          />
                          <button
                            onClick={() => removeFile(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Event Settings */}
                <div className="space-y-4">
                  <label className="flex items-center gap-3 p-4 border-2 rounded-lg hover:bg-purple-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={form.allows_rsvp}
                      onChange={(e) => setForm(prev => ({ ...prev, allows_rsvp: e.target.checked }))}
                      className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <div>
                      <p className="font-semibold text-gray-700">Allow RSVPs</p>
                      <p className="text-sm text-gray-500">People can indicate if they're attending</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 border-2 rounded-lg hover:bg-purple-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={form.rsvp_count_visible}
                      onChange={(e) => setForm(prev => ({ ...prev, rsvp_count_visible: e.target.checked }))}
                      className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <div>
                      <p className="font-semibold text-gray-700">Show RSVP Count</p>
                      <p className="text-sm text-gray-500">Display how many people are attending</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 border-2 rounded-lg hover:bg-purple-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={form.hide_address_until_rsvp}
                      onChange={(e) => setForm(prev => ({ ...prev, hide_address_until_rsvp: e.target.checked }))}
                      className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <div>
                      <p className="font-semibold text-gray-700">Hide Address Until RSVP</p>
                      <p className="text-sm text-gray-500">Location details shown only after RSVP</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 border-2 rounded-lg hover:bg-green-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={enableCarpool}
                      onChange={(e) => setEnableCarpool(e.target.checked)}
                      className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                    />
                    <div>
                      <p className="font-semibold text-gray-700">
                        <span className="mr-2">🚗</span>
                        Enable Carpool Coordination
                      </p>
                      <p className="text-sm text-gray-500">Opens carpool organizer after creating event</p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Step 3: Sharing Options */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-4">
                    Who can see this event?
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 p-4 border-2 rounded-lg hover:bg-purple-50 cursor-pointer transition-colors">
                      <input
                        type="radio"
                        name="visibility"
                        value="private"
                        checked={form.visibility === "private"}
                        onChange={(e) => setForm(prev => ({ ...prev, visibility: e.target.value as Visibility }))}
                        className="w-5 h-5 text-purple-600 focus:ring-purple-500"
                      />
                      <div>
                        <p className="font-semibold text-gray-700">Private</p>
                        <p className="text-sm text-gray-500">Only you can see this event</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-4 border-2 rounded-lg hover:bg-purple-50 cursor-pointer transition-colors">
                      <input
                        type="radio"
                        name="visibility"
                        value="friends"
                        checked={form.visibility === "friends"}
                        onChange={(e) => setForm(prev => ({ ...prev, visibility: e.target.value as Visibility }))}
                        className="w-5 h-5 text-purple-600 focus:ring-purple-500"
                      />
                      <div>
                        <p className="font-semibold text-gray-700">Friends</p>
                        <p className="text-sm text-gray-500">Your friends can see this event</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-4 border-2 rounded-lg hover:bg-purple-50 cursor-pointer transition-colors">
                      <input
                        type="radio"
                        name="visibility"
                        value="everyone"
                        checked={form.visibility === "everyone"}
                        onChange={(e) => setForm(prev => ({ ...prev, visibility: e.target.value as Visibility }))}
                        className="w-5 h-5 text-purple-600 focus:ring-purple-500"
                      />
                      <div>
                        <p className="font-semibold text-gray-700">Everyone</p>
                        <p className="text-sm text-gray-500">Anyone on MyZenTribe can see this event</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Friend Selection */}
                {form.visibility === "friends" && friends.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Invite specific friends (optional)
                    </label>
                    <div className="max-h-48 overflow-y-auto border rounded-lg p-3 space-y-2">
                      {friends.map((friend) => (
                        <label
                          key={friend.friend_id}
                          className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={form.selected_friends.includes(friend.friend_id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setForm(prev => ({
                                  ...prev,
                                  selected_friends: [...prev.selected_friends, friend.friend_id]
                                }));
                              } else {
                                setForm(prev => ({
                                  ...prev,
                                  selected_friends: prev.selected_friends.filter(id => id !== friend.friend_id)
                                }));
                              }
                            }}
                            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                          />
                          <div className="flex items-center gap-2">
                            {friend.avatar_url ? (
                              <img
                                src={friend.avatar_url}
                                alt={friend.name}
                                className="w-8 h-8 rounded-full"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white text-sm font-bold">
                                {friend.name[0].toUpperCase()}
                              </div>
                            )}
                            <span className="text-sm font-medium">{friend.name}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                    {form.selected_friends.length > 0 && (
                      <p className="mt-2 text-sm text-gray-600">
                        {form.selected_friends.length} friend{form.selected_friends.length !== 1 ? 's' : ''} selected
                      </p>
                    )}
                  </div>
                )}

                {/* Summary */}
                <div className="bg-purple-50 rounded-lg p-4 space-y-2">
                  <h4 className="font-semibold text-gray-700">Event Summary</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>📌 {form.title || "Untitled Event"}</p>
                    <p>📅 {form.start ? new Date(form.start).toLocaleString() : "No date set"}</p>
                    {form.location && <p>📍 {form.location}</p>}
                    <p>👥 Visibility: {form.visibility}</p>
                    {enableCarpool && <p>🚗 Carpool coordination enabled</p>}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
            <div>
              {currentStep > 1 && (
                <button
                  onClick={prevStep}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                >
                  ← Back
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
              >
                Cancel
              </button>
              
              {currentStep < totalSteps ? (
                <button
                  onClick={nextStep}
                  disabled={currentStep === 1 && (!form.title || !form.start || !form.end)}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-lg transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading || !form.title || !form.start || !form.end}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-lg transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                      Creating...
                    </span>
                  ) : (
                    'Create Event'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
