// app/(protected)/calendar/components/carpool/utils.ts

import { createClient } from '@/lib/supabase/client';
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
  PersistenceState,
  CarDetails,
  EventDetails,
  DriverStatus
} from './types';

const supabase = createClient();

// ===== ENHANCED PERSISTENCE FUNCTIONS =====

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
        // First, check if carpool_chat_data table exists, if not create the entry in carpool_groups
        const { data: existingData } = await supabase
          .from('carpool_chat_data')
          .select('id')
          .eq('event_id', eventId)
          .eq('user_id', userId)
          .single();

        if (existingData) {
          // Update existing record
          const { error } = await supabase
            .from('carpool_chat_data')
            .update({
              data: JSON.stringify(data),
              updated_at: new Date().toISOString()
            })
            .eq('event_id', eventId)
            .eq('user_id', userId);
          
          if (error) throw error;
        } else {
          // Create new record
          const { error } = await supabase
            .from('carpool_chat_data')
            .insert({
              event_id: eventId,
              user_id: userId,
              data: JSON.stringify(data),
              updated_at: new Date().toISOString()
            });
          
          if (error) throw error;
        }
        
        showToast?.({ 
          type: 'success', 
          message: 'Carpool data saved!' 
        });

        return { success: true, message: 'Saved to cloud', carpoolId };
      } catch (supabaseError: any) {
        console.warn('Supabase save failed, using localStorage:', supabaseError);
        
        showToast?.({ 
          type: 'info', 
          message: 'Saved locally (cloud sync pending)' 
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
      message: 'Failed to save data' 
    });

    return { success: false, message: error.message };
  }
};

// Enhanced carpool data loading with offline support
export const loadCarpoolData = async (
  carpoolId?: string,
  userId?: string,
  eventId?: string,
  showToast?: (toast: { type: string; message: string }) => void
) => {
  // If only carpoolId is provided, use the original behavior for carpool groups
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
        .from('carpool_chat_data')
        .select('data')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .single();
      
      if (!error && data) {
        const carpoolData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
        
        showToast?.({ type: 'success', message: 'Carpool data loaded!' });
        return { success: true, data: carpoolData, source: 'cloud' };
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

  // No saved data found - return default
  const defaultData = {
    messages: [],
    polls: [],
    selectedFriends: [],
    driverStatus: 'none',
    carDetails: { seats: 4, make: '', color: '' },
    tempEventDetails: { meetupLocation: '', departureTime: '', notes: '' }
  };

  return { success: true, data: defaultData, source: 'default' };
};

// Clear carpool data for fresh start
export const clearCarpoolData = async (
  userId: string,
  eventId: string,
  showToast?: (toast: { type: string; message: string }) => void
) => {
  try {
    // Clear from localStorage
    const localStorageKey = `carpool-${eventId}-${userId}`;
    localStorage.removeItem(localStorageKey);
    
    // Clear draft message
    localStorage.removeItem(`carpool-draft-${eventId}`);
    
    // Clear from Supabase if online
    if (navigator.onLine) {
      await supabase
        .from('carpool_chat_data')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', userId);
    }
    
    showToast?.({ type: 'success', message: 'Carpool data cleared!' });
    return { success: true };
  } catch (error) {
    console.error('Error clearing carpool data:', error);
    showToast?.({ type: 'error', message: 'Failed to clear data' });
    return { success: false };
  }
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
      await saveCarpoolData(
        parsed.carpoolId || 'new', 
        parsed, 
        { useLocalStorage: false }, 
        userId, 
        eventId, 
        showToast
      );
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
        driver_id: userId,
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

// ===== GEOCODING AND MAP UTILITIES =====

// Geocoding function using free Nominatim service (OpenStreetMap)
export async function geocodeAddress(address: string): Promise<{lat: number, lng: number} | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      {
        headers: {
          'User-Agent': 'MyZenTribe Carpool App'
        }
      }
    );
    const data = await response.json();
    
    if (data && data[0]) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
  } catch (error) {
    console.error('Geocoding error:', error);
  }
  
  // Fallback to approximate location based on common places
  const commonLocations: { [key: string]: { lat: number; lng: number } } = {
    'dallas': { lat: 32.7767, lng: -96.7970 },
    'greenville': { lat: 33.1385, lng: -96.1108 },
    'texas': { lat: 31.9686, lng: -99.9018 },
    'new york': { lat: 40.7128, lng: -74.0060 },
    'los angeles': { lat: 34.0522, lng: -118.2437 },
    'chicago': { lat: 41.8781, lng: -87.6298 },
    'houston': { lat: 29.7604, lng: -95.3698 },
    'phoenix': { lat: 33.4484, lng: -112.0740 },
    'philadelphia': { lat: 39.9526, lng: -75.1652 },
    'san antonio': { lat: 29.4241, lng: -98.4936 },
    'san diego': { lat: 32.7157, lng: -117.1611 },
    'austin': { lat: 30.2672, lng: -97.7431 },
  };
  
  const lowerAddress = address.toLowerCase();
  for (const [city, coords] of Object.entries(commonLocations)) {
    if (lowerAddress.includes(city)) {
      return coords;
    }
  }
  
  // Default to Dallas area
  return { lat: 32.7767, lng: -96.7970 };
}

// Get distance between two coordinates (in miles)
export function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

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

