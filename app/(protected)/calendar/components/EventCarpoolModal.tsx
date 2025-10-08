// app/(protected)/calendar/components/EventCarpoolModal.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, X, Settings, RefreshCw, MoreVertical, Car, UserPlus, MapPin, Clock, Save, Map, Maximize2 } from 'lucide-react';
import type { DBEvent } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';

// Import modular components
import CarpoolOverview from './carpool/CarpoolOverview';
import CarpoolChat from './carpool/CarpoolChat';
import CarpoolSidebars from './carpool/CarpoolSidebars';
import CarpoolModals from './carpool/CarpoolModals';
import CarpoolMap from './carpool/CarpoolMap'; // ADDED: Map component import
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

// Import ALL functions from utils instead of duplicating
import {
  generateCarpoolStats,
  generateAISuggestions,
  initializeCarpoolChat,
  handleQuickAction,
  formatEventTime,
  vibrate,
  // Extracted handler functions
  handleSendMessage,
  handleVoiceRecord,
  handleCreatePollInChat,
  handleVotePollInChat,
  handleChangeVoteInChat,
  handleSaveCarDetailsInModal,
  handleSaveEventDetailsInModal,
  handleStartNewCarpoolInModal,
  handleFriendToggleInModal,
  // Persistence functions
  saveCarpoolData,
  loadCarpoolData,
  syncPendingChanges,
  geocodeAddress // ADDED: For geocoding addresses
} from './carpool/utils';

// Supabase client
const supabase = createClient();

