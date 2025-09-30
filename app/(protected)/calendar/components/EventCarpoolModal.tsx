// app/(protected)/calendar/components/EventCarpoolModal.tsx

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Car, Users, MapPin, Clock, DollarSign, MessageCircle,
  Camera, Navigation, AlertCircle, Star, Bell, Calendar,
  Plus, Check, X, Send, Settings, Route, Fuel, Coffee,
  Share2, UserPlus, Timer, CloudRain, Phone, ChevronDown,
  Shield, Zap, TrendingUp, Award, Heart, ThumbsUp, ArrowLeft,
  MoreVertical, Mic, Paperclip, Map, Info, Trash2, RefreshCw,
  Activity, Target, Percent, Globe, Eye, EyeOff, Sparkles,
  Gauge, BookOpen, Wifi, WifiOff, Bookmark, BookmarkCheck,
  Edit
} from 'lucide-react';
import type { DBEvent } from '@/lib/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
  onOpenSettings?: () => void;
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
  edited?: boolean;
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

interface CarpoolStats {
  totalFriends: number;
  needingRides: number;
  driversAvailable: number;
  estimatedSavings: string;
  distanceAway: number;
}

const EventCarpoolModal: React.FC<EventCarpoolModalProps> = ({
  isOpen,
  onClose,
  event,
  userId,
  carpoolData,
  showToast,
  isMobile = false,
  onOpenSettings
}) => {
  const [activeView, setActiveView] = useState<'overview' | 'coordination' | 'chat'>('overview');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [polls, setPolls] = useState<Poll[]>([]);
  const [newPollQuestion, setNewPollQuestion] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [driverStatus, setDriverStatus] = useState<'none' | 'driver' | 'rider'>('none');
  const [carDetails, setCarDetails] = useState({ seats: 4, make: '', color: '' });
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showNewCarpoolConfirm, setShowNewCarpoolConfirm] = useState(false);
  const [editingMessage, setEditingMessage] = useState<number | null>(null);
  const [editMessageText, setEditMessageText] = useState('');
  const [editingPoll, setEditingPoll] = useState<string | null>(null);
  const [editPollText, setEditPollText] = useState('');
  const [showEditCarDetails, setShowEditCarDetails] = useState(false);
  const [tempCarDetails, setTempCarDetails] = useState(carDetails);
  const [showEditEventDetails, setShowEditEventDetails] = useState(false);
  const [tempEventDetails, setTempEventDetails] = useState({
    meetupLocation: '',
    departureTime: '',
    notes: ''
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Calculate carpool stats
  const carpoolStats: CarpoolStats = {
    totalFriends: carpoolData?.friends?.length || 8,
    needingRides: 5,
    driversAvailable: 2,
    estimatedSavings: '$45',
    distanceAway: 23
  };

  // AI Suggestions based on event data
  const getAISuggestions = () => {
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

  // Initialize with event post when opening
  useEffect(() => {
    if (isOpen && event) {
      initializeCarpoolChat();
    }
  }, [isOpen, event]);

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
    setMessages(existingMessages);
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

  const aiSuggestions = getAISuggestions();

  const sendMessage = async () => {
    if (!newMessage.trim() || !carpoolGroupId || !userId) return;
    
    vibrate();
    
    try {
      // Save message to database
      const { data, error } = await supabase
        .from('carpool_messages')
        .insert({
          group_id: carpoolGroupId,
          user_id: userId,
          message: newMessage.trim(),
          message_type: 'text'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Add to local state
      const newMsg: Message = {
        id: parseInt(data.id),
        user: 'You',
        userId: userId,
        message: newMessage,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        avatar: '😊'
      };
      
      setMessages(prev => [...prev, newMsg]);
      setNewMessage('');
      
      // Update group last activity
      await supabase
        .from('carpool_groups')
        .update({ last_activity: new Date().toISOString() })
        .eq('id', carpoolGroupId);
      
    } catch (error) {
      console.error('Error sending message:', error);
      showToast?.({ type: 'error', message: 'Failed to send message' });
    }
  };

  const handleQuickAction = (action: string) => {
    vibrate();
    switch (action) {
      case 'offer-drive':
        setDriverStatus('driver');
        setMessages(prev => [...prev, {
          id: Date.now(),
          user: 'You',
          message: `🚗 I can drive! ${carDetails.seats} seats available`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          avatar: '😊'
        }]);
        break;
      case 'need-ride':
        setDriverStatus('rider');
        setMessages(prev => [...prev, {
          id: Date.now(),
          user: 'You',
          message: '🙋 I need a ride!',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          avatar: '😊'
        }]);
        break;
      case 'suggest-meetup':
        setMessages(prev => [...prev, {
          id: Date.now(),
          user: 'You',
          message: '📍 How about meeting at Central Park entrance?',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          avatar: '😊'
        }]);
        break;
      case 'running-late':
        setMessages(prev => [...prev, {
          id: Date.now(),
          user: 'You',
          message: '⏰ Running 10 mins late!',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          avatar: '😊'
        }]);
        break;
      case 'share-location':
        setMessages(prev => [...prev, {
          id: Date.now(),
          user: 'You',
          message: '📍 Sharing my live location...',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          avatar: '😊'
        }]);
        break;
      case 'quick-poll':
        setShowPoll(true);
        break;
    }
    showToast?.({ type: 'success', message: 'Action completed!' });
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

  // New editing functions
  const startEditMessage = (messageId: number, currentText: string) => {
    setEditingMessage(messageId);
    setEditMessageText(currentText);
  };

  const saveEditMessage = () => {
    if (!editMessageText.trim() || editingMessage === null) return;
    
    setMessages(messages.map(msg => 
      msg.id === editingMessage 
        ? { ...msg, message: editMessageText, edited: true }
        : msg
    ));
    setEditingMessage(null);
    setEditMessageText('');
    showToast?.({ type: 'success', message: 'Message updated!' });
  };

  const deleteMessage = (messageId: number) => {
    setMessages(messages.filter(msg => msg.id !== messageId));
    showToast?.({ type: 'success', message: 'Message deleted!' });
  };

  const startEditPoll = (pollId: string, currentQuestion: string) => {
    setEditingPoll(pollId);
    setEditPollText(currentQuestion);
  };

  const saveEditPoll = () => {
    if (!editPollText.trim() || !editingPoll) return;
    
    setPolls(polls.map(poll => 
      poll.id === editingPoll 
        ? { ...poll, question: editPollText }
        : poll
    ));
    setEditingPoll(null);
    setEditPollText('');
    showToast?.({ type: 'success', message: 'Poll updated!' });
  };

  const deletePoll = (pollId: string) => {
    setPolls(polls.filter(poll => poll.id !== pollId));
    showToast?.({ type: 'success', message: 'Poll deleted!' });
  };

  const changeVote = (pollId: string, oldOptionIndex: number, newOptionIndex: number) => {
    setPolls(polls.map(poll => {
      if (poll.id === pollId) {
        const newOptions = [...poll.options];
        // Remove vote from old option
        newOptions[oldOptionIndex].votes = newOptions[oldOptionIndex].votes.filter(id => id !== userId);
        // Add vote to new option
        if (!newOptions[newOptionIndex].votes.includes(userId || '')) {
          newOptions[newOptionIndex].votes.push(userId || '');
        }
        return { ...poll, options: newOptions };
      }
      return poll;
    }));
    vibrate();
    showToast?.({ type: 'success', message: 'Vote changed!' });
  };

  const saveCarDetails = () => {
    setCarDetails(tempCarDetails);
    setShowEditCarDetails(false);
    
    // Update driver status message if user is currently driving
    if (driverStatus === 'driver') {
      setMessages(prev => [...prev, {
        id: Date.now(),
        user: 'You',
        message: `🚗 Updated car info: ${tempCarDetails.make} ${tempCarDetails.color}, ${tempCarDetails.seats} seats available`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        avatar: '😊'
      }]);
    }
    
    showToast?.({ type: 'success', message: 'Car details updated!' });
  };

  const saveEventDetails = () => {
    setMessages(prev => [...prev, {
      id: Date.now(),
      user: 'You',
      message: `📍 Updated carpool details: Meetup at ${tempEventDetails.meetupLocation}, departing ${tempEventDetails.departureTime}${tempEventDetails.notes ? ` - ${tempEventDetails.notes}` : ''}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      avatar: '😊'
    }]);
    setShowEditEventDetails(false);
    showToast?.({ type: 'success', message: 'Carpool details updated!' });
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
            <button onClick={onClose} className="p-2 -ml-2 active:scale-95">
              <ArrowLeft size={24} />
            </button>
            <div className="flex-1 text-center">
              <h3 className="font-semibold text-lg">Event Carpool Feature Page</h3>
              <p className="text-xs opacity-90 truncate px-4">{event.title}</p>
            </div>
            <div className="flex items-center gap-1">
              {onOpenSettings && (
                <button onClick={onOpenSettings} className="p-2 active:scale-95">
                  <Settings size={20} />
                </button>
              )}
              <button onClick={() => setShowInfo(true)} className="p-2 -mr-2 active:scale-95">
                <MoreVertical size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Overview Section - Always Shown First */}
        {activeView === 'overview' && (
          <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950">
            {/* Event Header Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg m-4 p-4 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {event.title}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {eventDateStr} • {eventTime} • {event.location || 'Madison Square Garden'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-blue-600 dark:text-blue-400 font-semibold">Carpool Coordination</p>
                  <p className="text-blue-500 dark:text-blue-400 text-sm font-medium">
                    {carpoolStats.totalFriends} friends invited
                  </p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <div className="bg-blue-100 dark:bg-blue-900/30 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                    <Users className="text-blue-600 dark:text-blue-400" size={24} />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{carpoolStats.needingRides}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Need Rides</p>
                </div>
                <div className="text-center">
                  <div className="bg-green-100 dark:bg-green-900/30 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                    <Car className="text-green-600 dark:text-green-400" size={24} />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{carpoolStats.driversAvailable}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Drivers Available</p>
                </div>
                <div className="text-center">
                  <div className="bg-purple-100 dark:bg-purple-900/30 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                    <DollarSign className="text-purple-600 dark:text-purple-400" size={24} />
                  </div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{carpoolStats.estimatedSavings} per person</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Est. Savings</p>
                </div>
                <div className="text-center">
                  <div className="bg-orange-100 dark:bg-orange-900/30 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                    <Navigation className="text-orange-600 dark:text-orange-400" size={24} />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{carpoolStats.distanceAway}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Miles Away</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleQuickAction('offer-drive')}
                  className="p-4 bg-blue-500 text-white rounded-xl font-medium active:scale-95 flex items-center gap-2"
                >
                  <Car size={20} />
                  <span>Offer to Drive</span>
                </button>
                <button
                  onClick={() => handleQuickAction('need-ride')}
                  className="p-4 bg-green-500 text-white rounded-xl font-medium active:scale-95 flex items-center gap-2"
                >
                  <UserPlus size={20} />
                  <span>Need a Ride</span>
                </button>
                <button
                  onClick={() => handleQuickAction('suggest-meetup')}
                  className="p-4 bg-purple-500 text-white rounded-xl font-medium active:scale-95 flex items-center gap-2"
                >
                  <MapPin size={20} />
                  <span>Suggest Meetup</span>
                </button>
                <button
                  onClick={() => handleQuickAction('running-late')}
                  className="p-4 bg-orange-500 text-white rounded-xl font-medium active:scale-95 flex items-center gap-2"
                >
                  <Clock size={20} />
                  <span>Running Late</span>
                </button>
                <button
                  onClick={() => handleQuickAction('share-location')}
                  className="p-4 bg-blue-600 text-white rounded-xl font-medium active:scale-95 flex items-center gap-2"
                >
                  <Share2 size={20} />
                  <span>Share Location</span>
                </button>
                <button
                  onClick={() => handleQuickAction('quick-poll')}
                  className="p-4 bg-orange-600 text-white rounded-xl font-medium active:scale-95 flex items-center gap-2"
                >
                  <Activity size={20} />
                  <span>Quick Poll</span>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-4 space-y-3">
              <button
                onClick={() => setActiveView('coordination')}
                className="w-full p-4 bg-blue-500 text-white rounded-xl font-medium active:scale-95 flex items-center justify-center gap-2"
              >
                <Settings size={20} />
                <span>Coordination</span>
              </button>
              <button
                onClick={() => setActiveView('chat')}
                className="w-full p-4 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium active:scale-95 flex items-center justify-center gap-2"
              >
                <MessageCircle size={20} />
                <span>Live Chat</span>
              </button>
            </div>

            {/* Smart Carpool Features */}
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Smart Carpool Features</h3>
              <div className="grid grid-cols-2 gap-3">
                <button className="p-4 bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl text-left hover:shadow-md transition-all active:scale-95">
                  <Route className="text-blue-600 dark:text-blue-400 mb-2" size={24} />
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm">Smart Route Planning</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    AI optimizes pickup order and suggests best meetup spots
                  </p>
                </button>
                
                <button className="p-4 bg-gradient-to-r from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 rounded-xl text-left hover:shadow-md transition-all active:scale-95">
                  <DollarSign className="text-green-600 dark:text-green-400 mb-2" size={24} />
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm">Expense Splitting</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Auto-calculate gas costs and split evenly
                  </p>
                </button>
                
                <button className="p-4 bg-gradient-to-r from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl text-left hover:shadow-md transition-all active:scale-95">
                  <Bell className="text-purple-600 dark:text-purple-400 mb-2" size={24} />
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm">Smart Notifications</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Get alerts for departures, delays, and updates
                  </p>
                </button>

                <button className="p-4 bg-gradient-to-r from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30 rounded-xl text-left hover:shadow-md transition-all active:scale-95">
                  <Camera className="text-orange-600 dark:text-orange-400 mb-2" size={24} />
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm">Car Photos</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Share car/license plate photos for easy identification
                  </p>
                </button>

                <button className="p-4 bg-gradient-to-r from-blue-100 to-cyan-200 dark:from-blue-900/30 dark:to-cyan-800/30 rounded-xl text-left hover:shadow-md transition-all active:scale-95">
                  <CloudRain className="text-blue-600 dark:text-blue-400 mb-2" size={24} />
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm">Weather Alerts</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Automatic departure time adjustments for weather
                  </p>
                </button>

                <button className="p-4 bg-gradient-to-r from-red-100 to-pink-200 dark:from-red-900/30 dark:to-pink-800/30 rounded-xl text-left hover:shadow-md transition-all active:scale-95">
                  <Phone className="text-red-600 dark:text-red-400 mb-2" size={24} />
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm">Emergency Contacts</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Shared emergency contacts within carpool group
                  </p>
                </button>
              </div>
            </div>

            {/* AI Suggestions */}
            {aiSuggestions && (
              <div className="p-4">
                <div className="bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-xl p-4">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Sparkles className="text-yellow-500" size={16} />
                    AI Suggestions
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        • Best meetup spot: {aiSuggestions.meetupSpot}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        • Optimal departure time: {aiSuggestions.departureTime}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        • Recommended route: {aiSuggestions.route}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        • Parking suggestion: {aiSuggestions.parking}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Coordination View */}
        {activeView === 'coordination' && (
          <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 p-4">
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setActiveView('overview')}
                className="p-2 active:scale-95"
              >
                <ArrowLeft size={20} />
              </button>
              <h3 className="text-lg font-semibold">Coordination</h3>
            </div>
            
            {/* Coordination content would go here */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
              <p className="text-gray-600 dark:text-gray-400">
                Coordination features - driver management, timing, routes, etc.
              </p>
            </div>
          </div>
        )}

        {/* Chat View */}
        {activeView === 'chat' && (
          <div className="flex-1 flex flex-col">
            <div className="flex items-center gap-2 p-4 border-b dark:border-gray-700">
              <button
                onClick={() => setActiveView('overview')}
                className="p-2 active:scale-95"
              >
                <ArrowLeft size={20} />
              </button>
              <h3 className="text-lg font-semibold">Live Chat</h3>
            </div>

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

            {/* Input Area */}
            <div className="px-4 py-3 bg-white dark:bg-gray-900 border-t dark:border-gray-700">
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
          </div>
        )}

        {/* Modals */}
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
              </p>
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

  // Desktop version with full feature implementation
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Desktop Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Car />
                Event Carpool Feature Page
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
              {onOpenSettings && (
                <button
                  onClick={onOpenSettings}
                  className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
                  title="Carpool Settings"
                >
                  <Settings size={20} />
                </button>
              )}
              <button
                onClick={onClose}
                className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>
          </div>
          
          {/* Event Stats Bar */}
          <div className="mt-4 grid grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{carpoolStats.totalFriends}</p>
              <p className="text-xs text-blue-200">Friends Invited</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{carpoolStats.needingRides}</p>
              <p className="text-xs text-blue-200">Need Rides</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{carpoolStats.driversAvailable}</p>
              <p className="text-xs text-blue-200">Drivers Available</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">{carpoolStats.estimatedSavings}</p>
              <p className="text-xs text-blue-200">Est. Savings/Person</p>
            </div>
          </div>
        </div>

        {/* Desktop Content */}
        <div className="flex h-[70vh]">
          {/* Left Sidebar - Quick Actions & Features */}
          <div className="w-80 bg-gray-50 dark:bg-gray-800 p-6 border-r dark:border-gray-700">
            {/* Quick Actions */}
            <div className="space-y-3 mb-6">
              <h3 className="font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleQuickAction('offer-drive')}
                  className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <Car size={16} />
                  Offer to Drive
                </button>
                <button
                  onClick={() => handleQuickAction('need-ride')}
                  className="p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <UserPlus size={16} />
                  Need a Ride
                </button>
                <button
                  onClick={() => handleQuickAction('suggest-meetup')}
                  className="p-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <MapPin size={16} />
                  Suggest Meetup
                </button>
                <button
                  onClick={() => handleQuickAction('running-late')}
                  className="p-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <Clock size={16} />
                  Running Late
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleQuickAction('share-location')}
                  className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <Share2 size={16} />
                  Share Location
                </button>
                <button
                  onClick={() => handleQuickAction('quick-poll')}
                  className="p-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <Activity size={16} />
                  Quick Poll
                </button>
              </div>
            </div>

            {/* Smart Features */}
            <div className="space-y-4 mb-6">
              <h4 className="font-medium text-gray-900 dark:text-white">Smart Carpool Features</h4>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-700 rounded-lg">
                  <Route className="text-blue-500 mt-0.5" size={16} />
                  <div>
                    <p className="text-sm font-medium">Smart Route Planning</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">AI optimizes pickup order and suggests best meetup spots</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-700 rounded-lg">
                  <DollarSign className="text-green-500 mt-0.5" size={16} />
                  <div>
                    <p className="text-sm font-medium">Expense Splitting</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Auto-calculate gas costs and split evenly</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-700 rounded-lg">
                  <Bell className="text-purple-500 mt-0.5" size={16} />
                  <div>
                    <p className="text-sm font-medium">Smart Notifications</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Get alerts for departures, delays, and updates</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-700 rounded-lg">
                  <Camera className="text-orange-500 mt-0.5" size={16} />
                  <div>
                    <p className="text-sm font-medium">Car Photos</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Share car/license plate photos for easy identification</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-700 rounded-lg">
                  <CloudRain className="text-blue-500 mt-0.5" size={16} />
                  <div>
                    <p className="text-sm font-medium">Weather Alerts</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Automatic departure time adjustments for weather</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-700 rounded-lg">
                  <Phone className="text-red-500 mt-0.5" size={16} />
                  <div>
                    <p className="text-sm font-medium">Emergency Contacts</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Shared emergency contacts within carpool group</p>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Suggestions */}
            {aiSuggestions && (
              <div className="bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-xl p-4">
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Sparkles className="text-yellow-500" size={16} />
                  AI Suggestions
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <MapPin className="text-blue-500 mt-0.5" size={12} />
                    <div>
                      <p className="font-medium">Best meetup spot:</p>
                      <p className="text-gray-600 dark:text-gray-400">{aiSuggestions.meetupSpot}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="text-orange-500 mt-0.5" size={12} />
                    <div>
                      <p className="font-medium">Optimal departure time:</p>
                      <p className="text-gray-600 dark:text-gray-400">{aiSuggestions.departureTime}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Route className="text-green-500 mt-0.5" size={12} />
                    <div>
                      <p className="font-medium">Recommended route:</p>
                      <p className="text-gray-600 dark:text-gray-400">{aiSuggestions.route}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <DollarSign className="text-purple-500 mt-0.5" size={12} />
                    <div>
                      <p className="font-medium">Parking suggestion:</p>
                      <p className="text-gray-600 dark:text-gray-400">{aiSuggestions.parking}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
                          {msg.edited && (
                            <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                              (edited)
                            </span>
                          )}
                          {/* Edit controls for user's own messages */}
                          {msg.userId === userId && !msg.isAI && (
                            <div className="flex gap-1 ml-auto">
                              <button
                                onClick={() => startEditMessage(msg.id, msg.message)}
                                className="text-gray-400 hover:text-blue-500 transition-colors"
                                title="Edit message"
                              >
                                <Edit size={12} />
                              </button>
                              <button
                                onClick={() => deleteMessage(msg.id)}
                                className="text-gray-400 hover:text-red-500 transition-colors"
                                title="Delete message"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {editingMessage === msg.id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editMessageText}
                              onChange={(e) => setEditMessageText(e.target.value)}
                              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={saveEditMessage}
                                className="px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingMessage(null);
                                  setEditMessageText('');
                                }}
                                className="px-3 py-1 bg-gray-400 text-white rounded text-xs hover:bg-gray-500 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className={`rounded-2xl px-4 py-3 ${
                            msg.userId === userId
                              ? 'bg-blue-500 text-white'
                              : msg.isAI
                              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-100'
                              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                          }`}>
                            <p>{msg.message}</p>
                          </div>
                        )}
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
                    <div className="flex items-center justify-between mb-3">
                      {editingPoll === poll.id ? (
                        <div className="flex-1 flex gap-2">
                          <input
                            type="text"
                            value={editPollText}
                            onChange={(e) => setEditPollText(e.target.value)}
                            className="flex-1 px-3 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                          <button
                            onClick={saveEditPoll}
                            className="px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingPoll(null);
                              setEditPollText('');
                            }}
                            className="px-3 py-1 bg-gray-400 text-white rounded text-xs hover:bg-gray-500 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="font-medium">{poll.question}</p>
                          {poll.createdBy === userId && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => startEditPoll(poll.id, poll.question)}
                                className="text-gray-400 hover:text-blue-500 transition-colors"
                                title="Edit poll"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => deletePoll(poll.id)}
                                className="text-gray-400 hover:text-red-500 transition-colors"
                                title="Delete poll"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    
                    {editingPoll !== poll.id && (
                      <div className="flex gap-3">
                        {poll.options.map((option, idx) => {
                          const userVoted = option.votes.includes(userId || '');
                          const userVotedElsewhere = poll.options.some((opt, i) => 
                            i !== idx && opt.votes.includes(userId || '')
                          );
                          
                          return (
                            <button
                              key={idx}
                              onClick={() => {
                                if (userVoted) {
                                  // Remove vote if clicking same option
                                  votePoll(poll.id, idx);
                                } else if (userVotedElsewhere) {
                                  // Change vote if user voted elsewhere
                                  const oldIndex = poll.options.findIndex(opt => 
                                    opt.votes.includes(userId || '')
                                  );
                                  changeVote(poll.id, oldIndex, idx);
                                } else {
                                  // New vote
                                  votePoll(poll.id, idx);
                                }
                              }}
                              className={`px-4 py-2 rounded-lg transition-colors ${
                                userVoted
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                              }`}
                            >
                              {option.text} ({option.votes.length})
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Input Area */}
            <div className="px-6 py-4 bg-white dark:bg-gray-900 border-t dark:border-gray-700">
              {/* Quick Actions Bar */}
              <div className="flex gap-2 mb-3 overflow-x-auto">
                <button
                  onClick={() => setShowPoll(true)}
                  className="px-3 py-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full text-sm font-medium hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors whitespace-nowrap"
                >
                  📊 Create Poll
                </button>
                <button
                  onClick={() => setShowEditCarDetails(true)}
                  className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors whitespace-nowrap"
                >
                  🚗 Edit Car Details
                </button>
                <button
                  onClick={() => setShowEditEventDetails(true)}
                  className="px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full text-sm font-medium hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors whitespace-nowrap"
                >
                  📍 Edit Meetup
                </button>
                <button
                  onClick={() => handleQuickAction('running-late')}
                  className="px-3 py-1.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-full text-sm font-medium hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors whitespace-nowrap"
                >
                  ⏰ Running Late
                </button>
                <button
                  onClick={() => {
                    // Post event details to chat
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
                  }}
                  className="px-3 py-1.5 bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded-full text-sm font-medium hover:bg-pink-200 dark:hover:bg-pink-900/50 transition-colors whitespace-nowrap"
                >
                  📅 Post Event
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
                This will clear the current chat history and start a fresh carpool group for this event. You can invite different friends and start new coordination.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowNewCarpoolConfirm(false)}
                  className="flex-1 p-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Reset everything for new carpool
                    setMessages([]);
                    setPolls([]);
                    setDriverStatus('none');
                    setSelectedFriends([]);
                    setShowNewCarpoolConfirm(false);
                    
                    // Initialize with fresh event post
                    setTimeout(() => {
                      initializeCarpoolChat();
                    }, 100);
                    
                    showToast?.({ type: 'success', message: 'Started new carpool group!' });
                  }}
                  className="flex-1 p-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                >
                  Start New Carpool
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Car Details Modal */}
        {showEditCarDetails && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Edit Car Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Car Make/Model</label>
                  <input
                    type="text"
                    value={tempCarDetails.make}
                    onChange={(e) => setTempCarDetails(prev => ({ ...prev, make: e.target.value }))}
                    placeholder="e.g. Honda Civic"
                    className="w-full p-3 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Car Color</label>
                  <input
                    type="text"
                    value={tempCarDetails.color}
                    onChange={(e) => setTempCarDetails(prev => ({ ...prev, color: e.target.value }))}
                    placeholder="e.g. Blue"
                    className="w-full p-3 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Available Seats</label>
                  <select
                    value={tempCarDetails.seats}
                    onChange={(e) => setTempCarDetails(prev => ({ ...prev, seats: parseInt(e.target.value) }))}
                    className="w-full p-3 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {[1,2,3,4,5,6,7,8].map(num => (
                      <option key={num} value={num}>{num} seat{num > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditCarDetails(false);
                    setTempCarDetails(carDetails); // Reset to original
                  }}
                  className="flex-1 p-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveCarDetails}
                  className="flex-1 p-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Event Details Modal */}
        {showEditEventDetails && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Edit Carpool Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Meetup Location</label>
                  <input
                    type="text"
                    value={tempEventDetails.meetupLocation}
                    onChange={(e) => setTempEventDetails(prev => ({ ...prev, meetupLocation: e.target.value }))}
                    placeholder="e.g. Central Park Main Entrance"
                    className="w-full p-3 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Departure Time</label>
                  <input
                    type="time"
                    value={tempEventDetails.departureTime}
                    onChange={(e) => setTempEventDetails(prev => ({ ...prev, departureTime: e.target.value }))}
                    className="w-full p-3 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Additional Notes</label>
                  <textarea
                    value={tempEventDetails.notes}
                    onChange={(e) => setTempEventDetails(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="e.g. Look for the blue Honda in parking spot 12"
                    rows={3}
                    className="w-full p-3 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditEventDetails(false);
                    setTempEventDetails({ meetupLocation: '', departureTime: '', notes: '' }); // Reset
                  }}
                  className="flex-1 p-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEventDetails}
                  className="flex-1 p-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                >
                  Save & Share
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );-6">
                <button
                  onClick={() => {
                    setShowEditCarDetails(false);
                    setTempCarDetails(carDetails); // Reset to original
                  }}
                  className="flex-1 p-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveCarDetails}
                  className="flex-1 p-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Event Details Modal */}
        {showEditEventDetails && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Edit Carpool Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Meetup Location</label>
                  <input
                    type="text"
                    value={tempEventDetails.meetupLocation}
                    onChange={(e) => setTempEventDetails(prev => ({ ...prev, meetupLocation: e.target.value }))}
                    placeholder="e.g. Central Park Main Entrance"
                    className="w-full p-3 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Departure Time</label>
                  <input
                    type="time"
                    value={tempEventDetails.departureTime}
                    onChange={(e) => setTempEventDetails(prev => ({ ...prev, departureTime: e.target.value }))}
                    className="w-full p-3 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Additional Notes</label>
                  <textarea
                    value={tempEventDetails.notes}
                    onChange={(e) => setTempEventDetails(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="e.g. Look for the blue Honda in parking spot 12"
                    rows={3}
                    className="w-full p-3 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditEventDetails(false);
                    setTempEventDetails({ meetupLocation: '', departureTime: '', notes: '' }); // Reset
                  }}
                  className="flex-1 p-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEventDetails}
                  className="flex-1 p-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                >
                  Save & Share
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
