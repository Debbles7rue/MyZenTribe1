// app/(protected)/calendar/components/CalendarModals.tsx

import React, { useRef, useEffect, useState } from 'react';
import UnifiedEventCreator from '@/components/events/UnifiedEventCreator';
import EventDetails from '@/components/EventDetails';
import CalendarAnalytics from '@/components/CalendarAnalytics';
import SmartTemplates from '@/components/SmartTemplates';
import SmartMeetingCoordinator from '@/components/SmartMeetingCoordinator';
import KeyboardShortcutsHelp from '@/hooks/useKeyboardShortcuts';
import PomodoroTimer from '@/components/PomodoroTimer';
import TimeBlockingModal from '@/components/TimeBlockingModal';
import CarpoolChatModal from '@/components/CarpoolChatModal';
import Modal from '@/components/Modal';
import type { DBEvent } from '@/lib/types';
import type { Friend, CalendarForm, QuickModalForm, FeedEvent } from '../types';
// Import the EventCarpoolModal component
import EventCarpoolModal from './EventCarpoolModal';

interface CalendarModalsProps {
  // Modal visibility states
  openCreate: boolean;
  openEdit: boolean;
  detailsOpen: boolean;
  showAnalytics: boolean;
  showTemplates: boolean;
  showMeetingCoordinator: boolean;
  showShortcutsHelp: boolean;
  showCarpoolChat: boolean;
  quickModalOpen: boolean;
  showTimeBlocking: boolean;
  showPomodoroTimer?: boolean;
  
  // Modal setters
  setOpenCreate: (open: boolean) => void;
  setOpenEdit: (open: boolean) => void;
  setDetailsOpen: (open: boolean) => void;
  setShowAnalytics: (show: boolean) => void;
  setShowTemplates: (show: boolean) => void;
  setShowMeetingCoordinator: (show: boolean) => void;
  setShowShortcutsHelp: (show: boolean) => void;
  setShowCarpoolChat: (show: boolean) => void;
  setQuickModalOpen: (open: boolean) => void;
  setShowTimeBlocking: (show: boolean) => void;
  setShowPomodoroTimer?: (show: boolean) => void;
  
  // Data
  me: string | null;
  selected: DBEvent | null;
  selectedFeedEvent: FeedEvent | null;
  selectedCarpoolEvent: any;
  selectedCarpoolFriends: Set<string>;
  setSelectedCarpoolFriends: (friends: Set<string>) => void;
  events: DBEvent[];
  friends: Friend[];
  form: CalendarForm;
  setForm: (form: CalendarForm | ((prev: CalendarForm) => CalendarForm)) => void;
  quickModalForm: QuickModalForm;
  setQuickModalForm: (form: QuickModalForm | ((prev: QuickModalForm) => QuickModalForm)) => void;
  quickModalType: 'reminder' | 'todo';
  isMobile: boolean;
  
  // Actions
  handleCreateEvent: () => void;
  handleUpdateEvent: () => void;
  handleEdit: (event: DBEvent) => void;
  handleApplyTemplate: (events: any[]) => void;
  createQuickItem: () => void;
  createCarpoolGroup: () => void;
  resetForm: () => void;
  
  // Additional props that may be present
  showToast?: (toast: { type: string; message: string }) => void;
  carpoolMatches?: any[];
  gamificationEnabled?: boolean;
  setGamificationEnabled?: (enabled: boolean) => void;
}

