// app/(protected)/calendar/components/EventCarpoolModal.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  Car, Users, MapPin, Clock, DollarSign, MessageCircle,
  Camera, Navigation, AlertCircle, Star, Bell, Calendar,
  Plus, Check, X, Send, Settings, Route, Fuel, Coffee,
  Share2, UserPlus, Timer, CloudRain, Phone, ChevronDown,
  Shield, Zap, TrendingUp, Award, Heart, ThumbsUp, ArrowLeft,
  MoreVertical, Mic, Paperclip, Map, Info, Trash2, RefreshCw
} from 'lucide-react';
import type { DBEvent } from '@/lib/types';

// Types
interface EventCarpoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: DBEvent | null;
  userId: string | null;
  carpoolData?: {
    carpoolMatches: any[];
    friends: any[];
    sendCarpoolInvite: (matchId: string, message?: string) => Promise<any>;
    createCarpoolGroup: (eventId: string, friendIds: string[], message?: string) => Promise<any>;
  };
  showToast?: (toast: { type: string; message: string }) => void;
  isMobile?: boolean;
}

interface Message {
  id: number;
  user: string;
  userId?: string;
  message: string;
  time: string;
  avatar: string;
  isAI?: boolean;
  reactions?: string[];
  isEventPost?: boolean;
  eventData?: {
    title: string;
    date: string;
    time: string;
    location: string;
  };
}

interface Poll {
  id: string;
  question: string;
  options: { text: string; votes: string[] }[];
  createdBy: string;
  active: boolean;
}

