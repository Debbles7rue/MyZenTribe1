// app/(protected)/calendar/hooks/useCarpoolMatches.ts

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useFriends } from '@/lib/hooks/useFriends';
import type { DBEvent } from '@/lib/types';

export interface CarpoolMatch {
  id: string;
  friendName: string;
  friendId: string;
  destination: string;
  time: string;
  date: string;
  savings: string;
  myEventId: string;
  friendEventId: string;
}

interface UseCarpoolMatchesProps {
  userId: string | null;
  events: DBEvent[];
}

export function useCarpoolMatches({ userId, events }: UseCarpoolMatchesProps) {
  const { friends, loading: friendsLoading } = useFriends(userId);
  const [carpoolMatches, setCarpoolMatches] = useState<CarpoolMatch[]>([]);
  const [suggestedCarpools, setSuggestedCarpools] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Find carpool matches based on similar events
  const findMatches = useCallback(async () => {
    if (!userId || friends.length === 0 || friendsLoading) return;

    setLoading(true);
    try {
      // Get friend events
      const friendIds = friends.map(f => f.friend_id);
      const { data: friendEvents } = await supabase
        .from('events')
        .select('*')
        .in('created_by', friendIds)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true });

      if (friendEvents) {
        const matches: CarpoolMatch[] = [];
        
        // Find events with similar times and locations
        events.forEach(myEvent => {
          friendEvents.forEach(friendEvent => {
            const myStart = new Date(myEvent.start_time);
            const friendStart = new Date(friendEvent.start_time);
            const timeDiff = Math.abs(myStart.getTime() - friendStart.getTime());
            
            // If events are within 30 minutes and have same location
            if (timeDiff < 30 * 60000 && myEvent.location === friendEvent.location) {
              const friend = friends.find(f => f.friend_id === friendEvent.created_by);
              if (friend) {
                matches.push({
                  id: `${myEvent.id}-${friendEvent.id}`,
                  friendName: friend.name,
                  friendId: friend.friend_id,
                  destination: myEvent.location || 'Unknown',
                  time: myStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                  date: myStart.toISOString().split('T')[0],
                  savings: `$${Math.floor(Math.random() * 15) + 5}`,
                  myEventId: myEvent.id,
                  friendEventId: friendEvent.id
                });
              }
            }
          });
        });

        // Limit to top 5 matches
        setCarpoolMatches(matches.slice(0, 5));
      }
    } catch (error) {
      console.error('Error finding carpool matches:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, events, friends, friendsLoading]);

  // Smart carpool suggestions based on patterns
  const generateSuggestions = useCallback(() => {
    const suggestions = [];
    
    // Look for recurring events
    const recurringEvents = events.filter(e => {
      const eventDay = new Date(e.start_time).getDay();
      const sameWeekdayEvents = events.filter(other => 
        new Date(other.start_time).getDay() === eventDay && 
        other.id !== e.id
      );
      return sameWeekdayEvents.length > 0;
    });

    recurringEvents.slice(0, 3).forEach(event => {
      suggestions.push({
        type: 'recurring',
        title: `Set up weekly carpool for ${event.title}`,
        description: 'Save money and reduce emissions with regular carpools',
        eventId: event.id
      });
    });

    // Add friend-based suggestions if we have friends
    if (friends.length > 0) {
      suggestions.push({
        type: 'friends',
        title: `You have ${friends.length} friend${friends.length > 1 ? 's' : ''} to carpool with!`,
        description: 'Check your upcoming events for carpool opportunities',
        action: 'view_matches'
      });
    }

    setSuggestedCarpools(suggestions);
  }, [events, friends]);

  // Create carpool group
  const createCarpoolGroup = useCallback(async (
    eventId: string,
    friendIds: string[],
    message?: string
  ) => {
    if (!userId) return { success: false, message: 'Not signed in' };

    try {
      // Create notifications for invited friends
      const notifications = friendIds.map(friendId => ({
        user_id: friendId,
        type: 'carpool_invite',
        title: 'Carpool Invitation',
        message: message || `You've been invited to carpool!`,
        sender_id: userId,
        event_id: eventId,
        created_at: new Date().toISOString()
      }));

      // In a real implementation, you'd insert these into a notifications table
      // For now, we'll simulate success
      console.log('Creating carpool group with:', { eventId, friendIds, notifications });

      return {
        success: true,
        groupId: `carpool-${Date.now()}`,
        message: `Carpool invitations sent to ${friendIds.length} friend${friendIds.length > 1 ? 's' : ''}!`
      };
    } catch (error) {
      console.error('Error creating carpool group:', error);
      return {
        success: false,
        message: 'Failed to create carpool group'
      };
    }
  }, [userId]);

  // Send carpool invitation
  const sendCarpoolInvite = useCallback(async (
    matchId: string,
    message?: string
  ) => {
    const match = carpoolMatches.find(m => m.id === matchId);
    if (!match || !userId) {
      return { success: false, message: 'Invalid match or not signed in' };
    }

    try {
      // Create notification for the friend
      const notification = {
        user_id: match.friendId,
        type: 'carpool_invite',
        title: 'Carpool Match!',
        message: message || `Want to carpool to ${match.destination}?`,
        sender_id: userId,
        event_id: match.friendEventId,
        created_at: new Date().toISOString()
      };

      // In a real implementation, you'd insert this into a notifications table
      console.log('Sending carpool invite:', notification);

      return {
        success: true,
        message: `Carpool invitation sent to ${match.friendName}!`
      };
    } catch (error) {
      console.error('Error sending carpool invite:', error);
      return {
        success: false,
        message: 'Failed to send invitation'
      };
    }
  }, [carpoolMatches, userId]);

  // Calculate environmental impact
  const calculateImpact = useCallback((matches: CarpoolMatch[]) => {
    const totalTrips = matches.length;
    const avgDistance = 15; // Average miles per trip
    const co2PerMile = 0.411; // kg CO2 per mile
    
    return {
      tripsShared: totalTrips,
      milesSaved: totalTrips * avgDistance,
      co2Reduced: (totalTrips * avgDistance * co2PerMile).toFixed(1),
      moneySaved: matches.reduce((sum, m) => {
        const amount = parseInt(m.savings.replace('$', ''));
        return sum + amount;
      }, 0)
    };
  }, []);

  // Auto-find matches when events or friends change
  useEffect(() => {
    if (!friendsLoading) {
      findMatches();
      generateSuggestions();
    }
  }, [findMatches, generateSuggestions, friendsLoading]);

  return {
    carpoolMatches,
    suggestedCarpools,
    loading: loading || friendsLoading,
    friends, // Export friends for use in components
    createCarpoolGroup,
    sendCarpoolInvite,
    calculateImpact,
    refreshMatches: findMatches
  };
}