// ADDED: Extended ActiveView type to include map
type ExtendedActiveView = ActiveView | 'map';

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
  // ALL ORIGINAL STATE PRESERVED - Updated activeView type
  const [activeView, setActiveView] = useState<ExtendedActiveView>('overview');
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

  // ENHANCED STATE FOR PERSISTENCE
  const [currentCarpoolId, setCurrentCarpoolId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // STATE FOR PROFILE SETTINGS
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  
  // STATE FOR FRIEND INVITE MODAL
  const [showFriendInvite, setShowFriendInvite] = useState(false);
  const [selectedFriendsToInvite, setSelectedFriendsToInvite] = useState<string[]>([]);

  // ADDED: State for event coordinates
  const [eventCoordinates, setEventCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  // Use extracted save function from utils.ts
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
        tempEventDetails
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
    } catch (error: any) {
      console.error('Save carpool error:', error);
      setSaveError(error.message);
      showToast?.({ 
        type: 'error', 
        message: 'Failed to save data completely' 
      });
    } finally {
      setIsSaving(false);
    }
  }, [userId, event?.id, currentCarpoolId, messages, polls, selectedFriends, driverStatus, carDetails, tempEventDetails, isSaving, showToast]);

  // Use extracted load function from utils.ts
  const handleLoadCarpoolData = useCallback(async () => {
    if (!userId || !event?.id) return;
    
    try {
      const result = await loadCarpoolData(undefined, userId, event.id, showToast);
      
      if (result.success && result.data) {
        if (result.carpoolId) {
          setCurrentCarpoolId(result.carpoolId);
        }
        
        setMessages(result.data.messages || []);
        setPolls(result.data.polls || []);
        setSelectedFriends(result.data.selectedFriends || []);
        setDriverStatus(result.data.driverStatus || 'none');
        setCarDetails(result.data.carDetails || { seats: 4, make: '', color: '' });
        setTempEventDetails(result.data.tempEventDetails || { meetupLocation: '', departureTime: '', notes: '' });
      }
    } catch (error) {
      console.warn('Error loading carpool data:', error);
    }
  }, [userId, event?.id, showToast]);

  // ADDED: Geocode event location if needed
  useEffect(() => {
    const checkAndGeocodeEvent = async () => {
      if (!event) return;
      
      // Check if event already has coordinates
      if (event.latitude && event.longitude) {
        setEventCoordinates({ lat: event.latitude, lng: event.longitude });
        return;
      }
      
      // If no coordinates but has address, geocode it
      if (event.location) {
        const coords = await geocodeAddress(event.location);
        if (coords) {
          setEventCoordinates(coords);
          
          // Optionally save coordinates back to database
          await supabase
            .from('events')
            .update({ 
              latitude: coords.lat, 
              longitude: coords.lng 
            })
            .eq('id', event.id);
        }
      }
    };
    
    if (isOpen && event) {
      checkAndGeocodeEvent();
    }
  }, [isOpen, event]);

  // ALL ORIGINAL EFFECTS PRESERVED
  useEffect(() => {
    if (isOpen && event) {
      // Load existing data first
      handleLoadCarpoolData();
      
      // Fallback to initial messages if no saved data
      setTimeout(() => {
        if (messages.length === 0) {
          const initialMessages = initializeCarpoolChat(event);
          setMessages(initialMessages);
        }
      }, 1000);
    }
  }, [isOpen, event, handleLoadCarpoolData]);

  useEffect(() => {
    setTempCarDetails(carDetails);
  }, [carDetails]);

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

  // Auto-save every 2 minutes
  useEffect(() => {
    if (!isOpen || !event) return;
    
    const autoSaveInterval = setInterval(() => {
      if (messages.length > 0 || polls.length > 0 || selectedFriends.length > 0) {
        handleSaveCarpoolData();
      }
    }, 120000); // 2 minutes

    return () => clearInterval(autoSaveInterval);
  }, [isOpen, event, messages.length, polls.length, selectedFriends.length, handleSaveCarpoolData]);

  // PROFILE SETTINGS HANDLERS
  const handleOpenProfileSettings = () => {
    setShowProfileSettings(true);
  };

  const handleCloseProfileSettings = () => {
    setShowProfileSettings(false);
  };

  // FRIEND INVITE HANDLERS
  const handleOpenFriendInvite = () => {
    setShowFriendInvite(true);
  };

  const handleCloseFriendInvite = () => {
    setShowFriendInvite(false);
    setSelectedFriendsToInvite([]);
  };

  const handleSendFriendInvites = () => {
    if (selectedFriendsToInvite.length > 0 && carpoolData?.createCarpoolGroup) {
      carpoolData.createCarpoolGroup(event.id, selectedFriendsToInvite, "Join our carpool!");
      showToast?.({ 
        type: 'success', 
        message: `Invitations sent to ${selectedFriendsToInvite.length} friend${selectedFriendsToInvite.length > 1 ? 's' : ''}!` 
      });
      handleCloseFriendInvite();
    }
  };

  if (!isOpen || !event) return null;

  const carpoolStats = generateCarpoolStats(carpoolData);
  const aiSuggestions = generateAISuggestions(event);
  const { eventTime, eventDateStr } = formatEventTime(event.start_time);

  // ALL ORIGINAL HANDLERS PRESERVED
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
  };

  // MOBILE VERSION WITH MAP ADDED
  if (isMobile) {
    return (
      <>
        <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col h-screen">
          {/* Header */}
          <div className="flex-shrink-0 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-3 safe-area-top">
            <div className="flex items-center justify-between">
              <button onClick={onClose} className="p-2 -ml-2 active:scale-95">
                <ArrowLeft size={24} />
              </button>
              <div className="flex-1 text-center">
                <h3 className="font-semibold text-lg">Event Carpool</h3>
                {lastSaved && (
                  <p className="text-xs text-blue-200">
                    Saved {lastSaved.toLocaleTimeString()}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleSaveCarpoolData}
                  disabled={isSaving}
                  className="p-2 active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw size={20} className="animate-spin" /> : <Save size={20} />}
                </button>
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

          {/* UPDATED Navigation with Map Tab */}
          <div className="flex-shrink-0 flex bg-gray-100 dark:bg-gray-800">
            {([
              { view: 'overview' as const, icon: MapPin, label: 'Overview' }, 
              { view: 'chat' as const, icon: Car, label: 'Chat' },
              { view: 'map' as const, icon: Map, label: 'Map' } // ADDED: Map tab
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

          {/* Content with Map View Added */}
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

            {/* ADDED: Map View */}
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
                      Map Not Available
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
            onStartNewCarpool={() => handleStartNewCarpoolInModal(setMessages, setPolls, setDriverStatus, setSelectedFriends, setCurrentCarpoolId, setShowNewCarpoolConfirm, event, showToast)}
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
          />
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

  // DESKTOP VERSION WITH MAP VIEW
  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-5xl my-8 shadow-2xl flex flex-col max-h-[calc(100vh-4rem)]">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 flex-shrink-0 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold truncate">Event Carpool</h2>
                <p className="text-blue-100 text-sm truncate">{event.title}</p>
                <p className="text-xs text-blue-200 truncate">
                  {eventDateStr} • {eventTime} • {event.location || 'TBD'}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                <button
                  onClick={handleSaveCarpoolData}
                  disabled={isSaving}
                  className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-sm transition-colors whitespace-nowrap disabled:opacity-50 flex items-center gap-1"
                >
                  {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setDesktopLayout(desktopLayout === 'custom' ? 'modular' : 'custom')}
                  className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded text-sm transition-colors whitespace-nowrap"
                >
                  {desktopLayout === 'custom' ? 'Modular' : 'Custom'}
                </button>
                {/* ADDED: Map View Button */}
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

          {/* LAYOUT WITH MAP VIEW */}
          {activeView === 'map' ? (
            // ADDED: Full-screen map view for desktop
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
                      Map Not Available
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
                onShowEditEventDetails={() => setShowEditEventDetails(true)}
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
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                  <div className="p-4">
                  
                  <div className="space-y-2 mb-6">
                    <button onClick={() => setShowNewCarpoolConfirm(true)} className="w-full p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium">
                      🔄 Start New Carpool
                    </button>
                    {/* REPLACED: Car Details with Invite Friends */}
                    <button 
                      onClick={handleOpenFriendInvite} 
                      className="w-full p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <UserPlus size={18} />
                      <span>Invite Friends</span>
                    </button>
                    <button onClick={() => setShowEditEventDetails(true)} className="w-full p-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium">
                      📍 Edit Meetup Details
                    </button>
                    <button onClick={() => setShowPoll(true)} className="w-full p-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium">
                      📊 Create Poll
                    </button>
                    <button 
                      onClick={handleSaveCarpoolData}
                      disabled={isSaving}
                      className="w-full p-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      {isSaving ? 'Saving...' : 'Save Now'}
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

              {/* RIGHT SIDEBAR - REPLACED WITH MAP PREVIEW */}
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
                        {/* Map Preview Container */}
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
                        {/* Click overlay to open full map */}
                        <button
                          onClick={() => setActiveView('map')}
                          className="absolute inset-0 bg-transparent hover:bg-black/5 transition-colors cursor-pointer z-10"
                          title="Click to view full map"
                        />
                        {/* Map Info Overlay */}
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
            onStartNewCarpool={() => handleStartNewCarpoolInModal(setMessages, setPolls, setDriverStatus, setSelectedFriends, setCurrentCarpoolId, setShowNewCarpoolConfirm, event, showToast)}
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
          />
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