const EventCarpoolModal: React.FC<EventCarpoolModalProps> = ({
  isOpen,
  onClose,
  event,
  userId,
  carpoolData,
  showToast,
  isMobile = false
}) => {
  const [activeSection, setActiveSection] = useState('chat');
  const [isNewCarpool, setIsNewCarpool] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [newPollQuestion, setNewPollQuestion] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [driverStatus, setDriverStatus] = useState<'none' | 'driver' | 'rider'>('none');
  const [carDetails, setCarDetails] = useState({ seats: 4, make: '', color: '' });
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showNewCarpoolConfirm, setShowNewCarpoolConfirm] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize with event post when opening or starting new carpool
  useEffect(() => {
    if (isOpen && event) {
      initializeCarpoolChat();
    }
  }, [isOpen, event, isNewCarpool]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initializeCarpoolChat = () => {
    if (!event) return;

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

    // Create event post message
    const eventPostMessage: Message = {
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

    if (isNewCarpool) {
      // Start fresh for new carpool
      setMessages([eventPostMessage]);
      setPolls([]);
      setDriverStatus('none');
      setSelectedFriends([]);
    } else {
      // Load existing messages (for demo, we'll use sample data)
      const existingMessages: Message[] = [
        eventPostMessage,
        { 
          id: 1, 
          user: 'Sarah', 
          message: 'I can drive! My car fits 5 people', 
          time: '2:30 PM', 
          avatar: '👩‍🦰',
          reactions: ['👍']
        },
        { 
          id: 2, 
          user: 'Mike', 
          message: 'Perfect! When should we meet?', 
          time: '2:32 PM', 
          avatar: '👨‍💼' 
        },
        { 
          id: 3, 
          user: 'AI Assistant', 
          message: 'Based on traffic, I suggest leaving at 6:15 PM from Central Park entrance', 
          time: '2:35 PM', 
          avatar: '🤖', 
          isAI: true 
        }
      ];
      setMessages(existingMessages);
    }
  };

  // Vibrate function for mobile haptic feedback
  const vibrate = () => {
    if (isMobile && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  if (!isOpen || !event) return null;

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

  const carpoolStats = {
    totalFriends: carpoolData?.friends?.length || 0,
    needingRides: 3,
    driversAvailable: 1,
    estimatedSavings: '$12-18'
  };

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    
    vibrate();
    const newMsg: Message = {
      id: Date.now(),
      user: 'You',
      userId: userId || '',
      message: newMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      avatar: '😊'
    };
    setMessages([...messages, newMsg]);
    setNewMessage('');
    
    // Auto AI response for certain keywords
    if (newMessage.toLowerCase().includes('route') || newMessage.toLowerCase().includes('way')) {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: Date.now(),
          user: 'AI Assistant',
          message: 'The fastest route is via I-95 North, avoiding downtown. ETA: 32 minutes',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          avatar: '🤖',
          isAI: true
        }]);
      }, 800);
    }
  };

  const handleQuickAction = (action: string) => {
    vibrate();
    switch (action) {
      case 'driver':
        setDriverStatus('driver');
        setMessages(prev => [...prev, {
          id: Date.now(),
          user: 'You',
          message: `🚗 I can drive! ${carDetails.seats} seats available`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          avatar: '😊'
        }]);
        break;
      case 'rider':
        setDriverStatus('rider');
        setMessages(prev => [...prev, {
          id: Date.now(),
          user: 'You',
          message: '🙋 I need a ride!',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          avatar: '😊'
        }]);
        break;
      case 'location':
        setMessages(prev => [...prev, {
          id: Date.now(),
          user: 'You',
          message: '📍 Sharing my location...',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          avatar: '😊'
        }]);
        break;
      case 'late':
        setMessages(prev => [...prev, {
          id: Date.now(),
          user: 'You',
          message: '⏰ Running 10 mins late!',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          avatar: '😊'
        }]);
        break;
    }
    setShowQuickActions(false);
    showToast?.({ type: 'success', message: 'Message sent!' });
  };

  const createPoll = () => {
    if (!newPollQuestion.trim()) return;
    
    vibrate();
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

  const votePoll = (pollId: string, optionIndex: number) => {
    vibrate();
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

  const handleVoiceRecord = () => {
    vibrate();
    setIsVoiceRecording(!isVoiceRecording);
    if (!isVoiceRecording) {
      showToast?.({ type: 'info', message: '🎤 Recording...' });
      // Simulate recording
      setTimeout(() => {
        setIsVoiceRecording(false);
        setMessages(prev => [...prev, {
          id: Date.now(),
          user: 'You',
          message: '🎵 Voice message (0:03)',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          avatar: '😊'
        }]);
        showToast?.({ type: 'success', message: 'Voice message sent!' });
      }, 3000);
    }
  };

  const addReaction = (messageId: number, emoji: string) => {
    vibrate();
    setMessages(messages.map(msg => {
      if (msg.id === messageId) {
        const reactions = msg.reactions || [];
        if (!reactions.includes(emoji)) {
          reactions.push(emoji);
        }
        return { ...msg, reactions };
      }
      return msg;
    }));
  };

  const startNewCarpool = () => {
    setIsNewCarpool(true);
    setShowNewCarpoolConfirm(false);
    showToast?.({ type: 'success', message: 'Started new carpool group!' });
  };

  const postEventDetails = () => {
    if (!event) return;
    
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

    const eventPostMessage: Message = {
      id: Date.now(),
      user: 'You',
      message: 'Shared event details',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      avatar: '😊',
      isEventPost: true,
      eventData: {
        title: event.title,
        date: eventDateStr,
        time: eventTime,
        location: event.location || 'Location TBD'
      }
    };

    setMessages(prev => [...prev, eventPostMessage]);
    showToast?.({ type: 'success', message: 'Event details posted!' });
  };

  // Event Post Component
  const EventPost = ({ eventData }: { eventData: any }) => (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4 my-2">
      <div className="flex items-start gap-3">
        <div className="bg-blue-500 text-white p-2 rounded-lg">
          <Calendar size={20} />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
            {eventData.title}
          </h4>
          <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <Clock size={14} />
              <span>{eventData.date} • {eventData.time}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={14} />
              <span>{eventData.location}</span>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
              <Navigation className="inline mr-1" size={12} />
              Directions
            </button>
            <button className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full text-xs font-medium hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors">
              <Share2 className="inline mr-1" size={12} />
              Share
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Mobile-optimized full-screen modal
  if (isMobile) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col">
        {/* Mobile Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-3 safe-area-top">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="p-2 -ml-2 active:scale-95"
            >
              <ArrowLeft size={24} />
            </button>
            <div className="flex-1 text-center">
              <h3 className="font-semibold text-lg">Carpool</h3>
              <p className="text-xs opacity-90 truncate px-4">{event.title}</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowNewCarpoolConfirm(true)}
                className="p-2 active:scale-95"
                title="Start New Carpool"
              >
                <RefreshCw size={20} />
              </button>
              <button
                onClick={() => setShowInfo(true)}
                className="p-2 -mr-2 active:scale-95"
              >
                <Info size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Event Info Bar */}
        <div className="bg-blue-50 dark:bg-gray-800 px-4 py-2 border-b dark:border-gray-700">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
              <Calendar size={12} />
              {eventDateStr}
            </span>
            <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
              <Clock size={12} />
              {eventTime}
            </span>
            <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
              <MapPin size={12} />
              {event.location || 'TBD'}
            </span>
          </div>
        </div>

        {/* Status Banner */}
        {driverStatus !== 'none' && (
          <div className={`px-4 py-2 flex items-center justify-between ${
            driverStatus === 'driver' 
              ? 'bg-green-100 dark:bg-green-900/30' 
              : 'bg-blue-100 dark:bg-blue-900/30'
          }`}>
            <div className="flex items-center gap-2">
              {driverStatus === 'driver' ? (
                <>
                  <Car className="text-green-600 dark:text-green-400" size={16} />
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">
                    You're driving • {carDetails.seats} seats
                  </span>
                </>
              ) : (
                <>
                  <UserPlus className="text-blue-600 dark:text-blue-400" size={16} />
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Looking for a ride
                  </span>
                </>
              )}
            </div>
            <button 
              onClick={() => setDriverStatus('none')}
              className="text-gray-500 active:scale-95"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Mobile Tabs */}
        <div className="flex border-b dark:border-gray-700 bg-white dark:bg-gray-900">
          <button
            onClick={() => setActiveSection('chat')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeSection === 'chat'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveSection('plan')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeSection === 'plan'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            Plan
          </button>
          <button
            onClick={() => setActiveSection('friends')}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              activeSection === 'friends'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            Friends
            {carpoolData?.friends && carpoolData.friends.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {carpoolData.friends.length}
              </span>
            )}
          </button>
        </div>

        {/* Chat Section */}
        {activeSection === 'chat' && (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50 dark:bg-gray-950">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2 ${
                    msg.userId === userId ? 'flex-row-reverse' : ''
                  }`}
                >
                  <span className="text-2xl flex-shrink-0">{msg.avatar}</span>
                  <div className={`max-w-[70%] ${msg.userId === userId ? 'items-end' : ''}`}>
                    {msg.isEventPost ? (
                      <EventPost eventData={msg.eventData} />
                    ) : (
                      <>
                        <div className={`rounded-2xl px-3 py-2 ${
                          msg.userId === userId
                            ? 'bg-blue-500 text-white'
                            : msg.isAI
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-100'
                            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                        }`}>
                          <p className="text-sm">{msg.message}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1 px-1">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {msg.time}
                          </span>
                          {msg.reactions && msg.reactions.length > 0 && (
                            <div className="flex gap-1">
                              {msg.reactions.map((reaction, idx) => (
                                <span key={idx} className="text-xs">
                                  {reaction}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Active Polls */}
            {polls.length > 0 && (
              <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-t dark:border-gray-700">
                {polls.map(poll => (
                  <div key={poll.id} className="mb-2">
                    <p className="text-sm font-medium mb-2">{poll.question}</p>
                    <div className="flex gap-2">
                      {poll.options.map((option, idx) => (
                        <button
                          key={idx}
                          onClick={() => votePoll(poll.id, idx)}
                          className={`flex-1 py-1 px-2 text-xs rounded-lg transition-colors ${
                            option.votes.includes(userId || '')
                              ? 'bg-blue-500 text-white'
                              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border dark:border-gray-600'
                          }`}
                        >
                          {option.text} ({option.votes.length})
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Input Area */}
            <div className="px-4 py-3 bg-white dark:bg-gray-900 border-t dark:border-gray-700 safe-area-bottom">
              {/* Quick Actions Bar */}
              <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
                <button
                  onClick={() => handleQuickAction('driver')}
                  className="flex-shrink-0 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs font-medium active:scale-95"
                >
                  🚗 I'll Drive
                </button>
                <button
                  onClick={() => handleQuickAction('rider')}
                  className="flex-shrink-0 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full text-xs font-medium active:scale-95"
                >
                  🙋 Need Ride
                </button>
                <button
                  onClick={() => handleQuickAction('location')}
                  className="flex-shrink-0 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full text-xs font-medium active:scale-95"
                >
                  📍 Location
                </button>
                <button
                  onClick={() => handleQuickAction('late')}
                  className="flex-shrink-0 px-3 py-1.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-full text-xs font-medium active:scale-95"
                >
                  ⏰ Running Late
                </button>
                <button
                  onClick={() => setShowPoll(true)}
                  className="flex-shrink-0 px-3 py-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full text-xs font-medium active:scale-95"
                >
                  📊 Poll
                </button>
                <button
                  onClick={postEventDetails}
                  className="flex-shrink-0 px-3 py-1.5 bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded-full text-xs font-medium active:scale-95"
                >
                  📅 Post Event
                </button>
              </div>

              {/* Message Input */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleVoiceRecord}
                  className={`p-2 rounded-full transition-colors active:scale-95 ${
                    isVoiceRecording
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <Mic size={20} />
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={sendMessage}
                  className="p-2 bg-blue-500 text-white rounded-full active:scale-95"
                  disabled={!newMessage.trim()}
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </>
        )}

        {/* Plan Section */}
        {activeSection === 'plan' && (
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {/* AI Suggestions */}
            <div className="bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-xl p-4">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Zap className="text-yellow-500" size={16} />
                Smart Suggestions
              </h4>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <MapPin className="text-blue-500 mt-0.5" size={14} />
                  <div>
                    <p className="text-sm font-medium">Meetup: Central Park</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Best for 3 riders</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="text-orange-500 mt-0.5" size={14} />
                  <div>
                    <p className="text-sm font-medium">Leave by 6:15 PM</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Heavy traffic expected</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Route className="text-green-500 mt-0.5" size={14} />
                  <div>
                    <p className="text-sm font-medium">Via Downtown</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Saves 12 minutes</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <DollarSign className="text-purple-500 mt-0.5" size={14} />
                  <div>
                    <p className="text-sm font-medium">$3.75 per person</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Parking split 4 ways</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center">
                <Users className="mx-auto text-blue-500 mb-1" size={20} />
                <p className="text-lg font-bold">{carpoolStats.needingRides}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Need Rides</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center">
                <Car className="mx-auto text-green-500 mb-1" size={20} />
                <p className="text-lg font-bold">{carpoolStats.driversAvailable}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Drivers</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center">
                <DollarSign className="mx-auto text-purple-500 mb-1" size={20} />
                <p className="text-sm font-bold">{carpoolStats.estimatedSavings}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Est. Savings</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center">
                <TrendingUp className="mx-auto text-orange-500 mb-1" size={20} />
                <p className="text-lg font-bold">-4.2</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">kg CO₂</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button className="w-full p-3 bg-blue-500 text-white rounded-lg font-medium active:scale-98">
                <Map className="inline mr-2" size={18} />
                Open in Maps
              </button>
              <button className="w-full p-3 bg-green-500 text-white rounded-lg font-medium active:scale-98">
                <Share2 className="inline mr-2" size={18} />
                Share Trip Details
              </button>
            </div>
          </div>
        )}

        {/* Friends Section */}
        {activeSection === 'friends' && (
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {carpoolData?.friends && carpoolData.friends.length > 0 ? (
              <>
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Select friends to invite
                  </h4>
                  <div className="space-y-2">
                    {carpoolData.friends.map((friend: any) => (
                      <label
                        key={friend.friend_id}
                        className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg active:scale-98"
                      >
                        <input
                          type="checkbox"
                          checked={selectedFriends.includes(friend.friend_id)}
                          onChange={(e) => {
                            vibrate();
                            if (e.target.checked) {
                              setSelectedFriends([...selectedFriends, friend.friend_id]);
                            } else {
                              setSelectedFriends(selectedFriends.filter(id => id !== friend.friend_id));
                            }
                          }}
                          className="rounded text-blue-500"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{friend.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {friend.safe_to_carpool ? '✅ Verified' : 'Not verified'}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                
                {selectedFriends.length > 0 && (
                  <button
                    onClick={() => {
                      carpoolData.createCarpoolGroup?.(event.id, selectedFriends, "Let's carpool!");
                      setSelectedFriends([]);
                      showToast?.({ type: 'success', message: 'Invitations sent!' });
                      vibrate();
                    }}
                    className="w-full p-3 bg-green-500 text-white rounded-lg font-medium active:scale-98"
                  >
                    Send Invites ({selectedFriends.length})
                  </button>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <Users className="mx-auto mb-3 text-gray-300" size={48} />
                <p className="text-gray-500 dark:text-gray-400">No friends available</p>
                <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm">
                  Invite Friends
                </button>
              </div>
            )}
          </div>
        )}

        {/* Modals */}
        {showNewCarpoolConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 px-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full">
              <h3 className="text-lg font-semibold mb-3">Start New Carpool?</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                This will clear the current chat history and start fresh. Are you sure?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowNewCarpoolConfirm(false)}
                  className="flex-1 p-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium active:scale-98"
                >
                  Cancel
                </button>
                <button
                  onClick={startNewCarpool}
                  className="flex-1 p-3 bg-blue-500 text-white rounded-lg font-medium active:scale-98"
                >
                  Start New
                </button>
              </div>
            </div>
          </div>
        )}

        {showPoll && (
          <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-60">
            <div className="bg-white dark:bg-gray-800 rounded-t-2xl p-6 w-full max-w-lg safe-area-bottom animate-slide-up">
              <h3 className="text-lg font-semibold mb-4">Create Poll</h3>
              <input
                type="text"
                value={newPollQuestion}
                onChange={(e) => setNewPollQuestion(e.target.value)}
                placeholder="What should we vote on?"
                className="w-full p-3 border dark:border-gray-700 rounded-lg mb-4 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPoll(false)}
                  className="flex-1 p-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium active:scale-98"
                >
                  Cancel
                </button>
                <button
                  onClick={createPoll}
                  className="flex-1 p-3 bg-blue-500 text-white rounded-lg font-medium active:scale-98"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {showInfo && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 px-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full">
              <h3 className="text-lg font-semibold mb-3">About Carpool</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Coordinate rides with friends to save money and reduce emissions. 
                Share locations, split costs, and arrive together!
              </p>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2">
                  <Shield className="text-green-500" size={16} />
                  <span className="text-xs">Safe verified friends only</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="text-blue-500" size={16} />
                  <span className="text-xs">Auto-split gas & parking</span>
                </div>
                <div className="flex items-center gap-2">
                  <Navigation className="text-purple-500" size={16} />
                  <span className="text-xs">Real-time location sharing</span>
                </div>
              </div>
              <button
                onClick={() => setShowInfo(false)}
                className="w-full p-3 bg-blue-500 text-white rounded-lg font-medium active:scale-98"
              >
                Got it!
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Desktop version
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Desktop Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Car />
                Carpool Coordination
              </h2>
              <p className="text-blue-100 mt-1">{event.title}</p>
              <p className="text-sm text-blue-200">
                {eventDateStr} • {eventTime} • {event.location || 'TBD'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowNewCarpoolConfirm(true)}
                className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors flex items-center gap-2"
                title="Start New Carpool"
              >
                <RefreshCw size={20} />
                <span className="text-sm">New Carpool</span>
              </button>
              <button
                onClick={onClose}
                className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Content */}
        <div className="flex h-[70vh]">
          {/* Left Sidebar - Stats & Actions */}
          <div className="w-80 bg-gray-50 dark:bg-gray-800 p-6 border-r dark:border-gray-700">
            {/* Stats */}
            <div className="space-y-4 mb-6">
              <h3 className="font-semibold text-gray-900 dark:text-white">Trip Overview</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center">
                  <Users className="mx-auto text-blue-500 mb-1" size={24} />
                  <p className="text-xl font-bold">{carpoolStats.needingRides}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Need Rides</p>
                </div>
                <div className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center">
                  <Car className="mx-auto text-green-500 mb-1" size={24} />
                  <p className="text-xl font-bold">{carpoolStats.driversAvailable}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Drivers</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-3 mb-6">
              <h4 className="font-medium text-gray-900 dark:text-white">Quick Actions</h4>
              <button
                onClick={() => handleQuickAction('driver')}
                className="w-full p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-left"
              >
                🚗 I can drive ({carDetails.seats} seats)
              </button>
              <button
                onClick={() => handleQuickAction('rider')}
                className="w-full p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors text-left"
              >
                🙋 I need a ride
              </button>
              <button
                onClick={() => handleQuickAction('location')}
                className="w-full p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors text-left"
              >
                📍 Share location
              </button>
              <button
                onClick={postEventDetails}
                className="w-full p-3 bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 rounded-lg hover:bg-pink-200 dark:hover:bg-pink-900/50 transition-colors text-left"
              >
                📅 Post event details
              </button>
            </div>

            {/* AI Suggestions */}
            <div className="bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-xl p-4">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Zap className="text-yellow-500" size={16} />
                Smart Suggestions
              </h4>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <MapPin className="text-blue-500 mt-0.5" size={14} />
                  <div>
                    <p className="text-sm font-medium">Central Park Meetup</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Best pickup spot</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="text-orange-500 mt-0.5" size={14} />
                  <div>
                    <p className="text-sm font-medium">Leave at 6:15 PM</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Avoid rush hour</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <DollarSign className="text-purple-500 mt-0.5" size={14} />
                  <div>
                    <p className="text-sm font-medium">$3.75 per person</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Gas + parking split</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col">
            {/* Status Banner */}
            {driverStatus !== 'none' && (
              <div className={`px-6 py-3 flex items-center justify-between ${
                driverStatus === 'driver' 
                  ? 'bg-green-100 dark:bg-green-900/30' 
                  : 'bg-blue-100 dark:bg-blue-900/30'
              }`}>
                <div className="flex items-center gap-2">
                  {driverStatus === 'driver' ? (
                    <>
                      <Car className="text-green-600 dark:text-green-400" size={20} />
                      <span className="font-medium text-green-800 dark:text-green-200">
                        You're driving • {carDetails.seats} seats available
                      </span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="text-blue-600 dark:text-blue-400" size={20} />
                      <span className="font-medium text-blue-800 dark:text-blue-200">
                        Looking for a ride
                      </span>
                    </>
                  )}
                </div>
                <button 
                  onClick={() => setDriverStatus('none')}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <X size={20} />
                </button>
              </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50 dark:bg-gray-950">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${
                    msg.userId === userId ? 'flex-row-reverse' : ''
                  }`}
                >
                  <span className="text-3xl flex-shrink-0">{msg.avatar}</span>
                  <div className={`max-w-[60%] ${msg.userId === userId ? 'items-end' : ''}`}>
                    {msg.isEventPost ? (
                      <EventPost eventData={msg.eventData} />
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {msg.user}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {msg.time}
                          </span>
                        </div>
                        <div className={`rounded-2xl px-4 py-3 ${
                          msg.userId === userId
                            ? 'bg-blue-500 text-white'
                            : msg.isAI
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-100'
                            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                        }`}>
                          <p>{msg.message}</p>
                        </div>
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className="flex gap-1 mt-1 px-2">
                            {msg.reactions.map((reaction, idx) => (
                              <span key={idx} className="text-sm bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">
                                {reaction}
                              </span>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Active Polls */}
            {polls.length > 0 && (
              <div className="px-6 py-4 bg-yellow-50 dark:bg-yellow-900/20 border-t dark:border-gray-700">
                {polls.map(poll => (
                  <div key={poll.id} className="mb-4">
                    <p className="font-medium mb-3">{poll.question}</p>
                    <div className="flex gap-3">
                      {poll.options.map((option, idx) => (
                        <button
                          key={idx}
                          onClick={() => votePoll(poll.id, idx)}
                          className={`px-4 py-2 rounded-lg transition-colors ${
                            option.votes.includes(userId || '')
                              ? 'bg-blue-500 text-white'
                              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                          }`}
                        >
                          {option.text} ({option.votes.length})
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Input Area */}
            <div className="px-6 py-4 bg-white dark:bg-gray-900 border-t dark:border-gray-700">
              {/* Quick Actions */}
              <div className="flex gap-2 mb-3 overflow-x-auto">
                <button
                  onClick={() => setShowPoll(true)}
                  className="px-3 py-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full text-sm font-medium hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
                >
                  📊 Create Poll
                </button>
                <button
                  onClick={() => handleQuickAction('late')}
                  className="px-3 py-1.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-full text-sm font-medium hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors"
                >
                  ⏰ Running Late
                </button>
              </div>

              {/* Message Input */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleVoiceRecord}
                  className={`p-2 rounded-full transition-colors ${
                    isVoiceRecording
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <Mic size={20} />
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={sendMessage}
                  className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                  disabled={!newMessage.trim()}
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Friends */}
          <div className="w-80 bg-gray-50 dark:bg-gray-800 p-6 border-l dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Invite Friends</h3>
            {carpoolData?.friends && carpoolData.friends.length > 0 ? (
              <div className="space-y-3">
                {carpoolData.friends.map((friend: any) => (
                  <label
                    key={friend.friend_id}
                    className="flex items-center gap-3 p-3 bg-white dark:bg-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors cursor-pointer"
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
                      className="rounded text-blue-500"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{friend.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {friend.safe_to_carpool ? '✅ Verified' : 'Not verified'}
                      </p>
                    </div>
                  </label>
                ))}
                
                {selectedFriends.length > 0 && (
                  <button
                    onClick={() => {
                      carpoolData.createCarpoolGroup?.(event.id, selectedFriends, "Let's carpool!");
                      setSelectedFriends([]);
                      showToast?.({ type: 'success', message: 'Invitations sent!' });
                    }}
                    className="w-full p-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
                  >
                    Send Invites ({selectedFriends.length})
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="mx-auto mb-3 text-gray-300" size={48} />
                <p className="text-gray-500 dark:text-gray-400 mb-4">No friends available</p>
                <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                  Invite Friends
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Poll Modal */}
        {showPoll && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Create Poll</h3>
              <input
                type="text"
                value={newPollQuestion}
                onChange={(e) => setNewPollQuestion(e.target.value)}
                placeholder="What should we vote on?"
                className="w-full p-3 border dark:border-gray-700 rounded-lg mb-4 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPoll(false)}
                  className="flex-1 p-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createPoll}
                  className="flex-1 p-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                >
                  Create Poll
                </button>
              </div>
            </div>
          </div>
        )}

        {/* New Carpool Confirmation Modal */}
        {showNewCarpoolConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Start New Carpool?</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                This will clear the current chat history and start a fresh carpool group for this event. Are you sure?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowNewCarpoolConfirm(false)}
                  className="flex-1 p-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={startNewCarpool}
                  className="flex-1 p-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                >
                  Start New
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventCarpoolModal;
