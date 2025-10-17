// components/TemplateEditor.tsx
"use client";

import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ToastProvider";
import FriendSelector from "@/components/FriendSelector";
import type { DBEvent } from "@/lib/types";

interface TemplateEditorProps {
  event: DBEvent | null;
  onClose: () => void;
  onSave?: () => void;
  currentUserId?: string | null;
}

export default function TemplateEditor({
  event,
  onClose,
  onSave,
  currentUserId
}: TemplateEditorProps) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    location: ''
  });

  // Initialize form with event data
  useEffect(() => {
    if (event) {
      const startDate = new Date(event.start_time);
      const endDate = new Date(event.end_time);
      
      setFormData({
        title: event.title || '',
        description: event.description || '',
        startTime: startDate.toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        endTime: endDate.toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        location: event.location || ''
      });

      // Load existing friends if any
      loadEventFriends();
    }
  }, [event]);

  const loadEventFriends = async () => {
    if (!event?.id) return;

    try {
      // Check if this template has invited friends
      const { data, error } = await supabase
        .from('event_rsvps')
        .select('user_id')
        .eq('event_id', event.id);

      if (!error && data) {
        setSelectedFriends(data.map(r => r.user_id));
      }
    } catch (err) {
      console.error('Error loading event friends:', err);
    }
  };

  const calculateDuration = () => {
    try {
      const [startHour, startMin] = formData.startTime.split(':').map(Number);
      const [endHour, endMin] = formData.endTime.split(':').map(Number);
      
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      const diff = endMinutes - startMinutes;
      
      if (diff < 0) return 'Invalid time range';
      if (diff < 60) return `${diff} min`;
      
      const hours = Math.floor(diff / 60);
      const mins = diff % 60;
      
      if (mins === 0) return `${hours} hr${hours !== 1 ? 's' : ''}`;
      return `${hours}h ${mins}m`;
    } catch {
      return 'N/A';
    }
  };

  const handleSave = async () => {
    if (!event || !currentUserId) {
      showToast({ type: 'error', message: 'Cannot save template' });
      return;
    }

    if (!formData.title.trim() || !formData.startTime || !formData.endTime) {
      showToast({ type: 'warning', message: 'Please fill in all required fields' });
      return;
    }

    setSaving(true);
    try {
      // Get all future instances of this template
      const now = new Date();
      const { data: futureInstances, error: fetchError } = await supabase
        .from('events')
        .select('id, start_time')
        .eq('title', event.title)
        .eq('event_type', 'template')
        .eq('created_by', currentUserId)
        .gte('start_time', now.toISOString());

      if (fetchError) throw fetchError;

      if (!futureInstances || futureInstances.length === 0) {
        showToast({ type: 'info', message: 'No future instances to update' });
        setSaving(false);
        return;
      }

      // Update each future instance
      const updatePromises = futureInstances.map(async (instance) => {
        const instanceDate = new Date(instance.start_time);
        
        // Parse new times
        const [startHour, startMin] = formData.startTime.split(':').map(Number);
        const [endHour, endMin] = formData.endTime.split(':').map(Number);
        
        // Create new datetime by combining instance date with new times
        const newStart = new Date(instanceDate);
        newStart.setHours(startHour, startMin, 0, 0);
        
        const newEnd = new Date(instanceDate);
        newEnd.setHours(endHour, endMin, 0, 0);

        // Update the event
        const { error: updateError } = await supabase
          .from('events')
          .update({
            title: formData.title.trim(),
            description: formData.description.trim() || null,
            location: formData.location.trim() || null,
            start_time: newStart.toISOString(),
            end_time: newEnd.toISOString()
          })
          .eq('id', instance.id);

        if (updateError) throw updateError;

        // Handle friend invites for this instance
        if (selectedFriends.length > 0) {
          // Get existing RSVPs
          const { data: existingRsvps } = await supabase
            .from('event_rsvps')
            .select('user_id')
            .eq('event_id', instance.id);

          const existingUserIds = existingRsvps?.map(r => r.user_id) || [];
          
          // Add new friends
          const newFriends = selectedFriends.filter(id => !existingUserIds.includes(id));
          if (newFriends.length > 0) {
            const rsvpsToAdd = newFriends.map(friendId => ({
              event_id: instance.id,
              user_id: friendId,
              status: 'invited'
            }));
            
            await supabase.from('event_rsvps').insert(rsvpsToAdd);
          }

          // Remove unselected friends
          const friendsToRemove = existingUserIds.filter(id => !selectedFriends.includes(id));
          if (friendsToRemove.length > 0) {
            await supabase
              .from('event_rsvps')
              .delete()
              .eq('event_id', instance.id)
              .in('user_id', friendsToRemove);
          }
        } else {
          // No friends selected - remove all RSVPs
          await supabase
            .from('event_rsvps')
            .delete()
            .eq('event_id', instance.id);
        }
      });

      await Promise.all(updatePromises);

      showToast({ 
        type: 'success', 
        message: `✨ Updated ${futureInstances.length} future instance${futureInstances.length !== 1 ? 's' : ''}!` 
      });

      if (onSave) onSave();
      onClose();

    } catch (error: any) {
      console.error('Error updating template:', error);
      showToast({ 
        type: 'error', 
        message: `Failed to update: ${error.message}` 
      });
    } finally {
      setSaving(false);
    }
  };

  if (!event) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="editor-title"
    >
      <div className="flex items-center justify-center min-h-screen p-4">
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fadeIn"
          onClick={onClose}
          aria-hidden="true"
        />

        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-slideUp">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">✏️</span>
                  <span className="text-xs bg-white/20 px-2 py-1 rounded-full font-medium">
                    EDIT TEMPLATE
                  </span>
                </div>
                <h2 id="editor-title" className="text-2xl md:text-3xl font-bold">
                  Edit Routine Template
                </h2>
                <p className="text-sm opacity-90 mt-1">
                  Changes will apply to all future instances
                </p>
              </div>
              <button 
                onClick={onClose} 
                className="p-2 hover:bg-white/20 rounded-full transition-colors ml-4" 
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto p-6 space-y-6" style={{ maxHeight: 'calc(90vh - 200px)' }}>
            
            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Template Name *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Morning Routine"
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
                maxLength={100}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What does this routine involve?"
                rows={4}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all resize-none"
                maxLength={500}
              />
            </div>

            {/* Time Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Start Time *
                </label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  End Time *
                </label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
                />
              </div>
            </div>

            {/* Duration Display */}
            {formData.startTime && formData.endTime && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Duration:
                  </span>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {calculateDuration()}
                  </span>
                </div>
              </div>
            )}

            {/* Location */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Location (Optional)
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Where does this routine happen?"
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
                maxLength={200}
              />
            </div>

            {/* Friend Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                👥 Accountability Buddies (Optional)
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Invite friends to join you in this routine. They'll receive invites for all future instances.
              </p>
              <FriendSelector
                value={selectedFriends}
                onChange={setSelectedFriends}
                multiple={true}
                placeholder="Select friends to invite..."
              />
              {selectedFriends.length > 0 && (
                <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                  ✓ {selectedFriends.length} friend{selectedFriends.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            {/* Info Box */}
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="text-sm text-amber-800 dark:text-amber-200 font-medium mb-1">
                    This will update all future instances
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Past instances won't be changed. The new time, duration, and friends will apply to all upcoming occurrences of this routine.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-t dark:border-gray-700">
            <div className="flex items-center justify-end gap-3">
              <button 
                onClick={onClose}
                disabled={saving}
                className="px-5 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={saving || !formData.title.trim() || !formData.startTime || !formData.endTime}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .animate-slideUp { animation: slideUp 0.3s ease-out; }
      `}</style>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}
