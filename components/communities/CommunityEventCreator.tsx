// FILE NAME: CommunityEventCreator.tsx
// LOCATION: /components/communities/CommunityEventCreator.tsx

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { supabase } from '@/lib/supabaseClient';

interface Community {
  id: string;
  title: string;
  name?: string;
  photo_url?: string;
  cover_url?: string;
  region?: string;
  zip?: string;
  category?: string;
  tags?: string[];
  guidelines?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  community: Community;
  userId: string;
  onSuccess?: (eventId: string) => void;
}

export default function CommunityEventCreator({
  open,
  onClose,
  community,
  userId,
  onSuccess
}: Props) {
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [eventType, setEventType] = useState('');
  const [isVirtual, setIsVirtual] = useState(false);
  const [virtualLink, setVirtualLink] = useState('');
  const [maxCapacity, setMaxCapacity] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Event type suggestions based on community category
  const eventTypeSuggestions = {
    'Wellness': ['Yoga Class', 'Meditation', 'Sound Healing', 'Breathwork', 'Reiki Circle'],
    'Music & Sound': ['Drum Circle', 'Sound Bath', 'Kirtan', 'Music Jam', 'Open Mic'],
    'Spiritual': ['Prayer Circle', 'Sacred Ceremony', 'Group Meditation', 'Study Group'],
    'Support': ['Support Circle', 'Group Meeting', 'Workshop', 'Check-in Circle'],
    'Creative': ['Art Session', 'Writing Circle', 'Craft Workshop', 'Creative Meetup'],
    'Nature': ['Nature Walk', 'Park Cleanup', 'Garden Workday', 'Hiking Trip'],
    'Learning': ['Workshop', 'Study Group', 'Skill Share', 'Book Club']
  };

  const suggestions = community.category 
    ? eventTypeSuggestions[community.category as keyof typeof eventTypeSuggestions] || []
    : [];

  // Set default location from community
  useEffect(() => {
    if (community.region) {
      setLocation(community.region);
    }
  }, [community.region]);

  // Quick create meditation event
  const createMeditationEvent = () => {
    setTitle('Group Meditation');
    setEventType('Meditation');
    setDescription(`Join us for a peaceful group meditation session in the ${community.title}.`);
    setIsVirtual(true);
    setVirtualLink(`/communities/${community.id}/meditation`);
  };

  // Handle image upload
  const handleImageUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `event-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('event-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('event-photos')
        .getPublicUrl(filePath);

      setImagePreview(publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('Upload failed:', error);
      setError('Failed to upload image');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !startDate || !startTime) {
      setError('Please fill in all required fields');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Upload image if present
      let imageUrl = imagePreview;
      if (imageFile && !imagePreview) {
        imageUrl = await handleImageUpload(imageFile);
      }

      // Combine date and time
      const startDateTime = new Date(`${startDate}T${startTime}`);
      const endDateTime = endDate && endTime 
        ? new Date(`${endDate}T${endTime}`)
        : new Date(startDateTime.getTime() + 60 * 60 * 1000); // Default 1 hour later

      // Create event in events table
      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          location: location.trim() || null,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          event_type: eventType || null,
          visibility: 'community',
          created_by: userId,
          source: 'community',
          image_path: imageUrl,
          virtual_link: isVirtual ? virtualLink : null,
          capacity: maxCapacity ? parseInt(maxCapacity) : null
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Link event to community via event_communities table
      const { error: linkError } = await supabase
        .from('event_communities')
        .insert({
          event_id: event.id,
          community_id: community.id
        });

      if (linkError) throw linkError;

      // Success!
      if (onSuccess) {
        onSuccess(event.id);
      }

      // Reset form
      resetForm();
      onClose();
    } catch (err: any) {
      console.error('Error creating event:', err);
      setError(err.message || 'Failed to create event');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setLocation('');
    setStartDate('');
    setStartTime('');
    setEndDate('');
    setEndTime('');
    setEventType('');
    setIsVirtual(false);
    setVirtualLink('');
    setMaxCapacity('');
    setImageFile(null);
    setImagePreview(null);
  };

  const communityPhoto = community.cover_url || community.photo_url;
  const communityName = community.title || community.name || 'Community';

  return (
    <Dialog open={open} onClose={onClose} className="relative z-[999]">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
      
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
          <Dialog.Panel className="w-full max-w-2xl bg-white dark:bg-gray-900 sm:rounded-2xl shadow-xl max-h-[100dvh] sm:max-h-[90vh] flex flex-col overflow-hidden">
            
            {/* Header with Community Branding */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 flex-shrink-0">
              <div className="flex items-center gap-3">
                {communityPhoto && (
                  <img 
                    src={communityPhoto} 
                    alt="" 
                    className="w-12 h-12 rounded-lg object-cover border-2 border-white/30"
                  />
                )}
                <div className="flex-1">
                  <Dialog.Title className="text-xl font-bold text-white">
                    Create Community Event
                  </Dialog.Title>
                  <p className="text-sm text-white/80">
                    For {communityName}
                  </p>
                </div>
              </div>
            </div>

            {/* Body - Scrollable */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-4 pb-40 sm:pb-6">
                
                {/* Error Message */}
                {error && (
                  <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 rounded-lg text-red-800 dark:text-red-200 text-sm">
                    {error}
                  </div>
                )}

                {/* Quick Action: Group Meditation */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                  <button
                    type="button"
                    onClick={createMeditationEvent}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition font-medium"
                  >
                    <span className="text-xl">🧘</span>
                    <span>Quick Create: Group Meditation</span>
                  </button>
                  <p className="text-xs text-gray-600 dark:text-gray-400 text-center mt-2">
                    Automatically sets up a meditation session in your community room
                  </p>
                </div>

                {/* Event Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Event Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
                    placeholder="e.g., Sunday Morning Yoga"
                    required
                  />
                </div>

                {/* Event Type with Suggestions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Event Type
                  </label>
                  <input
                    type="text"
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
                    placeholder="What kind of event?"
                    list="event-type-suggestions"
                  />
                  {suggestions.length > 0 && (
                    <datalist id="event-type-suggestions">
                      {suggestions.map(type => (
                        <option key={type} value={type} />
                      ))}
                    </datalist>
                  )}
                  {suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {suggestions.slice(0, 5).map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setEventType(type)}
                          className="px-3 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full hover:bg-purple-200 dark:hover:bg-purple-900/50 transition"
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white resize-none"
                    placeholder="Tell people what to expect..."
                  />
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Start Time *
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                </div>

                {/* Location / Virtual */}
                <div>
                  <label className="flex items-center gap-2 mb-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isVirtual}
                      onChange={(e) => setIsVirtual(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Virtual Event
                    </span>
                  </label>

                  {isVirtual ? (
                    <input
                      type="text"
                      value={virtualLink}
                      onChange={(e) => setVirtualLink(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
                      placeholder="Meeting link or virtual location"
                    />
                  ) : (
                    <>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Location
                      </label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
                        placeholder={community.region ? `e.g., Local park in ${community.region}` : "Where is this happening?"}
                      />
                    </>
                  )}
                </div>

                {/* Max Capacity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Maximum Capacity (Optional)
                  </label>
                  <input
                    type="number"
                    value={maxCapacity}
                    onChange={(e) => setMaxCapacity(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
                    placeholder="Leave blank for unlimited"
                    min="1"
                  />
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Event Photo
                  </label>
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Event preview"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null);
                          setImageFile(null);
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setImageFile(file);
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setImagePreview(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="w-full py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-purple-500 transition-colors"
                      >
                        {isUploading ? (
                          <span className="text-gray-500">Uploading...</span>
                        ) : (
                          <div className="text-center">
                            <span className="text-3xl">📷</span>
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                              Click to upload image
                            </p>
                          </div>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Community Guidelines Reminder */}
                {community.guidelines && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                      📋 Community Guidelines
                    </h4>
                    <p className="text-xs text-blue-800 dark:text-blue-400 whitespace-pre-wrap">
                      {community.guidelines.substring(0, 200)}
                      {community.guidelines.length > 200 ? '...' : ''}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer Actions - Fixed at bottom */}
              <div 
                className="bg-gray-50 dark:bg-gray-800 px-6 py-4 flex flex-col-reverse sm:flex-row gap-3 justify-end flex-shrink-0 border-t dark:border-gray-700 fixed bottom-0 left-0 right-0 sm:relative"
                style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
              >
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !title.trim() || !startDate || !startTime}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition"
                >
                  {saving ? 'Creating...' : 'Create Event'}
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </div>
    </Dialog>
  );
}