// Send invite notification to friends
export const sendCarpoolInvite = async (
  eventId: string,
  eventTitle: string,
  fromUserId: string,
  fromUserName: string,
  toUserIds: string[],
  message: string,
  showToast?: (toast: { type: string; message: string }) => void
) => {
  try {
    // Create notifications for each invited user
    const notifications = toUserIds.map(toUserId => ({
      user_id: toUserId,
      type: 'carpool_invite',
      title: 'Carpool Invitation',
      message: `${fromUserName} invited you to carpool for "${eventTitle}"`,
      data: JSON.stringify({
        event_id: eventId,
        event_title: eventTitle,
        from_user_id: fromUserId,
        from_user_name: fromUserName,
        custom_message: message
      }),
      is_read: false,
      created_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('notifications')
      .insert(notifications);

    if (error) throw error;

    showToast?.({ 
      type: 'success', 
      message: `Invitations sent to ${toUserIds.length} friend${toUserIds.length > 1 ? 's' : ''}!` 
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending invites:', error);
    showToast?.({ type: 'error', message: 'Failed to send invitations' });
    return { success: false };
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

// ===== UTILITY FUNCTIONS (ALL PRESERVED) =====

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
  
  // Get event time for better departure suggestions
  const eventDate = new Date(event.start_time);
  const eventTime = eventDate.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit' 
  });
  
  // Calculate suggested departure time (30 minutes before event)
  const departureTime = new Date(eventDate.getTime() - 30 * 60000);
  const departureTimeStr = departureTime.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit' 
  });
  
  // Get location-based suggestions
  const location = event.location || 'the venue';
  const isOutdoor = event.title.toLowerCase().includes('park') || 
                   event.title.toLowerCase().includes('outdoor') || 
                   event.title.toLowerCase().includes('beach');
  
  // Get current hour for time-based suggestions
  const currentHour = new Date().getHours();
  const isRushHour = (currentHour >= 7 && currentHour <= 9) || (currentHour >= 16 && currentHour <= 19);
  
  return {
    meetupSpot: location.includes('Park') 
      ? `Main entrance of ${location} (most visible spot)`
      : location.includes('Mall') || location.includes('Center')
      ? `Food court area at ${location} (easy to find)`
      : `Main lobby/entrance of ${location} (central meeting point)`,
    
    departureTime: isRushHour 
      ? `${departureTimeStr} (accounts for rush hour traffic)`
      : `${departureTimeStr} (30min buffer recommended)`,
    
    route: location.includes('downtown') || location.includes('Downtown')
      ? 'Take main roads → Avoid construction zones → Downtown'
      : location.includes('Mall') || location.includes('mall')
      ? 'Highway → Shopping district → Mall entrance'
      : `Best route to ${location} → Check traffic updates`,
    
    parking: location.includes('Mall') || location.includes('mall')
      ? 'Free mall parking - meet near main entrance'
      : location.includes('downtown') || location.includes('Downtown')
      ? 'Use SpotHero app for pre-booking ($10-15 split between riders)'
      : isOutdoor
      ? 'Street parking usually available - arrive early'
      : 'Check venue website for parking options',
    
    weatherAlert: isOutdoor 
      ? 'Check weather forecast - outdoor event may be affected'
      : null,
    
    alternativeRoute: isRushHour
      ? 'Avoid highways during rush hour - use local roads'
      : 'Have backup route ready in case of traffic'
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
  
  // Only return the event message, no fake sample messages
  return [eventPostMessage];
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

// ===== ALL EVENT HANDLERS (PRESERVED) =====

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
    userId: userId || undefined,
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

// FIXED: Handle starting new carpool - properly clears ALL data
export const handleStartNewCarpoolInModal = (
  setMessages: (messages: Message[]) => void,
  setPolls: (polls: Poll[]) => void,
  setDriverStatus: (status: DriverStatus) => void,
  setSelectedFriends: (friends: string[]) => void,
  setCurrentCarpoolId: (id: string | null) => void,
  setShowNewCarpoolConfirm: (show: boolean) => void,
  setTempEventDetails?: (details: EventDetails) => void,
  setTempCarDetails?: (details: CarDetails) => void,
  event?: any,
  userId?: string,
  showToast?: (toast: { type: string; message: string }) => void
) => {
  // Clear ALL data for a fresh start
  setMessages([]);
  setPolls([]);
  setDriverStatus('none');
  setSelectedFriends([]);
  setCurrentCarpoolId(null);
  
  // CRITICAL: Clear event details to prevent "drum circle" carrying over
  if (setTempEventDetails) {
    setTempEventDetails({ meetupLocation: '', departureTime: '', notes: '' });
  }
  
  // Clear car details too
  if (setTempCarDetails) {
    setTempCarDetails({ seats: 4, make: '', color: '' });
  }
  
  // Clear from localStorage if we have userId and event
  if (userId && event?.id) {
    clearCarpoolData(userId, event.id);
  }
  
  setShowNewCarpoolConfirm(false);
  
  // Add only the welcome message after clearing
  if (event) {
    setTimeout(() => {
      const initialMessages = initializeCarpoolChat(event);
      setMessages(initialMessages);
    }, 100);
  }
  
  showToast?.({ type: 'success', message: 'Started fresh carpool group!' });
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

// Generate random avatar color
export function getAvatarColor(userId: string): string {
  const colors = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308', 
    '#84CC16', '#22C55E', '#10B981', '#14B8A6',
    '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
    '#8B5CF6', '#A855F7', '#D946EF', '#EC4899'
  ];
  
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}
