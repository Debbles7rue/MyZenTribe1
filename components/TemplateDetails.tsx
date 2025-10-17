// components/TemplateDetails.tsx
"use client";

import React, { useState } from "react";
import ReactDOM from "react-dom";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ToastProvider";
import type { DBEvent } from "@/lib/types";

interface TemplateDetailsProps {
  event: DBEvent | null;
  onClose: () => void;
  onDelete?: (id: string) => void;
  currentUserId?: string | null;
}

export default function TemplateDetails({
  event,
  onClose,
  onDelete,
  currentUserId
}: TemplateDetailsProps) {
  const { showToast } = useToast();
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!event) return null;

  const isCreator = currentUserId && event.created_by === currentUserId;

  const formatDuration = (startTime: string, endTime: string): string => {
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return 'Invalid time';
      }
      
      const minutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
      
      if (minutes < 0) return 'Invalid duration';
      if (minutes < 60) return `${minutes} min`;
      
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      
      if (mins === 0) return `${hours} hr${hours !== 1 ? 's' : ''}`;
      return `${hours}h ${mins}m`;
    } catch (error) {
      console.error('Error formatting duration:', error);
      return 'N/A';
    }
  };

  const handleDeleteInstance = async () => {
    if (!isCreator || !event.id) return;

    if (!confirm(`Delete just this instance of "${event.title}"?`)) {
      return;
    }

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", event.id)
        .eq("created_by", currentUserId);

      if (error) throw error;

      showToast({ type: 'success', message: '🗑️ Template instance deleted' });
      if (onDelete) onDelete(event.id);
      onClose();
    } catch (error: any) {
      console.error("Error deleting instance:", error);
      showToast({ type: 'error', message: 'Failed to delete' });
    } finally {
      setDeleting(false);
      setShowDeleteMenu(false);
    }
  };

  const handleDeleteAllInstances = async () => {
    if (!isCreator || !event.title) return;

    if (!confirm(`Delete ALL instances of "${event.title}"? This cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    try {
      // Delete all events with the same title and type='template' created by this user
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("title", event.title)
        .eq("event_type", "template")
        .eq("created_by", currentUserId);

      if (error) throw error;

      showToast({ type: 'success', message: '🗑️ All instances deleted' });
      if (onDelete) onDelete(event.id);
      onClose();
    } catch (error: any) {
      console.error("Error deleting all instances:", error);
      showToast({ type: 'error', message: 'Failed to delete all instances' });
    } finally {
      setDeleting(false);
      setShowDeleteMenu(false);
    }
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-title"
    >
      <div className="flex items-center justify-center min-h-screen p-4">
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fadeIn"
          onClick={onClose}
          aria-hidden="true"
        />

        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-slideUp">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">✨</span>
                  <span className="text-xs bg-white/20 px-2 py-1 rounded-full font-medium">
                    ROUTINE TEMPLATE
                  </span>
                </div>
                <h2 id="template-title" className="text-2xl md:text-3xl font-bold mb-2">
                  {event.title}
                </h2>
                {event.start_time && (
                  <div className="flex flex-wrap items-center gap-3 text-sm opacity-90">
                    <span className="flex items-center gap-1">
                      ⏰ {new Date(event.start_time).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                    {event.end_time && (
                      <span className="flex items-center gap-1">
                        ⏱️ Duration: {formatDuration(event.start_time, event.end_time)}
                      </span>
                    )}
                  </div>
                )}
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
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
            <div className="p-6 space-y-6">
              
              {/* Description */}
              {event.description && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-lg flex items-center gap-2">
                    📝 Routine Details
                  </h3>
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {event.description}
                    </p>
                  </div>
                </div>
              )}

              {/* Schedule Info */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-lg flex items-center gap-2">
                  📅 Schedule
                </h3>
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 rounded-xl p-4 space-y-3 border border-gray-200 dark:border-gray-600">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400 font-medium">Start Time:</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {event.start_time ? new Date(event.start_time).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'Not set'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400 font-medium">End Time:</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {event.end_time ? new Date(event.end_time).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'Not set'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-300 dark:border-gray-600">
                    <span className="text-gray-600 dark:text-gray-400 font-medium">Duration:</span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">
                      {event.start_time && event.end_time ? formatDuration(event.start_time, event.end_time) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Location (if any) */}
              {event.location && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-lg flex items-center gap-2">
                    📍 Location
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <p className="text-gray-700 dark:text-gray-300 font-medium">{event.location}</p>
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💡</span>
                  <div>
                    <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-1">
                      This is a routine template
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Edit this template to change the pattern for future instances, or delete specific occurrences individually.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-t dark:border-gray-700">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                {isCreator && (
                  <>
                    <button
                      onClick={() => showToast({ 
                        type: 'info', 
                        message: '🚧 Template editing coming soon! For now, delete and recreate.' 
                      })}
                      className="px-5 py-2.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 font-semibold transition-all shadow-sm hover:shadow-md"
                    >
                      ✏️ Edit Template
                    </button>
                    
                    <div className="relative">
                      <button
                        onClick={() => setShowDeleteMenu(!showDeleteMenu)}
                        disabled={deleting}
                        className="px-5 py-2.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 font-semibold transition-all shadow-sm hover:shadow-md disabled:opacity-50"
                      >
                        🗑️ Delete {showDeleteMenu ? '▼' : '▶'}
                      </button>
                      
                      {showDeleteMenu && (
                        <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-10 min-w-[220px]">
                          <button
                            onClick={handleDeleteInstance}
                            disabled={deleting}
                            className="w-full px-4 py-3 text-left hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 border-b border-gray-200 dark:border-gray-700"
                          >
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              Delete This Instance
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              Remove only this occurrence
                            </div>
                          </button>
                          <button
                            onClick={handleDeleteAllInstances}
                            disabled={deleting}
                            className="w-full px-4 py-3 text-left hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                          >
                            <div className="font-medium text-red-700 dark:text-red-300">
                              Delete All Instances
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              Remove all occurrences of this routine
                            </div>
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <button 
                onClick={onClose} 
                className="px-5 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-colors shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Click outside delete menu to close */}
      {showDeleteMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowDeleteMenu(false)}
        />
      )}

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
