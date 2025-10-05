// app/(protected)/calendar/components/EventCarpoolModal.tsx

import React, { useState, useEffect } from 'react';
import { ArrowLeft, X, Settings, RefreshCw, MoreVertical, Car, UserPlus, MapPin, Clock } from 'lucide-react';
import type { DBEvent } from '@/lib/types';

// Import modular components
import CarpoolOverview from './carpool/CarpoolOverview';
import CarpoolChat from './carpool/CarpoolChat';
import CarpoolSidebars from './carpool/CarpoolSidebars';
import CarpoolModals from './carpool/CarpoolModals';

// Import types and utilities
import type { 
  EventCarpoolModalProps, 
  Message, 
  Poll, 
  DriverStatus, 
  ActiveView,
  CarDetails,
  EventDetails
} from './carpool/types';

import {
  generateCarpoolStats,
  generateAISuggestions,
  initializeCarpoolChat,
  handleQuickAction,
  formatEventTime,
  vibrate
} from './carpool/utils';

const EventCarpoolModal: React.FC<EventCarpoolModalProps> = ({
  isOpen,
  onClose,
  event,
  userId,
  carpoolGroupId,
  carpoolData,
  showToast,
  isMobile = false,
  onOpenSettings
}) => {
  // State management
  const [activeView, setActiveView] = useState<ActiveView>('overview');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [polls, setPolls] = useState<Poll[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [driverStatus, setDriverStatus] = useState<DriverStatus>('none');
  const [carDetails, setCarDetails] = useState<CarDetails>({ seats: 4, make: '', color: '' });
  const [tempCarDetails, setTempCarDetails] = useState<CarDetails>(carDetails);
  const [tempEventDetails, setTempEventDetails] = useState<EventDetails>({
    meetupLocation: '',
    departureTime: '',
    notes: ''
  });

  // Modal states
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showNewCarpoolConfirm, setShowNewCarpoolConfirm] = useState(false);
  const [showEditCarDetails, setShowEditCarDetails] = useState(false);
  const [showEditEventDetails, setShowEditEventDetails] = useState(false);
  const [newPollQuestion, setNewPollQuestion] = useState('');

  // Message editing states
  const [editingMessage, setEditingMessage] = useState<number | null>(null);
  const [editMessageText, setEditMessageText] = useState('');
  const [editingPoll, setEditingPoll] = useState<string | null>(null);
  const [editPollText, setEditPollText] = useState('');

  // Enhancement: Layout preference state
  const [desktopLayout, setDesktopLayout] = useState<'custom' | 'modular'>('custom');
  const [showQuickActions, setShowQuickActions] = useState(true);

  // Initialize chat when modal opens
  useEffect(() => {
    if (isOpen && event) {
      const initialMessages = initializeCarpoolChat(event);
      setMessages(initialMessages);
    }
  }, [isOpen, event]);

  // Sync temp details with actual details
  useEffect(() => {
    setTempCarDetails(carDetails);
  }, [carDetails]);

  // Debug logging to check if modal states are working
  useEffect(() => {
    if (showEditCarDetails) {
      console.log('Car details modal should be open');
    }
    if (showEditEventDetails) {
      console.log('Event details modal should be open');
    }
    if (showPoll) {
      console.log('Poll modal should be open');
    }
    if (showNewCarpoolConfirm) {
      console.log('New carpool confirm modal should be open');
    }
  }, [showEditCarDetails, showEditEventDetails, showPoll, showNewCarpoolConfirm]);

  // Enhancement: Auto-save functionality
  useEffect(() => {
    const autoSave = setTimeout(() => {
      if (newMessage.trim()) {
        localStorage.setItem(`carpool-draft-${event?.id}`, newMessage);
      }
    }, 1000);
    return () => clearTimeout(autoSave);
  }, [newMessage, event?.id]);

  // Enhancement: Load draft message on mount
  useEffect(() => {
    if (event?.id) {
      const draft = localStorage.getItem(`carpool-draft-${event.id}`);
      if (draft) {
        setNewMessage(draft);
      }
    }
  }, [event?.id]);

  // Don't render if modal is closed or no event
  if (!isOpen || !event) return null;

  // Calculate stats and suggestions
  const carpoolStats = generateCarpoolStats(carpoolData);
  const aiSuggestions = generateAISuggestions(event);
  const { eventTime, eventDateStr } = formatEventTime(event.start_time);

  // Enhanced quick action handler with more actions
  const handleQuickActionClick = (action: string) => {
    handleQuickAction(
      action,
      messages,
      setMessages,
      driverStatus,
      setDriverStatus,
      carDetails,
      showToast,
      isMobile
    );
    
    // Enhanced actions
    switch (action) {
      case 'quick-poll':
        setShowPoll(true);
        break;
      case 'share-event':
        if (navigator.share) {
          navigator.share({
            title: `Carpool to ${event.title}`,
            text: `Join our carpool to ${event.title} on ${eventDateStr}`,
            url: window.location.href
          });
        } else {
          navigator.clipboard.writeText(window.location.href);
          showToast?.({ type: 'success', message: 'Event link copied to clipboard!' });
        }
        break;
      case 'emergency-contact':
        setMessages(prev => [...prev, {
          id: Date.now(),
          user: 'You',
          message: '🚨 Emergency contact info shared privately',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          avatar: '😊'
        }]);
        break;
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    vibrate(isMobile);
    const newMsg: Message = {
      id: Date.now(),
      user: 'You',
      userId: userId,
      message: newMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      avatar: '😊'
    };
    
    setMessages(prev => [...prev, newMsg]);
    setNewMessage('');
    
    // Clear draft after sending
    localStorage.removeItem(`carpool-draft-${event.id}`);
  };

  const handleVoiceRecord = () => {
    vibrate(isMobile);
    setIsVoiceRecording(!isVoiceRecording);
    if (!isVoiceRecording) {
      showToast?.({ type: 'info', message: '🎤 Recording...' });
      setTimeout(() => {
        setIsVoiceRecording(false);
        const voiceMsg: Message = {
          id: Date.now(),
          user: 'You',
          message: '🎵 Voice message (0:03)',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          avatar: '😊'
        };
        setMessages(prev => [...prev, voiceMsg]);
        showToast?.({ type: 'success', message: 'Voice message sent!' });
      }, 3000);
    }
  };

  const handleCreatePoll = () => {
    if (!newPollQuestion.trim()) return;
    
    vibrate(isMobile);
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

  const handleVotePoll = (pollId: string, optionIndex: number) => {
    vibrate(isMobile);
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

  const handleChangeVote = (pollId: string, oldOptionIndex: number, newOptionIndex: number) => {
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
    vibrate(isMobile);
    showToast?.({ type: 'success', message: 'Vote changed!' });
  };

  const handleFriendToggle = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleSaveCarDetails = () => {
    setCarDetails(tempCarDetails);
    setShowEditCarDetails(false);
    
    if (driverStatus === 'driver') {
      const carUpdateMsg: Message = {
        id: Date.now(),
        user: 'You',
        message: `🚗 Updated car info: ${tempCarDetails.make} ${tempCarDetails.color}, ${tempCarDetails.seats} seats available`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        avatar: '😊'
      };
      setMessages(prev => [...prev, carUpdateMsg]);
    }
    
    showToast?.({ type: 'success', message: 'Car details updated!' });
  };

  const handleSaveEventDetails = () => {
    const eventUpdateMsg: Message = {
      id: Date.now(),
      user: 'You',
      message: `📍 Updated carpool details: Meetup at ${tempEventDetails.meetupLocation}, departing ${tempEventDetails.departureTime}${tempEventDetails.notes ? ` - ${tempEventDetails.notes}` : ''}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      avatar: '😊'
    };
    setMessages(prev => [...prev, eventUpdateMsg]);
    setShowEditEventDetails(false);
    showToast?.({ type: 'success', message: 'Carpool details updated!' });
  };

  const handleStartNewCarpool = () => {
    setMessages([]);
    setPolls([]);
    setDriverStatus('none');
    setSelectedFriends([]);
    setShowNewCarpoolConfirm(false);
    
    setTimeout(() => {
      const initialMessages = initializeCarpoolChat(event);
      setMessages(initialMessages);
    }, 100);
    
    showToast?.({ type: 'success', message: 'Started new carpool group!' });
  };

  // Mobile version - Enhanced with better navigation
  if (isMobile) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col">
        {/* Enhanced Mobile Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-3 safe-area-top">
          <div className="flex items-center justify-between">
            <button onClick={onClose} className="p-2 -ml-2 active:scale-95">
              <ArrowLeft size={24} />
            </button>
            <div className="flex-1 text-center">
              <h3 className="font-semibold text-lg">Event Carpool</h3>
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

          {/* Enhanced stats bar */}
          <div className="mt-3 flex justify-center gap-6 text-sm">
            <div className="text-center">
              <div className="font-bold">{carpoolStats.needingRides}</div>
              <div className="text-xs opacity-75">Need rides</div>
            </div>
            <div className="text-center">
              <div className="font-bold">{carpoolStats.driversAvailable}</div>
              <div className="text-xs opacity-75">Drivers</div>
            </div>
            <div className="text-center">
              <div className="font-bold">{carpoolStats.estimatedSavings}</div>
              <div className="text-xs opacity-75">Savings</div>
            </div>
          </div>
        </div>

        {/* Enhanced View Navigation with icons */}
        <div className="flex bg-gray-100 dark:bg-gray-800">
          {([
            { view: 'overview', icon: MapPin, label: 'Overview' }, 
            { view: 'chat', icon: Car, label: 'Chat' }
          ] as const).map(({ view, icon: Icon, label }) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 ${
                activeView === view
                  ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeView === 'overview' && (
          <CarpoolOverview
            event={event}
            carpoolStats={carpoolStats}
            aiSuggestions={aiSuggestions}
            onQuickAction={handleQuickActionClick}
            driverStatus={driverStatus}
            onSetDriverStatus={setDriverStatus}
            carDetails={carDetails}
            onEditCarDetails={() => setShowEditCarDetails(true)}
            onEditEventDetails={() => setShowEditEventDetails(true)}
            isMobile={isMobile}
          />
        )}

        {activeView === 'chat' && (
          <>
            {/* Enhanced quick actions bar for mobile chat */}
            {showQuickActions && (
              <div className="p-3 bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
                <div className="flex gap-2 overflow-x-auto">
                  <button
                    onClick={() => handleQuickActionClick('offer-drive')}
                    className="px-3 py-2 bg-blue-500 text-white rounded-lg text-xs font-medium whitespace-nowrap flex items-center gap-1"
                  >
                    <Car size={14} />
                    Offer Drive
                  </button>
                  <button
                    onClick={() => handleQuickActionClick('need-ride')}
                    className="px-3 py-2 bg-green-500 text-white rounded-lg text-xs font-medium whitespace-nowrap flex items-center gap-1"
                  >
                    <UserPlus size={14} />
                    Need Ride
                  </button>
                  <button
                    onClick={() => handleQuickActionClick('running-late')}
                    className="px-3 py-2 bg-orange-500 text-white rounded-lg text-xs font-medium whitespace-nowrap flex items-center gap-1"
                  >
                    <Clock size={14} />
                    Late
                  </button>
                  <button
                    onClick={() => handleQuickActionClick('share-event')}
                    className="px-3 py-2 bg-purple-500 text-white rounded-lg text-xs font-medium whitespace-nowrap"
                  >
                    Share
                  </button>
                  <button
                    onClick={() => setShowQuickActions(false)}
                    className="px-2 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-xs"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}

            <CarpoolChat
              messages={messages}
              polls={polls}
              newMessage={newMessage}
              onMessageChange={setNewMessage}
              onSendMessage={handleSendMessage}
              onVoiceRecord={handleVoiceRecord}
              isVoiceRecording={isVoiceRecording}
              onVotePoll={handleVotePoll}
              onEditMessage={(id, text) => {
                setEditingMessage(id);
                setEditMessageText(text);
              }}
              onDeleteMessage={(id) => {
                setMessages(messages.filter(msg => msg.id !== id));
                showToast?.({ type: 'success', message: 'Message deleted!' });
              }}
              onEditPoll={(id, text) => {
                setEditingPoll(id);
                setEditPollText(text);
              }}
              onDeletePoll={(id) => {
                setPolls(polls.filter(poll => poll.id !== id));
                showToast?.({ type: 'success', message: 'Poll deleted!' });
              }}
              onChangeVote={handleChangeVote}
              editingMessage={editingMessage}
              editMessageText={editMessageText}
              onEditMessageTextChange={setEditMessageText}
              onSaveEditMessage={() => {
                if (editingMessage && editMessageText.trim()) {
                  setMessages(messages.map(msg => 
                    msg.id === editingMessage 
                      ? { ...msg, message: editMessageText, edited: true }
                      : msg
                  ));
                  setEditingMessage(null);
                  setEditMessageText('');
                  showToast?.({ type: 'success', message: 'Message updated!' });
                }
              }}
              onCancelEditMessage={() => {
                setEditingMessage(null);
                setEditMessageText('');
              }}
              editingPoll={editingPoll}
              editPollText={editPollText}
              onEditPollTextChange={setEditPollText}
              onSaveEditPoll={() => {
                if (editingPoll && editPollText.trim()) {
                  setPolls(polls.map(poll => 
                    poll.id === editingPoll 
                      ? { ...poll, question: editPollText }
                      : poll
                  ));
                  setEditingPoll(null);
                  setEditPollText('');
                  showToast?.({ type: 'success', message: 'Poll updated!' });
                }
              }}
              onCancelEditPoll={() => {
                setEditingPoll(null);
                setEditPollText('');
              }}
              userId={userId}
              isMobile={isMobile}
            />
          </>
        )}

        {/* Enhanced floating action button for quick access when actions are hidden */}
        {!showQuickActions && activeView === 'chat' && (
          <button
            onClick={() => setShowQuickActions(true)}
            className="fixed bottom-20 right-4 w-12 h-12 bg-blue-500 text-white rounded-full shadow-lg flex items-center justify-center z-10"
          >
            <Car size={20} />
          </button>
        )}

        {/* Modals */}
        <CarpoolModals
          showPoll={showPoll}
          onClosePoll={() => setShowPoll(false)}
          newPollQuestion={newPollQuestion}
          onPollQuestionChange={setNewPollQuestion}
          onCreatePoll={handleCreatePoll}
          showEditCarDetails={showEditCarDetails}
          onCloseEditCarDetails={() => setShowEditCarDetails(false)}
          tempCarDetails={tempCarDetails}
          onTempCarDetailsChange={setTempCarDetails}
          onSaveCarDetails={handleSaveCarDetails}
          showEditEventDetails={showEditEventDetails}
          onCloseEditEventDetails={() => setShowEditEventDetails(false)}
          tempEventDetails={tempEventDetails}
          onTempEventDetailsChange={setTempEventDetails}
          onSaveEventDetails={handleSaveEventDetails}
          showNewCarpoolConfirm={showNewCarpoolConfirm}
          onCloseNewCarpoolConfirm={() => setShowNewCarpoolConfirm(false)}
          onStartNewCarpool={handleStartNewCarpool}
          showInfo={showInfo}
          onCloseInfo={() => setShowInfo(false)}
          isMobile={isMobile}
        />
      </div>
    );
  }

  // Desktop version - Enhanced with layout options
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-6xl h-[75vh] max-h-[700px] min-h-[500px] overflow-hidden shadow-2xl flex flex-col">
        {/* Enhanced Desktop Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold truncate">Event Carpool</h2>
              <p className="text-blue-100 text-sm truncate">{event.title}</p>
              <p className="text-xs text-blue-200 truncate">
                {eventDateStr} • {eventTime} • {event.location || 'TBD'}
              </p>
            </div>
            
            {/* Enhanced header controls */}
            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
              <button
                onClick={() => setDesktopLayout(desktopLayout === 'custom' ? 'modular' : 'custom')}
                className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded text-xs transition-colors whitespace-nowrap"
                title="Switch layout"
              >
                {desktopLayout === 'custom' ? 'Modular View' : 'Custom View'}
              </button>
              <button
                onClick={() => setShowNewCarpoolConfirm(true)}
                className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded text-xs transition-colors whitespace-nowrap"
                title="Start a new carpool group"
              >
                New Carpool
              </button>
              <button
                onClick={() => setShowEditCarDetails(true)}
                className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded text-xs transition-colors whitespace-nowrap"
                title="Edit your car details"
              >
                Edit Car
              </button>
              <button
                onClick={() => setShowEditEventDetails(true)}
                className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded text-xs transition-colors whitespace-nowrap"
                title="Edit meetup details"
              >
                Edit Meetup
              </button>
              <button
                onClick={() => setShowPoll(true)}
                className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded text-xs transition-colors whitespace-nowrap"
                title="Create a poll"
              >
                Create Poll
              </button>
              {onOpenSettings && (
                <button
                  onClick={onOpenSettings}
                  className="bg-white/20 hover:bg-white/30 p-1 rounded transition-colors"
                  title="Settings"
                >
                  <Settings size={16} />
                </button>
              )}
              <button
                onClick={onClose}
                className="bg-white/20 hover:bg-white/30 p-1 rounded transition-colors"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Content - Layout choice */}
        {desktopLayout === 'modular' ? (
          // Modular layout using extracted components
          <div className="flex flex-1 min-h-0">
            <CarpoolSidebars
              selectedFriends={selectedFriends}
              onFriendToggle={handleFriendToggle}
              carpoolData={carpoolData}
              event={event}
              onShowPoll={() => setShowPoll(true)}
              onShowEditCarDetails={() => setShowEditCarDetails(true)}
              onShowEditEventDetails={() => setShowEditEventDetails(true)}
              onQuickAction={handleQuickActionClick}
              showToast={showToast}
              isMobile={false}
            />

            <CarpoolChat
              messages={messages}
              polls={polls}
              newMessage={newMessage}
              onMessageChange={setNewMessage}
              onSendMessage={handleSendMessage}
              onVoiceRecord={handleVoiceRecord}
              isVoiceRecording={isVoiceRecording}
              onVotePoll={handleVotePoll}
              onEditMessage={(id, text) => {
                setEditingMessage(id);
                setEditMessageText(text);
              }}
              onDeleteMessage={(id) => {
                setMessages(messages.filter(msg => msg.id !== id));
                showToast?.({ type: 'success', message: 'Message deleted!' });
              }}
              onEditPoll={(id, text) => {
                setEditingPoll(id);
                setEditPollText(text);
              }}
              onDeletePoll={(id) => {
                setPolls(polls.filter(poll => poll.id !== id));
                showToast?.({ type: 'success', message: 'Poll deleted!' });
              }}
              onChangeVote={handleChangeVote}
              editingMessage={editingMessage}
              editMessageText={editMessageText}
              onEditMessageTextChange={setEditMessageText}
              onSaveEditMessage={() => {
                if (editingMessage && editMessageText.trim()) {
                  setMessages(messages.map(msg => 
                    msg.id === editingMessage 
                      ? { ...msg, message: editMessageText, edited: true }
                      : msg
                  ));
                  setEditingMessage(null);
                  setEditMessageText('');
                  showToast?.({ type: 'success', message: 'Message updated!' });
                }
              }}
              onCancelEditMessage={() => {
                setEditingMessage(null);
                setEditMessageText('');
              }}
              editingPoll={editingPoll}
              editPollText={editPollText}
              onEditPollTextChange={setEditPollText}
              onSaveEditPoll={() => {
                if (editingPoll && editPollText.trim()) {
                  setPolls(polls.map(poll => 
                    poll.id === editingPoll 
                      ? { ...poll, question: editPollText }
                      : poll
                  ));
                  setEditingPoll(null);
                  setEditPollText('');
                  showToast?.({ type: 'success', message: 'Poll updated!' });
                }
              }}
              onCancelEditPoll={() => {
                setEditingPoll(null);
                setEditPollText('');
              }}
              userId={userId}
              isMobile={false}
            />
          </div>
        ) : (
          // Your original custom layout (preserved)
          <div className="flex flex-1 min-h-0">
            {/* Left Panel - Overview/Stats */}
            <div className="w-80 bg-gray-50 dark:bg-gray-800 border-r dark:border-gray-700 overflow-y-auto flex-shrink-0">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Event Overview</h3>
                  <button
                    onClick={onClose}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                    title="Close"
                  >
                    <X size={16} />
                  </button>
                </div>
                
                {/* Essential Action Buttons */}
                <div className="space-y-2 mb-6">
                  <button
                    onClick={() => setShowNewCarpoolConfirm(true)}
                    className="w-full p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                  >
                    🔄 Start New Carpool
                  </button>
                  <button
                    onClick={() => setShowEditCarDetails(true)}
                    className="w-full p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                  >
                    🚗 Edit Car Details
                  </button>
                  <button
                    onClick={() => setShowEditEventDetails(true)}
                    className="w-full p-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium"
                  >
                    📍 Edit Meetup Details
                  </button>
                  <button
                    onClick={() => setShowPoll(true)}
                    className="w-full p-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
                  >
                    📊 Create Poll
                  </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-blue-600">{carpoolStats.needingRides}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Need Rides</div>
                  </div>
                  <div className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-600">{carpoolStats.driversAvailable}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Drivers</div>
                  </div>
                  <div className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-purple-600">{carpoolStats.estimatedSavings}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Est. Savings</div>
                  </div>
                  <div className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-orange-600">{carpoolStats.distanceAway}mi</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Distance</div>
                  </div>
                </div>

                {/* Enhanced Quick Actions */}
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Quick Actions</h4>
                <div className="grid grid-cols-2 gap-2 mb-6">
                  <button
                    onClick={() => handleQuickActionClick('offer-drive')}
                    className="p-2 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
                  >
                    Offer to Drive
                  </button>
                  <button
                    onClick={() => handleQuickActionClick('need-ride')}
                    className="p-2 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors"
                  >
                    Need a Ride
                  </button>
                  <button
                    onClick={() => handleQuickActionClick('suggest-meetup')}
                    className="p-2 bg-purple-500 text-white rounded text-xs hover:bg-purple-600 transition-colors"
                  >
                    Suggest Meetup
                  </button>
                  <button
                    onClick={() => handleQuickActionClick('running-late')}
                    className="p-2 bg-orange-500 text-white rounded text-xs hover:bg-orange-600 transition-colors"
                  >
                    Running Late
                  </button>
                  <button
                    onClick={() => handleQuickActionClick('share-event')}
                    className="p-2 bg-pink-500 text-white rounded text-xs hover:bg-pink-600 transition-colors"
                  >
                    Share Event
                  </button>
                  <button
                    onClick={() => handleQuickActionClick('emergency-contact')}
                    className="p-2 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors"
                  >
                    Emergency
                  </button>
                </div>

                {/* Driver Status */}
                {driverStatus !== 'none' && (
                  <div className={`p-3 rounded-lg mb-4 ${
                    driverStatus === 'driver' 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' 
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                  }`}>
                    <div className="text-sm font-medium">
                      {driverStatus === 'driver' ? 'You are driving' : 'You need a ride'}
                    </div>
                    {driverStatus === 'driver' && (
                      <div className="text-xs mt-1">
                        {carDetails.make} {carDetails.color} • {carDetails.seats} seats
                      </div>
                    )}
                  </div>
                )}

                {/* AI Suggestions */}
                {aiSuggestions && (
                  <div className="bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-lg p-3">
                    <h4 className="font-medium text-sm mb-2">AI Suggestions</h4>
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="font-medium">Meetup:</span> {aiSuggestions.meetupSpot}
                      </div>
                      <div>
                        <span className="font-medium">Departure:</span> {aiSuggestions.departureTime}
                      </div>
                      <div>
                        <span className="font-medium">Parking:</span> {aiSuggestions.parking}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 min-w-0">
              <CarpoolChat
                messages={messages}
                polls={polls}
                newMessage={newMessage}
                onMessageChange={setNewMessage}
                onSendMessage={handleSendMessage}
                onVoiceRecord={handleVoiceRecord}
                isVoiceRecording={isVoiceRecording}
                onVotePoll={handleVotePoll}
                onEditMessage={(id, text) => {
                  setEditingMessage(id);
                  setEditMessageText(text);
                }}
                onDeleteMessage={(id) => {
                  setMessages(messages.filter(msg => msg.id !== id));
                  showToast?.({ type: 'success', message: 'Message deleted!' });
                }}
                onEditPoll={(id, text) => {
                  setEditingPoll(id);
                  setEditPollText(text);
                }}
                onDeletePoll={(id) => {
                  setPolls(polls.filter(poll => poll.id !== id));
                  showToast?.({ type: 'success', message: 'Poll deleted!' });
                }}
                onChangeVote={handleChangeVote}
                editingMessage={editingMessage}
                editMessageText={editMessageText}
                onEditMessageTextChange={setEditMessageText}
                onSaveEditMessage={() => {
                  if (editingMessage && editMessageText.trim()) {
                    setMessages(messages.map(msg => 
                      msg.id === editingMessage 
                        ? { ...msg, message: editMessageText, edited: true }
                        : msg
                    ));
                    setEditingMessage(null);
                    setEditMessageText('');
                    showToast?.({ type: 'success', message: 'Message updated!' });
                  }
                }}
                onCancelEditMessage={() => {
                  setEditingMessage(null);
                  setEditMessageText('');
                }}
                editingPoll={editingPoll}
                editPollText={editPollText}
                onEditPollTextChange={setEditPollText}
                onSaveEditPoll={() => {
                  if (editingPoll && editPollText.trim()) {
                    setPolls(polls.map(poll => 
                      poll.id === editingPoll 
                        ? { ...poll, question: editPollText }
                        : poll
                    ));
                    setEditingPoll(null);
                    setEditPollText('');
                    showToast?.({ type: 'success', message: 'Poll updated!' });
                  }
                }}
                onCancelEditPoll={() => {
                  setEditingPoll(null);
                  setEditPollText('');
                }}
                userId={userId}
                isMobile={false}
              />
            </div>

            {/* Right Panel - Friends */}
            <div className="w-72 bg-gray-50 dark:bg-gray-800 border-l dark:border-gray-700 overflow-y-auto flex-shrink-0">
              <div className="p-4">
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
                          onChange={() => handleFriendToggle(friend.friend_id)}
                          className="rounded text-blue-500 focus:ring-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{friend.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {friend.safe_to_carpool ? '✅ Verified' : 'Not verified'}
                          </p>
                        </div>
                      </label>
                    ))}
                    
                    {selectedFriends.length > 0 && (
                      <button
                        onClick={() => {
                          if (carpoolData.createCarpoolGroup) {
                            carpoolData.createCarpoolGroup(event.id, selectedFriends, "Let's carpool!");
                            setSelectedFriends([]);
                            showToast?.({ type: 'success', message: 'Invitations sent!' });
                          }
                        }}
                        className="w-full p-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors text-sm"
                      >
                        Send Invites ({selectedFriends.length})
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400 mb-4 text-sm">No friends available</p>
                    <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm">
                      Invite Friends
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Modals */}
        <CarpoolModals
          showPoll={showPoll}
          onClosePoll={() => setShowPoll(false)}
          newPollQuestion={newPollQuestion}
          onPollQuestionChange={setNewPollQuestion}
          onCreatePoll={handleCreatePoll}
          showEditCarDetails={showEditCarDetails}
          onCloseEditCarDetails={() => setShowEditCarDetails(false)}
          tempCarDetails={tempCarDetails}
          onTempCarDetailsChange={setTempCarDetails}
          onSaveCarDetails={handleSaveCarDetails}
          showEditEventDetails={showEditEventDetails}
          onCloseEditEventDetails={() => setShowEditEventDetails(false)}
          tempEventDetails={tempEventDetails}
          onTempEventDetailsChange={setTempEventDetails}
          onSaveEventDetails={handleSaveEventDetails}
          showNewCarpoolConfirm={showNewCarpoolConfirm}
          onCloseNewCarpoolConfirm={() => setShowNewCarpoolConfirm(false)}
          onStartNewCarpool={handleStartNewCarpool}
          showInfo={showInfo}
          onCloseInfo={() => setShowInfo(false)}
          isMobile={false}
        />

        {/* Fallback Direct Modals - Remove these once CarpoolModals works */}
        {showEditCarDetails && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Edit Car Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Car Make/Model</label>
                  <input
                    type="text"
                    value={tempCarDetails.make}
                    onChange={(e) => setTempCarDetails({ ...tempCarDetails, make: e.target.value })}
                    placeholder="e.g. Honda Civic"
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Car Color</label>
                  <input
                    type="text"
                    value={tempCarDetails.color}
                    onChange={(e) => setTempCarDetails({ ...tempCarDetails, color: e.target.value })}
                    placeholder="e.g. Blue"
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Available Seats</label>
                  <select
                    value={tempCarDetails.seats}
                    onChange={(e) => setTempCarDetails({ ...tempCarDetails, seats: parseInt(e.target.value) })}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {[1,2,3,4,5,6,7,8].map(num => (
                      <option key={num} value={num}>{num} seat{num > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowEditCarDetails(false)}
                  className="flex-1 p-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCarDetails}
                  className="flex-1 p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {showEditEventDetails && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Edit Carpool Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Meetup Location</label>
                  <input
                    type="text"
                    value={tempEventDetails.meetupLocation}
                    onChange={(e) => setTempEventDetails({ ...tempEventDetails, meetupLocation: e.target.value })}
                    placeholder="e.g. Central Park Main Entrance"
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Departure Time</label>
                  <input
                    type="time"
                    value={tempEventDetails.departureTime}
                    onChange={(e) => setTempEventDetails({ ...tempEventDetails, departureTime: e.target.value })}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Additional Notes</label>
                  <textarea
                    value={tempEventDetails.notes}
                    onChange={(e) => setTempEventDetails({ ...tempEventDetails, notes: e.target.value })}
                    placeholder="e.g. Look for the blue Honda"
                    rows={3}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowEditEventDetails(false)}
                  className="flex-1 p-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEventDetails}
                  className="flex-1 p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Save & Share
                </button>
              </div>
            </div>
          </div>
        )}

        {showPoll && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Create Poll</h3>
              <input
                type="text"
                value={newPollQuestion}
                onChange={(e) => setNewPollQuestion(e.target.value)}
                placeholder="What should we vote on?"
                className="w-full p-3 border rounded-lg mb-4 focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPoll(false)}
                  className="flex-1 p-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePoll}
                  className="flex-1 p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  disabled={!newPollQuestion.trim()}
                >
                  Create Poll
                </button>
              </div>
            </div>
          </div>
        )}

        {showNewCarpoolConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Start New Carpool?</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                This will clear the current chat history and start a fresh carpool group for this event.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowNewCarpoolConfirm(false)}
                  className="flex-1 p-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartNewCarpool}
                  className="flex-1 p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Start New Carpool
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
