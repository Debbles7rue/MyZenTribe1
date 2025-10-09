// app/(protected)/calendar/components/EventCarpoolModal.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, X, Settings, RefreshCw, MoreVertical, Car, UserPlus, MapPin, Clock, Map, Maximize2, Link, Image, Type } from 'lucide-react';
import type { DBEvent } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { sendCarpoolInvites } from '@/lib/notifications/send-notifications';

// Import modular components
import CarpoolOverview from './carpool/CarpoolOverview';
import CarpoolChat from './carpool/CarpoolChat';
import CarpoolSidebars from './carpool/CarpoolSidebars';
import CarpoolModals from './carpool/CarpoolModals';
import CarpoolMap from './carpool/CarpoolMap';
import FriendSelector from '@/components/FriendSelector';
import CarpoolSettings from './CarpoolSettings';

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

// Import ALL functions from utils
import {
  generateCarpoolStats,
  generateAISuggestions,
  initializeCarpoolChat,
  handleQuickAction,
  formatEventTime,
  vibrate,
  handleSendMessage,
  handleVoiceRecord,
  handleCreatePollInChat,
  handleVotePollInChat,
  handleChangeVoteInChat,
  handleSaveCarDetailsInModal,
  handleSaveEventDetailsInModal,
  handleStartNewCarpoolInModal,
  handleFriendToggleInModal,
  saveCarpoolData,
  loadCarpoolData,
  syncPendingChanges,
  geocodeAddress,
  clearCarpoolData
} from './carpool/utils';

// Supabase client
const supabase = createClient();

// Extended ActiveView type to include map
type ExtendedActiveView = ActiveView | 'map';

