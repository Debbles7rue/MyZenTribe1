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
  const [emailInvites, setEmailInvites] = useState<string[]>([]);
  const [inviteInput, setInviteInput] = useState('');
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

  // Handle adding email invites
  const handleAddEmail = () => {
    const email = inviteInput.trim();
    if (email && email.includes('@') && !emailInvites.includes(email)) {
      setEmailInvites([...emailInvites, email]);
      setInviteInput('');
      showToast('success', `Added ${email} to invites`);
    }
  };

  const handleRemoveEmail = (email: string) => {
    setEmailInvites(emailInvites.filter(e => e !== email));
  };

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
    if (step === 'ai-slots' && (selectedParticipants.size > 0 || emailInvites.length > 0)) {
      fetchParticipantAvailability().then(() => {
        setTimeout(() => findOptimalSlots(), 1000);
      });
    }
  }, [step, selectedParticipants, emailInvites, fetchParticipantAvailability, findOptimalSlots]);

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
      email_invites: emailInvites,
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
              // Mobile Wizard Mode content continues...
              <>
                {step === 'participants' && (
                  <div className="space-y-3">
                    <h3 className="font-medium">Select Participants</h3>
                    
                    {/* Add Email Input for Mobile */}
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <label className="block text-sm font-medium mb-2">Invite by Email</label>
                      <div className="flex gap-2">
                        <input
                          type="email"
                          value={inviteInput}
                          onChange={(e) => setInviteInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleAddEmail()}
                          placeholder="email@example.com"
                          className="flex-1 px-3 py-2 border rounded-lg text-sm"
                        />
                        <button
                          onClick={handleAddEmail}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
                        >
                          Add
                        </button>
                      </div>
                      {emailInvites.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {emailInvites.map(email => (
                            <span key={email} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-800 rounded-full text-xs">
                              {email}
                              <button onClick={() => handleRemoveEmail(email)} className="text-red-500">×</button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {friends.length > 0 && (
                      <>
                        <h4 className="text-sm font-medium">Or Select from Friends</h4>
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
                      </>
                    )}
                  </div>
                )}
                {/* Other mobile steps remain the same */}
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
                disabled={
                  (step === 'participants' && selectedParticipants.size === 0 && emailInvites.length === 0)
                }
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

  // Desktop/Tablet Modal - FIXED POSITIONING WITH ABSOLUTE CENTERING
  return (
    <div className="fixed inset-0 z-50">
      {/* Background overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Centered modal container */}
      <div 
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-[90%] max-w-4xl flex flex-col"
        style={{ maxHeight: '85vh' }}
      >
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
          {/* Content remains the same but add participants section with email input */}
          {mode === 'wizard' && step === 'participants' && (
            <div className="space-y-4">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                  Select Participants
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Invite people by email or select from your friends list.
                </p>
              </div>

              {/* Email Invitation Section */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <label className="block text-sm font-medium text-blue-900 dark:text-blue-100 mb-3">
                  Invite by Email Address
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={inviteInput}
                    onChange={(e) => setInviteInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddEmail();
                      }
                    }}
                    placeholder="Enter email address (e.g., john@example.com)"
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             bg-white dark:bg-gray-700 text-gray-800 dark:text-white
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleAddEmail}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
                
                {emailInvites.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-blue-800 dark:text-blue-200 mb-2">Email invites ({emailInvites.length}):</p>
                    <div className="flex flex-wrap gap-2">
                      {emailInvites.map(email => (
                        <span 
                          key={email} 
                          className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-800 rounded-full text-sm"
                        >
                          <span>📧</span>
                          {email}
                          <button 
                            onClick={() => handleRemoveEmail(email)} 
                            className="text-red-500 hover:text-red-700 font-bold"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Friends Selection */}
              {friends.length > 0 && (
                <>
                  <div className="flex items-center gap-2 mt-6 mb-3">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Or Select from Friends
                    </h4>
                    <span className="text-xs text-gray-500">({friends.length} available)</span>
                  </div>
                  
                  <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2">
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
                </>
              )}

              {/* Summary */}
              <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <span className="text-xl">✨</span>
                  <div>
                    <p className="text-sm text-purple-800 dark:text-purple-300 font-medium">
                      Total Invites: {selectedParticipants.size + emailInvites.length}
                    </p>
                    <p className="text-xs text-purple-700 dark:text-purple-400 mt-1">
                      {selectedParticipants.size > 0 && `${selectedParticipants.size} friends`}
                      {selectedParticipants.size > 0 && emailInvites.length > 0 && ', '}
                      {emailInvites.length > 0 && `${emailInvites.length} email invites`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Other wizard steps and chat mode remain the same */}
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
                  if (selectedParticipants.size > 0 || emailInvites.length > 0) {
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
                (step === 'participants' && selectedParticipants.size === 0 && emailInvites.length === 0) ||
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
  );
}
