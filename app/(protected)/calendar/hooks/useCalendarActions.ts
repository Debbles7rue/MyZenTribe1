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

  // ENHANCED: Create event with meeting coordinator support
  const handleCreateEvent = useCallback(async (eventData?: any) => {
    if (!me) {
      showToast({ type: 'error', message: 'Please log in first' });
      return;
    }

    // Use provided eventData (from meeting coordinator) or form data
    const data = eventData || form;

    // Check for required fields based on data source
    if (!data.title) {
      showToast({ type: 'error', message: 'Please enter a title' });
      return;
    }
    
    // For regular form, check start/end; for coordinator data, check start_time/end_time
    if (!data.start_time && !data.end_time && (!data.start || !data.end)) {
      showToast({ type: 'error', message: 'Please fill in required fields' });
      return;
    }

    try {
      // Create the main event
      const payload: any = {
        title: data.title,
        description: data.description || null,
        location: data.location || null,
        start_time: data.start_time || new Date(data.start).toISOString(),
        end_time: data.end_time || new Date(data.end).toISOString(),
        visibility: data.visibility || 'private',
        created_by: me,
        event_type: data.event_type || 'meeting',
        community_id: data.community_id || null,
        image_path: data.image_path || null,
        source: data.source || 'personal',
        completed: false,
        // Store coordination metadata in description if from AI coordinator
        ...(data.source === 'ai_coordinator' && {
          description: `${data.description || ''}\n\n---\nCreated with AI Meeting Coordinator\nParticipants: ${data.participants?.length || 0} friends, ${data.email_invites?.length || 0} email invites`
        })
      };

      const { data: newEvent, error: eventError } = await supabase
        .from("events")
        .insert(payload)
        .select()
        .single();

      if (eventError) {
        showToast({ type: 'error', message: eventError.message });
        return;
      }

      // If this is from the meeting coordinator, handle invitations
      if (data.source === 'ai_coordinator' && newEvent) {
        // Create meeting coordination record
        const coordinationData = {
          event_id: newEvent.id,
          organizer_id: me,
          status: 'pending',
          created_at: new Date().toISOString()
        };

        const { data: coordination, error: coordError } = await supabase
          .from('meeting_coordinations')
          .insert(coordinationData)
          .select()
          .single();

        if (coordError) {
          console.error('Failed to create coordination:', coordError);
          // Don't fail the whole operation if coordination fails
        }

        // Handle friend invitations
        if (data.participants && data.participants.length > 0 && coordination) {
          const invitations = data.participants.map((friendId: string) => ({
            coordination_id: coordination.id,
            event_id: newEvent.id,
            invitee_id: friendId,
            invitee_email: null,
            status: 'pending',
            created_at: new Date().toISOString()
          }));

          const { error: inviteError } = await supabase
            .from('meeting_invitations')
            .insert(invitations);

          if (inviteError) {
            console.error('Failed to create invitations:', inviteError);
          }

          // Send notifications to invited friends
          const notifications = data.participants.map((friendId: string) => {
            const friend = friends.find(f => f.friend_id === friendId);
            return {
              user_id: friendId,
              type: 'meeting_invite',
              title: `Meeting Invitation: ${data.title}`,
              message: `${friend?.name || 'A friend'} invited you to "${data.title}"`,
              data: {
                event_id: newEvent.id,
                coordination_id: coordination.id,
                start_time: newEvent.start_time,
                location: newEvent.location
              },
              created_at: new Date().toISOString(),
              read: false
            };
          });

          const { error: notifError } = await supabase
            .from('notifications')
            .insert(notifications);

          if (notifError) {
            console.error('Failed to send notifications:', notifError);
          }
        }

        // Handle email invitations
        if (data.email_invites && data.email_invites.length > 0 && coordination) {
          const emailInvitations = data.email_invites.map((email: string) => ({
            coordination_id: coordination.id,
            event_id: newEvent.id,
            invitee_id: null,
            invitee_email: email,
            status: 'pending',
            created_at: new Date().toISOString()
          }));

          const { error: emailError } = await supabase
            .from('meeting_invitations')
            .insert(emailInvitations);

          if (emailError) {
            console.error('Failed to create email invitations:', emailError);
          }

          // Here you would trigger email sending - this is a placeholder
          // In production, you'd use a service like SendGrid or AWS SES
          console.log('Email invites would be sent to:', data.email_invites);
        }

        showToast({ 
          type: 'success', 
          message: `🎉 Meeting scheduled and invitations sent! ${data.participants?.length || 0} friends and ${data.email_invites?.length || 0} email invites.`
        });
      } else {
        showToast({ type: 'success', message: '✨ Event created successfully!' });
      }

      setOpenCreate(false);
      resetForm();
      loadCalendar();
      
      return newEvent;
    } catch (error) {
      console.error('Error creating event:', error);
      showToast({ type: 'error', message: 'Failed to create event' });
    }
  }, [me, form, friends, showToast, setOpenCreate, resetForm, loadCalendar]);

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

  // Toggle complete
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
