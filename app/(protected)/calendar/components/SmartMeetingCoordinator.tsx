// app/(protected)/calendar/components/SmartMeetingCoordinator.tsx

import React, { useState, useMemo } from 'react';
import type { DBEvent } from '@/lib/types';
import type { Friend } from '../types';

interface SmartMeetingCoordinatorProps {
  events: DBEvent[];
  friends: Friend[];
  onScheduleMeeting: (meeting: any) => void;
  onClose: () => void;
}

export default function SmartMeetingCoordinator({
  events,
  friends,
  onScheduleMeeting,
  onClose
}: SmartMeetingCoordinatorProps) {
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [duration, setDuration] = useState(60); // minutes
  const [preferredTime, setPreferredTime] = useState<'morning' | 'afternoon' | 'evening'>('afternoon');
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  // Find available time slots
  const availableSlots = useMemo(() => {
    const slots: Array<{ date: string; time: string; score: number }> = [];
    
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    
    // Define time preferences
    const timeRanges = {
      morning: { start: 9, end: 12 },
      afternoon: { start: 13, end: 17 },
      evening: { start: 18, end: 21 }
    };
    
    const preferredRange = timeRanges[preferredTime];
    
    // Check each day in the range
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayEvents = events.filter(e => {
        const eventDate = new Date(e.start_time);
        return eventDate.toDateString() === d.toDateString();
      });
      
      // Check each hour in the preferred time range
      for (let hour = preferredRange.start; hour < preferredRange.end; hour++) {
        const slotStart = new Date(d);
        slotStart.setHours(hour, 0, 0, 0);
        const slotEnd = new Date(slotStart.getTime() + duration * 60000);
        
        // Check if this slot conflicts with any existing events
        const hasConflict = dayEvents.some(e => {
          const eventStart = new Date(e.start_time);
          const eventEnd = new Date(e.end_time);
          return (slotStart < eventEnd && slotEnd > eventStart);
        });
        
        if (!hasConflict) {
          // Calculate a score based on various factors
          let score = 100;
          
          // Prefer slots not adjacent to other meetings
          const hasAdjacentMeeting = dayEvents.some(e => {
            const eventStart = new Date(e.start_time);
            const eventEnd = new Date(e.end_time);
            const buffer = 30 * 60000; // 30 minute buffer
            return Math.abs(slotStart.getTime() - eventEnd.getTime()) < buffer ||
                   Math.abs(slotEnd.getTime() - eventStart.getTime()) < buffer;
          });
          if (hasAdjacentMeeting) score -= 20;
          
          // Prefer mid-week
          const dayOfWeek = d.getDay();
          if (dayOfWeek === 2 || dayOfWeek === 3 || dayOfWeek === 4) score += 10;
          
          // Avoid Monday mornings and Friday afternoons
          if (dayOfWeek === 1 && hour < 11) score -= 15;
          if (dayOfWeek === 5 && hour > 14) score -= 15;
          
          slots.push({
            date: d.toISOString().split('T')[0],
            time: `${hour.toString().padStart(2, '0')}:00`,
            score
          });
        }
      }
    }
    
    // Sort by score (highest first) and return top 5
    return slots.sort((a, b) => b.score - a.score).slice(0, 5);
  }, [events, dateRange, duration, preferredTime]);

  const handleSchedule = (slot: any) => {
    const meeting = {
      title: 'Team Meeting',
      start_time: `${slot.date}T${slot.time}`,
      end_time: new Date(new Date(`${slot.date}T${slot.time}`).getTime() + duration * 60000).toISOString(),
      participants: Array.from(selectedFriends),
      type: 'meeting'
    };
    
    onScheduleMeeting(meeting);
  };

  return (
    <div className="space-y-6">
      {/* Friend Selection */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Select Participants</h3>
        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
          {friends.map((friend) => (
            <label
              key={friend.friend_id}
              className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
            >
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
                className="cursor-pointer"
              />
              <span className="text-sm">{friend.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Meeting Configuration */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Duration</label>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
          >
            <option value={30}>30 minutes</option>
            <option value={45}>45 minutes</option>
            <option value={60}>1 hour</option>
            <option value={90}>1.5 hours</option>
            <option value={120}>2 hours</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Preferred Time</label>
          <select
            value={preferredTime}
            onChange={(e) => setPreferredTime(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
          >
            <option value="morning">Morning (9am-12pm)</option>
            <option value="afternoon">Afternoon (1pm-5pm)</option>
            <option value="evening">Evening (6pm-9pm)</option>
          </select>
        </div>
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Start Date</label>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">End Date</label>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
          />
        </div>
      </div>

      {/* Available Slots */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Suggested Time Slots</h3>
        {availableSlots.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">
            No available slots found. Try adjusting your criteria.
          </p>
        ) : (
          <div className="space-y-2">
            {availableSlots.map((slot, index) => {
              const date = new Date(slot.date);
              const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
              const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              
              return (
                <button
                  key={index}
                  onClick={() => handleSchedule(slot)}
                  className="w-full p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg hover:shadow-md transition-all text-left"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {dayName}, {dateStr}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {slot.time} ({duration} minutes)
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-1 rounded-full">
                        Score: {slot.score}%
                      </div>
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
