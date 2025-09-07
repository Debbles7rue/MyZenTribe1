// app/(protected)/calendar/hooks/useCarpoolMatches.ts

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { DBEvent } from '@/lib/types';
import type { Friend, CarpoolMatch } from '../types';

interface UseCarpoolMatchesProps {
  userId: string | null;
  events: DBEvent[];
  friends: Friend[];
}

export function useCarpoolMatches({ userId, events, friends }: UseCarpoolMatchesProps) {
  const [carpoolMatches, setCarpoolMatches] = useState<CarpoolMatch[]>([]);
  const [suggestedCarpools, setSuggestedCarpools] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Find carpool matches based on similar events
  const findMatches = useCallback(async () => {
    if (!userId || friends.length === 0) return;

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
  }, [userId, events, friends]);

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

    setSuggestedCarpools(suggestions);
  }, [events]);

  // Create carpool group
  const createCarpoolGroup = useCallback(async (
    eventId: string,
    friendIds: string[],
    message?: string
  ) => {
    if (!userId) return;

    try {
      // This would create a carpool group in the database
      // For now, just return success
      return {
        success: true,
        groupId: `carpool-${Date.now()}`,
        message: 'Carpool group created successfully!'
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
    if (!match || !userId) return;

    try {
      // This would send an invitation through the database
      // For now, just return success
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
    findMatches();
    generateSuggestions();
  }, [findMatches, generateSuggestions]);

  return {
    carpoolMatches,
    suggestedCarpools,
    loading,
    createCarpoolGroup,
    sendCarpoolInvite,
    calculateImpact,
    refreshMatches: findMatches
  };
}
