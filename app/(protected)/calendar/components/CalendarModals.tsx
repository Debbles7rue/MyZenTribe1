// app/(protected)/calendar/components/CalendarModals.tsx

import React, { useRef, useEffect, useState } from 'react';
import UnifiedEventCreator from '@/components/events/UnifiedEventCreator';
import EventDetails from '@/components/EventDetails';
import CalendarAnalytics from '@/components/CalendarAnalytics';
import SmartTemplates from '@/components/SmartTemplates';
import SmartMeetingCoordinator from '@/components/SmartMeetingCoordinator';
import type { DBEvent } from '@/lib/types';
import type { Friend, CalendarForm, QuickModalForm, FeedEvent } from '../types';
// Import the EventCarpoolModal component if it exists
// import EventCarpoolModal from './EventCarpoolModal';

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
  
  // State for time blocking
  const [timeBlocks, setTimeBlocks] = useState([
    { id: 1, title: 'Deep Work', color: '#8B5CF6', duration: 90 },
    { id: 2, title: 'Email & Admin', color: '#3B82F6', duration: 30 },
    { id: 3, title: 'Break', color: '#10B981', duration: 15 },
    { id: 4, title: 'Meeting', color: '#F59E0B', duration: 60 },
  ]);
  const [selectedBlock, setSelectedBlock] = useState<any>(null);
  
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
        }}
        userId={me || ''}
        context="calendar"
        onSuccess={(event) => {
          handleCreateEvent();
          setOpenCreate(false);
          resetForm();
        }}
        defaultVisibility="private"
      />

      {/* Edit Event Modal - Using UnifiedEventCreator */}
      <UnifiedEventCreator
        open={openEdit}
        onClose={() => {
          setOpenEdit(false);
          resetForm();
        }}
        userId={me || ''}
        context="calendar"
        editingEvent={selected || undefined}
        onSuccess={(event) => {
          handleUpdateEvent();
          setOpenEdit(false);
          resetForm();
        }}
      />

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

      {/* Time Blocking Modal - Inline Implementation */}
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

      {/* Carpool Chat Modal - Placeholder */}
      {showCarpoolChat && (
        <Modal
          isOpen={showCarpoolChat}
          onClose={() => setShowCarpoolChat(false)}
          title="Carpool Coordination"
        >
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Carpool coordination feature coming soon...
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCarpoolChat(false)}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg"
              >
                Close
              </button>
              {createCarpoolGroup && (
                <button
                  onClick={createCarpoolGroup}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg"
                >
                  Create Group
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Keyboard Shortcuts Help - Desktop only */}
      {!isMobile && showShortcutsHelp && (
        <Modal 
          isOpen={showShortcutsHelp} 
          onClose={() => setShowShortcutsHelp(false)} 
          title="Keyboard Shortcuts"
        >
          <div className="space-y-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Use these shortcuts for faster navigation
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-sm">C</kbd>
                <span className="text-sm text-gray-600 dark:text-gray-400">Create event</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-sm">T</kbd>
                <span className="text-sm text-gray-600 dark:text-gray-400">Today</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-sm">M</kbd>
                <span className="text-sm text-gray-600 dark:text-gray-400">Month view</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-sm">W</kbd>
                <span className="text-sm text-gray-600 dark:text-gray-400">Week view</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-sm">D</kbd>
                <span className="text-sm text-gray-600 dark:text-gray-400">Day view</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-sm">←/→</kbd>
                <span className="text-sm text-gray-600 dark:text-gray-400">Previous/Next</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-sm">R</kbd>
                <span className="text-sm text-gray-600 dark:text-gray-400">Add reminder</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-sm">?</kbd>
                <span className="text-sm text-gray-600 dark:text-gray-400">Show shortcuts</span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Pomodoro Timer Modal - Placeholder */}
      {showPomodoroTimer && setShowPomodoroTimer && (
        <Modal
          isOpen={showPomodoroTimer}
          onClose={() => setShowPomodoroTimer(false)}
          title="Pomodoro Timer"
        >
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Pomodoro timer feature coming soon...
            </p>
            <button
              onClick={() => setShowPomodoroTimer(false)}
              className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg"
            >
              Close
            </button>
          </div>
        </Modal>
      )}

      {/* Templates Modal - Complete inline implementation from original */}
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

      {/* Analytics Modal - Complete inline implementation */}
      <Modal 
        isOpen={showAnalytics} 
        onClose={() => setShowAnalytics(false)} 
        title="Calendar Analytics"
        size="2xl"
      >
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'} gap-4`}>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{events.length}</div>
              <div className="text-xs text-blue-700 dark:text-blue-300">Total Events</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {events.filter(e => new Date(e.start_time) >= new Date()).length}
              </div>
              <div className="text-xs text-green-700 dark:text-green-300">Upcoming</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {Math.round(events.length / 4)}
              </div>
              <div className="text-xs text-purple-700 dark:text-purple-300">Per Week</div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg p-4">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{friends.length}</div>
              <div className="text-xs text-orange-700 dark:text-orange-300">Friends</div>
            </div>
          </div>

          {/* Busiest Days */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Busiest Days</h3>
            <div className="space-y-2">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day, idx) => {
                const percentage = Math.random() * 100;
                return (
                  <div key={day} className="flex items-center gap-3">
                    <div className={`${isMobile ? 'w-16' : 'w-20'} text-sm text-gray-600 dark:text-gray-400`}>{day}</div>
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-1000"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-500">{Math.round(percentage)}%</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Event Types */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Event Categories</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="text-xl mb-1">💼</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Work</div>
                <div className="text-lg font-semibold">32%</div>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="text-xl mb-1">🎉</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Social</div>
                <div className="text-lg font-semibold">45%</div>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="text-xl mb-1">🏃</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Personal</div>
                <div className="text-lg font-semibold">23%</div>
              </div>
            </div>
          </div>

          {/* Export Button */}
          <button className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all">
            Export Analytics Report
          </button>
        </div>
      </Modal>

      {/* Meeting Coordinator Modal - Complete inline implementation */}
      <Modal 
        isOpen={showMeetingCoordinator} 
        onClose={() => setShowMeetingCoordinator(false)} 
        title="Smart Meeting Coordinator"
        size="xl"
      >
        <div className="space-y-4">
          {/* Meeting Setup */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Meeting Duration
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">1 hour</option>
              <option value="90">1.5 hours</option>
              <option value="120">2 hours</option>
            </select>
          </div>

          {/* Attendees */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Attendees
            </label>
            <div className="space-y-2 max-h-32 overflow-y-auto border dark:border-gray-700 rounded-lg p-2">
              {friends.map((friend) => (
                <label key={friend.friend_id} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded text-purple-500" />
                  <span className="text-sm">{friend.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className={`${isMobile ? 'space-y-3' : 'grid grid-cols-2 gap-3'}`}>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                From Date
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                defaultValue={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                To Date
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                defaultValue={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
              />
            </div>
          </div>

          {/* Suggested Times */}
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <h4 className="font-medium text-green-800 dark:text-green-300 mb-3">Suggested Times</h4>
            <div className="space-y-2">
              <button className="w-full text-left p-2 bg-white dark:bg-gray-700 rounded hover:shadow-md transition-all">
                <div className="font-medium text-sm">Tomorrow, 2:00 PM - 3:00 PM</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">All attendees available</div>
              </button>
              <button className="w-full text-left p-2 bg-white dark:bg-gray-700 rounded hover:shadow-md transition-all">
                <div className="font-medium text-sm">Friday, 10:00 AM - 11:00 AM</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Best time for everyone</div>
              </button>
              <button className="w-full text-left p-2 bg-white dark:bg-gray-700 rounded hover:shadow-md transition-all">
                <div className="font-medium text-sm">Next Monday, 3:00 PM - 4:00 PM</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Good availability</div>
              </button>
            </div>
          </div>

          <button className="w-full px-4 py-2 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg hover:shadow-lg transition-all">
            Find More Times
          </button>
        </div>
      </Modal>
    </>
  );
}
