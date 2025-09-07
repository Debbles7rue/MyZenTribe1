// app/(protected)/calendar/components/SmartMeetingCoordinator.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { DBEvent } from '@/lib/types';
import type { Friend } from '../types';

interface SmartMeetingCoordinatorProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  friends: Friend[];
  userEvents: DBEvent[];
  onSchedule: (event: any) => void;
}

interface TimeSlot {
  date: Date;
  startTime: string;
  endTime: string;
  availability: Map<string, boolean>;
  score: number;
  conflicts: string[];
}

interface Participant {
  id: string;
  name: string;
  email?: string;
  isAvailable?: boolean;
  events?: DBEvent[];
}

export default function SmartMeetingCoordinator({
  open,
  onClose,
  userId,
  friends,
  userEvents,
  onSchedule
}: SmartMeetingCoordinatorProps) {
  const [step, setStep] = useState<'details' | 'participants' | 'ai-slots' | 'confirm'>('details');
  const [meetingDetails, setMeetingDetails] = useState({
    title: '',
    description: '',
    duration: 60, // minutes
    location: '',
    type: 'in-person' as 'in-person' | 'virtual' | 'hybrid',
    preferredTimes: {
      morning: false,
      afternoon: true,
      evening: false
    },
    dateRange: {
      start: new Date().toISOString().split('T')[0],
      end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }
  });

  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());
  const [participantAvailability, setParticipantAvailability] = useState<Map<string, DBEvent[]>>(new Map());
  const [suggestedSlots, setSuggestedSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [shareableLink, setShareableLink] = useState('');
  const [sendMethod, setSendMethod] = useState<'app' | 'email' | 'link'>('app');

  // Fetch participant availability
  const fetchParticipantAvailability = useCallback(async () => {
    if (selectedParticipants.size === 0) return;

    setIsAnalyzing(true);
    const availability = new Map<string, DBEvent[]>();

    try {
      for (const participantId of selectedParticipants) {
        const { data } = await supabase
          .from('events')
          .select('*')
          .eq('created_by', participantId)
          .gte('start_time', meetingDetails.dateRange.start)
          .lte('start_time', meetingDetails.dateRange.end);

        if (data) {
          availability.set(participantId, data);
        }
      }
      setParticipantAvailability(availability);
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedParticipants, meetingDetails.dateRange]);

  // AI-powered slot finding algorithm
  const findOptimalSlots = useCallback(() => {
    setIsAnalyzing(true);
    const slots: TimeSlot[] = [];
    const startDate = new Date(meetingDetails.dateRange.start);
    const endDate = new Date(meetingDetails.dateRange.end);
    
    // All participant events including user
    const allEvents = [...userEvents];
    participantAvailability.forEach(events => {
      allEvents.push(...events);
    });

    // Generate potential time slots
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      // Skip weekends if needed
      if (d.getDay() === 0 || d.getDay() === 6) continue;

      // Check preferred times
      const timeRanges = [];
      if (meetingDetails.preferredTimes.morning) {
        timeRanges.push({ start: 9, end: 12 });
      }
      if (meetingDetails.preferredTimes.afternoon) {
        timeRanges.push({ start: 13, end: 17 });
      }
      if (meetingDetails.preferredTimes.evening) {
        timeRanges.push({ start: 18, end: 20 });
      }

      for (const range of timeRanges) {
        for (let hour = range.start; hour < range.end; hour++) {
          const slotStart = new Date(d);
          slotStart.setHours(hour, 0, 0, 0);
          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotEnd.getMinutes() + meetingDetails.duration);

          // Check conflicts
          const conflicts: string[] = [];
          const availability = new Map<string, boolean>();
          
          // Check user availability
          const userConflict = userEvents.some(event => {
            const eventStart = new Date(event.start_time);
            const eventEnd = new Date(event.end_time);
            return slotStart < eventEnd && slotEnd > eventStart;
          });
          
          availability.set(userId, !userConflict);
          if (userConflict) conflicts.push('You');

          // Check each participant
          selectedParticipants.forEach(participantId => {
            const participantEvents = participantAvailability.get(participantId) || [];
            const hasConflict = participantEvents.some(event => {
              const eventStart = new Date(event.start_time);
              const eventEnd = new Date(event.end_time);
              return slotStart < eventEnd && slotEnd > eventStart;
            });
            
            availability.set(participantId, !hasConflict);
            if (hasConflict) {
              const friend = friends.find(f => f.friend_id === participantId);
              conflicts.push(friend?.name || 'Participant');
            }
          });

          // Calculate score (higher is better)
          let score = 100;
          score -= conflicts.length * 20;
          
          // Bonus for preferred times
          if (hour >= 9 && hour < 12 && meetingDetails.preferredTimes.morning) score += 10;
          if (hour >= 13 && hour < 17 && meetingDetails.preferredTimes.afternoon) score += 10;
          if (hour >= 18 && hour < 20 && meetingDetails.preferredTimes.evening) score += 10;
          
          // Penalty for early morning or late evening
          if (hour < 9) score -= 20;
          if (hour > 19) score -= 15;
          
          // Bonus for near-future dates
          const daysFromNow = Math.floor((slotStart.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          if (daysFromNow <= 3) score += 15;
          else if (daysFromNow <= 7) score += 10;

          slots.push({
            date: new Date(slotStart),
            startTime: slotStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
            endTime: slotEnd.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
            availability,
            score,
            conflicts
          });
        }
      }
    }

    // Sort by score and take top 10
    slots.sort((a, b) => b.score - a.score);
    setSuggestedSlots(slots.slice(0, 10));
    setIsAnalyzing(false);
  }, [meetingDetails, userEvents, participantAvailability, selectedParticipants, friends, userId]);

  // Generate shareable link
  const generateShareableLink = useCallback(async () => {
    const meetingData = {
      title: meetingDetails.title,
      description: meetingDetails.description,
      suggestedSlots: suggestedSlots.slice(0, 5),
      organizer: userId,
      created_at: new Date().toISOString()
    };

    // In production, this would create a unique URL
    const encodedData = btoa(JSON.stringify(meetingData));
    const link = `${window.location.origin}/meeting-poll/${encodedData.slice(0, 10)}`;
    setShareableLink(link);
    
    return link;
  }, [meetingDetails, suggestedSlots, userId]);

  // Send invites
  const sendInvites = useCallback(async () => {
    const link = await generateShareableLink();
    
    if (sendMethod === 'app') {
      // Send in-app notifications
      for (const participantId of selectedParticipants) {
        await supabase.from('notifications').insert({
          user_id: participantId,
          type: 'meeting_invite',
          title: `Meeting Request: ${meetingDetails.title}`,
          message: `You're invited to help schedule a meeting. Click to view available times.`,
          link,
          created_by: userId
        });
      }
    } else if (sendMethod === 'email') {
      // Trigger email sending (would need email service)
      console.log('Sending email invites...');
    }
    
    // Copy link to clipboard
    navigator.clipboard.writeText(link);
  }, [generateShareableLink, selectedParticipants, meetingDetails.title, userId, sendMethod]);

  // Schedule the meeting
  const handleScheduleMeeting = async () => {
    if (!selectedSlot) return;

    const event = {
      title: meetingDetails.title,
      description: meetingDetails.description,
      location: meetingDetails.location,
      start_time: selectedSlot.date.toISOString(),
      end_time: new Date(selectedSlot.date.getTime() + meetingDetails.duration * 60000).toISOString(),
      created_by: userId,
      visibility: 'private' as const,
      event_type: 'meeting',
      participants: Array.from(selectedParticipants),
      source: 'personal' as const
    };

    onSchedule(event);
    await sendInvites();
  };

  // Auto-analyze when participants change
  useEffect(() => {
    if (step === 'ai-slots' && selectedParticipants.size > 0) {
      fetchParticipantAvailability().then(() => {
        findOptimalSlots();
      });
    }
  }, [step, selectedParticipants, fetchParticipantAvailability, findOptimalSlots]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">🤖 Smart Meeting Coordinator</h2>
              <p className="text-sm opacity-90 mt-1">AI-powered scheduling that works for everyone</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/20 transition-colors"
            >
              ✕
            </button>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center gap-2 mt-4">
            {['details', 'participants', 'ai-slots', 'confirm'].map((s, idx) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                              ${step === s ? 'bg-white text-blue-600' : 
                                ['details', 'participants', 'ai-slots', 'confirm'].indexOf(step) > idx 
                                  ? 'bg-green-500 text-white' : 'bg-white/30 text-white'}`}>
                  {['details', 'participants', 'ai-slots', 'confirm'].indexOf(step) > idx ? '✓' : idx + 1}
                </div>
                {idx < 3 && (
                  <div className={`w-12 h-1 ml-2 ${
                    ['details', 'participants', 'ai-slots', 'confirm'].indexOf(step) > idx 
                      ? 'bg-green-500' : 'bg-white/30'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Step 1: Meeting Details */}
          {step === 'details' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Meeting Title *
                </label>
                <input
                  type="text"
                  value={meetingDetails.title}
                  onChange={(e) => setMeetingDetails(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Project Review Meeting"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-800 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={meetingDetails.description}
                  onChange={(e) => setMeetingDetails(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="What's this meeting about?"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-800 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Duration
                  </label>
                  <select
                    value={meetingDetails.duration}
                    onChange={(e) => setMeetingDetails(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             bg-white dark:bg-gray-700 text-gray-800 dark:text-white
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="90">1.5 hours</option>
                    <option value="120">2 hours</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Meeting Type
                  </label>
                  <select
                    value={meetingDetails.type}
                    onChange={(e) => setMeetingDetails(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             bg-white dark:bg-gray-700 text-gray-800 dark:text-white
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="in-person">In Person</option>
                    <option value="virtual">Virtual</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Preferred Times
                </label>
                <div className="flex gap-3">
                  {(['morning', 'afternoon', 'evening'] as const).map(time => (
                    <label key={time} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={meetingDetails.preferredTimes[time]}
                        onChange={(e) => setMeetingDetails(prev => ({
                          ...prev,
                          preferredTimes: { ...prev.preferredTimes, [time]: e.target.checked }
                        }))}
                        className="rounded accent-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                        {time} {time === 'morning' ? '(9-12)' : time === 'afternoon' ? '(1-5)' : '(6-8)'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date Range
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={meetingDetails.dateRange.start}
                    onChange={(e) => setMeetingDetails(prev => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, start: e.target.value }
                    }))}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             bg-white dark:bg-gray-700 text-gray-800 dark:text-white
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="date"
                    value={meetingDetails.dateRange.end}
                    onChange={(e) => setMeetingDetails(prev => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, end: e.target.value }
                    }))}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             bg-white dark:bg-gray-700 text-gray-800 dark:text-white
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {meetingDetails.type !== 'in-person' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Location/Link
                  </label>
                  <input
                    type="text"
                    value={meetingDetails.location}
                    onChange={(e) => setMeetingDetails(prev => ({ ...prev, location: e.target.value }))}
                    placeholder={meetingDetails.type === 'virtual' ? 'Zoom/Meet link' : 'Location'}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             bg-white dark:bg-gray-700 text-gray-800 dark:text-white
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 2: Select Participants */}
          {step === 'participants' && (
            <div className="space-y-4">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                  Select Participants
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Choose who needs to attend this meeting. AI will find times that work for everyone.
                </p>
              </div>

              {friends.length === 0 ? (
                <div className="text-center py-8">
                  <span className="text-4xl">👥</span>
                  <p className="mt-3 text-gray-600 dark:text-gray-400">No friends added yet</p>
                  <button className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Invite Friends
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {friends.map(friend => (
                    <label
                      key={friend.friend_id}
                      className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg
                               hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedParticipants.has(friend.friend_id)}
                        onChange={(e) => {
                          const newSet = new Set(selectedParticipants);
                          if (e.target.checked) {
                            newSet.add(friend.friend_id);
                          } else {
                            newSet.delete(friend.friend_id);
                          }
                          setSelectedParticipants(newSet);
                        }}
                        className="rounded accent-blue-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-800 dark:text-white">
                          {friend.name}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  💡 Tip: The AI will analyze everyone's calendar to find optimal meeting times
                </p>
              </div>
            </div>
          )}

          {/* Step 3: AI-Suggested Time Slots */}
          {step === 'ai-slots' && (
            <div className="space-y-4">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                  AI-Suggested Times
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Based on everyone's availability, here are the best times for your meeting:
                </p>
              </div>

              {isAnalyzing ? (
                <div className="flex flex-col items-center py-8">
                  <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">AI is analyzing calendars...</p>
                </div>
              ) : suggestedSlots.length === 0 ? (
                <div className="text-center py-8">
                  <span className="text-4xl">📅</span>
                  <p className="mt-3 text-gray-600 dark:text-gray-400">
                    No available slots found. Try adjusting your date range or preferred times.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {suggestedSlots.map((slot, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedSlot(slot)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedSlot === slot
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-800 dark:text-white">
                            {slot.date.toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {slot.startTime} - {slot.endTime}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-medium ${
                            slot.conflicts.length === 0 
                              ? 'text-green-600 dark:text-green-400' 
                              : 'text-orange-600 dark:text-orange-400'
                          }`}>
                            {slot.conflicts.length === 0 
                              ? '✅ Everyone available' 
                              : `⚠️ ${slot.conflicts.length} conflict${slot.conflicts.length > 1 ? 's' : ''}`}
                          </div>
                          {slot.conflicts.length > 0 && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {slot.conflicts.join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Match Score:</span>
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full"
                              style={{ width: `${slot.score}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {slot.score}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Confirm & Send */}
          {step === 'confirm' && selectedSlot && (
            <div className="space-y-4">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                  Confirm Meeting Details
                </h3>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Title:</span>
                  <p className="font-medium text-gray-800 dark:text-white">{meetingDetails.title}</p>
                </div>
                
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Date & Time:</span>
                  <p className="font-medium text-gray-800 dark:text-white">
                    {selectedSlot.date.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'long', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                  <p className="text-gray-700 dark:text-gray-300">
                    {selectedSlot.startTime} - {selectedSlot.endTime}
                  </p>
                </div>

                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Participants:</span>
                  <p className="text-gray-700 dark:text-gray-300">
                    You + {selectedParticipants.size} other{selectedParticipants.size !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Send Invites Via
                </label>
                <div className="flex gap-3">
                  {(['app', 'email', 'link'] as const).map(method => (
                    <label key={method} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="sendMethod"
                        value={method}
                        checked={sendMethod === method}
                        onChange={(e) => setSendMethod(e.target.value as any)}
                        className="accent-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                        {method === 'app' ? 'In-App' : method === 'link' ? 'Copy Link' : method}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {shareableLink && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-300 mb-2">
                    📋 Meeting poll link created:
                  </p>
                  <code className="text-xs bg-white dark:bg-gray-800 p-2 rounded block break-all">
                    {shareableLink}
                  </code>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          <button
            onClick={() => {
              if (step === 'participants') setStep('details');
              else if (step === 'ai-slots') setStep('participants');
              else if (step === 'confirm') setStep('ai-slots');
            }}
            disabled={step === 'details'}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg
                     hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors"
          >
            Back
          </button>

          <button
            onClick={() => {
              if (step === 'details') {
                if (meetingDetails.title && 
                    (meetingDetails.preferredTimes.morning || 
                     meetingDetails.preferredTimes.afternoon || 
                     meetingDetails.preferredTimes.evening)) {
                  setStep('participants');
                }
              } else if (step === 'participants') {
                setStep('ai-slots');
              } else if (step === 'ai-slots') {
                if (selectedSlot) {
                  setStep('confirm');
                  generateShareableLink();
                }
              } else if (step === 'confirm') {
                handleScheduleMeeting();
              }
            }}
            disabled={
              (step === 'details' && !meetingDetails.title) ||
              (step === 'participants' && selectedParticipants.size === 0) ||
              (step === 'ai-slots' && !selectedSlot)
            }
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg
                     hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed
                     transform hover:scale-105 active:scale-95 transition-all"
          >
            {step === 'confirm' ? 'Schedule & Send Invites' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
