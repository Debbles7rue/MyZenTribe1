// app/(protected)/calendar/components/CalendarModals.tsx
import React from 'react';
import CreateEventModal from '@/components/CreateEventModal';
import EventDetails from '@/components/EventDetails';
import CalendarAnalytics from '@/components/CalendarAnalytics';
import SmartTemplates from '@/components/SmartTemplates';
import SmartMeetingCoordinator from '@/components/SmartMeetingCoordinator';
import { KeyboardShortcutsHelp } from '@/hooks/useKeyboardShortcuts';
import EventCarpoolModal from './EventCarpoolModal';  // ADD THIS IMPORT
import { useToast } from '@/components/ToastProvider';  // ADD THIS IF NOT ALREADY IMPORTED
import type { DBEvent } from '@/lib/types';
import type { CalendarForm, QuickModalForm, Friend } from '../types';

// Modal component for modals that aren't imported yet
function Modal({ isOpen, onClose, title, children }: any) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}

// Placeholder components for modals not yet implemented
function PomodoroTimer({ open, onClose }: any) {
  return (
    <Modal isOpen={open} onClose={onClose} title="Pomodoro Timer">
      <p>Pomodoro timer component coming soon...</p>
    </Modal>
  );
}

function TimeBlockingModal({ open, onClose, events }: any) {
  return (
    <Modal isOpen={open} onClose={onClose} title="Time Blocking">
      <p>Time blocking component coming soon...</p>
    </Modal>
  );
}

interface CalendarModalsProps {
  // Visibility states
  openCreate: boolean;
  openEdit: boolean;
  detailsOpen: boolean;
  showAnalytics: boolean;
  showTemplates: boolean;
  showMeetingCoordinator: boolean;
  showShortcutsHelp: boolean;
  showCarpoolChat: boolean;
  quickModalOpen: boolean;
  showPomodoroTimer?: boolean;
  showTimeBlocking?: boolean;
  
  // Setters
  setOpenCreate: (open: boolean) => void;
  setOpenEdit: (open: boolean) => void;
  setDetailsOpen: (open: boolean) => void;
  setShowAnalytics: (show: boolean) => void;
  setShowTemplates: (show: boolean) => void;
  setShowMeetingCoordinator: (show: boolean) => void;
  setShowShortcutsHelp: (show: boolean) => void;
  setShowCarpoolChat: (show: boolean) => void;
  setQuickModalOpen: (open: boolean) => void;
  setShowPomodoroTimer?: (show: boolean) => void;
  setShowTimeBlocking?: (show: boolean) => void;
  
  // Data
  me: string | null;
  selected: DBEvent | null;
  selectedFeedEvent: any;
  selectedCarpoolEvent: any;
  selectedCarpoolFriends: Set<string>;
  setSelectedCarpoolFriends: (friends: Set<string>) => void;
  events: any[];
  friends: Friend[];
  form: CalendarForm;
  setForm: (form: CalendarForm | ((prev: CalendarForm) => CalendarForm)) => void;
  quickModalForm: QuickModalForm;
  setQuickModalForm: (form: QuickModalForm | ((prev: QuickModalForm) => QuickModalForm)) => void;
  quickModalType: 'reminder' | 'todo';
  isMobile: boolean;
  gamificationEnabled?: boolean;
  setGamificationEnabled?: (enabled: boolean) => void;
  
