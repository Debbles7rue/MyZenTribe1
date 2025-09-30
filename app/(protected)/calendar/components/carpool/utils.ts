// app/(protected)/calendar/components/carpool/utils.ts

import { createClient } from '@supabase/supabase-js';
import type { DBEvent } from '@/lib/types';
import type { 
  Message, 
  Poll, 
  CarpoolGroup, 
  CarpoolParticipant, 
  AISuggestions,
  CarpoolStats 
} from './types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Database Functions
export const loadCarpoolData = async (carpoolGroupId: string) => {
  try {
    // Load carpool group details
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
      .eq('id', carpoolGroupId)
      .single();

    if (groupError) throw groupError;

    // Load messages
    const { data: messages, error: messagesError } = await supabase
      .from('carpool_messages')
      .select('*')
      .eq('group_id', carpoolGroupId)
      .order('created_at', { ascending: true });

    if (messagesError) throw messagesError;

    // Load polls
    const { data: polls, error: pollsError } = await supabase
      .from('carpool_polls')
      .select(`
        *,
        carpool_poll_votes (*)
      `)
      .eq('group_id', carpoolGroupId)
      .eq('active', true);

    if (pollsError) throw pollsError;

    return { group, messages, polls };
  } catch (error) {
    console.error('Error loading carpool data:', error);
    throw error;
  }
};

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

// Utility Functions
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
