// app/(protected)/calendar/components/CalendarModals.tsx
import React from 'react';
import CreateEventModal from '@/components/CreateEventModal';
import EventDetails from '@/components/EventDetails';
import CalendarAnalytics from '@/components/CalendarAnalytics';
import SmartTemplates from '@/components/SmartTemplates';
import SmartMeetingCoordinator from '@/components/SmartMeetingCoordinator';
import { KeyboardShortcutsHelp } from '@/hooks/useKeyboardShortcuts';
import type { DBEvent } from '@/lib/types';
import type { CalendarForm, QuickModalForm, Friend } from '../types';

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
  
  // Actions
  handleCreateEvent: () => void;
  handleUpdateEvent: () => void;
  handleEdit: (event: DBEvent) => void;
  handleApplyTemplate: (events: any[]) => void;
  createQuickItem: () => void;
  createCarpoolGroup: () => void;
  resetForm: () => void;
}

export default function CalendarModals(props: CalendarModalsProps) {
  const {
    openCreate, openEdit, detailsOpen, showAnalytics, showTemplates,
    showMeetingCoordinator, showShortcutsHelp, showCarpoolChat, quickModalOpen,
    showPomodoroTimer, showTimeBlocking,
    setOpenCreate, setOpenEdit, setDetailsOpen, setShowAnalytics, setShowTemplates,
    setShowMeetingCoordinator, setShowShortcutsHelp, setShowCarpoolChat, setQuickModalOpen,
    setShowPomodoroTimer, setShowTimeBlocking,
    me, selected, selectedFeedEvent, selectedCarpoolEvent, selectedCarpoolFriends,
    setSelectedCarpoolFriends, events, friends, form, setForm, quickModalForm,
    setQuickModalForm, quickModalType, isMobile,
    handleCreateEvent, handleUpdateEvent, handleEdit, handleApplyTemplate,
    createQuickItem, createCarpoolGroup, resetForm
  } = props;

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

      {/* Create Event Modal */}
      <CreateEventModal
        open={openCreate}
        onClose={() => {
          setOpenCreate(false);
          resetForm();
        }}
        sessionUser={me}
        value={form}
        onChange={(updates) => setForm(prev => ({ ...prev, ...updates }))}
        onSave={handleCreateEvent}
      />

      {/* Edit Event Modal */}
      <CreateEventModal
        open={openEdit}
        onClose={() => {
          setOpenEdit(false);
          resetForm();
        }}
        sessionUser={me}
        value={form}
        onChange={(updates) => setForm(prev => ({ ...prev, ...updates }))}
        onSave={handleUpdateEvent}
        isEdit={true}
      />

      {/* Analytics Modal */}
      {showAnalytics && (
        <CalendarAnalytics
          events={events}
          userId={me!}
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
        <QuickCreateModal
          open={quickModalOpen}
          type={quickModalType}
          form={quickModalForm}
          setForm={setQuickModalForm}
          onClose={() => {
            setQuickModalOpen(false);
            setQuickModalForm({
              title: '',
              description: '',
              date: '',
              time: '',
              enableNotification: true,
              notificationMinutes: 10
            });
          }}
          onSave={createQuickItem}
        />
      )}

      {/* Carpool Chat Modal */}
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

// Quick Create Modal Component
function QuickCreateModal({ open, type, form, setForm, onClose, onSave }: any) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
          Create {type === 'reminder' ? 'Reminder' : 'To-do'}
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((prev: any) => ({ ...prev, title: e.target.value }))}
              placeholder={`Enter ${type} title...`}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-800 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-purple-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev: any) => ({ ...prev, description: e.target.value }))}
              placeholder="Optional notes..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-800 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((prev: any) => ({ ...prev, date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-800 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time</label>
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm((prev: any) => ({ ...prev, time: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-800 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {type === 'reminder' && (
            <div className="border-t pt-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.enableNotification}
                  onChange={(e) => setForm((prev: any) => ({ 
                    ...prev, 
                    enableNotification: e.target.checked 
                  }))}
                  className="rounded accent-purple-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable notification</span>
              </label>
              
              {form.enableNotification && (
                <div className="mt-2 ml-6">
                  <label className="text-xs text-gray-600 dark:text-gray-400">Notify me</label>
                  <select
                    value={form.notificationMinutes}
                    onChange={(e) => setForm((prev: any) => ({ 
                      ...prev, 
                      notificationMinutes: parseInt(e.target.value) 
                    }))}
                    className="ml-2 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm
                             bg-white dark:bg-gray-700 text-gray-800 dark:text-white
                             focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="5">5 minutes before</option>
                    <option value="10">10 minutes before</option>
                    <option value="15">15 minutes before</option>
                    <option value="30">30 minutes before</option>
                    <option value="60">1 hour before</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onSave}
            disabled={!form.title?.trim()}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg
                     hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed
                     transform hover:scale-105 active:scale-95 transition-all"
          >
            Create
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg
                     hover:bg-gray-300 dark:hover:bg-gray-600 transform hover:scale-105 active:scale-95 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Carpool Chat Modal Component
function CarpoolChatModal({ open, event, friends, selectedFriends, setSelectedFriends, onClose, onCreate }: any) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
          🚗 Carpool Chat
        </h3>
        
        {event && (
          <div className="mb-4 p-3 border border-blue-300 dark:border-blue-600 bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-blue-900/20 rounded-lg">
            <div className="text-sm font-medium text-blue-900 dark:text-blue-300">{event.title}</div>
            <div className="text-xs text-blue-700 dark:text-blue-400">
              {new Date(event.start_time).toLocaleString()}
            </div>
          </div>
        )}
        
        <div className="space-y-3">
          {friends.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-600 dark:text-gray-400 mb-4">No friends added yet</p>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                               transform hover:scale-105 active:scale-95 transition-all">
                Invite Friends to MyZenTribe
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Select friends to add to this carpool group:
              </p>
              
              <div className="max-h-64 overflow-y-auto space-y-2">
                {friends.map((friend: any) => (
                  <label key={friend.friend_id} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded
                                                          transition-colors cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={selectedFriends.has(friend.friend_id)}
                      onChange={(e) => {
                        const newSet = new Set(selectedFriends);
                        if (e.target.checked) {
                          newSet.add(friend.friend_id);
                        } else {
                          newSet.delete(friend.friend_id);
                        }
                        setSelectedFriends(newSet);
                      }}
                      className="rounded accent-green-500" 
                    />
                    <span className="text-sm text-gray-800 dark:text-gray-200">{friend.name}</span>
                    {friend.safe_to_carpool && (
                      <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                        Carpool safe
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
        
        <div className="flex gap-3 mt-6">
          {friends.length > 0 && (
            <button
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg
                       hover:bg-green-700 transform hover:scale-105 active:scale-95 transition-all"
              onClick={onCreate}
              disabled={selectedFriends.size === 0}
            >
              Start Chat
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg
                     hover:bg-gray-300 dark:hover:bg-gray-600 transform hover:scale-105 active:scale-95 transition-all"
          >
            {friends.length === 0 ? 'Close' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Pomodoro Timer Component (placeholder)
function PomodoroTimer({ open, onClose }: any) {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
          🍅 Pomodoro Timer
        </h3>
        <p className="text-gray-600 dark:text-gray-400">Coming soon...</p>
        <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg">
          Close
        </button>
      </div>
    </div>
  );
}

// Time Blocking Modal (placeholder)
function TimeBlockingModal({ open, onClose, events }: any) {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
          ⏰ Time Blocking
        </h3>
        <p className="text-gray-600 dark:text-gray-400">Visual time budget coming soon...</p>
        <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg">
          Close
        </button>
      </div>
    </div>
  );
}

// ===== useCalendarData.ts Hook =====
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { DBEvent, Visibility } from '@/lib/types';
// import type { CalendarForm, QuickModalForm, TodoReminder, Friend, CarpoolMatch, FeedEvent } from '../types';

export function useCalendarData() {
  // Auth state
  const [me, setMe] = useState<string | null>(null);
  
  // Event data
  const [events, setEvents] = useState<DBEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [feed, setFeed] = useState<any[]>([]);
  const [selected, setSelected] = useState<DBEvent | null>(null);
  const [selectedFeedEvent, setSelectedFeedEvent] = useState<any>(null);
  
  // Lists
  const [reminders, setReminders] = useState<any[]>([]);
  const [todos, setTodos] = useState<any[]>([]);
  
  // Friends & Carpool
  const [friends, setFriends] = useState<any[]>([]);
  const [carpoolMatches, setCarpoolMatches] = useState<any[]>([]);
  const [selectedCarpoolEvent, setSelectedCarpoolEvent] = useState<any>(null);
  const [selectedCarpoolFriends, setSelectedCarpoolFriends] = useState<Set<string>>(new Set());
  
  // Forms
  const [form, setForm] = useState<any>({
    title: "",
    description: "",
    location: "",
    start: "",
    end: "",
    visibility: "private" as Visibility,
    event_type: "",
    community_id: "",
    source: "personal" as "personal" | "business",
    image_path: "",
  });
  
  const [quickModalForm, setQuickModalForm] = useState<any>({
    title: '',
    description: '',
    date: '',
    time: '',
    enableNotification: true,
    notificationMinutes: 10
  });

  // Auth check
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  // Load friends
  const loadFriends = useCallback(async () => {
    if (!me) return;
    
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select('*, friend:friend_id(id, name, avatar_url)')
        .eq('user_id', me)
        .eq('status', 'accepted');

      if (!error && data) {
        const friendsList = data.map(f => ({
          friend_id: f.friend.id,
          name: f.friend.name || 'Friend',
          avatar_url: f.friend.avatar_url,
          safe_to_carpool: f.safe_to_carpool || false
        }));
        setFriends(friendsList);
      }
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  }, [me]);

  // Load calendar events
  const loadCalendar = useCallback(async () => {
    if (!me) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .or(`created_by.eq.${me},visibility.in.(public,friends)`)
        .order("start_time", { ascending: true });

      if (error) throw error;

      const safe = (data || []).filter((e: any) => e?.start_time && e?.end_time);
      setEvents(safe);

      // Filter reminders and todos
      const userReminders = safe.filter((e: any) => 
        e.created_by === me && e.event_type === 'reminder'
      ).map((e: any) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        type: 'reminder' as const,
        completed: e.completed || false,
        created_at: e.created_at,
        start_time: e.start_time,
        end_time: e.end_time
      }));
      
      const userTodos = safe.filter((e: any) => 
        e.created_by === me && e.event_type === 'todo'
      ).map((e: any) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        type: 'todo' as const,
        completed: e.completed || false,
        created_at: e.created_at,
        start_time: e.start_time,
        end_time: e.end_time
      }));

      setReminders(userReminders);
      setTodos(userTodos);

      // Check for carpool matches
      checkCarpoolMatches(safe);
    } catch (error: any) {
      console.error("Load calendar error:", error);
    } finally {
      setLoading(false);
    }
  }, [me]);

  // Check carpool matches
  const checkCarpoolMatches = useCallback((allEvents: DBEvent[]) => {
    if (!me || friends.length === 0) return;

    const carpoolFriends = friends.filter(f => f.safe_to_carpool);
    if (carpoolFriends.length === 0) return;

    const matches: any[] = [];

    allEvents.forEach(event => {
      if (event.created_by === me || event.visibility === 'public' || event.visibility === 'friends') {
        const attendingFriends = carpoolFriends.filter(friend => {
          return allEvents.some(e => 
            e.created_by === friend.friend_id &&
            e.title === event.title &&
            new Date(e.start_time).getTime() === new Date(event.start_time).getTime() &&
            e.location === event.location
          );
        });

        if (attendingFriends.length > 0) {
          matches.push({
            event,
            friends: attendingFriends,
            savings: calculateCarpoolSavings(attendingFriends.length + 1),
          });
        }
      }
    });

    setCarpoolMatches(matches);
  }, [me, friends]);

  const calculateCarpoolSavings = (peopleCount: number) => {
    const avgGasPrice = 3.50;
    const avgMpg = 25;
    const avgDistance = 10;
    
    const individualCost = (avgDistance / avgMpg) * avgGasPrice;
    const sharedCost = individualCost / peopleCount;
    const savings = individualCost - sharedCost;
    
    return {
      amount: savings.toFixed(2),
      co2Saved: (peopleCount - 1) * 8.89,
    };
  };

  // Load feed
  const loadFeed = useCallback(async () => {
    if (!me) return;
    setLoading(true);

    try {
      const { data: businessEvents } = await supabase
        .from("events")
        .select("*")
        .eq("source", "business")
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true });

      const { data: communityEvents } = await supabase
        .from("events")
        .select("*")
        .eq("source", "community")
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true });

      const allFeedEvents = [
        ...(businessEvents || []).map(e => ({ ...e, _eventSource: 'business' as const })),
        ...(communityEvents || []).map(e => ({ ...e, _eventSource: 'community' as const }))
      ];

      const uniqueEvents = allFeedEvents.filter((event, index, self) => 
        index === self.findIndex(e => e.id === event.id)
      );

      uniqueEvents.sort((a, b) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );

      setFeed(uniqueEvents);
    } catch (error) {
      console.error("Load feed error:", error);
    } finally {
      setLoading(false);
    }
  }, [me]);

  // Reset form
  const resetForm = useCallback(() => {
    setForm({
      title: "",
      description: "",
      location: "",
      start: "",
      end: "",
      visibility: "private",
      event_type: "",
      community_id: "",
      source: "personal",
      image_path: "",
    });
  }, []);

  // Load initial data
  useEffect(() => {
    if (!me) return;
    loadFriends();
    loadCalendar();
  }, [me, loadFriends, loadCalendar]);

  // Realtime subscriptions
  useEffect(() => {
    if (!me) return;

    const ch = supabase
      .channel("cal-events")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => {
        loadCalendar();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [me, loadCalendar]);

  return {
    me,
    events,
    loading,
    feed,
    selected,
    setSelected,
    selectedFeedEvent,
    setSelectedFeedEvent,
    reminders,
    todos,
    friends,
    carpoolMatches,
    selectedCarpoolEvent,
    setSelectedCarpoolEvent,
    selectedCarpoolFriends,
    setSelectedCarpoolFriends,
    form,
    setForm,
    quickModalForm,
    setQuickModalForm,
    loadCalendar,
    loadFeed,
    resetForm
  };
}
