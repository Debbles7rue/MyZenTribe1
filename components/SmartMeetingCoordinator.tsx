// components/SmartMeetingCoordinator.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { DBEvent } from '@/lib/types';

interface TimeSlot {
  start: Date;
  end: Date;
  availableCount: number;
  availableUsers: string[];
  conflicts: { userId: string; reason: string }[];
  score: number;
}

interface Participant {
  user_id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

interface Constraints {
  dateRange: {
    from: string;
    to: string;
  };
  timeRange: {
    earliest: string; // "09:00"
    latest: string;   // "17:00"
  };
  daysOfWeek: string[];
  avoidLunch?: boolean;
  bufferTime?: number; // minutes between events
}

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string;
  friends: Array<{ friend_id: string; name: string; avatar_url?: string }>;
  userEvents: DBEvent[];
  onSchedule: (event: any) => void;
}

export default function SmartMeetingCoordinator({ 
  open, 
  onClose, 
  userId, 
  friends = [], 
  userEvents,
  onSchedule 
}: Props) {
  const [step, setStep] = useState<'setup' | 'constraints' | 'finding' | 'results' | 'voting'>('setup');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(60);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [constraints, setConstraints] = useState<Constraints>({
    dateRange: {
      from: new Date().toISOString().split('T')[0],
      to: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    },
    timeRange: {
      earliest: '09:00',
      latest: '21:00'
    },
    daysOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    avoidLunch: false,
    bufferTime: 15
  });
  const [possibleSlots, setPossibleSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loading, setLoading] = useState(false);

  // Find available time slots algorithm
  const findAvailableSlots = async () => {
    setLoading(true);
    setStep('finding');

    try {
      // Get all participants' events (simplified - in production, you'd fetch friends' events)
      const participantIds = [userId, ...selectedFriends];
      
      // For this demo, we'll generate possible slots
      const slots: TimeSlot[] = [];
      const startDate = new Date(constraints.dateRange.from);
      const endDate = new Date(constraints.dateRange.to);
      
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
        
        // Check if this day is allowed
        if (!constraints.daysOfWeek.includes(dayName)) continue;
        
        // Generate time slots for this day
        const [earliestHour, earliestMin] = constraints.timeRange.earliest.split(':').map(Number);
        const [latestHour, latestMin] = constraints.timeRange.latest.split(':').map(Number);
        
        for (let hour = earliestHour; hour < latestHour; hour++) {
          for (let min = 0; min < 60; min += 30) {
            // Skip lunch hours if requested
            if (constraints.avoidLunch && hour >= 12 && hour < 13) continue;
            
            const slotStart = new Date(d);
            slotStart.setHours(hour, min, 0, 0);
            
            const slotEnd = new Date(slotStart);
            slotEnd.setMinutes(slotEnd.getMinutes() + duration);
            
            // Check if end time is within constraints
            if (slotEnd.getHours() > latestHour || 
                (slotEnd.getHours() === latestHour && slotEnd.getMinutes() > latestMin)) {
              continue;
            }
            
            // Check conflicts with existing events
            const conflicts: { userId: string; reason: string }[] = [];
            let availableCount = participantIds.length;
            
            userEvents.forEach(event => {
              const eventStart = new Date(event.start_time);
              const eventEnd = new Date(event.end_time);
              
              // Add buffer time
              const bufferedStart = new Date(eventStart.getTime() - constraints.bufferTime! * 60000);
              const bufferedEnd = new Date(eventEnd.getTime() + constraints.bufferTime! * 60000);
              
              // Check for overlap
              if (
                (slotStart >= bufferedStart && slotStart < bufferedEnd) ||
                (slotEnd > bufferedStart && slotEnd <= bufferedEnd) ||
                (slotStart <= bufferedStart && slotEnd >= bufferedEnd)
              ) {
                conflicts.push({
                  userId: event.created_by,
                  reason: event.title
                });
                availableCount--;
              }
            });
            
            // Calculate score (higher is better)
            const score = calculateSlotScore(slotStart, availableCount, participantIds.length);
            
            slots.push({
              start: slotStart,
              end: slotEnd,
              availableCount,
              availableUsers: participantIds.filter(id => 
                !conflicts.some(c => c.userId === id)
              ),
              conflicts,
              score
            });
          }
        }
      }
      
      // Sort by score and filter top options
      const sortedSlots = slots
        .filter(s => s.availableCount >= Math.ceil(participantIds.length * 0.6)) // At least 60% can attend
        .sort((a, b) => b.score - a.score)
        .slice(0, 10); // Top 10 options
      
      setPossibleSlots(sortedSlots);
      setStep('results');
    } catch (error) {
      console.error('Error finding slots:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate score for a time slot
  const calculateSlotScore = (start: Date, available: number, total: number): number => {
    let score = (available / total) * 100;
    
    // Prefer mornings slightly
    const hour = start.getHours();
    if (hour >= 9 && hour < 12) score += 10;
    
    // Prefer weekdays for work meetings
    const day = start.getDay();
    if (day >= 1 && day <= 5) score += 5;
    
    // Prefer sooner rather than later
    const daysFromNow = Math.floor((start.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    score -= daysFromNow * 2;
    
    return Math.max(0, Math.min(100, score));
  };

  // Create the meeting event
  const scheduleMeeting = async () => {
    if (!selectedSlot) return;
    
    const event = {
      title,
      description,
      start_time: selectedSlot.start.toISOString(),
      end_time: selectedSlot.end.toISOString(),
      created_by: userId,
      visibility: 'private',
      event_type: 'meeting',
      metadata: {
        coordinator: true,
        participants: selectedFriends,
        availableCount: selectedSlot.availableCount
      }
    };
    
    onSchedule(event);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setStep('setup');
    setTitle('');
    setDescription('');
    setDuration(60);
    setSelectedFriends([]);
    setPossibleSlots([]);
    setSelectedSlot(null);
  };

  if (!open) return null;

  const renderStep = () => {
    switch (step) {
      case 'setup':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">What's the meeting about?</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meeting Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Coffee catch-up, Team sync, etc."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg 
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Any additional details..."
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg 
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration
                  </label>
                  <div className="flex gap-2">
                    {[30, 60, 90, 120].map(mins => (
                      <button
                        key={mins}
                        onClick={() => setDuration(mins)}
                        className={`px-4 py-2 rounded-lg border-2 transition-all ${
                          duration === mins
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {mins < 60 ? `${mins} min` : `${mins/60} ${mins === 60 ? 'hour' : 'hours'}`}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Who should we include? *
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {friends.map(friend => (
                      <label
                        key={friend.friend_id}
                        className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedFriends.includes(friend.friend_id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedFriends.includes(friend.friend_id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedFriends([...selectedFriends, friend.friend_id]);
                            } else {
                              setSelectedFriends(selectedFriends.filter(id => id !== friend.friend_id));
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm font-medium">{friend.name}</span>
                      </label>
                    ))}
                  </div>
                  {selectedFriends.length === 0 && (
                    <p className="text-xs text-gray-500 mt-2">Select at least one person</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={() => setStep('constraints')}
                disabled={!title || selectedFriends.length === 0}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  title && selectedFriends.length > 0
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                Next: Set Preferences
              </button>
            </div>
          </div>
        );

      case 'constraints':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">When should we meet?</h3>
            
            <div className="space-y-4">
              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-600">From</label>
                    <input
                      type="date"
                      value={constraints.dateRange.from}
                      onChange={(e) => setConstraints({
                        ...constraints,
                        dateRange: { ...constraints.dateRange, from: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">To</label>
                    <input
                      type="date"
                      value={constraints.dateRange.to}
                      onChange={(e) => setConstraints({
                        ...constraints,
                        dateRange: { ...constraints.dateRange, to: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>
              
              {/* Time Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time Range
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-600">Earliest</label>
                    <input
                      type="time"
                      value={constraints.timeRange.earliest}
                      onChange={(e) => setConstraints({
                        ...constraints,
                        timeRange: { ...constraints.timeRange, earliest: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Latest</label>
                    <input
                      type="time"
                      value={constraints.timeRange.latest}
                      onChange={(e) => setConstraints({
                        ...constraints,
                        timeRange: { ...constraints.timeRange, latest: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>
              
              {/* Days of Week */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available Days
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                    <button
                      key={day}
                      onClick={() => {
                        if (constraints.daysOfWeek.includes(day)) {
                          setConstraints({
                            ...constraints,
                            daysOfWeek: constraints.daysOfWeek.filter(d => d !== day)
                          });
                        } else {
                          setConstraints({
                            ...constraints,
                            daysOfWeek: [...constraints.daysOfWeek, day]
                          });
                        }
                      }}
                      className={`px-3 py-1 rounded-full text-sm transition-all ${
                        constraints.daysOfWeek.includes(day)
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Additional Options */}
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={constraints.avoidLunch}
                    onChange={(e) => setConstraints({
                      ...constraints,
                      avoidLunch: e.target.checked
                    })}
                    className="rounded"
                  />
                  <span className="text-sm">Avoid lunch hours (12-1pm)</span>
                </label>
                
                <div className="flex items-center gap-3">
                  <label className="text-sm">Buffer time between events:</label>
                  <select
                    value={constraints.bufferTime}
                    onChange={(e) => setConstraints({
                      ...constraints,
                      bufferTime: parseInt(e.target.value)
                    })}
                    className="px-3 py-1 border border-gray-300 rounded-lg"
                  >
                    <option value="0">None</option>
                    <option value="15">15 min</option>
                    <option value="30">30 min</option>
                    <option value="60">1 hour</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between">
              <button
                onClick={() => setStep('setup')}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Back
              </button>
              <button
                onClick={findAvailableSlots}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white 
                         rounded-lg font-medium hover:from-blue-700 hover:to-purple-700"
              >
                Find Available Times
              </button>
            </div>
          </div>
        );

      case 'finding':
        return (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Analyzing calendars...</p>
            <p className="text-sm text-gray-500 mt-2">Finding the best times for everyone</p>
          </div>
        );

      case 'results':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Best Available Times</h3>
              <p className="text-sm text-gray-600">
                Found {possibleSlots.length} possible slots for {selectedFriends.length + 1} participants
              </p>
            </div>
            
            {possibleSlots.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">No common available times found.</p>
                <button
                  onClick={() => setStep('constraints')}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Adjust preferences
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {possibleSlots.map((slot, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedSlot(slot)}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      selectedSlot === slot
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">
                        {slot.start.toLocaleDateString('en-US', { 
                          weekday: 'long',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                      <div className="text-sm text-gray-600">
                        {slot.start.toLocaleTimeString('en-US', { 
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                        {' - '}
                        {slot.end.toLocaleTimeString('en-US', { 
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className={`text-sm ${
                        slot.availableCount === selectedFriends.length + 1
                          ? 'text-green-600 font-medium'
                          : 'text-amber-600'
                      }`}>
                        {slot.availableCount === selectedFriends.length + 1
                          ? '✅ Everyone available'
                          : `⚠️ ${slot.availableCount}/${selectedFriends.length + 1} available`
                        }
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-2 h-2 rounded-full ${
                              i < Math.round(slot.score / 20)
                                ? 'bg-green-500'
                                : 'bg-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    
                    {slot.conflicts.length > 0 && (
                      <div className="mt-2 text-xs text-gray-500">
                        Conflicts: {slot.conflicts.map(c => c.reason).join(', ')}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
            
            <div className="flex justify-between">
              <button
                onClick={() => setStep('constraints')}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Back
              </button>
              <button
                onClick={scheduleMeeting}
                disabled={!selectedSlot}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  selectedSlot
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                Schedule Meeting
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <span>🤝</span> Smart Meeting Coordinator
              </h2>
              <p className="text-blue-100 text-sm mt-1">
                Find the perfect time for everyone
              </p>
            </div>
            <button
              onClick={() => {
                handleReset();
                onClose();
              }}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Progress Indicator */}
          <div className="flex items-center gap-2 mt-4">
            {['Setup', 'Preferences', 'Finding', 'Results'].map((label, idx) => {
              const stepIndex = ['setup', 'constraints', 'finding', 'results'].indexOf(step);
              const isActive = idx <= stepIndex;
              
              return (
                <div key={label} className="flex items-center flex-1">
                  <div className={`flex items-center gap-2 ${idx > 0 ? 'flex-1' : ''}`}>
                    {idx > 0 && (
                      <div className={`flex-1 h-0.5 ${isActive ? 'bg-white' : 'bg-white/30'}`} />
                    )}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      isActive ? 'bg-white text-blue-600' : 'bg-white/30 text-white/70'
                    }`}>
                      {idx + 1}
                    </div>
                  </div>
                  {idx === 3 && (
                    <div className="flex-1 h-0.5 bg-white/30" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-180px)] overflow-y-auto">
          {renderStep()}
        </div>
      </div>
    </div>
  );
}
