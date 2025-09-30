// app/(protected)/calendar/components/EventCarpoolModal.tsx

import React, { useState, useEffect } from 'react';
import { ArrowLeft, X, Settings, RefreshCw, MoreVertical } from 'lucide-react';
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

  // Initialize chat when modal opens
  useEffect(() => {
    if (isOpen && event) {
      const initialMessages = initializeCarpoolChat(event);
      setMessages(initialMessages);
    }
  }, [isOpen, event]);

  // Don't render if modal is closed or no event
  if (!isOpen || !event) return null;

  // Calculate stats and suggestions
  const carpoolStats = generateCarpoolStats(carpoolData);
  const aiSuggestions = generateAISuggestions(event);
  const { eventTime, eventDateStr } = formatEventTime(event.start_time);

  // Event handlers
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
    
    if (action === 'quick-poll') {
      setShowPoll(true);
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

  // Mobile version
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
        </div>

        {/* View Navigation */}
        <div className="flex bg-gray-100 dark:bg-gray-800">
          {(['overview', 'chat'] as ActiveView[]).map((view) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`flex-1 py-3 px-4 text-sm font-medium capitalize ${
                activeView === view
                  ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              {view}
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

  // Desktop version
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Desktop Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Event Carpool</h2>
              <p className="text-blue-100 mt-1">{event.title}</p>
              <p className="text-sm text-blue-200">
                {eventDateStr} • {eventTime} • {event.location || 'TBD'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowNewCarpoolConfirm(true)}
                className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <RefreshCw size={20} />
                <span className="text-sm">New Carpool</span>
              </button>
              {onOpenSettings && (
                <button
                  onClick={onOpenSettings}
                  className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
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
        </div>

        {/* Desktop Content */}
        <div className="flex h-[70vh]">
          {/* Sidebars */}
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
            isMobile={isMobile}
          />

          {/* Main Chat Area */}
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
        </div>

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
    </div>
  );
};

export default EventCarpoolModal;
