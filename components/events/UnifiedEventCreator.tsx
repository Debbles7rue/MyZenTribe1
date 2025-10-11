// components/events/UnifiedEventCreator.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { supabase } from '@/lib/supabaseClient';
import { createEvent, updateEvent, EVENT_TEMPLATES, EVENT_TYPE_SUGGESTIONS } from '@/lib/eventManager';
import type { EventForm, DBEvent } from '@/lib/eventManager';
import type { Visibility } from '@/lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string;
  context?: 'calendar' | 'business' | 'community';
  businessId?: string;
  communityId?: string;
  editingEvent?: DBEvent;
  onSuccess?: (event: DBEvent) => void;
  defaultDate?: Date;
  defaultVisibility?: Visibility;
}

interface Community {
  id: string;
  name: string;
  title?: string;
}

// Extended form type to include pre/post events
interface ExtendedEventForm extends EventForm {
  pre_event?: {
    title: string;
    time: string;
    location?: string;
  };
  post_event?: {
    title: string;
    time: string;
    location?: string;
  };
  cover_photo?: string;
  community_ids?: string[]; // Multiple communities
}

export default function UnifiedEventCreator({
  open,
  onClose,
  userId,
  context = 'calendar',
  businessId,
  communityId,
  editingEvent,
  onSuccess,
  defaultDate,
  defaultVisibility = 'public'
}: Props) {
  // Form state - preserves ALL existing functionality plus pre/post events
  const [form, setForm] = useState<ExtendedEventForm>({
    title: '',
    description: '',
    location: '',
    start: '',
    end: '',
    visibility: defaultVisibility,
    event_type: '',
    community_id: communityId || '',
    source: context === 'business' ? 'business' : 'personal',
    image_path: '',
    hide_exact_address: false,
    show_email_only: false,
    hide_attendee_count: false,
    is_virtual: false,
    virtual_link: '',
    capacity: undefined,
    recurring_pattern: '',
    tags: [],
    pre_event: undefined,
    post_event: undefined,
    cover_photo: '',
    community_ids: []
  });

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showPreEvent, setShowPreEvent] = useState(false);
  const [showPostEvent, setShowPostEvent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Community state
  const [availableCommunities, setAvailableCommunities] = useState<Community[]>([]);
  const [loadingCommunities, setLoadingCommunities] = useState(false);
  const [showCommunitySection, setShowCommunitySection] = useState(false);

  // Load communities when component opens
  useEffect(() => {
    if (open && (context === 'business' || context === 'community')) {
      loadAvailableCommunities();
    }
  }, [open, context, businessId, userId]);

  // Load communities the business/user is part of
  const loadAvailableCommunities = async () => {
    setLoadingCommunities(true);
    try {
      if (context === 'business' && businessId) {
        // Load communities this business is part of
        const { data, error } = await supabase
          .from('business_communities')
          .select(`
            community_id,
            communities (
              id,
              name,
              title
            )
          `)
          .eq('business_id', businessId);

        if (!error && data) {
          const communities = data
            .map(bc => bc.communities)
            .filter(Boolean) as Community[];
          setAvailableCommunities(communities);
        }
      } else {
        // Load communities the user is a member of
        const { data, error } = await supabase
          .from('community_members')
          .select(`
            community_id,
            communities (
              id,
              name,
              title
            )
          `)
          .eq('user_id', userId)
          .eq('status', 'active');

        if (!error && data) {
          const communities = data
            .map(cm => cm.communities)
            .filter(Boolean) as Community[];
          setAvailableCommunities(communities);
        }
      }
    } catch (error) {
      console.error('Error loading communities:', error);
    } finally {
      setLoadingCommunities(false);
    }
  };

  // Initialize form when editing
  useEffect(() => {
    if (editingEvent) {
      setForm({
        title: editingEvent.title || '',
        description: editingEvent.description || '',
        location: editingEvent.location || '',
        start: editingEvent.start_time ? new Date(editingEvent.start_time).toISOString().slice(0, 16) : '',
        end: editingEvent.end_time ? new Date(editingEvent.end_time).toISOString().slice(0, 16) : '',
        visibility: editingEvent.visibility || 'public',
        event_type: editingEvent.event_type || '',
        community_id: editingEvent.community_id || '',
        source: editingEvent.source || 'personal',
        image_path: editingEvent.image_path || '',
        hide_exact_address: editingEvent.hide_exact_address || false,
        show_email_only: editingEvent.show_email_only || false,
        hide_attendee_count: editingEvent.hide_attendee_count || false,
        is_virtual: editingEvent.is_virtual || false,
        virtual_link: editingEvent.virtual_link || '',
        capacity: editingEvent.capacity || undefined,
        recurring_pattern: editingEvent.recurring_pattern || '',
        tags: editingEvent.tags || [],
        pre_event: (editingEvent as any).pre_event,
        post_event: (editingEvent as any).post_event,
        cover_photo: (editingEvent as any).cover_photo || editingEvent.image_path || '',
        community_ids: []
      });
      
      if (editingEvent.image_path || (editingEvent as any).cover_photo) {
        setImagePreview(editingEvent.image_path || (editingEvent as any).cover_photo);
      }
      
      // Set pre/post event visibility if they exist
      if ((editingEvent as any).pre_event) setShowPreEvent(true);
      if ((editingEvent as any).post_event) setShowPostEvent(true);

      // Load existing community associations
      loadEventCommunities(editingEvent.id);
    } else if (defaultDate) {
      const startStr = defaultDate.toISOString().slice(0, 16);
      const endDate = new Date(defaultDate.getTime() + 60 * 60 * 1000);
      setForm(prev => ({
        ...prev,
        start: startStr,
        end: endDate.toISOString().slice(0, 16)
      }));
    }
  }, [editingEvent, defaultDate]);

  // Load communities this event is shared with
  const loadEventCommunities = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from('event_communities')
        .select('community_id')
        .eq('event_id', eventId);

      if (!error && data) {
        setForm(prev => ({
          ...prev,
          community_ids: data.map(ec => ec.community_id)
        }));
        if (data.length > 0) {
          setShowCommunitySection(true);
        }
      }
    } catch (error) {
      console.error('Error loading event communities:', error);
    }
  };

  // Set context-specific defaults
  useEffect(() => {
    if (context === 'business' && businessId) {
      setForm(prev => ({
        ...prev,
        source: 'business',
        visibility: 'public'
      }));
    } else if (context === 'community' && communityId) {
      setForm(prev => ({
        ...prev,
        community_id: communityId,
        visibility: 'community' as Visibility
      }));
    }
  }, [context, businessId, communityId]);

  // Handle image upload
  const handleImageUpload = async (file: File) => {
    if (!userId) return;
    
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
      setForm(prev => ({ ...prev, image_path: publicUrl, cover_photo: publicUrl }));
    } catch (error) {
      console.error('Upload failed:', error);
      setError('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  // Apply template
  const applyTemplate = (templateKey: keyof typeof EVENT_TEMPLATES) => {
    const template = EVENT_TEMPLATES[templateKey];
    setForm(prev => ({
      ...prev,
      ...template,
      community_id: communityId || prev.community_id
    }));
    setShowTemplates(false);
  };

  // Toggle community selection
  const toggleCommunity = (communityId: string) => {
    setForm(prev => {
      const currentIds = prev.community_ids || [];
      const isSelected = currentIds.includes(communityId);
      
      return {
        ...prev,
        community_ids: isSelected
          ? currentIds.filter(id => id !== communityId)
          : [...currentIds, communityId]
      };
    });
  };

  // Handle save
  const handleSave = async () => {
    setError('');
    setSaving(true);

    try {
      if (!form.title || !form.start) {
        throw new Error('Title and start time are required');
      }

      // Include pre/post events in the save data
      const eventData = {
        ...form,
        pre_event: showPreEvent && form.pre_event?.title ? form.pre_event : undefined,
        post_event: showPostEvent && form.post_event?.title ? form.post_event : undefined
      };

      let result;
      if (editingEvent) {
        result = await updateEvent(editingEvent.id, eventData, userId);
      } else {
        result = await createEvent(eventData, userId, context);
      }

      if (result.error) {
        throw result.error;
      }

      // Save community associations if any selected
      if (result.data && form.community_ids && form.community_ids.length > 0) {
        // Delete existing associations if editing
        if (editingEvent) {
          await supabase
            .from('event_communities')
            .delete()
            .eq('event_id', result.data.id);
        }

        // Insert new associations
        const communityLinks = form.community_ids.map(communityId => ({
          event_id: result.data!.id,
          community_id: communityId
        }));

        const { error: linkError } = await supabase
          .from('event_communities')
          .insert(communityLinks);

        if (linkError) {
          console.error('Error linking communities:', linkError);
          // Don't fail the whole operation, just log it
        }
      }

      if (result.data && onSuccess) {
        onSuccess(result.data);
      }

      // Reset form
      setForm({
        title: '',
        description: '',
        location: '',
        start: '',
        end: '',
        visibility: defaultVisibility,
        event_type: '',
        community_id: communityId || '',
        source: context === 'business' ? 'business' : 'personal',
        image_path: '',
        hide_exact_address: false,
        show_email_only: false,
        hide_attendee_count: false,
        is_virtual: false,
        virtual_link: '',
        capacity: undefined,
        recurring_pattern: '',
        tags: [],
        pre_event: undefined,
        post_event: undefined,
        cover_photo: '',
        community_ids: []
      });
      setImagePreview(null);
      setShowAdvanced(false);
      setShowPreEvent(false);
      setShowPostEvent(false);
      setShowCommunitySection(false);
      onClose();
    } catch (error: any) {
      setError(error.message || 'Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  // Search suggestions for event type
  const handleEventTypeChange = (value: string) => {
    setForm(prev => ({ ...prev, event_type: value }));
    
    if (value.length > 1) {
      const suggestions = EVENT_TYPE_SUGGESTIONS.filter(s =>
        s.toLowerCase().includes(value.toLowerCase())
      );
      setSearchSuggestions(suggestions.slice(0, 5));
    } else {
      setSearchSuggestions([]);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-[999]">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
      
      {/* MOBILE FIX: Changed container positioning for mobile */}
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
          <Dialog.Panel className="w-full max-w-2xl bg-white dark:bg-gray-900 sm:rounded-2xl shadow-xl max-h-[100dvh] sm:max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header - Mobile Friendly */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 flex-shrink-0">
              <Dialog.Title className="text-xl font-bold text-white">
                {editingEvent ? '✏️ Edit Event' : '✨ Create Event'}
                {context === 'business' && ' (Business)'}
                {context === 'community' && ' (Community)'}
              </Dialog.Title>
            </div>

            {/* MOBILE FIX: Scrollable body with extra padding */}
            <div className="flex-1 p-6 space-y-4 overflow-y-auto pb-40 sm:pb-6">
              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 rounded-lg text-red-800 dark:text-red-200">
                  {error}
                </div>
              )}

              {/* Templates - Mobile Friendly Grid */}
              {!editingEvent && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowTemplates(!showTemplates)}
                    className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                  >
                    🎨 Use Template
                    <span className="text-xs">▼</span>
                  </button>
                  
                  {showTemplates && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                      {Object.keys(EVENT_TEMPLATES).map(key => (
                        <button
                          key={key}
                          onClick={() => applyTemplate(key as keyof typeof EVENT_TEMPLATES)}
                          className="p-2 text-sm bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg text-purple-700 dark:text-purple-300 capitalize"
                        >
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Basic Information */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Event Title *
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
                    placeholder="Enter event title..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
                    placeholder="What's this event about?"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Start Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={form.start}
                      onChange={(e) => setForm(prev => ({ ...prev, start: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      End Time
                    </label>
                    <input
                      type="datetime-local"
                      value={form.end}
                      onChange={(e) => setForm(prev => ({ ...prev, end: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
                    placeholder="Where is this happening?"
                  />
                </div>

                {/* COMMUNITY SELECTION - NEW FEATURE */}
                {availableCommunities.length > 0 && (
                  <div className="space-y-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={showCommunitySection}
                          onChange={(e) => {
                            setShowCommunitySection(e.target.checked);
                            if (!e.target.checked) {
                              setForm(prev => ({ ...prev, community_ids: [] }));
                            }
                          }}
                          className="w-4 h-4 rounded text-blue-500 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          📢 Share with Communities
                        </span>
                      </label>
                    </div>

                    {showCommunitySection && (
                      <div className="ml-6 space-y-2 animate-in slide-in-from-top-1">
                        {loadingCommunities ? (
                          <div className="text-sm text-gray-500 py-2">Loading communities...</div>
                        ) : (
                          <>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                              Select which communities can see this event:
                            </p>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {availableCommunities.map(community => (
                                <label
                                  key={community.id}
                                  className="flex items-center gap-2 p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded cursor-pointer transition-colors"
                                >
                                  <input
                                    type="checkbox"
                                    checked={form.community_ids?.includes(community.id)}
                                    onChange={() => toggleCommunity(community.id)}
                                    className="w-4 h-4 rounded text-blue-500 focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-700 dark:text-gray-300">
                                    {community.title || community.name}
                                  </span>
                                </label>
                              ))}
                            </div>
                            {form.community_ids && form.community_ids.length > 0 && (
                              <div className="mt-2 text-xs text-blue-700 dark:text-blue-300 font-medium">
                                ✓ Sharing with {form.community_ids.length} communit{form.community_ids.length === 1 ? 'y' : 'ies'}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Pre/Post Event Options - Mobile Optimized - ALL ORIGINAL CLASSES PRESERVED */}
                <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={showPreEvent}
                        onChange={(e) => {
                          setShowPreEvent(e.target.checked);
                          if (!e.target.checked) {
                            setForm(prev => ({ ...prev, pre_event: undefined }));
                          }
                        }}
                        className="w-4 h-4 rounded text-purple-500 focus:ring-purple-500"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Add Pre-Event (e.g., dinner before)
                      </span>
                    </label>
                  </div>
                  
                  {showPreEvent && (
                    <div className="ml-6 space-y-2 animate-in slide-in-from-top-1">
                      <input
                        type="text"
                        value={form.pre_event?.title || ''}
                        onChange={(e) => setForm(prev => ({ 
                          ...prev, 
                          pre_event: { 
                            title: e.target.value,
                            time: prev.pre_event?.time || '',
                            location: prev.pre_event?.location || ''
                          }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Pre-event title (e.g., Dinner at Joe's)"
                      />
                      <input
                        type="datetime-local"
                        value={form.pre_event?.time || ''}
                        onChange={(e) => setForm(prev => ({ 
                          ...prev, 
                          pre_event: { 
                            title: prev.pre_event?.title || '',
                            time: e.target.value,
                            location: prev.pre_event?.location || ''
                          }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        value={form.pre_event?.location || ''}
                        onChange={(e) => setForm(prev => ({ 
                          ...prev, 
                          pre_event: { 
                            title: prev.pre_event?.title || '',
                            time: prev.pre_event?.time || '',
                            location: e.target.value
                          }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Pre-event location (optional)"
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={showPostEvent}
                        onChange={(e) => {
                          setShowPostEvent(e.target.checked);
                          if (!e.target.checked) {
                            setForm(prev => ({ ...prev, post_event: undefined }));
                          }
                        }}
                        className="w-4 h-4 rounded text-purple-500 focus:ring-purple-500"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Add Post-Event (e.g., drinks after)
                      </span>
                    </label>
                  </div>
                  
                  {showPostEvent && (
                    <div className="ml-6 space-y-2 animate-in slide-in-from-top-1">
                      <input
                        type="text"
                        value={form.post_event?.title || ''}
                        onChange={(e) => setForm(prev => ({ 
                          ...prev, 
                          post_event: { 
                            title: e.target.value,
                            time: prev.post_event?.time || '',
                            location: prev.post_event?.location || ''
                          }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Post-event title (e.g., Drinks at the bar)"
                      />
                      <input
                        type="datetime-local"
                        value={form.post_event?.time || ''}
                        onChange={(e) => setForm(prev => ({ 
                          ...prev, 
                          post_event: { 
                            title: prev.post_event?.title || '',
                            time: e.target.value,
                            location: prev.post_event?.location || ''
                          }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        value={form.post_event?.location || ''}
                        onChange={(e) => setForm(prev => ({ 
                          ...prev, 
                          post_event: { 
                            title: prev.post_event?.title || '',
                            time: prev.post_event?.time || '',
                            location: e.target.value
                          }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Post-event location (optional)"
                      />
                    </div>
                  )}
                </div>

                {/* Visibility Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Visibility
                  </label>
                  <select
                    value={form.visibility}
                    onChange={(e) => setForm(prev => ({ ...prev, visibility: e.target.value as Visibility }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="private">Private</option>
                    <option value="friends">Friends Only</option>
                    <option value="public">Public</option>
                    {context === 'community' && <option value="community">Community Only</option>}
                  </select>
                </div>

                {/* Event Type with Suggestions */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Event Type
                  </label>
                  <input
                    type="text"
                    value={form.event_type}
                    onChange={(e) => handleEventTypeChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
                    placeholder="Concert, Meeting, Workout..."
                  />
                  
                  {searchSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg">
                      {searchSuggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setForm(prev => ({ ...prev, event_type: suggestion }));
                            setSearchSuggestions([]);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-purple-50 dark:hover:bg-purple-900/20 text-sm"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cover Photo
                  </label>
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Event"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => {
                          setImagePreview(null);
                          setForm(prev => ({ ...prev, image_path: '', cover_photo: '' }));
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
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
                          if (file) handleImageUpload(file);
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

                {/* Advanced Options - Collapsible for Mobile */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                  >
                    ⚙️ Advanced Options
                    <span className="text-xs">{showAdvanced ? '▲' : '▼'}</span>
                  </button>
                  
                  {showAdvanced && (
                    <div className="mt-3 space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      {/* Privacy Options */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={form.hide_exact_address}
                            onChange={(e) => setForm(prev => ({ ...prev, hide_exact_address: e.target.checked }))}
                            className="rounded text-purple-500"
                          />
                          <span className="text-sm">Hide exact address</span>
                        </label>
                        
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={form.show_email_only}
                            onChange={(e) => setForm(prev => ({ ...prev, show_email_only: e.target.checked }))}
                            className="rounded text-purple-500"
                          />
                          <span className="text-sm">Show contact email only</span>
                        </label>
                        
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={form.hide_attendee_count}
                            onChange={(e) => setForm(prev => ({ ...prev, hide_attendee_count: e.target.checked }))}
                            className="rounded text-purple-500"
                          />
                          <span className="text-sm">Hide attendee count</span>
                        </label>
                      </div>

                      {/* Virtual Event Options */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={form.is_virtual}
                            onChange={(e) => setForm(prev => ({ ...prev, is_virtual: e.target.checked }))}
                            className="rounded text-purple-500"
                          />
                          <span className="text-sm">Virtual Event</span>
                        </label>
                        
                        {form.is_virtual && (
                          <input
                            type="text"
                            value={form.virtual_link}
                            onChange={(e) => setForm(prev => ({ ...prev, virtual_link: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                            placeholder="Meeting link (Zoom, Meet, etc.)"
                          />
                        )}
                      </div>

                      {/* Recurring Pattern */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Recurring Pattern
                        </label>
                        <select
                          value={form.recurring_pattern}
                          onChange={(e) => setForm(prev => ({ ...prev, recurring_pattern: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                        >
                          <option value="">Does not repeat</option>
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="biweekly">Bi-weekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      </div>

                      {/* Capacity */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Maximum Capacity
                        </label>
                        <input
                          type="number"
                          value={form.capacity || ''}
                          onChange={(e) => setForm(prev => ({ 
                            ...prev, 
                            capacity: e.target.value ? parseInt(e.target.value) : undefined 
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                          placeholder="Maximum attendees"
                          min="1"
                        />
                      </div>

                      {/* Tags */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Tags (comma-separated)
                        </label>
                        <input
                          type="text"
                          value={form.tags?.join(', ')}
                          onChange={(e) => setForm(prev => ({ 
                            ...prev, 
                            tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                          placeholder="wellness, meditation, community..."
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* MOBILE FIX: Footer Actions - Fixed at bottom, always visible */}
            <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 flex flex-col-reverse sm:flex-row gap-3 justify-end flex-shrink-0 border-t dark:border-gray-700" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.title || !form.start}
                className="w-full sm:w-auto px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {saving ? 'Saving...' : (editingEvent ? 'Update Event' : 'Create Event')}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </div>
    </Dialog>
  );
}
