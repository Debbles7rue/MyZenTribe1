// app/(protected)/calendar/components/carpool/utils.ts

import { createClient } from '@supabase/supabase-js';
import type { DBEvent } from '@/lib/types';
import type { 
  Message, 
  Poll, 
  CarpoolGroup, 
  CarpoolParticipant, 
  AISuggestions,
  CarpoolStats,
  CarpoolData,
  PersistenceOptions,
  PersistenceState
} from './types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ===== ENHANCED PERSISTENCE FUNCTIONS (MOVED FROM CARPOOLMANAGER) =====

// Enhanced carpool data persistence with offline support
export const saveCarpoolData = async (
  carpoolId: string, 
  data: CarpoolData, 
  options: Partial<PersistenceOptions> = {},
  userId: string,
  eventId: string,
  showToast?: (toast: { type: string; message: string }) => void
) => {
  const defaultOptions: PersistenceOptions = {
    useSupabase: true,
    useLocalStorage: true,
    autoSave: true,
    autoSaveInterval: 120000
  };
  
  const opts = { ...defaultOptions, ...options };
  
  if (!userId || !eventId) return { success: false, message: 'Invalid state' };
  
  try {
    // Always save to localStorage as backup/offline storage
    if (opts.useLocalStorage) {
      const localStorageKey = `carpool-${eventId}-${userId}`;
      const fallbackData = {
        ...data,
        carpoolId,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(localStorageKey, JSON.stringify(fallbackData));
    }
    
    // Try Supabase save if online and enabled
    if (opts.useSupabase && navigator.onLine) {
      try {
        const carpoolData = {
          id: carpoolId || undefined,
          event_id: eventId,
          driver_id: userId,
          messages: JSON.stringify(data.messages),
          polls: JSON.stringify(data.polls),
          selected_friends: data.selectedFriends,
          driver_status: data.driverStatus,
          car_details: JSON.stringify(data.carDetails),
          event_details: JSON.stringify(data.tempEventDetails),
          updated_at: new Date().toISOString()
        };

        if (carpoolId && carpoolId !== 'new') {
          // Update existing carpool
          const { error } = await supabase
            .from('carpool_groups')
            .update(carpoolData)
            .eq('id', carpoolId)
            .eq('driver_id', userId);
          
          if (error) throw error;
        } else {
          // Create new carpool
          const { data: newData, error } = await supabase
            .from('carpool_groups')
            .insert([{ ...carpoolData, created_at: new Date().toISOString() }])
            .select()
            .single();
          
          if (error) throw error;
          if (newData) {
            carpoolId = newData.id;
          }
        }
        
        showToast?.({ 
          type: 'success', 
          message: 'Carpool data saved to cloud!' 
        });

        return { success: true, message: 'Saved to cloud', carpoolId };
      } catch (supabaseError: any) {
        console.warn('Supabase save failed, using localStorage:', supabaseError);
        
        showToast?.({ 
          type: 'info', 
          message: 'Saved locally (cloud unavailable)' 
        });

        return { success: true, message: 'Saved locally', carpoolId };
      }
    } else {
      // Offline or Supabase disabled
      showToast?.({ 
        type: 'info', 
        message: navigator.onLine ? 'Saved locally' : 'Saved offline' 
      });

      return { success: true, message: 'Saved locally', carpoolId };
    }
  } catch (error: any) {
    console.error('Save carpool error:', error);
    
    showToast?.({ 
      type: 'error', 
      message: 'Failed to save data completely' 
    });

    return { success: false, message: error.message };
  }
};

// Enhanced carpool data loading with offline support (replaces existing loadCarpoolData)
export const loadCarpoolData = async (
  carpoolId?: string,
  userId?: string,
  eventId?: string,
  showToast?: (toast: { type: string; message: string }) => void
) => {
  // If carpoolId is provided, use the original behavior for carpool groups
  if (carpoolId && !userId && !eventId) {
    try {
      // Load carpool group details (original functionality)
      const { data: group, error: groupError } = await supabase
        .from('carpool_groups')
        .select(`
          *,
          carpool_participants (
            *,
            profiles (
              display_name
            )
          )
        `)
        .eq('id', carpoolId)
        .single();

      if (groupError) throw groupError;

      // Load messages
      const { data: messages, error: messagesError } = await supabase
        .from('carpool_messages')
        .select('*')
        .eq('group_id', carpoolId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      // Load polls
      const { data: polls, error: pollsError } = await supabase
        .from('carpool_polls')
        .select(`
          *,
          carpool_poll_votes (*)
        `)
        .eq('group_id', carpoolId)
        .eq('active', true);

      if (pollsError) throw pollsError;

      return { group, messages, polls };
    } catch (error) {
      console.error('Error loading carpool data:', error);
      throw error;
    }
  }

  // Enhanced functionality for event carpool data with offline support
  if (!userId || !eventId) return { success: false, data: null };
  
  try {
    // Try Supabase first if online
    if (navigator.onLine) {
      const { data, error } = await supabase
        .from('carpool_groups')
        .select('*')
        .eq('event_id', eventId)
        .eq('driver_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1);
      
      if (!error && data && data.length > 0) {
        const carpool = data[0];
        
        const carpoolData = {
          messages: carpool.messages ? JSON.parse(carpool.messages) : [],
          polls: carpool.polls ? JSON.parse(carpool.polls) : [],
          selectedFriends: carpool.selected_friends || [],
          driverStatus: carpool.driver_status || 'none',
          carDetails: carpool.car_details ? JSON.parse(carpool.car_details) : { seats: 4, make: '', color: '' },
          tempEventDetails: carpool.event_details ? JSON.parse(carpool.event_details) : { meetupLocation: '', departureTime: '', notes: '' }
        };

        showToast?.({ type: 'success', message: 'Carpool data loaded from cloud!' });
        return { success: true, data: carpoolData, source: 'cloud', carpoolId: carpool.id };
      }
    }
  } catch (supabaseError) {
    console.warn('Supabase load failed, trying localStorage:', supabaseError);
  }
  
  // Fallback to localStorage
  try {
    const localStorageKey = `carpool-${eventId}-${userId}`;
    const savedData = localStorage.getItem(localStorageKey);
    
    if (savedData) {
      const parsed = JSON.parse(savedData);
      
      const carpoolData = {
        messages: parsed.messages || [],
        polls: parsed.polls || [],
        selectedFriends: parsed.selectedFriends || [],
        driverStatus: parsed.driverStatus || 'none',
        carDetails: parsed.carDetails || { seats: 4, make: '', color: '' },
        tempEventDetails: parsed.tempEventDetails || { meetupLocation: '', departureTime: '', notes: '' }
      };
      
      showToast?.({ 
        type: 'info', 
        message: navigator.onLine ? 'Loaded from local storage' : 'Loaded offline data'
      });
      
      return { success: true, data: carpoolData, source: 'local', carpoolId: parsed.carpoolId || null };
    }
  } catch (localError) {
    console.warn('localStorage load failed:', localError);
  }

  return { success: false, data: null };
};

// Sync pending changes when coming back online
export const syncPendingChanges = async (
  eventId: string,
  userId: string,
  showToast?: (toast: { type: string; message: string }) => void
) => {
  if (!navigator.onLine) return;

  try {
    const localStorageKey = `carpool-${eventId}-${userId}`;
    const savedData = localStorage.getItem(localStorageKey);
    
    if (savedData) {
      const parsed = JSON.parse(savedData);
      if (parsed.carpoolId) {
        await saveCarpoolData(parsed.carpoolId, parsed, { useLocalStorage: false }, userId, eventId, showToast);
      }
    }
  } catch (error) {
    console.error('Sync error:', error);
  }
};

// Load carpool groups for an event
export const loadCarpoolGroups = async (eventId: string, userId: string) => {
  try {
    // Load carpool groups for this event
    const { data: groups, error: groupsError } = await supabase
      .from('carpool_groups')
      .select(`
        *,
        carpool_participants!inner (
          id,
          user_id,
          role,
          joined_at,
          profiles (
            display_name
          )
        )
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (groupsError) {
      console.error('Error loading carpool groups:', groupsError);
      throw groupsError;
    }

    // Transform data and filter groups where user is a participant
    const transformedGroups: CarpoolGroup[] = (groups || [])
      .filter(group => 
        group.carpool_participants.some((p: any) => p.user_id === userId)
      )
      .map(group => ({
        id: group.id,
        event_id: group.event_id,
        creator_id: group.creator_id,
        name: group.name,
        status: group.status,
        participant_count: group.carpool_participants.length,
        created_at: group.created_at,
        last_activity: group.last_activity || group.created_at,
        meetup_location: group.meetup_location,
        departure_time: group.departure_time,
        participants: group.carpool_participants.map((p: any) => ({
          id: p.id,
          group_id: group.id,
          user_id: p.user_id,
          role: p.role,
          joined_at: p.joined_at,
          user_name: p.profiles?.display_name || 'Unknown User'
        }))
      }));

    return transformedGroups;
  } catch (error) {
    console.error('Error loading carpool groups:', error);
    throw error;
  }
};

// Create new carpool group
export const createNewCarpool = async (eventId: string, userId: string, name: string) => {
  try {
    // Create carpool group
    const { data: group, error: groupError } = await supabase
      .from('carpool_groups')
      .insert({
        event_id: eventId,
        creator_id: userId,
        name: name.trim(),
        status: 'active',
        created_at: new Date().toISOString(),
        last_activity: new Date().toISOString()
      })
      .select()
      .single();

    if (groupError) throw groupError;

    // Add creator as participant
    const { error: participantError } = await supabase
      .from('carpool_participants')
      .insert({
        group_id: group.id,
        user_id: userId,
        role: 'creator',
        joined_at: new Date().toISOString()
      });

    if (participantError) throw participantError;

    return group;
  } catch (error) {
    console.error('Error creating carpool:', error);
    throw error;
  }
};

// Archive carpool group
export const archiveCarpool = async (groupId: string) => {
  try {
    const { error } = await supabase
      .from('carpool_groups')
      .update({ 
        status: 'archived',
        last_activity: new Date().toISOString()
      })
      .eq('id', groupId);

    if (error) throw error;
  } catch (error) {
    console.error('Error archiving carpool:', error);
    throw error;
  }
};

// Delete carpool group
export const deleteCarpool = async (groupId: string) => {
  try {
    // Delete participants first (foreign key constraint)
    await supabase
      .from('carpool_participants')
      .delete()
      .eq('group_id', groupId);

    // Delete messages
    await supabase
      .from('carpool_messages')
      .delete()
      .eq('group_id', groupId);

    // Delete group
    const { error } = await supabase
      .from('carpool_groups')
      .delete()
      .eq('id', groupId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting carpool:', error);
    throw error;
  }
};

// ===== ORIGINAL DATABASE FUNCTIONS (PRESERVED) =====

export const sendMessage = async (
  carpoolGroupId: string, 
  userId: string, 
  message: string
): Promise<Message> => {
  try {
    const { data, error } = await supabase
      .from('carpool_messages')
      .insert({
        group_id: carpoolGroupId,
        user_id: userId,
        message: message.trim(),
        message_type: 'text'
      })
      .select()
      .single();

    if (error) throw error;

    // Update group last activity
    await supabase
      .from('carpool_groups')
      .update({ last_activity: new Date().toISOString() })
      .eq('id', carpoolGroupId);

    // Transform to Message format
    const newMessage: Message = {
      id: parseInt(data.id),
      user: 'You',
      userId: userId,
      message: message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      avatar: '😊'
    };

    return newMessage;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

export const createPoll = async (
  carpoolGroupId: string,
  userId: string,
  question: string
): Promise<Poll> => {
  try {
    // Create poll
    const { data: poll, error: pollError } = await supabase
      .from('carpool_polls')
      .insert({
        group_id: carpoolGroupId,
        created_by: userId,
        question: question.trim(),
        active: true
      })
      .select()
      .single();

    if (pollError) throw pollError;

    // Create default options
    const defaultOptions = ['Yes', 'No', 'Maybe'];
    const optionInserts = defaultOptions.map((option, index) => ({
      poll_id: poll.id,
      option_text: option,
      option_index: index
    }));

    await supabase
      .from('carpool_poll_options')
      .insert(optionInserts);

    // Transform to Poll format
    const newPoll: Poll = {
      id: poll.id,
      question: question,
      options: defaultOptions.map(text => ({ text, votes: [] })),
      createdBy: userId,
      active: true
    };

    return newPoll;
  } catch (error) {
    console.error('Error creating poll:', error);
    throw error;
  }
};

export const votePoll = async (
  pollId: string,
  optionIndex: number,
  userId: string
): Promise<void> => {
  try {
    // Check if user already voted
    const { data: existingVote } = await supabase
      .from('carpool_poll_votes')
      .select('*')
      .eq('poll_id', pollId)
      .eq('user_id', userId)
      .single();

    if (existingVote) {
      // Update existing vote
      await supabase
        .from('carpool_poll_votes')
        .update({ option_index: optionIndex })
        .eq('id', existingVote.id);
    } else {
      // Create new vote
      await supabase
        .from('carpool_poll_votes')
        .insert({
          poll_id: pollId,
          user_id: userId,
          option_index: optionIndex
        });
    }
  } catch (error) {
    console.error('Error voting on poll:', error);
    throw error;
  }
};

export const updateMessage = async (
  messageId: number,
  newText: string
): Promise<void> => {
  try {
    await supabase
      .from('carpool_messages')
      .update({ 
        message: newText,
        edited_at: new Date().toISOString()
      })
      .eq('id', messageId);
  } catch (error) {
    console.error('Error updating message:', error);
    throw error;
  }
};

export const deleteMessage = async (messageId: number): Promise<void> => {
  try {
    await supabase
      .from('carpool_messages')
      .delete()
      .eq('id', messageId);
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
};

export const updatePoll = async (
  pollId: string,
  newQuestion: string
): Promise<void> => {
  try {
    await supabase
      .from('carpool_polls')
      .update({ question: newQuestion })
      .eq('id', pollId);
  } catch (error) {
    console.error('Error updating poll:', error);
    throw error;
  }
};

export const deletePoll = async (pollId: string): Promise<void> => {
  try {
    // Delete votes first
    await supabase
      .from('carpool_poll_votes')
      .delete()
      .eq('poll_id', pollId);

    // Delete options
    await supabase
      .from('carpool_poll_options')
      .delete()
      .eq('poll_id', pollId);

    // Delete poll
    await supabase
      .from('carpool_polls')
      .delete()
      .eq('id', pollId);
  } catch (error) {
    console.error('Error deleting poll:', error);
    throw error;
  }
};

// ===== UTILITY FUNCTIONS (PRESERVED) =====

export const generateCarpoolStats = (
  carpoolData?: any,
  defaultStats?: Partial<CarpoolStats>
): CarpoolStats => {
  return {
    totalFriends: carpoolData?.friends?.length || defaultStats?.totalFriends || 8,
    needingRides: defaultStats?.needingRides || 5,
    driversAvailable: defaultStats?.driversAvailable || 2,
    estimatedSavings: defaultStats?.estimatedSavings || '$45',
    distanceAway: defaultStats?.distanceAway || 23
  };
};

export const generateAISuggestions = (event: DBEvent | null): AISuggestions | null => {
  if (!event) return null;
  
  return {
    meetupSpot: 'Central Park (most central for everyone)',
    departureTime: '6:30 PM (accounts for traffic)',
    route: 'Highway 101 → Downtown → Venue',
    parking: 'Book spot at SpotHero for $15 (split 4 ways = $3.75 each)',
    weatherAlert: null,
    alternativeRoute: 'Avoid I-95 construction'
  };
};

export const createEventPostMessage = (event: DBEvent): Message => {
  const eventDate = new Date(event.start_time);
  const eventTime = eventDate.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit' 
  });
  const eventDateStr = eventDate.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });

  return {
    id: Date.now(),
    user: 'System',
    message: 'Event details shared',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    avatar: '📅',
    isEventPost: true,
    eventData: {
      title: event.title,
      date: eventDateStr,
      time: eventTime,
      location: event.location || 'Location TBD'
    }
  };
};

export const initializeCarpoolChat = (event: DBEvent): Message[] => {
  const eventPostMessage = createEventPostMessage(event);

  // Sample existing messages for demo
  const existingMessages: Message[] = [
    eventPostMessage,
    { 
      id: 1, 
      user: 'Sarah', 
      message: 'I can drive! My Honda Civic fits 4 people', 
      time: '2:30 PM', 
      avatar: '👩‍🦰',
      reactions: ['👍', '🚗']
    },
    { 
      id: 2, 
      user: 'Mike', 
      message: 'Perfect! When should we meet up?', 
      time: '2:32 PM', 
      avatar: '👨‍💼' 
    },
    { 
      id: 3, 
      user: 'AI Assistant', 
      message: 'Based on traffic patterns, I suggest meeting at Central Park at 6:15 PM. This gives you a 32-minute buffer for the drive.', 
      time: '2:35 PM', 
      avatar: '🤖', 
      isAI: true 
    }
  ];

  return existingMessages;
};

// Vibration utility for mobile haptic feedback
export const vibrate = (isMobile: boolean = false): void => {
  if (isMobile && 'vibrate' in navigator) {
    navigator.vibrate(10);
  }
};

// Quick action handlers
export const handleQuickAction = (
  action: string,
  messages: Message[],
  setMessages: (messages: Message[]) => void,
  driverStatus: string,
  setDriverStatus: (status: any) => void,
  carDetails: any,
  showToast?: (toast: { type: string; message: string }) => void,
  isMobile?: boolean
): void => {
  vibrate(isMobile);
  
  const newMessage: Message = {
    id: Date.now(),
    user: 'You',
    message: '',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    avatar: '😊'
  };

  switch (action) {
    case 'offer-drive':
      setDriverStatus('driver');
      newMessage.message = `🚗 I can drive! ${carDetails.seats} seats available`;
      break;
    case 'need-ride':
      setDriverStatus('rider');
      newMessage.message = '🙋 I need a ride!';
      break;
    case 'suggest-meetup':
      newMessage.message = '📍 How about meeting at Central Park entrance?';
      break;
    case 'running-late':
      newMessage.message = '⏰ Running 10 mins late!';
      break;
    case 'share-location':
      newMessage.message = '📍 Sharing my live location...';
      break;
    case 'quick-poll':
      // This should trigger poll modal, not send message
      return;
  }

  setMessages([...messages, newMessage]);
  showToast?.({ type: 'success', message: 'Action completed!' });
};

// Format time utilities
export const formatEventTime = (startTime: string): { eventTime: string; eventDateStr: string } => {
  const eventDate = new Date(startTime);
  const eventTime = eventDate.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit' 
  });
  const eventDateStr = eventDate.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });

  return { eventTime, eventDateStr };
};

// ===== EXTRACTED EVENT HANDLERS FROM EVENTCARPOOLMODAL =====

// Handle sending messages in carpool chat
export const handleSendMessage = (
  newMessage: string,
  userId: string | null,
  messages: Message[],
  setMessages: (messages: Message[]) => void,
  setNewMessage: (message: string) => void,
  eventId: string,
  isMobile?: boolean,
  showToast?: (toast: { type: string; message: string }) => void
) => {
  if (!newMessage.trim()) return;
  
  vibrate(isMobile);
  const newMsg: Message = {
    id: Date.now(),
    user: 'You',
    userId: userId,
    message: newMessage,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    avatar: '😊'
  };
  setMessages([...messages, newMsg]);
  setNewMessage('');
  localStorage.removeItem(`carpool-draft-${eventId}`);
};

// Handle voice recording in carpool chat
export const handleVoiceRecord = (
  isVoiceRecording: boolean,
  setIsVoiceRecording: (recording: boolean) => void,
  messages: Message[],
  setMessages: (messages: Message[]) => void,
  isMobile?: boolean,
  showToast?: (toast: { type: string; message: string }) => void
) => {
  vibrate(isMobile);
  setIsVoiceRecording(!isVoiceRecording);
  if (!isVoiceRecording) {
    showToast?.({ type: 'info', message: '🎤 Recording...' });
    setTimeout(() => {
      setIsVoiceRecording(false);
      const voiceMsg: Message = {
        id: Date.now(),
        user: 'You',
        message: '🎵 Voice message (0:03)',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        avatar: '😊'
      };
      setMessages([...messages, voiceMsg]);
      showToast?.({ type: 'success', message: 'Voice message sent!' });
    }, 3000);
  }
};

// Handle creating polls in carpool chat
export const handleCreatePollInChat = (
  newPollQuestion: string,
  userId: string | null,
  polls: Poll[],
  setPolls: (polls: Poll[]) => void,
  messages: Message[],
  setMessages: (messages: Message[]) => void,
  setNewPollQuestion: (question: string) => void,
  setShowPoll: (show: boolean) => void,
  isMobile?: boolean,
  showToast?: (toast: { type: string; message: string }) => void
) => {
  if (!newPollQuestion.trim()) return;
  
  vibrate(isMobile);
  const poll: Poll = {
    id: Date.now().toString(),
    question: newPollQuestion,
    options: [
      { text: 'Yes', votes: [] },
      { text: 'No', votes: [] },
      { text: 'Maybe', votes: [] }
    ],
    createdBy: userId || '',
    active: true
  };
  setPolls([...polls, poll]);
  setMessages([...messages, {
    id: Date.now(),
    user: 'You',
    message: `📊 Poll: ${newPollQuestion}`,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    avatar: '😊'
  }]);
  setNewPollQuestion('');
  setShowPoll(false);
  showToast?.({ type: 'success', message: 'Poll created!' });
};

// Handle voting on polls in carpool chat
export const handleVotePollInChat = (
  pollId: string,
  optionIndex: number,
  userId: string | null,
  polls: Poll[],
  setPolls: (polls: Poll[]) => void,
  isMobile?: boolean
) => {
  vibrate(isMobile);
  setPolls(polls.map(poll => {
    if (poll.id === pollId) {
      const newOptions = [...poll.options];
      if (!newOptions[optionIndex].votes.includes(userId || '')) {
        newOptions[optionIndex].votes.push(userId || '');
      }
      return { ...poll, options: newOptions };
    }
    return poll;
  }));
};

// Handle changing votes on polls
export const handleChangeVoteInChat = (
  pollId: string,
  oldOptionIndex: number,
  newOptionIndex: number,
  userId: string | null,
  polls: Poll[],
  setPolls: (polls: Poll[]) => void,
  isMobile?: boolean,
  showToast?: (toast: { type: string; message: string }) => void
) => {
  setPolls(polls.map(poll => {
    if (poll.id === pollId) {
      const newOptions = [...poll.options];
      newOptions[oldOptionIndex].votes = newOptions[oldOptionIndex].votes.filter(id => id !== userId);
      if (!newOptions[newOptionIndex].votes.includes(userId || '')) {
        newOptions[newOptionIndex].votes.push(userId || '');
      }
      return { ...poll, options: newOptions };
    }
    return poll;
  }));
  vibrate(isMobile);
  showToast?.({ type: 'success', message: 'Vote changed!' });
};

// Handle saving car details
export const handleSaveCarDetailsInModal = (
  tempCarDetails: CarDetails,
  setCarDetails: (details: CarDetails) => void,
  setShowEditCarDetails: (show: boolean) => void,
  driverStatus: DriverStatus,
  messages: Message[],
  setMessages: (messages: Message[]) => void,
  showToast?: (toast: { type: string; message: string }) => void
) => {
  setCarDetails(tempCarDetails);
  setShowEditCarDetails(false);
  if (driverStatus === 'driver') {
    const carUpdateMsg: Message = {
      id: Date.now(),
      user: 'You',
      message: `🚗 Updated car info: ${tempCarDetails.make} ${tempCarDetails.color}, ${tempCarDetails.seats} seats available`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      avatar: '😊'
    };
    setMessages([...messages, carUpdateMsg]);
  }
  showToast?.({ type: 'success', message: 'Car details updated!' });
};

// Handle saving event details
export const handleSaveEventDetailsInModal = (
  tempEventDetails: EventDetails,
  setShowEditEventDetails: (show: boolean) => void,
  messages: Message[],
  setMessages: (messages: Message[]) => void,
  showToast?: (toast: { type: string; message: string }) => void
) => {
  const eventUpdateMsg: Message = {
    id: Date.now(),
    user: 'You',
    message: `📍 Updated carpool details: Meetup at ${tempEventDetails.meetupLocation}, departing ${tempEventDetails.departureTime}${tempEventDetails.notes ? ` - ${tempEventDetails.notes}` : ''}`,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    avatar: '😊'
  };
  setMessages([...messages, eventUpdateMsg]);
  setShowEditEventDetails(false);
  showToast?.({ type: 'success', message: 'Carpool details updated!' });
};

// Handle starting new carpool
export const handleStartNewCarpoolInModal = (
  setMessages: (messages: Message[]) => void,
  setPolls: (polls: Poll[]) => void,
  setDriverStatus: (status: DriverStatus) => void,
  setSelectedFriends: (friends: string[]) => void,
  setCurrentCarpoolId: (id: string | null) => void,
  setShowNewCarpoolConfirm: (show: boolean) => void,
  event: any,
  showToast?: (toast: { type: string; message: string }) => void
) => {
  setMessages([]);
  setPolls([]);
  setDriverStatus('none');
  setSelectedFriends([]);
  setCurrentCarpoolId(null);
  setShowNewCarpoolConfirm(false);
  setTimeout(() => {
    const initialMessages = initializeCarpoolChat(event);
    setMessages(initialMessages);
  }, 100);
  showToast?.({ type: 'success', message: 'Started new carpool group!' });
};

// Handle friend toggle in carpool
export const handleFriendToggleInModal = (
  friendId: string,
  selectedFriends: string[],
  setSelectedFriends: (friends: string[]) => void
) => {
  setSelectedFriends(
    selectedFriends.includes(friendId) 
      ? selectedFriends.filter(id => id !== friendId) 
      : [...selectedFriends, friendId]
  );
};

// ===== UTILITY FUNCTIONS (PRESERVED) =====

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'active': return 'text-green-600 bg-green-100 dark:bg-green-900/30';
    case 'completed': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
    case 'archived': return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30';
    default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30';
  }
};

export const getStatusIcon = (status: string): string => {
  switch (status) {
    case 'active': return 'AlertCircle';
    case 'completed': return 'CheckCircle';
    case 'archived': return 'Archive';
    default: return 'Clock';
  }
};

export const getSyncStatusIcon = (persistenceState: PersistenceState) => {
  if (!persistenceState.isOnline) {
    return { icon: 'WifiOff', className: 'text-orange-500', title: 'Offline' };
  }
  
  switch (persistenceState.syncStatus) {
    case 'synced': 
      return { icon: 'Sync', className: 'text-green-500', title: 'Synced' };
    case 'pending': 
      return { icon: 'RefreshCw', className: 'text-blue-500 animate-spin', title: 'Syncing...' };
    case 'error': 
      return { icon: 'SyncOff', className: 'text-red-500', title: 'Sync Error' };
    default: 
      return { icon: 'Database', className: 'text-gray-500', title: 'Unknown' };
  }
};