export default function CalendarModals({
  openCreate,
  openEdit,
  detailsOpen,
  showAnalytics,
  showTemplates,
  showMeetingCoordinator,
  showShortcutsHelp,
  showCarpoolChat,
  quickModalOpen,
  showTimeBlocking,
  showPomodoroTimer,
  setOpenCreate,
  setOpenEdit,
  setDetailsOpen,
  setShowAnalytics,
  setShowTemplates,
  setShowMeetingCoordinator,
  setShowShortcutsHelp,
  setShowCarpoolChat,
  setQuickModalOpen,
  setShowTimeBlocking,
  setShowPomodoroTimer,
  me,
  selected,
  selectedFeedEvent,
  selectedCarpoolEvent,
  selectedCarpoolFriends,
  setSelectedCarpoolFriends,
  events,
  friends,
  form,
  setForm,
  quickModalForm,
  setQuickModalForm,
  quickModalType,
  isMobile,
  handleCreateEvent,
  handleUpdateEvent,
  handleEdit,
  handleApplyTemplate,
  createQuickItem,
  createCarpoolGroup,
  resetForm,
  showToast,
  carpoolMatches,
  gamificationEnabled,
  setGamificationEnabled
}: CalendarModalsProps) {
  
  // State for pre/post events
  const [showPreEvent, setShowPreEvent] = useState(false);
  const [showPostEvent, setShowPostEvent] = useState(false);
  
  // State for time blocking
  const [timeBlocks, setTimeBlocks] = useState([
    { id: 1, title: 'Deep Work', color: '#8B5CF6', duration: 90 },
    { id: 2, title: 'Email & Admin', color: '#3B82F6', duration: 30 },
    { id: 3, title: 'Break', color: '#10B981', duration: 15 },
    { id: 4, title: 'Meeting', color: '#F59E0B', duration: 60 },
  ]);
  const [selectedBlock, setSelectedBlock] = useState<any>(null);
  
  // State for cover photo
  const [coverPhotoFile, setCoverPhotoFile] = useState<File | null>(null);
  const [coverPhotoPreview, setCoverPhotoPreview] = useState<string>('');
  
  // Refs to prevent focus loss
  const titleInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Handle file upload for cover photo
  const handleCoverPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type and size
      if (!file.type.startsWith('image/')) {
        showToast?.({ type: 'error', message: 'Please select an image file' });
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showToast?.({ type: 'error', message: 'Image must be less than 5MB' });
        return;
      }
      
      setCoverPhotoFile(file);
      
      // Create preview URL using FileReader for better stability
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setCoverPhotoPreview(result);
        setForm(prev => ({ ...prev, cover_photo: result }));
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Clear cover photo
  const clearCoverPhoto = () => {
    setCoverPhotoFile(null);
    setCoverPhotoPreview('');
    setForm(prev => ({ ...prev, cover_photo: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Modal wrapper component with better focus management and mobile optimization
  const Modal = ({ isOpen, onClose, title, children, size = 'lg' }: { 
    isOpen: boolean; 
    onClose: () => void; 
    title: string; 
    children: React.ReactNode;
    size?: 'lg' | 'xl' | '2xl';
  }) => {
    useEffect(() => {
      if (isOpen) {
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
        return () => {
          document.body.style.overflow = 'unset';
        };
      }
    }, [isOpen]);
    
    if (!isOpen) return null;
    
    const sizeClasses = {
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      '2xl': 'max-w-2xl'
    };
    
    // Mobile-optimized modal
    if (isMobile) {
      return (
        <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col">
          <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-4 py-3 flex items-center justify-between safe-area-top">
            <button
              onClick={onClose}
              className="text-gray-600 dark:text-gray-400 p-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex-1 text-center mr-8">{title}</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 safe-area-bottom">{children}</div>
        </div>
      );
    }
    
    // Desktop modal
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <div className={`relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl ${sizeClasses[size]} w-full max-h-[90vh] overflow-y-auto`}>
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">{children}</div>
          </div>
        </div>
      </div>
    );
  };

  // Input component that prevents focus loss
  const StableInput = ({ value, onChange, ...props }: any) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onChange(newValue);
    };
    
    return (
      <input
        {...props}
        value={value || ''}
        onChange={handleChange}
        className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${isMobile ? 'text-base' : 'text-sm'}`}
      />
    );
  };

  // Textarea component that prevents focus loss
  const StableTextarea = ({ value, onChange, ...props }: any) => {
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      onChange(newValue);
    };
    
    return (
      <textarea
        {...props}
        value={value || ''}
        onChange={handleChange}
        className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${isMobile ? 'text-base' : 'text-sm'}`}
      />
    );
  };

  // Prepare carpool data for EventCarpoolModal
  const carpoolData = {
    carpoolMatches: carpoolMatches || [],
    friends: friends || [],
    sendCarpoolInvite: async (matchId: string, message?: string) => {
      // Implement your carpool invite logic here
      console.log('Sending carpool invite:', matchId, message);
      showToast?.({ type: 'success', message: 'Carpool invite sent!' });
      return { success: true };
    },
    createCarpoolGroup: async (eventId: string, friendIds: string[], message?: string) => {
      // Call your existing createCarpoolGroup function
      createCarpoolGroup();
      return { success: true };
    }
  };

  return (
    <>
      {/* Event Details Modal */}
      <EventDetails 
        event={detailsOpen ? (selectedFeedEvent || selected) : null} 
        onClose={() => {
          setDetailsOpen(false);
        }}
        onEdit={handleEdit}
        isOwner={selected?.created_by === me}
      />

      {/* Create Event Modal - Using UnifiedEventCreator */}
      <UnifiedEventCreator
        open={openCreate}
        onClose={() => {
          setOpenCreate(false);
          resetForm();
          setShowPreEvent(false);
          setShowPostEvent(false);
          clearCoverPhoto();
        }}
        userId={me || ''}
        context="calendar"
        onSuccess={(event) => {
          handleCreateEvent();
          setOpenCreate(false);
          resetForm();
          setShowPreEvent(false);
          setShowPostEvent(false);
          clearCoverPhoto();
        }}
        defaultVisibility="private"
      />

      {/* Edit Event Modal - Using UnifiedEventCreator */}
      <UnifiedEventCreator
        open={openEdit}
        onClose={() => {
          setOpenEdit(false);
          resetForm();
          clearCoverPhoto();
        }}
        userId={me || ''}
        context="calendar"
        editingEvent={selected || undefined}
        onSuccess={(event) => {
          handleUpdateEvent();
          setOpenEdit(false);
          resetForm();
          clearCoverPhoto();
        }}
      />

      {/* Time Blocking Modal */}
      <Modal 
        isOpen={showTimeBlocking} 
        onClose={() => setShowTimeBlocking(false)} 
        title="Time Block Scheduler"
        size="2xl"
      >
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Quick Time Blocks
            </h3>
            <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'} gap-2`}>
              {timeBlocks.map((block) => (
                <button
                  key={block.id}
                  onClick={() => setSelectedBlock(block)}
                  className="p-3 rounded-lg text-white font-medium text-sm hover:scale-105 transition-transform"
                  style={{ backgroundColor: block.color }}
                >
                  <div>{block.title}</div>
                  <div className="text-xs opacity-90">{block.duration} min</div>
                </button>
              ))}
            </div>
          </div>
          
          {selectedBlock && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-gray-800 dark:text-gray-200">
                Schedule: {selectedBlock.title}
              </h4>
              <div className={`${isMobile ? 'space-y-3' : 'grid grid-cols-2 gap-3'}`}>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                    defaultValue={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              <div className={`${isMobile ? 'space-y-2' : 'flex gap-2'}`}>
                <button className={`${isMobile ? 'w-full' : 'flex-1'} px-3 py-2 bg-indigo-500 text-white rounded-lg text-sm hover:bg-indigo-600`}>
                  Add to Calendar
                </button>
                <button 
                  onClick={() => setSelectedBlock(null)}
                  className={`${isMobile ? 'w-full' : ''} px-3 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm`}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          
          <div className="border-t dark:border-gray-700 pt-4">
            <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-3">
              Create Custom Time Block
            </h4>
            <div className="space-y-3">
              <div>
                <input
                  type="text"
                  placeholder="Block name (e.g., Deep Focus)"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className={`${isMobile ? 'space-y-3' : 'grid grid-cols-3 gap-3'}`}>
                <input
                  type="number"
                  placeholder="Duration (min)"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
                <input
                  type="color"
                  className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer"
                  defaultValue="#8B5CF6"
                />
                <button className={`${isMobile ? 'w-full' : ''} px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600`}>
                  Add Block
                </button>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Pro tip:</strong> Time blocking helps you protect your most important work. Block out focus time before meetings fill up your calendar!
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Quick Add Modal (Reminder/Todo) */}
      <Modal 
        isOpen={quickModalOpen} 
        onClose={() => setQuickModalOpen(false)} 
        title={`Add ${quickModalType === 'reminder' ? 'Reminder' : 'To-do'}`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title *
            </label>
            <StableInput
              type="text"
              value={quickModalForm.title}
              onChange={(value: string) => setQuickModalForm(prev => ({ ...prev, title: value }))}
              placeholder={`${quickModalType === 'reminder' ? 'Reminder' : 'To-do'} title`}
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <StableTextarea
              value={quickModalForm.description}
              onChange={(value: string) => setQuickModalForm(prev => ({ ...prev, description: value }))}
              rows={2}
              placeholder="Optional description"
            />
          </div>
          
          <div className={`${isMobile ? 'space-y-4' : 'grid grid-cols-2 gap-4'}`}>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date
              </label>
              <StableInput
                type="date"
                value={quickModalForm.date}
                onChange={(value: string) => setQuickModalForm(prev => ({ ...prev, date: value }))}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Time
              </label>
              <StableInput
                type="time"
                value={quickModalForm.time}
                onChange={(value: string) => setQuickModalForm(prev => ({ ...prev, time: value }))}
              />
            </div>
          </div>
          
          {quickModalType === 'reminder' && (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="enable-notification"
                checked={quickModalForm.enableNotification}
                onChange={(e) => setQuickModalForm(prev => ({ ...prev, enableNotification: e.target.checked }))}
                className="cursor-pointer"
              />
              <label htmlFor="enable-notification" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                Send notification {quickModalForm.notificationMinutes} minutes before
              </label>
            </div>
          )}
          
          <div className={`${isMobile ? 'space-y-3' : 'flex gap-3'} pt-4`}>
            <button
              onClick={createQuickItem}
              className={`${isMobile ? 'w-full' : 'flex-1'} px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all`}
            >
              Create {quickModalType === 'reminder' ? 'Reminder' : 'To-do'}
            </button>
            <button
              onClick={() => setQuickModalOpen(false)}
              className={`${isMobile ? 'w-full' : 'flex-1'} px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all`}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Use the EventCarpoolModal component */}
      <EventCarpoolModal
        isOpen={showCarpoolChat}
        onClose={() => setShowCarpoolChat(false)}
        event={selectedCarpoolEvent || selected}
        userId={me}
        carpoolData={carpoolData}
        showToast={showToast}
        isMobile={isMobile}
      />

      {/* Templates Modal - COMPLETE WITH ALL TEMPLATES */}
      <Modal 
        isOpen={showTemplates} 
        onClose={() => setShowTemplates(false)} 
        title="Event Templates"
        size="2xl"
      >
        <div className="space-y-4">
          <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'} gap-4`}>
            {/* Wellness Templates */}
            <div className="border dark:border-gray-700 rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">Meditation Session</h3>
                <span className="text-xs bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300 px-2 py-1 rounded">Wellness</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Mindfulness and relaxation practice</p>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                <span>🧘 Mindful</span>
                <span>⏰ 20 min</span>
                <span>🎯 Focus</span>
              </div>
              <button 
                onClick={() => {
                  setForm(prev => ({
                    ...prev,
                    title: 'Meditation Session',
                    description: 'Mindfulness practice - breathing exercises, body scan, and relaxation',
                    duration: 20
                  }));
                  setShowTemplates(false);
                  setOpenCreate(true);
                }}
                className="mt-3 w-full px-3 py-1 bg-cyan-500 text-white rounded text-sm hover:bg-cyan-600"
              >
                Use Template
              </button>
            </div>

            {/* Gratitude Journal */}
            <div className="border dark:border-gray-700 rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">Gratitude Journal</h3>
                <span className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 px-2 py-1 rounded">Reflection</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Daily gratitude practice & reflection</p>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                <span>📝 Journal</span>
                <span>⏰ 15 min</span>
                <span>🌟 Daily</span>
              </div>
              <button 
                onClick={() => {
                  setForm(prev => ({
                    ...prev,
                    title: 'Gratitude Journal',
                    description: 'Write 3 things I\'m grateful for today + reflection',
                    duration: 15
                  }));
                  setShowTemplates(false);
                  setOpenCreate(true);
                }}
                className="mt-3 w-full px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
              >
                Use Template
              </button>
            </div>

            {/* Work Templates */}
            <div className="border dark:border-gray-700 rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">Daily Standup</h3>
                <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">Work</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">15-minute team sync meeting</p>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                <span>📅 Daily</span>
                <span>⏰ 15 min</span>
                <span>👥 Team</span>
              </div>
              <button 
                onClick={() => {
                  setForm(prev => ({
                    ...prev,
                    title: 'Daily Standup',
                    description: 'Team sync to discuss progress and blockers',
                    duration: 15
                  }));
                  setShowTemplates(false);
                  setOpenCreate(true);
                }}
                className="mt-3 w-full px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
              >
                Use Template
              </button>
            </div>

            {/* Personal Templates */}
            <div className="border dark:border-gray-700 rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">Workout Session</h3>
                <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded">Personal</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Gym or home workout routine</p>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                <span>💪 Fitness</span>
                <span>⏰ 60 min</span>
                <span>📍 Gym</span>
              </div>
              <button 
                onClick={() => {
                  setForm(prev => ({
                    ...prev,
                    title: 'Workout Session',
                    description: 'Cardio + Strength training',
                    location: 'Local Gym',
                    duration: 60
                  }));
                  setShowTemplates(false);
                  setOpenCreate(true);
                }}
                className="mt-3 w-full px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
              >
                Use Template
              </button>
            </div>

            {/* Social Templates */}
            <div className="border dark:border-gray-700 rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">Coffee Chat</h3>
                <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">Social</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Casual meet-up with friends</p>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                <span>☕ Casual</span>
                <span>⏰ 45 min</span>
                <span>📍 Cafe</span>
              </div>
              <button 
                onClick={() => {
                  setForm(prev => ({
                    ...prev,
                    title: 'Coffee Chat',
                    description: 'Catch up over coffee',
                    location: 'Local Coffee Shop',
                    duration: 45
                  }));
                  setShowTemplates(false);
                  setOpenCreate(true);
                }}
                className="mt-3 w-full px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
              >
                Use Template
              </button>
            </div>

            {/* Learning Templates */}
            <div className="border dark:border-gray-700 rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">Study Block</h3>
                <span className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 px-2 py-1 rounded">Learning</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Focused learning session</p>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                <span>📚 Study</span>
                <span>⏰ 90 min</span>
                <span>🎯 Focus</span>
              </div>
              <button 
                onClick={() => {
                  setForm(prev => ({
                    ...prev,
                    title: 'Study Session',
                    description: 'Deep focus learning time',
                    duration: 90
                  }));
                  setShowTemplates(false);
                  setOpenCreate(true);
                }}
                className="mt-3 w-full px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
              >
                Use Template
              </button>
            </div>
          </div>

          {/* Create Custom Template */}
          <div className="border-t dark:border-gray-700 pt-4">
            <button className="w-full px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-purple-500 hover:text-purple-500 transition-all">
              + Create Custom Template
            </button>
          </div>
        </div>
      </Modal>

      {/* Analytics Modal */}
      {showAnalytics && (
        <CalendarAnalytics
          events={events}
          userId={me!}
          onClose={() => setShowAnalytics(false)}
        />
      )}

      {/* Templates Modal using SmartTemplates component */}
      {showTemplates && (
        <SmartTemplates
          open={showTemplates}
          onClose={() => setShowTemplates(false)}
          onApply={handleApplyTemplate}
          userId={me!}
        />
      )}

      {/* Meeting Coordinator Modal */}
      {showMeetingCoordinator && (
        <SmartMeetingCoordinator
          open={showMeetingCoordinator}
          onClose={() => setShowMeetingCoordinator(false)}
          userId={me!}
          friends={friends}
          userEvents={events}
          onSchedule={async (event) => {
            handleCreateEvent();
            setShowMeetingCoordinator(false);
          }}
        />
      )}

      {/* Keyboard Shortcuts Help - Desktop only */}
      {!isMobile && (
        <KeyboardShortcutsHelp 
          open={showShortcutsHelp} 
          onClose={() => setShowShortcutsHelp(false)} 
        />
      )}

      {/* Pomodoro Timer Modal */}
      {showPomodoroTimer && setShowPomodoroTimer && (
        <PomodoroTimer
          open={showPomodoroTimer}
          onClose={() => setShowPomodoroTimer(false)}
        />
      )}

      {/* Time Blocking Modal using TimeBlockingModal component */}
      {showTimeBlocking && (
        <TimeBlockingModal
          open={showTimeBlocking}
          onClose={() => setShowTimeBlocking(false)}
          events={events}
        />
      )}

      {/* Carpool Chat Modal using CarpoolChatModal component */}
      {showCarpoolChat && (
        <CarpoolChatModal
          open={showCarpoolChat}
          event={selectedCarpoolEvent}
          friends={friends}
          selectedFriends={selectedCarpoolFriends}
          setSelectedFriends={setSelectedCarpoolFriends}
          onClose={() => setShowCarpoolChat(false)}
          onCreate={createCarpoolGroup}
        />
      )}
    </>
  );
}
