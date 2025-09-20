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
  // Form state - preserves ALL existing functionality
  const [form, setForm] = useState<EventForm>({
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
    tags: []
  });

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        tags: editingEvent.tags || []
      });
      if (editingEvent.image_path) {
        setImagePreview(editingEvent.image_path);
      }
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
      setForm(prev => ({ ...prev, image_path: publicUrl }));
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

  // Handle save
  const handleSave = async () => {
    setError('');
    setSaving(true);

    try {
      if (!form.title || !form.start) {
        throw new Error('Title and start time are required');
      }

      let result;
      if (editingEvent) {
        result = await updateEvent(editingEvent.id, form, userId);
      } else {
        result = await createEvent(form, userId, context);
      }

      if (result.error) {
        throw result.error;
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
        tags: []
      });
      setImagePreview(null);
      setShowAdvanced(false);
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
      
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-900 shadow-xl transition-all">
            {/* Header - Mobile Friendly */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4">
              <Dialog.Title className="text-xl font-bold text-white">
                {editingEvent ? '✏️ Edit Event' : '✨ Create Event'}
                {context === 'business' && ' (Business)'}
                {context === 'community' && ' (Community)'}
              </Dialog.Title>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
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
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
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
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
                    rows={3}
                    placeholder="Describe your event..."
                  />
                </div>

                {/* Date/Time - Mobile Responsive Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Start Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={form.start}
                      onChange={(e) => setForm(prev => ({ ...prev, start: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
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
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
                    placeholder="Event location or 'Virtual'"
                  />
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
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
                    placeholder="e.g., Workshop, Meditation, Social..."
                  />
                  
                  {/* Suggestions Dropdown */}
                  {searchSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg">
                      {searchSuggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setForm(prev => ({ ...prev, event_type: suggestion }));
                            setSearchSuggestions([]);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-purple-50 dark:hover:bg-purple-900/20 text-sm"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Visibility - Mobile Friendly */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Visibility
                  </label>
                  <select
                    value={form.visibility}
                    onChange={(e) => setForm(prev => ({ ...prev, visibility: e.target.value as Visibility }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="private">Private (Only Me)</option>
                    <option value="friends">Friends Only</option>
                    {context === 'community' && (
                      <option value="community">Community Members</option>
                    )}
                    <option value="public">Public (Everyone)</option>
                  </select>
                </div>

                {/* Image Upload - Mobile Friendly */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Event Image
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
                          setForm(prev => ({ ...prev, image_path: '' }));
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
                    <div className="mt-3 space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      {/* Privacy Options */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.hide_exact_address}
                            onChange={(e) => setForm(prev => ({ ...prev, hide_exact_address: e.target.checked }))}
                            className="w-4 h-4 text-purple-600 rounded"
                          />
                          <span className="text-sm">Hide exact address until RSVP confirmed</span>
                        </label>
                        
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.show_email_only}
                            onChange={(e) => setForm(prev => ({ ...prev, show_email_only: e.target.checked }))}
                            className="w-4 h-4 text-purple-600 rounded"
                          />
                          <span className="text-sm">Show email only (hide phone)</span>
                        </label>
                        
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.hide_attendee_count}
                            onChange={(e) => setForm(prev => ({ ...prev, hide_attendee_count: e.target.checked }))}
                            className="w-4 h-4 text-purple-600 rounded"
                          />
                          <span className="text-sm">Hide attendee count</span>
                        </label>
                      </div>

                      {/* Virtual Event */}
                      <div>
                        <label className="flex items-center gap-2 cursor-pointer mb-2">
                          <input
                            type="checkbox"
                            checked={form.is_virtual}
                            onChange={(e) => setForm(prev => ({ ...prev, is_virtual: e.target.checked }))}
                            className="w-4 h-4 text-purple-600 rounded"
                          />
                          <span className="text-sm font-medium">Virtual Event</span>
                        </label>
                        
                        {form.is_virtual && (
                          <input
                            type="url"
                            value={form.virtual_link}
                            onChange={(e) => setForm(prev => ({ ...prev, virtual_link: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                            placeholder="Meeting link (Zoom, Google Meet, etc.)"
                          />
                        )}
                      </div>

                      {/* Capacity */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Event Capacity (optional)
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

            {/* Footer Actions - Mobile Friendly */}
            <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 flex flex-col sm:flex-row gap-3 justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.title || !form.start}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
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
