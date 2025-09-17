// app/(protected)/calendar/components/SmartMeetingCoordinator.tsx
"use client";

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ToastProvider';

interface Friend {
  friend_id: string;
  name: string;
  avatar_url?: string;
  email?: string;
}

interface DBEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  created_by: string;
}

interface TimeSlot {
  date: Date;
  startTime: string;
  endTime: string;
  availability: Map<string, boolean>;
  score: number;
  conflicts: { userId: string; eventTitle: string }[];
  dayName: string;
  isOptimal?: boolean;
  aiReason?: string;
}

interface MeetingDetails {
  title: string;
  description: string;
  duration: number;
  location: string;
  meetingType: 'in-person' | 'virtual' | 'hybrid';
  preferredTimes: {
    morning: boolean;
    afternoon: boolean;
    evening: boolean;
  };
  dateRange: {
    start: string;
    end: string;
  };
  requireAllAttendees: boolean;
  autoReminder: boolean;
  preparationTime: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

interface SmartMeetingCoordinatorProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  friends: Friend[];
  userEvents: DBEvent[];
  onSchedule: (event: any) => void;
  mobileMode?: 'modal' | 'bottomSheet';
}

export default function SmartMeetingCoordinator({
  open,
  onClose,
  userId,
  friends = [],
  userEvents = [],
  onSchedule,
  mobileMode = 'bottomSheet'
}: SmartMeetingCoordinatorProps) {
  const { showToast } = useToast();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // State management
  const [mode, setMode] = useState<'wizard' | 'chat'>('wizard');
  const [step, setStep] = useState<'details' | 'participants' | 'ai-slots' | 'confirm'>('details');
  const [meetingDetails, setMeetingDetails] = useState<MeetingDetails>({
    title: '',
    description: '',
    duration: 60,
    location: '',
    meetingType: 'virtual',
    preferredTimes: {
      morning: true,
      afternoon: true,
      evening: false
    },
    dateRange: {
      start: new Date().toISOString().split('T')[0],
      end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    },
    requireAllAttendees: false,
    autoReminder: true,
    preparationTime: 15
  });
  
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());
  const [participantAvailability, setParticipantAvailability] = useState<Map<string, DBEvent[]>>(new Map());
  const [suggestedSlots, setSuggestedSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sendMethod, setSendMethod] = useState<'app' | 'email' | 'link' | 'all'>('app');
  const [shareableLink, setShareableLink] = useState('');
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your AI Meeting Assistant 🤖 I can help you schedule the perfect meeting. What would you like to schedule?",
      timestamp: new Date(),
      suggestions: [
        "Quick standup",
        "1-on-1 meeting",
        "Team review",
        "Client call"
      ]
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Mobile drag handlers for bottom sheet
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile || mobileMode !== 'bottomSheet') return;
    setIsDragging(true);
    setDragY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !isMobile) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - dragY;
    if (diff > 50) {
      onClose();
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setDragY(0);
  };

  // Simulated participant availability fetching
  const fetchParticipantAvailability = useCallback(async () => {
    setIsAnalyzing(true);
    const availability = new Map<string, DBEvent[]>();
    
    for (const participantId of selectedParticipants) {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('created_by', participantId)
        .gte('start_time', meetingDetails.dateRange.start)
        .lte('end_time', meetingDetails.dateRange.end);
      
      if (data) {
        availability.set(participantId, data);
      } else {
        // Simulate some events for demo
        const mockEvents: DBEvent[] = [];
        for (let i = 0; i < 2; i++) {
          const randomDate = new Date(
            new Date(meetingDetails.dateRange.start).getTime() + 
            Math.random() * 7 * 24 * 60 * 60 * 1000
          );
          randomDate.setHours(9 + Math.floor(Math.random() * 8), 0, 0, 0);
          
          mockEvents.push({
            id: `mock-${participantId}-${i}`,
            title: 'Busy',
            start_time: randomDate.toISOString(),
            end_time: new Date(randomDate.getTime() + 60 * 60 * 1000).toISOString(),
            created_by: participantId
          });
        }
        availability.set(participantId, mockEvents);
      }
    }
    
    setParticipantAvailability(availability);
    setTimeout(() => setIsAnalyzing(false), 1500);
  }, [selectedParticipants, meetingDetails.dateRange]);

  // AI slot finding
  const findOptimalSlots = useCallback(() => {
    const slots: TimeSlot[] = [];
    const startDate = new Date(meetingDetails.dateRange.start);
    const endDate = new Date(meetingDetails.dateRange.end);
    
    const allEvents = [...userEvents];
    participantAvailability.forEach(events => {
      allEvents.push(...events);
    });

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      if (meetingDetails.meetingType === 'in-person' && (d.getDay() === 0 || d.getDay() === 6)) continue;

      const timeRanges = [];
      if (meetingDetails.preferredTimes.morning) {
        timeRanges.push({ start: 9, end: 12, label: 'Morning' });
      }
      if (meetingDetails.preferredTimes.afternoon) {
        timeRanges.push({ start: 13, end: 17, label: 'Afternoon' });
      }
      if (meetingDetails.preferredTimes.evening) {
        timeRanges.push({ start: 18, end: 20, label: 'Evening' });
      }

      for (const range of timeRanges) {
        for (let hour = range.start; hour <= range.end - (meetingDetails.duration / 60); hour += 0.5) {
          const slotStart = new Date(d);
          slotStart.setHours(Math.floor(hour), (hour % 1) * 60, 0, 0);
          const slotEnd = new Date(slotStart.getTime() + meetingDetails.duration * 60000);

          const conflicts: { userId: string; eventTitle: string }[] = [];
          const availability = new Map<string, boolean>();
          
          availability.set(userId, true);
          for (const event of allEvents) {
            const eventStart = new Date(event.start_time);
            const eventEnd = new Date(event.end_time);
            
            if ((slotStart >= eventStart && slotStart < eventEnd) ||
                (slotEnd > eventStart && slotEnd <= eventEnd)) {
              if (event.created_by === userId) {
                availability.set(userId, false);
                conflicts.push({ userId, eventTitle: 'You: ' + event.title });
              } else {
                const friend = friends.find(f => f.friend_id === event.created_by);
                availability.set(event.created_by, false);
                conflicts.push({ 
                  userId: event.created_by, 
                  eventTitle: friend?.name || 'Busy' 
                });
              }
            }
          }
          
          for (const participantId of selectedParticipants) {
            if (!availability.has(participantId)) {
              availability.set(participantId, true);
            }
          }
          
          const availableCount = Array.from(availability.values()).filter(a => a).length;
          const totalCount = availability.size;
          let score = (availableCount / totalCount) * 100;
          
          let aiReason = '';
          const hourOfDay = slotStart.getHours();
          if (hourOfDay === 10 || hourOfDay === 14) {
            score += 20;
            aiReason = '🎯 Peak productivity';
          } else if (hourOfDay >= 11 && hourOfDay <= 12) {
            score -= 10;
            aiReason = '🍽️ Lunch time';
          }
          
          const daysFromNow = Math.floor((slotStart.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          if (daysFromNow <= 2) {
            score += 25;
            aiReason = '⚡ Soon available';
          }

          const dayName = slotStart.toLocaleDateString('en-US', { weekday: 'long' });

          slots.push({
            date: slotStart,
            startTime: slotStart.toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            }),
            endTime: slotEnd.toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            }),
            availability,
            score: Math.max(0, Math.min(100, score)),
            conflicts,
            dayName,
            aiReason
          });
        }
      }
    }

    slots.sort((a, b) => b.score - a.score);
    const topSlots = slots.filter(s => s.score > 30).slice(0, 10);
    
    topSlots.forEach((slot, index) => {
      slot.isOptimal = index < 3;
    });
    
    setSuggestedSlots(topSlots);
  }, [meetingDetails, userEvents, participantAvailability, selectedParticipants, friends, userId]);

  // Chat functionality
  const handleChatSubmit = useCallback(async (message: string) => {
    if (!message.trim()) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsTyping(true);
    
    setTimeout(() => {
      let response = '';
      let suggestions: string[] = [];
      
      const lowerMessage = message.toLowerCase();
      
      if (lowerMessage.includes('standup') || lowerMessage.includes('daily')) {
        response = "Great! Setting up a daily standup. How many team members?";
        setMeetingDetails(prev => ({
          ...prev,
          title: 'Daily Standup',
          duration: 15,
          meetingType: 'virtual',
          preferredTimes: { morning: true, afternoon: false, evening: false }
        }));
        suggestions = ["2-3 people", "4-6 people", "Whole team"];
      } else if (lowerMessage.includes('1-on-1')) {
        response = "Perfect for focused discussion! Who will you meet with?";
        setMode('wizard');
        setStep('participants');
      } else {
        response = "I'll help you schedule that! What time works best?";
        suggestions = ["Morning", "Afternoon", "Find best time"];
      }
      
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        suggestions
      };
      
      setChatMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1000);
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Auto-analyze
  useEffect(() => {
    if (step === 'ai-slots' && selectedParticipants.size > 0) {
      fetchParticipantAvailability().then(() => {
        setTimeout(() => findOptimalSlots(), 1000);
      });
    }
  }, [step, selectedParticipants, fetchParticipantAvailability, findOptimalSlots]);

  const handleScheduleMeeting = async () => {
    if (!selectedSlot) return;

    const event = {
      title: meetingDetails.title,
      description: meetingDetails.description,
      location: meetingDetails.meetingType === 'virtual' 
        ? '🎥 Virtual Meeting' 
        : meetingDetails.location,
      start_time: selectedSlot.date.toISOString(),
      end_time: new Date(selectedSlot.date.getTime() + meetingDetails.duration * 60000).toISOString(),
      created_by: userId,
      visibility: 'private' as const,
      event_type: 'meeting',
      participants: Array.from(selectedParticipants),
      source: 'ai_coordinator' as const
    };

    await onSchedule(event);
    showToast('success', `Meeting scheduled! 🎉`);
    onClose();
  };

  if (!open) return null;

  // Mobile Bottom Sheet Style
  if (isMobile && mobileMode === 'bottomSheet') {
    return (
      <div className="fixed inset-0 z-50">
        <div className="fixed inset-0 bg-black/60" onClick={onClose} />
        
        <div 
          className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl"
          style={{ 
            maxHeight: '85vh',
            overflowY: 'auto'
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Drag Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>
          
          {/* Mobile Header */}
          <div className="px-4 pb-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">AI Scheduler 🤖</h2>
              <button onClick={onClose} className="p-2 -mr-2">
                <span className="text-gray-500">✕</span>
              </button>
            </div>
            
            {/* Compact Mode Toggle */}
            <div className="flex gap-2 mt-3 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <button
                onClick={() => setMode('wizard')}
                className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-all ${
                  mode === 'wizard' 
                    ? 'bg-white dark:bg-gray-600 text-purple-600 dark:text-purple-400 shadow' 
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                🪄 Wizard
              </button>
              <button
                onClick={() => setMode('chat')}
                className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-all ${
                  mode === 'chat' 
                    ? 'bg-white dark:bg-gray-600 text-purple-600 dark:text-purple-400 shadow' 
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                💬 Chat
              </button>
            </div>
            
            {/* Mobile Progress Dots */}
            {mode === 'wizard' && (
              <div className="flex justify-center gap-2 mt-4">
                {['details', 'participants', 'ai-slots', 'confirm'].map((s, idx) => (
                  <div 
                    key={s}
                    className={`w-2 h-2 rounded-full transition-all ${
                      step === s ? 'w-8 bg-purple-600' : 
                      ['details', 'participants', 'ai-slots', 'confirm'].indexOf(step) > idx 
                        ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Mobile Content */}
          <div className="px-4 pb-4 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 180px)' }}>
            {mode === 'chat' ? (
              // Mobile Chat Mode
              <div className="flex flex-col h-[400px]">
                <div className="flex-1 overflow-y-auto space-y-3 mb-3">
                  {chatMessages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] ${
                        msg.role === 'user' 
                          ? 'bg-purple-600 text-white rounded-2xl rounded-tr-sm' 
                          : 'bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-tl-sm'
                      } px-3 py-2`}>
                        <p className="text-sm">{msg.content}</p>
                        {msg.suggestions && (
                          <div className="mt-2 space-y-1">
                            {msg.suggestions.map((s, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleChatSubmit(s)}
                                className="block w-full text-left px-2 py-1 bg-white/10 rounded text-xs"
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-2">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit(chatInput)}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                  />
                  <button
                    onClick={() => handleChatSubmit(chatInput)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg"
                  >
                    Send
                  </button>
                </div>
              </div>
            ) : (
              // Mobile Wizard Mode
              <>
                {step === 'details' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Meeting Title</label>
                      <input
                        type="text"
                        value={meetingDetails.title}
                        onChange={(e) => setMeetingDetails(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="e.g., Team Standup"
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Duration</label>
                      <div className="grid grid-cols-4 gap-2">
                        {[15, 30, 45, 60].map(min => (
                          <button
                            key={min}
                            onClick={() => setMeetingDetails(prev => ({ ...prev, duration: min }))}
                            className={`py-2 rounded-lg text-sm ${
                              meetingDetails.duration === min
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-700'
                            }`}
                          >
                            {min}m
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Type</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['virtual', 'in-person', 'hybrid'].map(type => (
                          <button
                            key={type}
                            onClick={() => setMeetingDetails(prev => ({ 
                              ...prev, 
                              meetingType: type as 'virtual' | 'in-person' | 'hybrid' 
                            }))}
                            className={`py-3 rounded-lg text-xs capitalize ${
                              meetingDetails.meetingType === type
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-700'
                            }`}
                          >
                            {type === 'virtual' ? '🎥' : type === 'in-person' ? '📍' : '☕'}<br/>
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Preferred Times</label>
                      <div className="space-y-2">
                        {['morning', 'afternoon', 'evening'].map(time => (
                          <label key={time} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <input
                              type="checkbox"
                              checked={meetingDetails.preferredTimes[time as keyof typeof meetingDetails.preferredTimes]}
                              onChange={(e) => setMeetingDetails(prev => ({
                                ...prev,
                                preferredTimes: {
                                  ...prev.preferredTimes,
                                  [time]: e.target.checked
                                }
                              }))}
                              className="rounded text-purple-600"
                            />
                            <span className="text-sm capitalize">{time}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {step === 'participants' && (
                  <div className="space-y-3">
                    <h3 className="font-medium">Select Participants</h3>
                    {friends.length === 0 ? (
                      <div className="text-center py-8">
                        <span className="text-3xl">👥</span>
                        <p className="mt-2 text-gray-600">No friends added yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {friends.map(friend => (
                          <label key={friend.friend_id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <input
                              type="checkbox"
                              checked={selectedParticipants.has(friend.friend_id)}
                              onChange={(e) => {
                                const newSet = new Set(selectedParticipants);
                                e.target.checked ? newSet.add(friend.friend_id) : newSet.delete(friend.friend_id);
                                setSelectedParticipants(newSet);
                              }}
                              className="rounded text-purple-600"
                            />
                            <span className="text-sm">{friend.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {step === 'ai-slots' && (
                  <div className="space-y-3">
                    <h3 className="font-medium">Best Times Found</h3>
                    {isAnalyzing ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto" />
                        <p className="mt-3 text-sm">Finding best times...</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {suggestedSlots.map((slot, idx) => {
                          const availableCount = Array.from(slot.availability.values()).filter(a => a).length;
                          const totalCount = slot.availability.size;
                          
                          return (
                            <div
                              key={idx}
                              onClick={() => setSelectedSlot(slot)}
                              className={`p-3 rounded-lg border-2 ${
                                selectedSlot === slot ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-medium text-sm">
                                    {slot.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    {slot.startTime} - {slot.endTime}
                                  </div>
                                  {slot.aiReason && (
                                    <div className="text-xs text-purple-600 mt-1">{slot.aiReason}</div>
                                  )}
                                </div>
                                <div className="text-right">
                                  {slot.isOptimal && (
                                    <span className="inline-block px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs rounded-full mb-1">
                                      ⭐ Best
                                    </span>
                                  )}
                                  <div className="text-xs text-gray-500">
                                    {availableCount}/{totalCount} free
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
                
                {step === 'confirm' && selectedSlot && (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <h3 className="font-medium text-green-800 dark:text-green-300 mb-2">Ready to Schedule!</h3>
                      <div className="space-y-1 text-sm">
                        <div>📅 {selectedSlot.date.toLocaleDateString()}</div>
                        <div>⏰ {selectedSlot.startTime}</div>
                        <div>👥 {selectedParticipants.size + 1} people</div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Send Invites Via</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['app', 'email', 'link'].map(method => (
                          <button
                            key={method}
                            onClick={() => setSendMethod(method as 'app' | 'email' | 'link')}
                            className={`py-2 rounded-lg text-xs capitalize ${
                              sendMethod === method
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-700'
                            }`}
                          >
                            {method}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Mobile Footer */}
          {mode === 'wizard' && (
            <div className="px-4 pb-4 pt-2 border-t border-gray-200 dark:border-gray-700 flex gap-2">
              <button
                onClick={() => {
                  if (step === 'participants') setStep('details');
                  else if (step === 'ai-slots') setStep('participants');
                  else if (step === 'confirm') setStep('ai-slots');
                }}
                disabled={step === 'details'}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg disabled:opacity-50 text-sm"
              >
                Back
              </button>

              <button
                onClick={() => {
                  if (step === 'details') setStep('participants');
                  else if (step === 'participants') setStep('ai-slots');
                  else if (step === 'ai-slots' && selectedSlot) setStep('confirm');
                  else if (step === 'confirm') handleScheduleMeeting();
                }}
                className="flex-1 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-sm font-medium"
              >
                {step === 'confirm' ? 'Schedule Meeting' : 'Next'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop/Tablet Modal - FIXED POSITIONING
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg sm:max-w-2xl lg:max-w-4xl my-8 max-h-[90vh] overflow-hidden flex flex-col">
          {/* Desktop Header - Fixed at top */}
          <div className="flex-shrink-0">
            <div className="relative overflow-hidden rounded-t-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-pink-600 to-indigo-600 opacity-90" />
              
              <div className="relative p-4 sm:p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 sm:p-3 bg-white/20 backdrop-blur rounded-xl">
                      <span className="text-xl sm:text-2xl">🤖</span>
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-2xl font-bold">AI Meeting Coordinator</h2>
                      <p className="text-xs sm:text-sm opacity-90 mt-1">Smart scheduling for everyone</p>
                    </div>
                  </div>
                  <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/20 transition-colors">
                    <span className="text-xl">✕</span>
                  </button>
                </div>
                
                {/* Mode toggle */}
                <div className="flex gap-2 p-1 bg-white/10 backdrop-blur rounded-lg">
                  <button
                    onClick={() => setMode('wizard')}
                    className={`flex-1 py-2 px-3 sm:px-4 rounded-md text-sm sm:text-base transition-all ${
                      mode === 'wizard' 
                        ? 'bg-white text-purple-600 font-medium shadow-lg' 
                        : 'text-white/80 hover:text-white'
                    }`}
                  >
                    🪄 Wizard Mode
                  </button>
                  <button
                    onClick={() => setMode('chat')}
                    className={`flex-1 py-2 px-3 sm:px-4 rounded-md text-sm sm:text-base transition-all ${
                      mode === 'chat' 
                        ? 'bg-white text-purple-600 font-medium shadow-lg' 
                        : 'text-white/80 hover:text-white'
                    }`}
                  >
                    💬 Chat Mode
                  </button>
                </div>

                {/* Progress indicator for wizard mode */}
                {mode === 'wizard' && (
                  <div className="flex items-center gap-2 mt-4">
                    {[
                      { key: 'details', label: 'Details', icon: '📝' },
                      { key: 'participants', label: 'People', icon: '👥' },
                      { key: 'ai-slots', label: 'Find Times', icon: '✨' },
                      { key: 'confirm', label: 'Confirm', icon: '✅' }
                    ].map((s, idx) => (
                      <div key={s.key} className="flex items-center flex-1">
                        <div className={`flex items-center gap-2 ${
                          step === s.key ? 'text-white' : 
                          ['details', 'participants', 'ai-slots', 'confirm'].indexOf(step) > idx 
                            ? 'text-white/80' : 'text-white/40'
                        }`}>
                          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-lg
                                        ${step === s.key ? 'bg-white text-purple-600' : 
                                          ['details', 'participants', 'ai-slots', 'confirm'].indexOf(step) > idx 
                                            ? 'bg-green-500 text-white' : 'bg-white/20'}`}>
                            {['details', 'participants', 'ai-slots', 'confirm'].indexOf(step) > idx ? '✓' : s.icon}
                          </div>
                          <span className="text-xs font-medium hidden sm:block">{s.label}</span>
                        </div>
                        {idx < 3 && (
                          <div className={`flex-1 h-0.5 mx-2 ${
                            ['details', 'participants', 'ai-slots', 'confirm'].indexOf(step) > idx 
                              ? 'bg-green-500' : 'bg-white/20'
                          }`} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Desktop Content - Scrollable middle section */}
          <div className="flex-grow overflow-y-auto p-4 sm:p-6">
            {mode === 'chat' ? (
              // Desktop Chat Mode
              <div className="flex flex-col h-[450px]">
                <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                  {chatMessages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] ${
                        msg.role === 'user' 
                          ? 'bg-purple-600 text-white rounded-2xl rounded-tr-sm' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white rounded-2xl rounded-tl-sm'
                      } p-3`}>
                        <p className="text-sm">{msg.content}</p>
                        {msg.suggestions && msg.suggestions.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {msg.suggestions.map((suggestion, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleChatSubmit(suggestion)}
                                className="block w-full text-left px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs transition-colors"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-tl-sm p-3">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit(chatInput)}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             bg-white dark:bg-gray-700 text-gray-800 dark:text-white
                             focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    onClick={() => handleChatSubmit(chatInput)}
                    className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg
                             hover:from-purple-700 hover:to-pink-700 transition-all"
                  >
                    Send
                  </button>
                </div>
                
                <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-xs text-purple-700 dark:text-purple-300">
                    💡 Try: "Schedule a team standup tomorrow morning" or "Find time for a 1-on-1 with Sarah"
                  </p>
                </div>
              </div>
            ) : (
              // Desktop Wizard Mode
              <>
                {step === 'details' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Meeting Title *
                        </label>
                        <input
                          type="text"
                          value={meetingDetails.title}
                          onChange={(e) => setMeetingDetails(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="e.g., Team Standup, Project Review"
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                   bg-white dark:bg-gray-700 text-gray-800 dark:text-white
                                   focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Duration
                        </label>
                        <select
                          value={meetingDetails.duration}
                          onChange={(e) => setMeetingDetails(prev => ({ ...prev, duration: Number(e.target.value) }))}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                   bg-white dark:bg-gray-700 text-gray-800 dark:text-white
                                   focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="15">15 minutes</option>
                          <option value="30">30 minutes</option>
                          <option value="45">45 minutes</option>
                          <option value="60">1 hour</option>
                          <option value="90">1.5 hours</option>
                          <option value="120">2 hours</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Description
                      </label>
                      <textarea
                        value={meetingDetails.description}
                        onChange={(e) => setMeetingDetails(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="What's this meeting about?"
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                 bg-white dark:bg-gray-700 text-gray-800 dark:text-white
                                 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Meeting Type
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { value: 'virtual', icon: '🎥', label: 'Virtual' },
                          { value: 'in-person', icon: '📍', label: 'In-Person' },
                          { value: 'hybrid', icon: '☕', label: 'Hybrid' }
                        ].map(type => (
                          <button
                            key={type.value}
                            onClick={() => setMeetingDetails(prev => ({ 
                              ...prev, 
                              meetingType: type.value as 'virtual' | 'in-person' | 'hybrid' 
                            }))}
                            className={`p-3 rounded-lg border-2 transition-all ${
                              meetingDetails.meetingType === type.value
                                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                : 'border-gray-300 dark:border-gray-600 hover:border-purple-300'
                            }`}
                          >
                            <div className={`text-2xl mb-1 ${
                              meetingDetails.meetingType === type.value 
                                ? 'text-purple-600 dark:text-purple-400' 
                                : 'text-gray-500'
                            }`}>{type.icon}</div>
                            <span className={`text-sm ${
                              meetingDetails.meetingType === type.value 
                                ? 'text-purple-700 dark:text-purple-300 font-medium' 
                                : 'text-gray-600 dark:text-gray-400'
                            }`}>{type.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {meetingDetails.meetingType !== 'virtual' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Location
                        </label>
                        <input
                          type="text"
                          value={meetingDetails.location}
                          onChange={(e) => setMeetingDetails(prev => ({ ...prev, location: e.target.value }))}
                          placeholder="Where will the meeting take place?"
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                   bg-white dark:bg-gray-700 text-gray-800 dark:text-white
                                   focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Preferred Time of Day
                      </label>
                      <div className="flex gap-3">
                        {[
                          { key: 'morning', label: 'Morning (9am-12pm)' },
                          { key: 'afternoon', label: 'Afternoon (12pm-5pm)' },
                          { key: 'evening', label: 'Evening (5pm-8pm)' }
                        ].map(time => (
                          <label key={time.key} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={meetingDetails.preferredTimes[time.key as keyof typeof meetingDetails.preferredTimes]}
                              onChange={(e) => setMeetingDetails(prev => ({
                                ...prev,
                                preferredTimes: {
                                  ...prev.preferredTimes,
                                  [time.key]: e.target.checked
                                }
                              }))}
                              className="rounded text-purple-600 focus:ring-purple-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{time.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Search From
                        </label>
                        <input
                          type="date"
                          value={meetingDetails.dateRange.start}
                          onChange={(e) => setMeetingDetails(prev => ({
                            ...prev,
                            dateRange: { ...prev.dateRange, start: e.target.value }
                          }))}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                   bg-white dark:bg-gray-700 text-gray-800 dark:text-white
                                   focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Search Until
                        </label>
                        <input
                          type="date"
                          value={meetingDetails.dateRange.end}
                          onChange={(e) => setMeetingDetails(prev => ({
                            ...prev,
                            dateRange: { ...prev.dateRange, end: e.target.value }
                          }))}
                          min={meetingDetails.dateRange.start}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                   bg-white dark:bg-gray-700 text-gray-800 dark:text-white
                                   focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {step === 'participants' && (
                  <div className="space-y-4">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                        Select Participants
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Choose who needs to attend. The AI will analyze everyone's calendar to find the best times.
                      </p>
                    </div>

                    {friends.length === 0 ? (
                      <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <span className="text-4xl">👥</span>
                        <p className="mt-3 text-gray-600 dark:text-gray-400 mb-4">No friends added yet</p>
                        <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                          Invite Friends to MyZenTribe
                        </button>
                      </div>
                    ) : (
                      <>
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
                                className="rounded text-purple-600 focus:ring-purple-500"
                              />
                              <div className="flex-1">
                                <div className="font-medium text-gray-800 dark:text-white">
                                  {friend.name}
                                </div>
                                {friend.email && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {friend.email}
                                  </div>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>

                        <label className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                          <input
                            type="checkbox"
                            checked={meetingDetails.requireAllAttendees}
                            onChange={(e) => setMeetingDetails(prev => ({
                              ...prev,
                              requireAllAttendees: e.target.checked
                            }))}
                            className="rounded text-amber-600 focus:ring-amber-500"
                          />
                          <div>
                            <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                              Require all attendees
                            </span>
                            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                              Only show times when everyone is available
                            </p>
                          </div>
                        </label>
                      </>
                    )}

                    <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg">
                      <div className="flex items-start gap-3">
                        <span className="text-xl">✨</span>
                        <div>
                          <p className="text-sm text-purple-800 dark:text-purple-300 font-medium">
                            How it works
                          </p>
                          <p className="text-xs text-purple-700 dark:text-purple-400 mt-1">
                            Our AI will analyze {selectedParticipants.size + 1} calendars to find optimal meeting times.
                            Times are ranked by availability, preferences, and scheduling patterns.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {step === 'ai-slots' && (
                  <div className="space-y-4">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                        AI-Suggested Times
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Based on analyzing {selectedParticipants.size + 1} calendars, here are the best times:
                      </p>
                    </div>

                    {isAnalyzing ? (
                      <div className="text-center py-12">
                        <div className="inline-flex items-center gap-3">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                          <span className="text-gray-600 dark:text-gray-400">
                            Analyzing calendars and finding optimal times...
                          </span>
                        </div>
                      </div>
                    ) : suggestedSlots.length === 0 ? (
                      <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <span className="text-4xl">😔</span>
                        <p className="mt-3 text-gray-600 dark:text-gray-400">
                          No common available times found in the selected date range.
                        </p>
                        <button
                          onClick={() => setStep('details')}
                          className="mt-4 text-purple-600 hover:text-purple-700 text-sm font-medium"
                        >
                          Adjust date range or preferences
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {suggestedSlots.map((slot, index) => {
                          const availableCount = Array.from(slot.availability.values()).filter(a => a).length;
                          const totalCount = slot.availability.size;
                          const percentage = Math.round((availableCount / totalCount) * 100);
                          
                          return (
                            <div
                              key={index}
                              onClick={() => setSelectedSlot(slot)}
                              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                selectedSlot === slot
                                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                  : 'border-gray-200 dark:border-gray-600 hover:border-purple-300'
                              } ${slot.isOptimal ? 'ring-2 ring-yellow-400 ring-offset-2' : ''}`}
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xl">📅</span>
                                    <span className="font-medium text-gray-800 dark:text-white">
                                      {slot.dayName}, {slot.date.toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric' 
                                      })}
                                    </span>
                                    {slot.isOptimal && (
                                      <span className="px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs rounded-full font-medium">
                                        ⭐ Optimal
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    {slot.startTime} - {slot.endTime}
                                  </p>
                                  {slot.aiReason && (
                                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                                      {slot.aiReason}
                                    </p>
                                  )}
                                </div>
                                
                                <div className="text-right">
                                  <div className={`text-sm font-medium ${
                                    percentage === 100 ? 'text-green-600' : 
                                    percentage >= 75 ? 'text-yellow-600' : 'text-orange-600'
                                  }`}>
                                    {percentage}% Available
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {availableCount}/{totalCount} people
                                  </div>
                                </div>
                              </div>
                              
                              {slot.conflicts.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Conflicts: {slot.conflicts.map(c => c.eventTitle).join(', ')}
                                  </p>
                                </div>
                              )}
                              
                              <div className="mt-2 flex gap-1">
                                {Array.from(slot.availability.entries()).map(([participantId, isAvailable]) => {
                                  const friend = friends.find(f => f.friend_id === participantId);
                                  const name = participantId === userId ? 'You' : friend?.name || 'Unknown';
                                  
                                  return (
                                    <div
                                      key={participantId}
                                      className={`px-2 py-1 text-xs rounded ${
                                        isAvailable 
                                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                      }`}
                                    >
                                      {name}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {step === 'confirm' && selectedSlot && (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-3">
                        Ready to Schedule! 🎉
                      </h3>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">📅</span>
                          <span className="text-gray-700 dark:text-gray-300">
                            <strong>{meetingDetails.title}</strong>
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-xl">⏰</span>
                          <span className="text-gray-700 dark:text-gray-300">
                            {selectedSlot.dayName}, {selectedSlot.date.toLocaleDateString('en-US', { 
                              month: 'long', 
                              day: 'numeric',
                              year: 'numeric'
                            })} at {selectedSlot.startTime}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-xl">👥</span>
                          <span className="text-gray-700 dark:text-gray-300">
                            {selectedParticipants.size + 1} participants
                          </span>
                        </div>
                        
                        {meetingDetails.location && (
                          <div className="flex items-center gap-2">
                            <span className="text-xl">📍</span>
                            <span className="text-gray-700 dark:text-gray-300">
                              {meetingDetails.location}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        How should we notify participants?
                      </h4>
                      
                      <div className="space-y-2">
                        {[
                          { value: 'app', label: 'In-App Notification', desc: 'Send via MyZenTribe' },
                          { value: 'email', label: 'Email', desc: 'Send calendar invites' },
                          { value: 'link', label: 'Share Link', desc: 'Copy link to share manually' }
                        ].map(method => (
                          <label
                            key={method.value}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                              sendMethod === method.value
                                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                : 'border-gray-200 dark:border-gray-600 hover:border-purple-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="sendMethod"
                              value={method.value}
                              checked={sendMethod === method.value}
                              onChange={(e) => setSendMethod(e.target.value as 'app' | 'email' | 'link')}
                              className="text-purple-600 focus:ring-purple-500"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-gray-800 dark:text-white">
                                {method.label}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {method.desc}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {sendMethod === 'link' && shareableLink && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm text-blue-800 dark:text-blue-300 mb-2">
                          📋 Meeting link (click to copy):
                        </p>
                        <div 
                          onClick={() => {
                            navigator.clipboard.writeText(shareableLink);
                            showToast('success', 'Link copied to clipboard!');
                          }}
                          className="text-xs bg-white dark:bg-gray-800 p-2 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 break-all font-mono"
                        >
                          {shareableLink}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Desktop Footer - Fixed at bottom */}
          {mode === 'wizard' && (
            <div className="flex-shrink-0 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-2xl flex justify-between">
              <button
                onClick={() => {
                  if (step === 'participants') setStep('details');
                  else if (step === 'ai-slots') setStep('participants');
                  else if (step === 'confirm') setStep('ai-slots');
                }}
                disabled={step === 'details'}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg
                         hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors"
              >
                <span>←</span>
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
                    if (selectedParticipants.size > 0) {
                      setStep('ai-slots');
                    }
                  } else if (step === 'ai-slots') {
                    if (selectedSlot) {
                      setStep('confirm');
                    }
                  } else if (step === 'confirm') {
                    handleScheduleMeeting();
                  }
                }}
                disabled={
                  (step === 'details' && (!meetingDetails.title || 
                    (!meetingDetails.preferredTimes.morning && 
                     !meetingDetails.preferredTimes.afternoon && 
                     !meetingDetails.preferredTimes.evening))) ||
                  (step === 'participants' && selectedParticipants.size === 0) ||
                  (step === 'ai-slots' && !selectedSlot)
                }
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg
                         hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed
                         transform hover:scale-105 active:scale-95 transition-all disabled:transform-none"
              >
                {step === 'confirm' ? (
                  <>
                    <span>✅</span>
                    Schedule & Send Invites
                  </>
                ) : (
                  <>
                    Next
                    <span>→</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