// Enhanced Event Details interface for better structure
interface EnhancedEventDetails extends EventDetails {
  eventTitle?: string;
  eventImageUrl?: string;
  eventLink?: string;
}

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
  // Core state
  const [activeView, setActiveView] = useState<ExtendedActiveView>('overview');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [polls, setPolls] = useState<Poll[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [driverStatus, setDriverStatus] = useState<DriverStatus>('none');
  const [carDetails, setCarDetails] = useState<CarDetails>({ seats: 4, make: '', color: '' });
  const [tempCarDetails, setTempCarDetails] = useState<CarDetails>(carDetails);
  
  // ENHANCED: Better event details structure
  const [tempEventDetails, setTempEventDetails] = useState<EnhancedEventDetails>({
    meetupLocation: '',
    departureTime: '',
    notes: '',
    eventTitle: event?.title || '',
    eventImageUrl: '',
    eventLink: ''
  });

  // UI state
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showNewCarpoolConfirm, setShowNewCarpoolConfirm] = useState(false);
  const [showEditCarDetails, setShowEditCarDetails] = useState(false);
  const [showEditEventDetails, setShowEditEventDetails] = useState(false);
  const [newPollQuestion, setNewPollQuestion] = useState('');
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false);

  // Edit state
  const [editingMessage, setEditingMessage] = useState<number | null>(null);
  const [editMessageText, setEditMessageText] = useState('');
  const [editingPoll, setEditingPoll] = useState<string | null>(null);
  const [editPollText, setEditPollText] = useState('');

  // Layout state
  const [desktopLayout, setDesktopLayout] = useState<'custom' | 'modular'>('custom');
  const [showQuickActions, setShowQuickActions] = useState(true);

  // Persistence state
  const [currentCarpoolId, setCurrentCarpoolId] = useState<string | null>(carpoolGroupId || null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Modal state
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [showFriendInvite, setShowFriendInvite] = useState(false);
  const [selectedFriendsToInvite, setSelectedFriendsToInvite] = useState<string[]>([]);

  // Map state
  const [eventCoordinates, setEventCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  // FIXED: Clear data when switching between carpools
  useEffect(() => {
    if (carpoolGroupId && carpoolGroupId !== currentCarpoolId) {
      // Clear all data when switching to a different carpool
      setMessages([]);
      setPolls([]);
      setSelectedFriends([]);
      setDriverStatus('none');
      setCarDetails({ seats: 4, make: '', color: '' });
      setTempCarDetails({ seats: 4, make: '', color: '' });
      setTempEventDetails({
        meetupLocation: '',
        departureTime: '',
        notes: '',
        eventTitle: event?.title || '',
        eventImageUrl: '',
        eventLink: ''
      });
      setCurrentCarpoolId(carpoolGroupId);
      
      // Then load the new carpool data
      handleLoadCarpoolData();
    }
  }, [carpoolGroupId]);

  // ENHANCED: Save function with better error handling
  const handleSaveCarpoolData = useCallback(async () => {
    if (!userId || !event?.id || isSaving) return;
    
    setIsSaving(true);
    setSaveError(null);
    
    try {
      const carpoolData = {
        messages,
        polls,
        selectedFriends,
        driverStatus,
        carDetails,
        tempEventDetails,
        carpoolGroupId: currentCarpoolId // Include group ID
      };

      const result = await saveCarpoolData(
        currentCarpoolId || 'new',
        carpoolData,
        {},
        userId,
        event.id,
        showToast
      );

      if (result.success && result.carpoolId && result.carpoolId !== currentCarpoolId) {
        setCurrentCarpoolId(result.carpoolId);
      }
      
      setLastSaved(new Date());
      showToast?.({ type: 'success', message: 'Carpool data saved!' });
    } catch (error: any) {
      console.error('Save carpool error:', error);
      setSaveError(error.message);
      showToast?.({ 
        type: 'error', 
        message: 'Failed to save data' 
      });
    } finally {
      setIsSaving(false);
    }
  }, [userId, event?.id, currentCarpoolId, messages, polls, selectedFriends, driverStatus, carDetails, tempEventDetails, isSaving, showToast]);

  // ENHANCED: Load function that properly loads carpool-specific data
  const handleLoadCarpoolData = useCallback(async () => {
    if (!userId || !event?.id) return;
    
    try {
      // Load data specific to this carpool group
      const result = await loadCarpoolData(currentCarpoolId || undefined, userId, event.id, showToast);
      
      if (result.success && result.data) {
        // Only load data if it matches the current carpool
        if (!currentCarpoolId || result.carpoolId === currentCarpoolId) {
          setMessages(result.data.messages || []);
          setPolls(result.data.polls || []);
          setSelectedFriends(result.data.selectedFriends || []);
          setDriverStatus(result.data.driverStatus || 'none');
          setCarDetails(result.data.carDetails || { seats: 4, make: '', color: '' });
          setTempEventDetails(result.data.tempEventDetails || {
            meetupLocation: '',
            departureTime: '',
            notes: '',
            eventTitle: event?.title || '',
            eventImageUrl: '',
            eventLink: ''
          });
        }
      }
    } catch (error) {
      console.warn('Error loading carpool data:', error);
    }
  }, [userId, event?.id, currentCarpoolId, showToast]);

  // Geocode event location
  useEffect(() => {
    const checkAndGeocodeEvent = async () => {
      if (!event) return;
      
      if (event.latitude && event.longitude) {
        setEventCoordinates({ lat: event.latitude, lng: event.longitude });
        return;
      }
      
      if (event.location) {
        const coords = await geocodeAddress(event.location);
        if (coords) {
          setEventCoordinates(coords);
          
          await supabase
            .from('events')
            .update({ 
              latitude: coords.lat, 
              longitude: coords.lng 
            })
            .eq('id', event.id);
        }
      } else {
        setEventCoordinates({ lat: 32.7767, lng: -96.7970 }); // Default
      }
    };
    
    if (isOpen && event) {
      checkAndGeocodeEvent();
    }
  }, [isOpen, event]);

  // Load data on open
  useEffect(() => {
    if (isOpen && event) {
      handleLoadCarpoolData();
    }
  }, [isOpen, event]);

  // Auto-update tempEventDetails when event changes
  useEffect(() => {
    if (event) {
      setTempEventDetails(prev => ({
        ...prev,
        eventTitle: event.title || ''
      }));
    }
  }, [event]);

  useEffect(() => {
    setTempCarDetails(carDetails);
  }, [carDetails]);

  // Draft message auto-save
  useEffect(() => {
    const autoSave = setTimeout(() => {
      if (newMessage.trim() && currentCarpoolId) {
        localStorage.setItem(`carpool-draft-${currentCarpoolId}-${event?.id}`, newMessage);
      }
    }, 1000);
    return () => clearTimeout(autoSave);
  }, [newMessage, event?.id, currentCarpoolId]);

  useEffect(() => {
    if (event?.id && currentCarpoolId) {
      const draft = localStorage.getItem(`carpool-draft-${currentCarpoolId}-${event.id}`);
      if (draft) {
        setNewMessage(draft);
      }
    }
  }, [event?.id, currentCarpoolId]);

  // Auto-save every 2 minutes - THIS WAS MISSING!
  useEffect(() => {
    if (!isOpen || !event) return;
    
    const autoSaveInterval = setInterval(() => {
      if (messages.length > 0 || polls.length > 0 || selectedFriends.length > 0) {
        handleSaveCarpoolData();
      }
    }, 120000); // 2 minutes

    return () => clearInterval(autoSaveInterval);
  }, [isOpen, event, messages.length, polls.length, selectedFriends.length, handleSaveCarpoolData]);

  // ENHANCED: Send friend invites with notifications
  const handleSendFriendInvites = async () => {
    if (selectedFriendsToInvite.length === 0) {
      showToast?.({ type: 'warning', message: 'Please select friends to invite' });
      return;
    }

    try {
      // Get user's name for the notification
      const { data: userData } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', userId)
        .single();
      
      const inviterName = userData?.display_name || 'Someone';

      // Send notifications using the centralized notification system
      const result = await sendCarpoolInvites({
        eventId: event.id,
        eventTitle: tempEventDetails.eventTitle || event.title,
        carpoolId: currentCarpoolId || 'new',
        inviterUserId: userId,
        inviterName,
        invitedUserIds: selectedFriendsToInvite,
        message: "Let's carpool together!"
      });

      if (result.success) {
        // Also use the existing createCarpoolGroup if available (for backward compatibility)
        if (carpoolData?.createCarpoolGroup) {
          await carpoolData.createCarpoolGroup(
            event.id, 
            selectedFriendsToInvite, 
            `Join our carpool for ${tempEventDetails.eventTitle || event.title}!`
          );
        }

        showToast?.({ 
          type: 'success', 
          message: `Invitations sent to ${selectedFriendsToInvite.length} friend${selectedFriendsToInvite.length > 1 ? 's' : ''}!` 
        });
        handleCloseFriendInvite();
      } else {
        throw result.error || new Error('Failed to send notifications');
      }
    } catch (error) {
      console.error('Error sending invites:', error);
      showToast?.({ type: 'error', message: 'Failed to send invitations' });
    }
  };

  // FIXED: Start new carpool clears all old data
  const handleStartNewCarpool = () => {
    // Clear ALL data for a fresh start
    setMessages([]);
    setPolls([]);
    setDriverStatus('none');
    setSelectedFriends([]);
    setCarDetails({ seats: 4, make: '', color: '' });
    setTempCarDetails({ seats: 4, make: '', color: '' });
    setTempEventDetails({
      meetupLocation: '',
      departureTime: '',
      notes: '',
      eventTitle: event?.title || '',
      eventImageUrl: '',
      eventLink: ''
    });
    setCurrentCarpoolId(null);
    setShowNewCarpoolConfirm(false);
    
    // Clear local storage
    if (currentCarpoolId && event?.id) {
      localStorage.removeItem(`carpool-draft-${currentCarpoolId}-${event.id}`);
      localStorage.removeItem(`carpool-${currentCarpoolId}`);
    }
    
    showToast?.({ type: 'success', message: 'Started fresh carpool!' });
  };

  // Profile settings handlers
  const handleOpenProfileSettings = () => {
    setShowProfileSettings(true);
  };

  const handleCloseProfileSettings = () => {
    setShowProfileSettings(false);
  };

  // Friend invite handlers
  const handleOpenFriendInvite = () => {
    setShowFriendInvite(true);
  };

  const handleCloseFriendInvite = () => {
    setShowFriendInvite(false);
    setSelectedFriendsToInvite([]);
  };

  if (!isOpen || !event) return null;

  // Generate real stats based on actual data
  const carpoolStats = {
    totalFriends: selectedFriends.length,
    needingRides: messages.filter(m => m.message?.toLowerCase().includes('need a ride') || m.message?.toLowerCase().includes('need ride')).length,
    driversAvailable: messages.filter(m => m.message?.toLowerCase().includes('can drive') || m.message?.toLowerCase().includes('i can drive')).length,
    estimatedSavings: selectedFriends.length > 0 ? `$${Math.round(selectedFriends.length * 8)}` : '$0',
    distanceAway: 0
  };
  
  const aiSuggestions = null; // Don't show AI suggestions until we have real data
  const { eventTime, eventDateStr } = formatEventTime(event.start_time);

  const handleQuickActionClick = (action: string) => {
    handleQuickAction(action, messages, setMessages, driverStatus, setDriverStatus, carDetails, showToast, isMobile);
    
    switch (action) {
      case 'quick-poll':
        setShowPoll(true);
        break;
      case 'share-event':
        if (navigator.share) {
          navigator.share({
            title: `Carpool to ${tempEventDetails.eventTitle || event.title}`,
            text: `Join our carpool to ${tempEventDetails.eventTitle || event.title} on ${eventDateStr}`,
            url: tempEventDetails.eventLink || window.location.href
          });
        } else {
          navigator.clipboard.writeText(tempEventDetails.eventLink || window.location.href);
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

  // MOBILE VERSION
  if (isMobile) {
    return (
      <>
        <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col h-screen">
          {/* FIXED: Single header without duplicate save button */}
          <div className="flex-shrink-0 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-3 safe-area-top">
            <div className="flex items-center justify-between">
              <button onClick={onClose} className="p-2 -ml-2 active:scale-95">
                <ArrowLeft size={24} />
              </button>
              <div className="flex-1 text-center">
                <h3 className="font-semibold text-lg">Event Carpool</h3>
                <p className="text-xs text-blue-100 truncate px-4">
                  {tempEventDetails.eventTitle || event.title}
                </p>
                {lastSaved && (
                  <p className="text-xs text-blue-200">
                    Saved {lastSaved.toLocaleTimeString()}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={handleOpenProfileSettings} className="p-2 active:scale-95">
                  <Settings size={20} />
                </button>
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

          {/* Navigation tabs */}
          <div className="flex-shrink-0 flex bg-gray-100 dark:bg-gray-800">
            {([
              { view: 'overview' as const, icon: MapPin, label: 'Overview' }, 
              { view: 'chat' as const, icon: Car, label: 'Chat' },
              { view: 'map' as const, icon: Map, label: 'Map' }
            ]).map(({ view, icon: Icon, label }) => (
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
          <div className="flex-1 min-h-0 overflow-hidden">
            {activeView === 'overview' && (
              <CarpoolOverview
                event={{...event, title: tempEventDetails.eventTitle || event.title}}
                carpoolStats={carpoolStats}
                aiSuggestions={aiSuggestions}
                onQuickAction={handleQuickActionClick}
                driverStatus={driverStatus}
                onSetDriverStatus={setDriverStatus}
                carDetails={carDetails}
                onEditCarDetails={() => setShowEditCarDetails(true)}
                onEditEventDetails={() => setShowEventDetailsModal(true)}
                isMobile={isMobile}
                onOpenFriendInvite={handleOpenFriendInvite}
                onOpenProfileSettings={handleOpenProfileSettings}
                showToast={showToast}
                tempEventDetails={tempEventDetails}
                persistenceState={{
                  currentCarpoolId,
                  isSaving,
                  lastSaved,
                  saveError,
                  isOnline: navigator.onLine,
                  syncStatus: 'synced'
                }}
                onSaveData={handleSaveCarpoolData}
              />
            )}

            {activeView === 'chat' && (
              <div className="h-full flex flex-col">
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

                <div className="flex-1 min-h-0">
                  <CarpoolChat
                    messages={messages}
                    polls={polls}
                    newMessage={newMessage}
                    onMessageChange={setNewMessage}
                    onSendMessage={() => handleSendMessage(newMessage, userId, messages, setMessages, setNewMessage, event.id, isMobile, showToast)}
                    onVoiceRecord={() => handleVoiceRecord(isVoiceRecording, setIsVoiceRecording, messages, setMessages, isMobile, showToast)}
                    isVoiceRecording={isVoiceRecording}
                    onVotePoll={(pollId, optionIndex) => handleVotePollInChat(pollId, optionIndex, userId, polls, setPolls, isMobile)}
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
                    onChangeVote={(pollId, oldOptionIndex, newOptionIndex) => handleChangeVoteInChat(pollId, oldOptionIndex, newOptionIndex, userId, polls, setPolls, isMobile, showToast)}
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
              </div>
            )}

            {activeView === 'map' && (
              eventCoordinates ? (
                <CarpoolMap
                  eventId={event.id}
                  userId={userId || ''}
                  eventLocation={{ 
                    lat: eventCoordinates.lat, 
                    lng: eventCoordinates.lng,
                    address: event.location 
                  }}
                  showToast={showToast}
                  isMobile={isMobile}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center p-8">
                  <div className="text-center">
                    <MapPin className="mx-auto mb-4 text-gray-300" size={64} />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Map Loading...
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {event.location ? 'Loading location coordinates...' : 'No event location specified'}
                    </p>
                  </div>
                </div>
              )
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

          {/* All modals */}
          <CarpoolModals
            showPoll={showPoll}
            onClosePoll={() => setShowPoll(false)}
            newPollQuestion={newPollQuestion}
            onPollQuestionChange={setNewPollQuestion}
            onCreatePoll={() => handleCreatePollInChat(newPollQuestion, userId, polls, setPolls, messages, setMessages, setNewPollQuestion, setShowPoll, isMobile, showToast)}
            showEditCarDetails={showEditCarDetails}
            onCloseEditCarDetails={() => setShowEditCarDetails(false)}
            tempCarDetails={tempCarDetails}
            onTempCarDetailsChange={setTempCarDetails}
            onSaveCarDetails={() => handleSaveCarDetailsInModal(tempCarDetails, setCarDetails, setShowEditCarDetails, driverStatus, messages, setMessages, showToast)}
            showEditEventDetails={showEditEventDetails}
            onCloseEditEventDetails={() => setShowEditEventDetails(false)}
            tempEventDetails={tempEventDetails}
            onTempEventDetailsChange={setTempEventDetails}
            onSaveEventDetails={() => handleSaveEventDetailsInModal(tempEventDetails, setShowEditEventDetails, messages, setMessages, showToast)}
            showNewCarpoolConfirm={showNewCarpoolConfirm}
            onCloseNewCarpoolConfirm={() => setShowNewCarpoolConfirm(false)}
            onStartNewCarpool={handleStartNewCarpool}
            showInfo={showInfo}
            onCloseInfo={() => setShowInfo(false)}
            showProfileSettings={false}
            onCloseProfileSettings={() => {}}
            showFriendInvite={showFriendInvite}
            onCloseFriendInvite={handleCloseFriendInvite}
            selectedFriendsToInvite={selectedFriendsToInvite}
            onSelectedFriendsToInviteChange={setSelectedFriendsToInvite}
            onSendFriendInvites={handleSendFriendInvites}
            userId={userId}
            showToast={showToast}
            isMobile={isMobile}
            event={event}
          />

          {/* ENHANCED: Event Details Modal */}
          {showEventDetailsModal && (
            <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-60">
              <div className="bg-white dark:bg-gray-800 rounded-t-2xl p-6 w-full max-w-lg safe-area-bottom">
                <h3 className="text-lg font-semibold mb-4">Event Details</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      <Type size={14} className="inline mr-1" />
                      Event Title
                    </label>
                    <input
                      type="text"
                      value={tempEventDetails.eventTitle}
                      onChange={(e) => setTempEventDetails(prev => ({ ...prev, eventTitle: e.target.value }))}
                      placeholder="e.g., Concert at Madison Square Garden"
                      className="w-full p-3 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      <Image size={14} className="inline mr-1" />
                      Event Image URL (optional)
                    </label>
                    <input
                      type="url"
                      value={tempEventDetails.eventImageUrl}
                      onChange={(e) => setTempEventDetails(prev => ({ ...prev, eventImageUrl: e.target.value }))}
                      placeholder="https://example.com/event-image.jpg"
                      className="w-full p-3 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      <Link size={14} className="inline mr-1" />
                      Event Link (optional)
                    </label>
                    <input
                      type="url"
                      value={tempEventDetails.eventLink}
                      onChange={(e) => setTempEventDetails(prev => ({ ...prev, eventLink: e.target.value }))}
                      placeholder="https://ticketmaster.com/event/..."
                      className="w-full p-3 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      <MapPin size={14} className="inline mr-1" />
                      Carpool Meetup Location
                    </label>
                    <input
                      type="text"
                      value={tempEventDetails.meetupLocation}
                      onChange={(e) => setTempEventDetails(prev => ({ ...prev, meetupLocation: e.target.value }))}
                      placeholder="e.g., Starbucks on Main St"
                      className="w-full p-3 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      <Clock size={14} className="inline mr-1" />
                      Departure Time
                    </label>
                    <input
                      type="time"
                      value={tempEventDetails.departureTime}
                      onChange={(e) => setTempEventDetails(prev => ({ ...prev, departureTime: e.target.value }))}
                      className="w-full p-3 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Notes (optional)
                    </label>
                    <textarea
                      value={tempEventDetails.notes}
                      onChange={(e) => setTempEventDetails(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Any additional details..."
                      rows={3}
                      className="w-full p-3 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowEventDetailsModal(false)}
                    className="flex-1 p-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      handleSaveEventDetailsInModal(tempEventDetails, setShowEventDetailsModal, messages, setMessages, showToast);
                      handleSaveCarpoolData();
                    }}
                    className="flex-1 p-3 bg-blue-500 text-white rounded-lg font-medium"
                  >
                    Save Details
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <CarpoolSettings
          isOpen={showProfileSettings}
          onClose={handleCloseProfileSettings}
          userId={userId || ''}
          showToast={showToast}
        />
      </>
    );
  }

  // DESKTOP VERSION (similar fixes applied)
  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-5xl my-8 shadow-2xl flex flex-col max-h-[calc(100vh-4rem)]">
          {/* FIXED: Single header without duplicate save */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 flex-shrink-0 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold truncate">Event Carpool</h2>
                <p className="text-blue-100 text-sm truncate">
                  {tempEventDetails.eventTitle || event.title}
                </p>
                <p className="text-xs text-blue-200 truncate">
                  {eventDateStr} • {eventTime} • {event.location || 'TBD'}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                <button
                  onClick={() => setDesktopLayout(desktopLayout === 'custom' ? 'modular' : 'custom')}
                  className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded text-sm transition-colors whitespace-nowrap"
                >
                  {desktopLayout === 'custom' ? 'Modular' : 'Custom'}
                </button>
                <button
                  onClick={() => setActiveView(activeView === 'map' ? 'chat' : 'map')}
                  className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded text-sm transition-colors whitespace-nowrap flex items-center gap-1"
                >
                  <Map size={14} />
                  {activeView === 'map' ? 'Chat' : 'Map'}
                </button>
                <button
                  onClick={handleOpenProfileSettings}
                  className="bg-white/20 hover:bg-white/30 p-1 rounded transition-colors"
                >
                  <Settings size={16} />
                </button>
                <button
                  onClick={onClose}
                  className="bg-white/20 hover:bg-white/30 p-1 rounded transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Layout content */}
          {activeView === 'map' ? (
            <div className="flex-1 min-h-0 overflow-hidden">
              {eventCoordinates ? (
                <CarpoolMap
                  eventId={event.id}
                  userId={userId || ''}
                  eventLocation={{ 
                    lat: eventCoordinates.lat, 
                    lng: eventCoordinates.lng,
                    address: event.location 
                  }}
                  showToast={showToast}
                  isMobile={false}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center p-8">
                  <div className="text-center">
                    <MapPin className="mx-auto mb-4 text-gray-300" size={80} />
                    <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                      Map Loading...
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {event.location ? 'Loading location coordinates...' : 'No event location specified'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : desktopLayout === 'modular' ? (
            <div className="flex flex-1 min-h-0 overflow-hidden">
              <CarpoolSidebars
                selectedFriends={selectedFriends}
                onFriendToggle={(friendId) => handleFriendToggleInModal(friendId, selectedFriends, setSelectedFriends)}
                carpoolData={carpoolData}
                event={event}
                onShowPoll={() => setShowPoll(true)}
                onShowEditCarDetails={() => setShowEditCarDetails(true)}
                onShowEditEventDetails={() => setShowEventDetailsModal(true)}
                onQuickAction={handleQuickActionClick}
                showToast={showToast}
                isMobile={false}
              />
              <div className="flex-1 min-h-0 overflow-hidden">
                <CarpoolChat
                  messages={messages}
                  polls={polls}
                  newMessage={newMessage}
                  onMessageChange={setNewMessage}
                  onSendMessage={() => handleSendMessage(newMessage, userId, messages, setMessages, setNewMessage, event.id, isMobile, showToast)}
                  onVoiceRecord={() => handleVoiceRecord(isVoiceRecording, setIsVoiceRecording, messages, setMessages, isMobile, showToast)}
                  isVoiceRecording={isVoiceRecording}
                  onVotePoll={(pollId, optionIndex) => handleVotePollInChat(pollId, optionIndex, userId, polls, setPolls, isMobile)}
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
                  onChangeVote={(pollId, oldOptionIndex, newOptionIndex) => handleChangeVoteInChat(pollId, oldOptionIndex, newOptionIndex, userId, polls, setPolls, isMobile, showToast)}
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
            </div>
          ) : (
            <div className="flex flex-1 min-h-0 overflow-hidden">
              {/* LEFT SIDEBAR */}
              <div className="w-72 bg-gray-50 dark:bg-gray-800 border-r dark:border-gray-700 flex flex-col flex-shrink-0 overflow-hidden">
                <div className="flex-shrink-0 p-4 border-b dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Event Overview</h3>
                    <button
                      onClick={handleSaveCarpoolData}
                      disabled={isSaving}
                      className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 disabled:opacity-50"
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                  <div className="p-4">
                  
                  <div className="space-y-2 mb-6">
                    <button onClick={() => setShowNewCarpoolConfirm(true)} className="w-full p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium">
                      🔄 Start New Carpool
                    </button>
                    <button 
                      onClick={handleOpenFriendInvite} 
                      className="w-full p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <UserPlus size={18} />
                      <span>Invite Friends</span>
                    </button>
                    <button onClick={() => setShowEventDetailsModal(true)} className="w-full p-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium">
                      📝 Edit Event Details
                    </button>
                    <button onClick={() => setShowPoll(true)} className="w-full p-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium">
                      📊 Create Poll
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
                    <button onClick={() => handleQuickActionClick('running-late')} className="p-2 bg-orange-500 text-white rounded text-xs hover:bg-orange-600 transition-colors">
                      Running Late
                    </button>
                    <button onClick={() => handleQuickActionClick('share-event')} className="p-2 bg-pink-500 text-white rounded text-xs hover:bg-pink-600 transition-colors">
                      Share Event
                    </button>
                    <button onClick={() => handleQuickActionClick('emergency-contact')} className="p-2 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors">
                      Emergency
                    </button>
                    <button onClick={() => setShowEditCarDetails(true)} className="p-2 bg-indigo-500 text-white rounded text-xs hover:bg-indigo-600 transition-colors">
                      Car Details
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
                  </div>
                </div>
              </div>

              {/* CHAT CONTAINER */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <CarpoolChat
                  messages={messages}
                  polls={polls}
                  newMessage={newMessage}
                  onMessageChange={setNewMessage}
                  onSendMessage={() => handleSendMessage(newMessage, userId, messages, setMessages, setNewMessage, event.id, isMobile, showToast)}
                  onVoiceRecord={() => handleVoiceRecord(isVoiceRecording, setIsVoiceRecording, messages, setMessages, isMobile, showToast)}
                  isVoiceRecording={isVoiceRecording}
                  onVotePoll={(pollId, optionIndex) => handleVotePollInChat(pollId, optionIndex, userId, polls, setPolls, isMobile)}
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
                  onChangeVote={(pollId, oldOptionIndex, newOptionIndex) => handleChangeVoteInChat(pollId, oldOptionIndex, newOptionIndex, userId, polls, setPolls, isMobile, showToast)}
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

              {/* RIGHT SIDEBAR - MAP PREVIEW */}
              <div className="w-64 bg-gray-50 dark:bg-gray-800 border-l dark:border-gray-700 flex-shrink-0 overflow-hidden">
                <div className="flex flex-col h-full">
                  <div className="flex-shrink-0 p-4 border-b dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center justify-between">
                      <span>Event Location</span>
                      <button
                        onClick={() => setActiveView('map')}
                        className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
                      >
                        <Maximize2 size={14} />
                        <span>Full View</span>
                      </button>
                    </h3>
                  </div>
                  <div className="flex-1 relative">
                    {eventCoordinates ? (
                      <>
                        <div className="absolute inset-0">
                          <CarpoolMap
                            eventId={event.id}
                            userId={userId || ''}
                            eventLocation={{ 
                              lat: eventCoordinates.lat, 
                              lng: eventCoordinates.lng,
                              address: event.location 
                            }}
                            showToast={showToast}
                            isMobile={false}
                          />
                        </div>
                        <button
                          onClick={() => setActiveView('map')}
                          className="absolute inset-0 bg-transparent hover:bg-black/5 transition-colors cursor-pointer z-10"
                          title="Click to view full map"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 pointer-events-none">
                          <p className="text-white text-sm font-medium">
                            {event.location || 'Event Location'}
                          </p>
                          <p className="text-white/80 text-xs">
                            Click to view full map with carpool locations
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full p-4">
                        <div className="text-center">
                          <MapPin className="mx-auto mb-3 text-gray-300" size={48} />
                          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">
                            Map Preview
                          </p>
                          <p className="text-gray-400 dark:text-gray-500 text-xs">
                            {event.location ? 'Loading map...' : 'No location set'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* All modals */}
          <CarpoolModals
            showPoll={showPoll}
            onClosePoll={() => setShowPoll(false)}
            newPollQuestion={newPollQuestion}
            onPollQuestionChange={setNewPollQuestion}
            onCreatePoll={() => handleCreatePollInChat(newPollQuestion, userId, polls, setPolls, messages, setMessages, setNewPollQuestion, setShowPoll, isMobile, showToast)}
            showEditCarDetails={showEditCarDetails}
            onCloseEditCarDetails={() => setShowEditCarDetails(false)}
            tempCarDetails={tempCarDetails}
            onTempCarDetailsChange={setTempCarDetails}
            onSaveCarDetails={() => handleSaveCarDetailsInModal(tempCarDetails, setCarDetails, setShowEditCarDetails, driverStatus, messages, setMessages, showToast)}
            showEditEventDetails={showEditEventDetails}
            onCloseEditEventDetails={() => setShowEditEventDetails(false)}
            tempEventDetails={tempEventDetails}
            onTempEventDetailsChange={setTempEventDetails}
            onSaveEventDetails={() => handleSaveEventDetailsInModal(tempEventDetails, setShowEditEventDetails, messages, setMessages, showToast)}
            showNewCarpoolConfirm={showNewCarpoolConfirm}
            onCloseNewCarpoolConfirm={() => setShowNewCarpoolConfirm(false)}
            onStartNewCarpool={handleStartNewCarpool}
            showInfo={showInfo}
            onCloseInfo={() => setShowInfo(false)}
            showProfileSettings={false}
            onCloseProfileSettings={() => {}}
            showFriendInvite={showFriendInvite}
            onCloseFriendInvite={handleCloseFriendInvite}
            selectedFriendsToInvite={selectedFriendsToInvite}
            onSelectedFriendsToInviteChange={setSelectedFriendsToInvite}
            onSendFriendInvites={handleSendFriendInvites}
            userId={userId}
            showToast={showToast}
            isMobile={isMobile}
            event={{...event, title: tempEventDetails.eventTitle || event.title}}
          />

          {/* ENHANCED: Event Details Modal for Desktop */}
          {showEventDetailsModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                <h3 className="text-xl font-semibold mb-6">Event & Carpool Details</h3>
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-medium mb-4 text-blue-600 dark:text-blue-400">Event Information</h4>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          <Type size={14} className="inline mr-1" />
                          Event Title
                        </label>
                        <input
                          type="text"
                          value={tempEventDetails.eventTitle}
                          onChange={(e) => setTempEventDetails(prev => ({ ...prev, eventTitle: e.target.value }))}
                          placeholder="e.g., Concert at Madison Square Garden"
                          className="w-full p-3 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          <Image size={14} className="inline mr-1" />
                          Event Image URL
                        </label>
                        <input
                          type="url"
                          value={tempEventDetails.eventImageUrl}
                          onChange={(e) => setTempEventDetails(prev => ({ ...prev, eventImageUrl: e.target.value }))}
                          placeholder="https://example.com/event-image.jpg"
                          className="w-full p-3 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          <Link size={14} className="inline mr-1" />
                          Event Link
                        </label>
                        <input
                          type="url"
                          value={tempEventDetails.eventLink}
                          onChange={(e) => setTempEventDetails(prev => ({ ...prev, eventLink: e.target.value }))}
                          placeholder="https://ticketmaster.com/event/..."
                          className="w-full p-3 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-medium mb-4 text-green-600 dark:text-green-400">Carpool Plans</h4>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          <MapPin size={14} className="inline mr-1" />
                          Meetup Location
                        </label>
                        <input
                          type="text"
                          value={tempEventDetails.meetupLocation}
                          onChange={(e) => setTempEventDetails(prev => ({ ...prev, meetupLocation: e.target.value }))}
                          placeholder="e.g., Starbucks on Main St"
                          className="w-full p-3 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          <Clock size={14} className="inline mr-1" />
                          Departure Time
                        </label>
                        <input
                          type="time"
                          value={tempEventDetails.departureTime}
                          onChange={(e) => setTempEventDetails(prev => ({ ...prev, departureTime: e.target.value }))}
                          className="w-full p-3 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Notes
                        </label>
                        <textarea
                          value={tempEventDetails.notes}
                          onChange={(e) => setTempEventDetails(prev => ({ ...prev, notes: e.target.value }))}
                          placeholder="Any additional details for the carpool..."
                          rows={3}
                          className="w-full p-3 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Image preview if URL is provided */}
                {tempEventDetails.eventImageUrl && (
                  <div className="mt-6">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Image Preview:</p>
                    <img 
                      src={tempEventDetails.eventImageUrl} 
                      alt="Event preview" 
                      className="w-full max-h-48 object-cover rounded-lg"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowEventDetailsModal(false)}
                    className="flex-1 p-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      handleSaveEventDetailsInModal(tempEventDetails, setShowEventDetailsModal, messages, setMessages, showToast);
                      handleSaveCarpoolData();
                    }}
                    className="flex-1 p-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                  >
                    Save All Details
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <CarpoolSettings
        isOpen={showProfileSettings}
        onClose={handleCloseProfileSettings}
        userId={userId || ''}
        showToast={showToast}
      />
    </>
  );
};

export default EventCarpoolModal;
