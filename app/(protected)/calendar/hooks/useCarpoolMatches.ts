// app/(protected)/calendar/hooks/useCarpoolMatches.ts
// Simplified version that provides data for EventCarpoolModal

import { useMemo } from 'react';
import type { DBEvent } from '@/lib/types';
import type { Friend, CarpoolMatch } from '../types';

/**
 * Simplified carpool matching hook that finds potential carpool opportunities
 * and formats them for use with EventCarpoolModal
 */
export function useCarpoolMatches(events: DBEvent[], friends: Friend[]): CarpoolMatch[] {
  return useMemo(() => {
    if (!events?.length || !friends?.length) return [];
    
    const matches: CarpoolMatch[] = [];
    const now = new Date();
    
    // Find upcoming events with locations that could be carpooled
    const upcomingEvents = events.filter(event => 
      new Date(event.start_time) > now && 
      event.location && 
      event.visibility !== 'private' // Only suggest carpools for non-private events
    );
    
    // For each upcoming event, check if any friends might be interested
    upcomingEvents.forEach(event => {
      // In a real app, this would check:
      // - If friends have similar events at the same time
      // - If friends live nearby
      // - Past carpool history
      // - Friend preferences
      
      // For now, we'll simulate matches for events in the next 7 days
      const eventDate = new Date(event.start_time);
      const daysUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysUntilEvent <= 7) {
        // Simulate that some friends might be going to the same place
        // In production, this would be based on actual friend event data
        const potentialFriends = friends.filter(friend => {
          // Add your matching logic here
          // For demo: 30% chance a friend is going to the same event
          return Math.random() > 0.7;
        }).slice(0, 3); // Limit to 3 friends per event
        
        if (potentialFriends.length > 0) {
          // Calculate potential savings
          const avgDistanceMiles = 15;
          const gasPrice = 3.50;
          const mpg = 25;
          const peopleCount = potentialFriends.length + 1;
          
          const totalCost = (avgDistanceMiles / mpg) * gasPrice;
          const savedAmount = totalCost * (peopleCount - 1) / peopleCount;
          const co2Saved = (avgDistanceMiles / mpg) * 8.89 * (peopleCount - 1) / peopleCount;
          
          matches.push({
            event,
            friends: potentialFriends,
            savings: {
              amount: `$${savedAmount.toFixed(2)}`,
              co2Saved: Math.round(co2Saved * 10) / 10
            }
          });
        }
      }
    });
    
    // Sort by event date and return top 5 matches
    return matches
      .sort((a, b) => 
        new Date(a.event.start_time).getTime() - 
        new Date(b.event.start_time).getTime()
      )
      .slice(0, 5);
  }, [events, friends]);
}