  // Actions
  handleCreateEvent: () => void;
  handleUpdateEvent: () => void;
  handleEdit: (event: DBEvent) => void;
  handleApplyTemplate: (events: any[]) => void;
  createQuickItem?: () => void;
  createCarpoolGroup: () => void;
  resetForm: () => void;
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
  showPomodoroTimer,
  showTimeBlocking,
  setOpenCreate,
  setOpenEdit,
  setDetailsOpen,
  setShowAnalytics,
  setShowTemplates,
  setShowMeetingCoordinator,
  setShowShortcutsHelp,
  setShowCarpoolChat,
  setQuickModalOpen,
  setShowPomodoroTimer,
  setShowTimeBlocking,
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
  gamificationEnabled,
  setGamificationEnabled,
  handleCreateEvent,
  handleUpdateEvent,
  handleEdit,
  handleApplyTemplate,
  createQuickItem,
  createCarpoolGroup,
  resetForm
}: CalendarModalsProps) {
  const { showToast } = useToast();

  return (
    <>
      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={openCreate}
        onClose={() => {
          setOpenCreate(false);
          resetForm();
        }}
        event={form}
        setEvent={setForm}
        onSave={handleCreateEvent}
        communities={[]}
      />

      {/* Event Details Modal */}
<EventDetails 
  event={detailsOpen ? {
    ...(selected || selectedFeedEvent || {}),
    media_files: (selected || selectedFeedEvent)?.media_files || []
  } : null}
  onClose={() => setDetailsOpen(false)} 
  me={me || ''}
  onEdit={() => handleEdit(selected!)}

        event={form}
        setEvent={setForm}
        onSave={handleUpdateEvent}
        isEdit={true}
        communities={[]}
      />

      {/* Event Details Modal */}
      <EventDetails 
        event={detailsOpen ? (selected || selectedFeedEvent) : null}
        onClose={() => setDetailsOpen(false)} 
        me={me || ''}
        onEdit={() => handleEdit(selected!)}
      />

      {/* Analytics Modal */}
      {showAnalytics && (
        <CalendarAnalytics
          open={showAnalytics}
          onClose={() => setShowAnalytics(false)}
        />
      )}

      {/* Templates Modal */}
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

      {/* Quick Modal for Reminders/Todos */}
      {quickModalOpen && (
        <Modal 
          isOpen={quickModalOpen} 
          onClose={() => setQuickModalOpen(false)} 
          title={`Quick ${quickModalType === 'reminder' ? 'Reminder' : 'To-do'}`}
        >
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Title"
              value={quickModalForm.title}
              onChange={(e) => setQuickModalForm(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
            />
            <textarea
              placeholder="Description (optional)"
              value={quickModalForm.description}
              onChange={(e) => setQuickModalForm(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
              rows={3}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={quickModalForm.date}
                onChange={(e) => setQuickModalForm(prev => ({ ...prev, date: e.target.value }))}
                className="px-3 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
              />
              <input
                type="time"
                value={quickModalForm.time}
                onChange={(e) => setQuickModalForm(prev => ({ ...prev, time: e.target.value }))}
                className="px-3 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
              />
            </div>
            {quickModalType === 'reminder' && (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={quickModalForm.enableNotification}
                  onChange={(e) => setQuickModalForm(prev => ({ ...prev, enableNotification: e.target.checked }))}
                />
                <span className="text-sm">Enable notification</span>
              </label>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  createQuickItem?.();
                  setQuickModalOpen(false);
                }}
                className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all"
              >
                Create {quickModalType === 'reminder' ? 'Reminder' : 'To-do'}
              </button>
              <button
                onClick={() => setQuickModalOpen(false)}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ENHANCED CARPOOL MODAL - Using your existing EventCarpoolModal */}
      <EventCarpoolModal
        isOpen={showCarpoolChat}
        onClose={() => setShowCarpoolChat(false)}
        event={selectedCarpoolEvent}
        userId={me}
        carpoolData={{
          carpoolMatches: [],  // You can connect your actual carpool matches here
          friends: friends || [],
          sendCarpoolInvite: async (matchId: string, message?: string) => {
            console.log('Sending invite:', matchId, message);
            showToast({ type: 'success', message: 'Carpool invite sent!' });
            return { success: true, message: 'Invite sent!' };
          },
          createCarpoolGroup: async (eventId: string, friendIds: string[], message?: string) => {
            await createCarpoolGroup();
            return { success: true, message: 'Carpool group created!' };
          }
        }}
        showToast={showToast}
        isMobile={isMobile}
      />

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

      {/* Time Blocking Modal */}
      {showTimeBlocking && setShowTimeBlocking && (
        <TimeBlockingModal
          open={showTimeBlocking}
          onClose={() => setShowTimeBlocking(false)}
          events={events}
        />
      )}
    </>
  );
}
