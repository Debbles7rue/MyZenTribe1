// app/(protected)/calendar/components/EventCarpoolModal.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, X, Settings, RefreshCw, MoreVertical, Car, UserPlus, MapPin, Clock, Save, Database } from 'lucide-react';
import type { DBEvent } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';

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

// Supabase client
const supabase = createClient();

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
  // ALL ORIGINAL STATE PRESERVED
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

  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showNewCarpoolConfirm, setShowNewCarpoolConfirm] = useState(false);
  const [showEditCarDetails, setShowEditCarDetails] = useState(false);
  const [showEditEventDetails, setShowEditEventDetails] = useState(false);
  const [newPollQuestion, setNewPollQuestion] = useState('');

  const [editingMessage, setEditingMessage] = useState<number | null>(null);
  const [editMessageText, setEditMessageText] = useState('');
  const [editingPoll, setEditingPoll] = useState<string | null>(null);
  const [editPollText, setEditPollText] = useState('');

  const [desktopLayout, setDesktopLayout] = useState<'custom' | 'modular'>('custom');
  const [showQuickActions, setShowQuickActions] = useState(true);

  // NEW STATE FOR PERSISTENCE
  const [currentCarpoolId, setCurrentCarpoolId] = useState<string | null>(null);
  const [availableCarpools, setAvailableCarpools] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // SUPABASE DATA PERSISTENCE FUNCTIONS
  const saveCarpoolData = useCallback(async () => {
    if (!userId || !event?.id || isSaving) return;
    
    setIsSaving(true);
    try {
      const carpoolData = {
        id: currentCarpoolId || undefined,
        event_id: event.id,
        user_id: userId,
        messages: JSON.stringify(messages),
        polls: JSON.stringify(polls),
        selected_friends: selectedFriends,
        driver_status: driverStatus,
        car_details: JSON.stringify(carDetails),
        event_details: JSON.stringify(tempEventDetails),
        updated_at: new Date().toISOString()
      };

      if (currentCarpoolId) {
        // Update existing carpool
        const { error } = await supabase
          .from('carpool_groups')
          .update(carpoolData)
          .eq('id', currentCarpoolId)
          .eq('user_id', userId);
        
        if (error) throw error;
      } else {
        // Create new carpool
        const { data, error } = await supabase
          .from('carpool_groups')
          .insert([carpoolData])
          .select()
          .single();
        
        if (error) throw error;
        setCurrentCarpoolId(data.id);
      }

      setLastSaved(new Date());
      showToast?.({ 
        type: 'success', 
        message: '💾 Carpool data saved!' 
      });
    } catch (error: any) {
      console.error('Save carpool error:', error);
      showToast?.({ 
        type: 'error', 
        message: 'Failed to save carpool data' 
      });
    } finally {
      setIsSaving(false);
    }
  }, [userId, event?.id, currentCarpoolId, messages, polls, selectedFriends, driverStatus, carDetails, tempEventDetails, isSaving, showToast]);

  const loadCarpoolData = useCallback(async (carpoolId?: string) => {
    if (!userId || !event?.id) return;
    
    setIsLoading(true);
    try {
      let query = supabase
        .from('carpool_groups')
        .select('*')
        .eq('event_id', event.id)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (carpoolId) {
        query = query.eq('id', carpoolId);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      if (data && data.length > 0) {
        const carpool = data[0];
        setCurrentCarpoolId(carpool.id);
        
        // Restore all state
        if (carpool.messages) {
          try {
            setMessages(JSON.parse(carpool.messages));
          } catch (e) {
            console.warn('Failed to parse messages:', e);
          }
        }
        
        if (carpool.polls) {
          try {
            setPolls(JSON.parse(carpool.polls));
          } catch (e) {
            console.warn('Failed to parse polls:', e);
          }
        }
        
        if (carpool.selected_friends) {
          setSelectedFriends(carpool.selected_friends);
        }
        
        setDriverStatus(carpool.driver_status || 'none');
        
        if (carpool.car_details) {
          try {
            setCarDetails(JSON.parse(carpool.car_details));
          } catch (e) {
            console.warn('Failed to parse car details:', e);
          }
        }
        
        if (carpool.event_details) {
          try {
            setTempEventDetails(JSON.parse(carpool.event_details));
          } catch (e) {
            console.warn('Failed to parse event details:', e);
          }
        }

        showToast?.({ 
          type: 'success', 
          message: '📂 Carpool data loaded!' 
        });
      }
      
      // Load all carpools for this event
      const { data: allCarpools } = await supabase
        .from('carpool_groups')
        .select('id, created_at, updated_at')
        .eq('event_id', event.id)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
        
      setAvailableCarpools(allCarpools || []);
      
    } catch (error: any) {
      console.error('Load carpool error:', error);
      showToast?.({ 
        type: 'error', 
        message: 'Failed to load carpool data' 
      });
    } finally {
      setIsLoading(false);
    }
  }, [userId, event?.id, showToast]);

  // ENHANCED EFFECTS WITH PERSISTENCE
  useEffect(() => {
    if (isOpen && event) {
      // Try to load existing carpool data first
      loadCarpoolData();
      
      // Fallback to initial messages if no saved data
      setTimeout(() => {
        if (messages.length === 0) {
          const initialMessages = initializeCarpoolChat(event);
          setMessages(initialMessages);
        }
      }, 1000);
    }
  }, [isOpen, event, loadCarpoolData]);

  useEffect(() => {
    setTempCarDetails(carDetails);
  }, [carDetails]);

  // AUTO-SAVE FUNCTIONALITY
  useEffect(() => {
    const autoSave = setTimeout(() => {
      if (newMessage.trim()) {
        localStorage.setItem(`carpool-draft-${event?.id}`, newMessage);
      }
    }, 1000);
    return () => clearTimeout(autoSave);
  }, [newMessage, event?.id]);

  useEffect(() => {
    if (event?.id) {
      const draft = localStorage.getItem(`carpool-draft-${event.id}`);
      if (draft) {
        setNewMessage(draft);
      }
    }
  }, [event?.id]);

  // Auto-save carpool data every 30 seconds
  useEffect(() => {
    if (!isOpen || !event) return;
    
    const autoSaveInterval = setInterval(() => {
      if (messages.length > 0 || polls.length > 0 || selectedFriends.length > 0) {
        saveCarpoolData();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [isOpen, event, messages.length, polls.length, selectedFriends.length, saveCarpoolData]);

  // Save on component unmount (when modal closes)
  useEffect(() => {
    return () => {
      if (messages.length > 0 || polls.length > 0 || selectedFriends.length > 0) {
        saveCarpoolData();
      }
    };
  }, [messages, polls, selectedFriends, saveCarpoolData]);

  if (!isOpen || !event) return null;

  const carpoolStats = generateCarpoolStats(carpoolData);
  const aiSuggestions = generateAISuggestions(event);
  const { eventTime, eventDateStr } = formatEventTime(event.start_time);

  // ALL ORIGINAL HANDLERS PRESERVED + ENHANCED
  const handleQuickActionClick = (action: string) => {
    handleQuickAction(action, messages, setMessages, driverStatus, setDriverStatus, carDetails, showToast, isMobile);
    
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
    
    // Auto-save after quick actions
    setTimeout(saveCarpoolData, 1000);
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
    localStorage.removeItem(`carpool-draft-${event.id}`);
    
    // Auto-save after sending message
    setTimeout(saveCarpoolData, 1000);
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
        // Auto-save after voice message
        setTimeout(saveCarpoolData, 1000);
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
    
    // Auto-save after creating poll
    setTimeout(saveCarpoolData, 1000);
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
    
    // Auto-save after voting
    setTimeout(saveCarpoolData, 1000);
  };

  const handleChangeVote = (pollId: string, oldOptionIndex: number, newOptionIndex: number) => {
    setPolls(polls.map(poll => {
      if (poll.id === pollId) {
        const newOptions = [...poll.options];
        newOptions[oldOptionIndex].votes = newOptions[oldOptionIndex].votes.filter(id => id !== userId);
        if (!newOptions[newOptionIndex].votes.includes(userId || '')) {
          newOptions[newOptionIndex].votes.push(userId || '');
        }
        return { ...poll, options: newOptions };
      }
      return poll;
    }));
    vibrate(isMobile);
    showToast?.({ type: 'success', message: 'Vote changed!' });
    
    // Auto-save after vote change
    setTimeout(saveCarpoolData, 1000);
  };

  const handleFriendToggle = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]
    );
    
    // Auto-save after friend selection
    setTimeout(saveCarpoolData, 1000);
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
    
    // Auto-save after car details update
    setTimeout(saveCarpoolData, 1000);
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
    
    // Auto-save after event details update
    setTimeout(saveCarpoolData, 1000);
  };

  const handleStartNewCarpool = async () => {
    // Save current carpool before creating new one
    if (messages.length > 0 || polls.length > 0) {
      await saveCarpoolData();
    }
    
    // Reset state for new carpool
    setMessages([]);
    setPolls([]);
    setDriverStatus('none');
    setSelectedFriends([]);
    setCurrentCarpoolId(null);
    setShowNewCarpoolConfirm(false);
    
    setTimeout(() => {
      const initialMessages = initializeCarpoolChat(event);
      setMessages(initialMessages);
    }, 100);
    
    showToast?.({ type: 'success', message: 'Started new carpool group!' });
  };

  // ENHANCED CLOSE HANDLER WITH SAVE
  const handleClose = async () => {
    // Save data before closing
    if (messages.length > 0 || polls.length > 0 || selectedFriends.length > 0) {
      await saveCarpoolData();
    }
    onClose();
  };

  // MOBILE VERSION - ENHANCED WITH PERSISTENCE INDICATORS
  if (isMobile) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col h-screen">
        {/* Header with save indicators */}
        <div className="flex-shrink-0 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-3 safe-area-top">
          <div className="flex items-center justify-between">
            <button onClick={handleClose} className="p-2 -ml-2 active:scale-95">
              <ArrowLeft size={24} />
            </button>
            <div className="flex-1 text-center">
              <h3 className="font-semibold text-lg">Event Carpool Feature Page</h3>
              {lastSaved && (
                <p className="text-xs text-blue-200">
                  Saved {lastSaved.toLocaleTimeString()}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={saveCarpoolData}
                disabled={isSaving}
                className="p-2 active:scale-95 disabled:opacity-50"
              >
                {isSaving ? <RefreshCw size={20} className="animate-spin" /> : <Save size={20} />}
              </button>
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

        {/* Navigation */}
        <div className="flex-shrink-0 flex bg-gray-100 dark:bg-gray-800">
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

        {/* Content - FIXED HEIGHT TO PREVENT CHAT PUSHING BUTTONS */}
        <div className="flex-1 min-h-0 overflow-hidden">
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
            <div className="flex flex-col h-full">
              {showQuickActions && (
                <div className="flex-shrink-0 p-3 bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
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

              {/* FIXED HEIGHT CHAT CONTAINER */}
              <div className="flex-1 min-h-0">
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
                    setTimeout(saveCarpoolData, 1000);
                  }}
                  onEditPoll={(id, text) => {
                    setEditingPoll(id);
                    setEditPollText(text);
                  }}
                  onDeletePoll={(id) => {
                    setPolls(polls.filter(poll => poll.id !== id));
                    showToast?.({ type: 'success', message: 'Poll deleted!' });
                    setTimeout(saveCarpoolData, 1000);
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
                      setTimeout(saveCarpoolData, 1000);
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
                      setTimeout(saveCarpoolData, 1000);
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
            </div>
          )}
        </div>

        {!showQuickActions && activeView === 'chat' && (
          <button
            onClick={() => setShowQuickActions(true)}
            className="fixed bottom-20 right-4 w-12 h-12 bg-blue-500 text-white rounded-full shadow-lg flex items-center justify-center z-10"
          >
            <Car size={20} />
          </button>
        )}

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

  // DESKTOP VERSION - ENHANCED WITH PERSISTENCE
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-5xl max-h-[90vh] min-h-[600px] overflow-hidden shadow-2xl flex flex-col">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold truncate">Event Carpool</h2>
              <p className="text-blue-100 text-sm truncate">{event.title}</p>
              <p className="text-xs text-blue-200 truncate">
                {eventDateStr} • {eventTime} • {event.location || 'TBD'}
              </p>
              {lastSaved && (
                <p className="text-xs text-blue-200">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
              <button
                onClick={saveCarpoolData}
                disabled={isSaving}
                className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded text-xs transition-colors whitespace-nowrap disabled:opacity-50"
              >
                {isSaving ? '💾 Saving...' : '💾 Save'}
              </button>
              {availableCarpools.length > 1 && (
                <select
                  value={currentCarpoolId || ''}
                  onChange={(e) => loadCarpoolData(e.target.value)}
                  className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded text-xs text-white border-0"
                >
                  <option value="">Latest Carpool</option>
                  {availableCarpools.map((carpool, index) => (
                    <option key={carpool.id} value={carpool.id} className="text-gray-900">
                      Carpool #{index + 1} - {new Date(carpool.updated_at).toLocaleString()}
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={() => setDesktopLayout(desktopLayout === 'custom' ? 'modular' : 'custom')}
                className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded text-xs transition-colors whitespace-nowrap"
              >
                {desktopLayout === 'custom' ? 'Modular View' : 'Custom View'}
              </button>
              <button
                onClick={() => setShowNewCarpoolConfirm(true)}
                className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded text-xs transition-colors whitespace-nowrap"
              >
                New Carpool
              </button>
              <button
                onClick={() => setShowEditCarDetails(true)}
                className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded text-xs transition-colors whitespace-nowrap"
              >
                Edit Car
              </button>
              <button
                onClick={() => setShowEditEventDetails(true)}
                className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded text-xs transition-colors whitespace-nowrap"
              >
                Edit Meetup
              </button>
              <button
                onClick={() => setShowPoll(true)}
                className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded text-xs transition-colors whitespace-nowrap"
              >
                Create Poll
              </button>
              {onOpenSettings && (
                <button
                  onClick={onOpenSettings}
                  className="bg-white/20 hover:bg-white/30 p-1 rounded transition-colors"
                >
                  <Settings size={16} />
                </button>
              )}
              <button
                onClick={handleClose}
                className="bg-white/20 hover:bg-white/30 p-1 rounded transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* ENHANCED LAYOUT WITH FIXED HEIGHT CONTAINERS */}
        {desktopLayout === 'modular' ? (
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
            <div className="flex-1 min-h-0">
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
                  setTimeout(saveCarpoolData, 1000);
                }}
                onEditPoll={(id, text) => {
                  setEditingPoll(id);
                  setEditPollText(text);
                }}
                onDeletePoll={(id) => {
                  setPolls(polls.filter(poll => poll.id !== id));
                  showToast?.({ type: 'success', message: 'Poll deleted!' });
                  setTimeout(saveCarpoolData, 1000);
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
                    setTimeout(saveCarpoolData, 1000);
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
                    setTimeout(saveCarpoolData, 1000);
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
          </div>
        ) : (
          <div className="flex flex-1 min-h-0">
            <div className="w-72 bg-gray-50 dark:bg-gray-800 border-r dark:border-gray-700 overflow-y-auto flex-shrink-0">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Event Overview</h3>
                  <button onClick={handleClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded">
                    <X size={16} />
                  </button>
                </div>
                
                <div className="space-y-2 mb-6">
                  <button onClick={() => setShowNewCarpoolConfirm(true)} className="w-full p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium">
                    🔄 Start New Carpool
                  </button>
                  <button onClick={() => setShowEditCarDetails(true)} className="w-full p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium">
                    🚗 Edit Car Details
                  </button>
                  <button onClick={() => setShowEditEventDetails(true)} className="w-full p-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium">
                    📍 Edit Meetup Details
                  </button>
                  <button onClick={() => setShowPoll(true)} className="w-full p-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium">
                    📊 Create Poll
                  </button>
                  <button 
                    onClick={saveCarpoolData}
                    disabled={isSaving}
                    className="w-full p-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {isSaving ? '💾 Saving...' : '💾 Save Now'}
                  </button>
                </div>

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

                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Quick Actions</h4>
                <div className="grid grid-cols-2 gap-2 mb-6">
                  <button onClick={() => handleQuickActionClick('offer-drive')} className="p-2 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors">
                    Offer to Drive
                  </button>
                  <button onClick={() => handleQuickActionClick('need-ride')} className="p-2 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors">
                    Need a Ride
                  </button>
                  <button onClick={() => handleQuickActionClick('suggest-meetup')} className="p-2 bg-purple-500 text-white rounded text-xs hover:bg-purple-600 transition-colors">
                    Suggest Meetup
                  </button>
                  <button onClick={() => handleQuickActionClick('running-late')} className="p-2 bg-orange-500 text-white rounded text-xs hover:bg-orange-600 transition-colors">
                    Running Late
                  </button>
                  <button onClick={() => handleQuickActionClick('share-event')} className="p-2 bg-pink-500 text-white rounded text-xs hover:bg-pink-600 transition-colors">
                    Share Event
                  </button>
                  <button onClick={() => handleQuickActionClick('emergency-contact')} className="p-2 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors">
                    Emergency
                  </button>
                </div>

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

                {aiSuggestions && (
                  <div className="bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-lg p-3">
                    <h4 className="font-medium text-sm mb-2">AI Suggestions</h4>
                    <div className="space-y-2 text-xs">
                      <div><span className="font-medium">Meetup:</span> {aiSuggestions.meetupSpot}</div>
                      <div><span className="font-medium">Departure:</span> {aiSuggestions.departureTime}</div>
                      <div><span className="font-medium">Parking:</span> {aiSuggestions.parking}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* FIXED HEIGHT CHAT CONTAINER */}
            <div className="flex-1 min-h-0">
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
                  setTimeout(saveCarpoolData, 1000);
                }}
                onEditPoll={(id, text) => {
                  setEditingPoll(id);
                  setEditPollText(text);
                }}
                onDeletePoll={(id) => {
                  setPolls(polls.filter(poll => poll.id !== id));
                  showToast?.({ type: 'success', message: 'Poll deleted!' });
                  setTimeout(saveCarpoolData, 1000);
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
                    setTimeout(saveCarpoolData, 1000);
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
                    setTimeout(saveCarpoolData, 1000);
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

            <div className="w-64 bg-gray-50 dark:bg-gray-800 border-l dark:border-gray-700 overflow-y-auto flex-shrink-0">
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
                            setTimeout(saveCarpoolData, 1000);
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
      </div>
    </div>
  );
};

export default EventCarpoolModal;
