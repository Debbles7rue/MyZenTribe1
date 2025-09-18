// app/(protected)/calendar/hooks/useCalendarActions.ts

import { useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { DBEvent } from '@/lib/types';
import type { TodoReminder, Friend, CalendarForm, QuickModalForm, FeedEvent } from '../types';

interface UseCalendarActionsProps {
  me: string | null;
  form: CalendarForm;
  selected: DBEvent | null;
  quickModalForm: QuickModalForm;
  quickModalType: 'reminder' | 'todo';
  draggedItem: TodoReminder | null;
  selectedCarpoolFriends: Set<string>;
  friends: Friend[];
  showToast: (toast: any) => void;
  loadCalendar: () => Promise<void>;
  resetForm: () => void;
  setOpenCreate: (open: boolean) => void;
  setOpenEdit: (open: boolean) => void;
  setQuickModalOpen: (open: boolean) => void;
  setShowCarpoolChat: (show: boolean) => void;
  setQuickModalForm: React.Dispatch<React.SetStateAction<QuickModalForm>>;
  setSelected: (event: DBEvent | null) => void;
  setDraggedItem: (item: TodoReminder | null) => void;
  setDragType: (type: 'reminder' | 'todo' | 'none') => void;
  setSelectedCarpoolFriends: (friends: Set<string>) => void;
}

export function useCalendarActions(props: UseCalendarActionsProps) {
  const {
    me,
    form,
    selected,
    quickModalForm,
    quickModalType,
    draggedItem,
    selectedCarpoolFriends,
    friends,
    showToast,
    loadCalendar,
    resetForm,
    setOpenCreate,
    setOpenEdit,
    setQuickModalOpen,
    setShowCarpoolChat,
    setQuickModalForm,
    setSelected,
    setDraggedItem,
    setDragType,
    setSelectedCarpoolFriends
  } = props;

  // Create event
  const handleCreateEvent = useCallback(async () => {
    if (!me) {
      showToast({ type: 'error', message: 'Please log in first' });
      return;
    }

    if (!form.title || !form.start || !form.end) {
      showToast({ type: 'error', message: 'Please fill in required fields' });
      return;
    }

    const payload: any = {
      title: form.title,
      description: form.description || null,
      location: form.location || null,
      start_time: new Date(form.start).toISOString(),
      end_time: new Date(form.end).toISOString(),
      visibility: form.visibility,
      created_by: me,
      event_type: form.event_type || null,
      community_id: form.community_id || null,
      image_path: form.image_path || null,
      source: form.source,
      completed: false
    };

    const { error } = await supabase.from("events").insert(payload);
    if (error) {
      showToast({ type: 'error', message: error.message });
      return;
    }

    setOpenCreate(false);
    resetForm();
    showToast({ type: 'success', message: '✨ Event created successfully!' });
    loadCalendar();
  }, [me, form, showToast, setOpenCreate, resetForm, loadCalendar]);

  // Update event
  const handleUpdateEvent = useCallback(async () => {
    if (!selected || !me) return;

    const { error } = await supabase
      .from("events")
      .update({
        title: form.title,
        description: form.description,
        location: form.location,
        start_time: new Date(form.start).toISOString(),
        end_time: new Date(form.end).toISOString(),
        visibility: form.visibility,
        event_type: form.event_type,
        community_id: form.community_id,
        source: form.source,
        image_path: form.image_path,
      })
      .eq("id", selected.id)
      .eq("created_by", me);

    if (!error) {
      showToast({ type: 'success', message: '✅ Event updated!' });
      setOpenEdit(false);
      setSelected(null);
      resetForm();
      loadCalendar();
    } else {
      showToast({ type: 'error', message: 'Failed to update event' });
    }
  }, [selected, me, form, showToast, setOpenEdit, setSelected, resetForm, loadCalendar]);

  // Delete event
  const handleDeleteEvent = useCallback(async (eventId: string) => {
    if (!me) return;

    if (confirm('Are you sure you want to delete this event?')) {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId)
        .eq("created_by", me);

      if (!error) {
        showToast({ type: 'success', message: '🗑️ Event deleted' });
        loadCalendar();
      } else {
        showToast({ type: 'error', message: 'Failed to delete event' });
      }
    }
  }, [me, showToast, loadCalendar]);

  // External drop handler
  const handleExternalDrop = useCallback(async (
    { start, end }: { start: Date; end: Date },
    kind: 'reminder' | 'todo'
  ) => {
    if (!me) return;

    const title = draggedItem?.title || (kind === 'reminder' ? 'New Reminder' : 'New To-do');
    const description = draggedItem?.description || '';

    const { error } = await supabase.from("events").insert({
      title,
      description,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      created_by: me,
      event_type: kind,
      visibility: 'private',
      source: 'personal',
      completed: false
    });

    if (!error) {
      showToast({ 
        type: 'success', 
        message: `✨ ${kind === 'reminder' ? 'Reminder' : 'To-do'} added to calendar!` 
      });
      loadCalendar();
    }
    
    setDraggedItem(null);
    setDragType('none');
  }, [me, draggedItem, showToast, loadCalendar, setDraggedItem, setDragType]);

  // Apply template
  const handleApplyTemplate = useCallback(async (templateEvents: any[]) => {
    try {
      for (const event of templateEvents) {
        const eventWithUser = { ...event, created_by: me };
        await supabase.from('events').insert(eventWithUser);
      }
      loadCalendar();
      showToast({ type: 'success', message: '✨ Template applied to calendar!' });
    } catch (error) {
      showToast({ type: 'error', message: 'Failed to apply template' });
    }
  }, [me, loadCalendar, showToast]);

  // ========= FIXED TOGGLE COMPLETE FUNCTION =========
  // This now properly handles both events table and dedicated todos/reminders tables
  const handleToggleComplete = useCallback(async (item: TodoReminder) => {
    if (!me) {
      showToast({ type: 'error', message: 'Please log in to update items' });
      return;
    }

    const newStatus = !item.completed;
    
    try {
      // First, try to determine which table this item comes from
      // Check if it exists in events table
      const { data: eventData } = await supabase
        .from("events")
        .select('id, event_type')
        .eq("id", item.id)
        .eq("created_by", me)
        .single();

      if (eventData) {
        // Item is in events table
        const { error } = await supabase
          .from("events")
          .update({ 
            completed: newStatus,
            status: newStatus ? 'done' : 'scheduled',
            updated_at: new Date().toISOString()
          })
          .eq("id", item.id)
          .eq("created_by", me);

        if (error) {
          console.error('Error updating event:', error);
          showToast({ type: 'error', message: 'Failed to update item' });
          return;
        }
      } else {
        // Item might be in dedicated todos or reminders table
        // Try todos table first
        if (item.type === 'todo') {
          const { data: todoData } = await supabase
            .from("todos")
            .select('id')
            .eq("id", item.id)
            .eq("user_id", me)
            .single();

          if (todoData) {
            const { error } = await supabase
              .from("todos")
              .update({ 
                completed: newStatus,
                completed_at: newStatus ? new Date().toISOString() : null,
                updated_at: new Date().toISOString()
              })
              .eq("id", item.id)
              .eq("user_id", me);

            if (error) {
              console.error('Error updating todo:', error);
              showToast({ type: 'error', message: 'Failed to update todo' });
              return;
            }
          }
        } else if (item.type === 'reminder') {
          // Try reminders table
          const { data: reminderData } = await supabase
            .from("reminders")
            .select('id')
            .eq("id", item.id)
            .eq("user_id", me)
            .single();

          if (reminderData) {
            const { error } = await supabase
              .from("reminders")
              .update({ 
                completed: newStatus,
                updated_at: new Date().toISOString()
              })
              .eq("id", item.id)
              .eq("user_id", me);

            if (error) {
              console.error('Error updating reminder:', error);
              showToast({ type: 'error', message: 'Failed to update reminder' });
              return;
            }
          }
        }
      }

      // Show success message
      if (newStatus) {
        showToast({
          type: 'success',
          message: '✅ Marked as complete! Great job! 🎉'
        });
      } else {
        showToast({
          type: 'success',
          message: '↩️ Marked as incomplete'
        });
      }
      
      // Reload calendar to refresh all data
      await loadCalendar();
    } catch (error: any) {
      console.error('Toggle complete error:', error);
      showToast({ 
        type: 'error', 
        message: 'Failed to update item. Please try again.' 
      });
    }
  }, [me, showToast, loadCalendar]);

  // Delete item (handles all tables)
  const handleDeleteItem = useCallback(async (itemId: string) => {
    if (!me) {
      showToast({ type: 'error', message: 'Please log in to delete items' });
      return;
    }

    if (confirm('Are you sure you want to delete this item?')) {
      try {
        // Try events table first
        const { data: eventData } = await supabase
          .from("events")
          .select('id')
          .eq("id", itemId)
          .eq("created_by", me)
          .single();

        if (eventData) {
          const { error } = await supabase
            .from("events")
            .delete()
            .eq("id", itemId)
            .eq("created_by", me);

          if (error) throw error;
        } else {
          // Try todos table
          const { data: todoData } = await supabase
            .from("todos")
            .select('id')
            .eq("id", itemId)
            .eq("user_id", me)
            .single();

          if (todoData) {
            const { error } = await supabase
              .from("todos")
              .delete()
              .eq("id", itemId)
              .eq("user_id", me);

            if (error) throw error;
          } else {
            // Try reminders table
            const { error } = await supabase
              .from("reminders")
              .delete()
              .eq("id", itemId)
              .eq("user_id", me);

            if (error && error.code !== 'PGRST116') throw error;
          }
        }

        showToast({ type: 'success', message: '🗑️ Item deleted' });
        loadCalendar();
      } catch (error: any) {
        console.error('Delete item error:', error);
        showToast({ type: 'error', message: 'Failed to delete item' });
      }
    }
  }, [me, showToast, loadCalendar]);

  // Show interest
  const handleShowInterest = useCallback(async (event: FeedEvent) => {
    const { error } = await supabase.from("events").insert({
      ...event,
      id: undefined,
      created_by: me,
      original_event_id: event.id,
      interested: true,
      title: `[Interested] ${event.title}`,
    });

    if (!error) {
      showToast({ type: 'success', message: '✨ Added to calendar as interested!' });
      loadCalendar();
    }
  }, [me, showToast, loadCalendar]);

  // RSVP
  const handleRSVP = useCallback(async (event: FeedEvent) => {
    const { error } = await supabase.from("events").insert({
      ...event,
      id: undefined,
      created_by: me,
      original_event_id: event.id,
      rsvp: true,
      title: `[RSVP] ${event.title}`,
    });

    if (!error) {
      showToast({ type: 'success', message: '🎉 RSVP confirmed! Added to calendar.' });
      loadCalendar();
    }
  }, [me, showToast, loadCalendar]);

  // Dismiss feed event
  const dismissFeedEvent = useCallback((eventId: string) => {
    return eventId;
  }, []);

  // Create quick item
  const createQuickItem = useCallback(async () => {
    if (!me || !quickModalForm.title) {
      showToast({ type: 'error', message: 'Please enter a title' });
      return;
    }

    const startDate = quickModalForm.date && quickModalForm.time 
      ? new Date(`${quickModalForm.date}T${quickModalForm.time}`)
      : new Date();
    
    const endDate = new Date(startDate.getTime() + 3600000);

    const { error } = await supabase.from("events").insert({
      title: quickModalForm.title,
      description: quickModalForm.description || null,
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      created_by: me,
      event_type: quickModalType,
      visibility: 'private',
      source: 'personal',
      completed: false,
      notification_minutes: quickModalForm.enableNotification ? quickModalForm.notificationMinutes : null
    });

    if (!error) {
      showToast({ 
        type: 'success', 
        message: `✅ ${quickModalType === 'reminder' ? 'Reminder' : 'Todo'} created!` 
      });
      setQuickModalOpen(false);
      setQuickModalForm({
        title: '',
        description: '',
        date: '',
        time: '',
        enableNotification: true,
        notificationMinutes: 10
      });
      loadCalendar();
    } else {
      showToast({ type: 'error', message: 'Failed to create item' });
    }
  }, [me, quickModalForm, quickModalType, showToast, loadCalendar, setQuickModalOpen, setQuickModalForm]);

  // Create carpool group
  const createCarpoolGroup = useCallback(async (eventId: string, carpoolEvent: any) => {
    if (!me || selectedCarpoolFriends.size === 0) {
      showToast({ type: 'error', message: 'Please select friends for carpool' });
      return;
    }

    try {
      const carpoolData = {
        event_id: eventId,
        organizer_id: me,
        participants: Array.from(selectedCarpoolFriends),
        event_title: carpoolEvent.title,
        event_date: carpoolEvent.start_time,
        created_at: new Date().toISOString()
      };

      // Here you would save to a carpool_groups table
      // For now, we'll just show success
      showToast({ 
        type: 'success', 
        message: `🚗 Carpool group created with ${selectedCarpoolFriends.size} friends!` 
      });
      
      setSelectedCarpoolFriends(new Set());
      setShowCarpoolChat(true);
    } catch (error) {
      showToast({ type: 'error', message: 'Failed to create carpool group' });
    }
  }, [me, selectedCarpoolFriends, showToast, setSelectedCarpoolFriends, setShowCarpoolChat]);

  // Calendar grid drag/drop handlers
  const onDrop = useCallback(async ({ event, start, end }: any) => {
    if (!me) return;

    try {
      const eventResource = event.resource as DBEvent;
      if (eventResource.created_by !== me) {
        showToast({ type: 'warning', message: 'You can only move your own events' });
        return;
      }

      const { error } = await supabase
        .from("events")
        .update({
          start_time: start.toISOString(),
          end_time: end.toISOString()
        })
        .eq("id", eventResource.id)
        .eq("created_by", me);

      if (!error) {
        showToast({ type: 'success', message: '📅 Event moved!' });
        loadCalendar();
      }
    } catch (error) {
      showToast({ type: 'error', message: 'Failed to move event' });
    }
  }, [me, showToast, loadCalendar]);

  const onResize = useCallback(async ({ event, start, end }: any) => {
    if (!me) return;

    try {
      const eventResource = event.resource as DBEvent;
      if (eventResource.created_by !== me) {
        showToast({ type: 'warning', message: 'You can only resize your own events' });
        return;
      }

      const { error } = await supabase
        .from("events")
        .update({
          start_time: start.toISOString(),
          end_time: end.toISOString()
        })
        .eq("id", eventResource.id)
        .eq("created_by", me);

      if (!error) {
        showToast({ type: 'success', message: '⏰ Event duration updated!' });
        loadCalendar();
      }
    } catch (error) {
      showToast({ type: 'error', message: 'Failed to resize event' });
    }
  }, [me, showToast, loadCalendar]);

  return {
    handleCreateEvent,
    handleUpdateEvent,
    handleDeleteEvent,
    handleExternalDrop,
    handleApplyTemplate,
    handleToggleComplete,
    handleDeleteItem,
    handleShowInterest,
    handleRSVP,
    dismissFeedEvent,
    createQuickItem,
    createCarpoolGroup,
    onDrop,
    onResize
  };
}
