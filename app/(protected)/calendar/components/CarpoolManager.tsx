// app/(protected)/calendar/components/CarpoolManager.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Car, Users, Plus, MessageCircle, Archive, Trash2, Clock,
  MapPin, Calendar, ChevronRight, Settings, RefreshCw, User,
  CheckCircle, AlertCircle, Eye, Edit, Crown, UserCheck, Save,
  Database, Wifi, WifiOff, Sync, SyncOff
} from 'lucide-react';
import EventCarpoolModal from './EventCarpoolModal';
import type { DBEvent } from '@/lib/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface CarpoolManagerProps {
  isOpen: boolean;
  onClose: () => void;
  event: DBEvent | null;
  userId: string | null;
  showToast?: (toast: { type: string; message: string }) => void;
  isMobile?: boolean;
  onOpenSettings?: () => void;
}

interface CarpoolGroup {
  id: string;
  event_id: string;
  creator_id: string;
  name: string;
  status: 'active' | 'completed' | 'archived';
  participant_count: number;
  created_at: string;
  last_activity: string;
  meetup_location?: string;
  departure_time?: string;
  participants: CarpoolParticipant[];
}

interface CarpoolParticipant {
  id: string;
  group_id: string;
  user_id: string;
  role: 'creator' | 'driver' | 'rider' | 'member';
  joined_at: string;
  user_name: string;
}

// EXTRACTED: Data persistence interfaces and types
interface CarpoolData {
  messages: any[];
  polls: any[];
  selectedFriends: string[];
  driverStatus: string;
  carDetails: any;
  tempEventDetails: any;
}

interface PersistenceOptions {
  useSupabase?: boolean;
  useLocalStorage?: boolean;
  autoSave?: boolean;
  autoSaveInterval?: number;
}

interface PersistenceState {
  currentCarpoolId: string | null;
  isSaving: boolean;
  lastSaved: Date | null;
  saveError: string | null;
  isOnline: boolean;
  syncStatus: 'synced' | 'pending' | 'error';
}

const CarpoolManager: React.FC<CarpoolManagerProps> = ({
  isOpen,
  onClose,
  event,
  userId,
  showToast,
  isMobile = false,
  onOpenSettings
}) => {
  const [carpoolGroups, setCarpoolGroups] = useState<CarpoolGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCarpool, setSelectedCarpool] = useState<CarpoolGroup | null>(null);
  const [showCarpoolModal, setShowCarpoolModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCarpoolName, setNewCarpoolName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // EXTRACTED: Enhanced persistence state management
  const [persistenceState, setPersistenceState] = useState<PersistenceState>({
    currentCarpoolId: null,
    isSaving: false,
    lastSaved: null,
    saveError: null,
    isOnline: true,
    syncStatus: 'synced'
  });

  const [persistenceOptions] = useState<PersistenceOptions>({
    useSupabase: true,
    useLocalStorage: true,
    autoSave: true,
    autoSaveInterval: 120000 // 2 minutes
  });

  // EXTRACTED: Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setPersistenceState(prev => ({ ...prev, isOnline: true }));
      showToast?.({ type: 'success', message: 'Connection restored' });
    };

    const handleOffline = () => {
      setPersistenceState(prev => ({ ...prev, isOnline: false }));
      showToast?.({ type: 'warning', message: 'Offline mode - changes saved locally' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    setPersistenceState(prev => ({ ...prev, isOnline: navigator.onLine }));

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showToast]);

  useEffect(() => {
    if (isOpen && event) {
      loadCarpoolGroups();
    }
  }, [isOpen, event]);

  // EXTRACTED: Enhanced carpool data persistence with offline support
  const saveCarpoolData = useCallback(async (
    carpoolId: string, 
    data: CarpoolData, 
    options?: Partial<PersistenceOptions>
  ) => {
    const opts = { ...persistenceOptions, ...options };
    
    if (!userId || !event?.id || persistenceState.isSaving) return { success: false, message: 'Invalid state' };
    
    setPersistenceState(prev => ({ 
      ...prev, 
      isSaving: true, 
      saveError: null,
      syncStatus: 'pending'
    }));
    
    try {
      // Always save to localStorage as backup/offline storage
      if (opts.useLocalStorage) {
        const localStorageKey = `carpool-${event.id}-${userId}`;
        const fallbackData = {
          ...data,
          carpoolId,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem(localStorageKey, JSON.stringify(fallbackData));
      }
      
      // Try Supabase save if online and enabled
      if (opts.useSupabase && persistenceState.isOnline) {
        try {
          const carpoolData = {
            id: carpoolId || undefined,
            event_id: event.id,
            driver_id: userId,
            messages: JSON.stringify(data.messages),
            polls: JSON.stringify(data.polls),
            selected_friends: data.selectedFriends,
            driver_status: data.driverStatus,
            car_details: JSON.stringify(data.carDetails),
            event_details: JSON.stringify(data.tempEventDetails),
            updated_at: new Date().toISOString()
          };

          if (carpoolId && carpoolId !== 'new') {
            // Update existing carpool
            const { error } = await supabase
              .from('carpool_groups')
              .update(carpoolData)
              .eq('id', carpoolId)
              .eq('driver_id', userId);
            
            if (error) throw error;
          } else {
            // Create new carpool
            const { data: newData, error } = await supabase
              .from('carpool_groups')
              .insert([{ ...carpoolData, created_at: new Date().toISOString() }])
              .select()
              .single();
            
            if (error) throw error;
            if (newData) {
              setPersistenceState(prev => ({ ...prev, currentCarpoolId: newData.id }));
            }
          }

          setPersistenceState(prev => ({ 
            ...prev, 
            lastSaved: new Date(),
            syncStatus: 'synced'
          }));
          
          showToast?.({ 
            type: 'success', 
            message: 'Carpool data saved to cloud!' 
          });

          return { success: true, message: 'Saved to cloud', carpoolId };
        } catch (supabaseError: any) {
          console.warn('Supabase save failed, using localStorage:', supabaseError);
          setPersistenceState(prev => ({ 
            ...prev, 
            lastSaved: new Date(),
            syncStatus: 'error',
            saveError: supabaseError.message
          }));
          
          showToast?.({ 
            type: 'info', 
            message: 'Saved locally (cloud unavailable)' 
          });

          return { success: true, message: 'Saved locally', carpoolId };
        }
      } else {
        // Offline or Supabase disabled
        setPersistenceState(prev => ({ 
          ...prev, 
          lastSaved: new Date(),
          syncStatus: persistenceState.isOnline ? 'synced' : 'pending'
        }));
        
        showToast?.({ 
          type: 'info', 
          message: persistenceState.isOnline ? 'Saved locally' : 'Saved offline' 
        });

        return { success: true, message: 'Saved locally', carpoolId };
      }
    } catch (error: any) {
      console.error('Save carpool error:', error);
      setPersistenceState(prev => ({ 
        ...prev, 
        saveError: error.message,
        syncStatus: 'error'
      }));
      
      showToast?.({ 
        type: 'error', 
        message: 'Failed to save data completely' 
      });

      return { success: false, message: error.message };
    } finally {
      setPersistenceState(prev => ({ ...prev, isSaving: false }));
    }
  }, [userId, event?.id, persistenceState, persistenceOptions, showToast]);

  // EXTRACTED: Enhanced carpool data loading with offline support
  const loadCarpoolData = useCallback(async (carpoolId?: string) => {
    if (!userId || !event?.id) return { success: false, data: null };
    
    try {
      // Try Supabase first if online
      if (persistenceState.isOnline && persistenceOptions.useSupabase) {
        const { data, error } = await supabase
          .from('carpool_groups')
          .select('*')
          .eq('event_id', event.id)
          .eq('driver_id', userId)
          .order('updated_at', { ascending: false })
          .limit(1);
        
        if (!error && data && data.length > 0) {
          const carpool = data[0];
          setPersistenceState(prev => ({ 
            ...prev, 
            currentCarpoolId: carpool.id,
            syncStatus: 'synced'
          }));
          
          const carpoolData = {
            messages: carpool.messages ? JSON.parse(carpool.messages) : [],
            polls: carpool.polls ? JSON.parse(carpool.polls) : [],
            selectedFriends: carpool.selected_friends || [],
            driverStatus: carpool.driver_status || 'none',
            carDetails: carpool.car_details ? JSON.parse(carpool.car_details) : { seats: 4, make: '', color: '' },
            tempEventDetails: carpool.event_details ? JSON.parse(carpool.event_details) : { meetupLocation: '', departureTime: '', notes: '' }
          };

          showToast?.({ type: 'success', message: 'Carpool data loaded from cloud!' });
          return { success: true, data: carpoolData, source: 'cloud' };
        }
      }
    } catch (supabaseError) {
      console.warn('Supabase load failed, trying localStorage:', supabaseError);
      setPersistenceState(prev => ({ ...prev, syncStatus: 'error' }));
    }
    
    // Fallback to localStorage
    if (persistenceOptions.useLocalStorage) {
      try {
        const localStorageKey = `carpool-${event.id}-${userId}`;
        const savedData = localStorage.getItem(localStorageKey);
        
        if (savedData) {
          const parsed = JSON.parse(savedData);
          setPersistenceState(prev => ({ 
            ...prev, 
            currentCarpoolId: parsed.carpoolId || null,
            syncStatus: persistenceState.isOnline ? 'pending' : 'synced'
          }));
          
          const carpoolData = {
            messages: parsed.messages || [],
            polls: parsed.polls || [],
            selectedFriends: parsed.selectedFriends || [],
            driverStatus: parsed.driverStatus || 'none',
            carDetails: parsed.carDetails || { seats: 4, make: '', color: '' },
            tempEventDetails: parsed.tempEventDetails || { meetupLocation: '', departureTime: '', notes: '' }
          };
          
          showToast?.({ 
            type: 'info', 
            message: persistenceState.isOnline ? 'Loaded from local storage' : 'Loaded offline data'
          });
          
          return { success: true, data: carpoolData, source: 'local' };
        }
      } catch (localError) {
        console.warn('localStorage load failed:', localError);
      }
    }

    return { success: false, data: null };
  }, [userId, event?.id, persistenceState, persistenceOptions, showToast]);

  // EXTRACTED: Sync pending changes when coming back online
  const syncPendingChanges = useCallback(async () => {
    if (!persistenceState.isOnline || persistenceState.syncStatus !== 'pending') return;

    try {
      const localStorageKey = `carpool-${event?.id}-${userId}`;
      const savedData = localStorage.getItem(localStorageKey);
      
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed.carpoolId) {
          await saveCarpoolData(parsed.carpoolId, parsed, { useLocalStorage: false });
        }
      }
    } catch (error) {
      console.error('Sync error:', error);
    }
  }, [persistenceState, event?.id, userId, saveCarpoolData]);

  // Auto-sync when coming online
  useEffect(() => {
    if (persistenceState.isOnline && persistenceState.syncStatus === 'pending') {
      syncPendingChanges();
    }
  }, [persistenceState.isOnline, syncPendingChanges]);

  // EXTRACTED: Enhanced auto-save with offline awareness
  useEffect(() => {
    if (!isOpen || !event || !persistenceOptions.autoSave) return;
    
    const autoSaveInterval = setInterval(() => {
      // Only auto-save if we have unsaved changes
      if (persistenceState.syncStatus === 'pending') {
        syncPendingChanges();
      }
    }, persistenceOptions.autoSaveInterval);

    return () => clearInterval(autoSaveInterval);
  }, [isOpen, event, persistenceOptions.autoSave, persistenceOptions.autoSaveInterval, persistenceState.syncStatus, syncPendingChanges]);

  const loadCarpoolGroups = async () => {
    if (!event || !userId) return;
    
    try {
      setLoading(true);
      
      // Load carpool groups for this event
      const { data: groups, error: groupsError } = await supabase
        .from('carpool_groups')
        .select(`
          *,
          carpool_participants!inner (
            id,
            user_id,
            role,
            joined_at,
            profiles (
              display_name
            )
          )
        `)
        .eq('event_id', event.id)
        .order('created_at', { ascending: false });

      if (groupsError) {
        console.error('Error loading carpool groups:', groupsError);
        showToast?.({ type: 'error', message: 'Failed to load carpools' });
        return;
      }

      // Transform data and filter groups where user is a participant
      const transformedGroups: CarpoolGroup[] = (groups || [])
        .filter(group => 
          group.carpool_participants.some((p: any) => p.user_id === userId)
        )
        .map(group => ({
          id: group.id,
          event_id: group.event_id,
          creator_id: group.creator_id,
          name: group.name,
          status: group.status,
          participant_count: group.carpool_participants.length,
          created_at: group.created_at,
          last_activity: group.last_activity || group.created_at,
          meetup_location: group.meetup_location,
          departure_time: group.departure_time,
          participants: group.carpool_participants.map((p: any) => ({
            id: p.id,
            group_id: group.id,
            user_id: p.user_id,
            role: p.role,
            joined_at: p.joined_at,
            user_name: p.profiles?.display_name || 'Unknown User'
          }))
        }));

      setCarpoolGroups(transformedGroups);
    } catch (error) {
      console.error('Error loading carpool groups:', error);
      showToast?.({ type: 'error', message: 'Failed to load carpools' });
    } finally {
      setLoading(false);
    }
  };

  const createNewCarpool = async () => {
    if (!event || !userId || !newCarpoolName.trim()) return;

    try {
      // Create carpool group
      const { data: group, error: groupError } = await supabase
        .from('carpool_groups')
        .insert({
          event_id: event.id,
          creator_id: userId,
          name: newCarpoolName.trim(),
          status: 'active',
          created_at: new Date().toISOString(),
          last_activity: new Date().toISOString()
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add creator as participant
      const { error: participantError } = await supabase
        .from('carpool_participants')
        .insert({
          group_id: group.id,
          user_id: userId,
          role: 'creator',
          joined_at: new Date().toISOString()
        });

      if (participantError) throw participantError;

      // Reload groups
      await loadCarpoolGroups();
      
      setNewCarpoolName('');
      setShowCreateModal(false);
      showToast?.({ type: 'success', message: 'Carpool created successfully!' });
      
      // Automatically open the new carpool
      const newGroup = carpoolGroups.find(g => g.id === group.id);
      if (newGroup) {
        openCarpool(newGroup);
      }
    } catch (error) {
      console.error('Error creating carpool:', error);
      showToast?.({ type: 'error', message: 'Failed to create carpool' });
    }
  };

  const archiveCarpool = async (groupId: string) => {
    try {
      const { error } = await supabase
        .from('carpool_groups')
        .update({ 
          status: 'archived',
          last_activity: new Date().toISOString()
        })
        .eq('id', groupId);

      if (error) throw error;

      await loadCarpoolGroups();
      showToast?.({ type: 'success', message: 'Carpool archived' });
    } catch (error) {
      console.error('Error archiving carpool:', error);
      showToast?.({ type: 'error', message: 'Failed to archive carpool' });
    }
  };

  const deleteCarpool = async (groupId: string) => {
    try {
      // Delete participants first (foreign key constraint)
      await supabase
        .from('carpool_participants')
        .delete()
        .eq('group_id', groupId);

      // Delete messages
      await supabase
        .from('carpool_messages')
        .delete()
        .eq('group_id', groupId);

      // Delete group
      const { error } = await supabase
        .from('carpool_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;

      await loadCarpoolGroups();
      setShowDeleteConfirm(null);
      showToast?.({ type: 'success', message: 'Carpool deleted' });
    } catch (error) {
      console.error('Error deleting carpool:', error);
      showToast?.({ type: 'error', message: 'Failed to delete carpool' });
    }
  };

  const openCarpool = (group: CarpoolGroup) => {
    setSelectedCarpool(group);
    setPersistenceState(prev => ({ ...prev, currentCarpoolId: group.id }));
    setShowCarpoolModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100 dark:bg-green-900/30';
      case 'completed': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
      case 'archived': return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <AlertCircle size={14} />;
      case 'completed': return <CheckCircle size={14} />;
      case 'archived': return <Archive size={14} />;
      default: return <Clock size={14} />;
    }
  };

  // ENHANCED: Get sync status icon
  const getSyncStatusIcon = () => {
    if (!persistenceState.isOnline) {
      return <WifiOff size={16} className="text-orange-500" title="Offline" />;
    }
    
    switch (persistenceState.syncStatus) {
      case 'synced': 
        return <Sync size={16} className="text-green-500" title="Synced" />;
      case 'pending': 
        return <RefreshCw size={16} className="text-blue-500 animate-spin" title="Syncing..." />;
      case 'error': 
        return <SyncOff size={16} className="text-red-500" title="Sync Error" />;
      default: 
        return <Database size={16} className="text-gray-500" />;
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

  // Mobile version - ENHANCED with persistence status
  if (isMobile) {
    return (
      <>
        <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col">
          {/* Enhanced Mobile Header with sync status */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-3 safe-area-top">
            <div className="flex items-center justify-between">
              <button onClick={onClose} className="p-2 -ml-2 active:scale-95">
                <ChevronRight className="rotate-180" size={24} />
              </button>
              <div className="flex-1 text-center">
                <h3 className="font-semibold text-lg">Carpool Coordination</h3>
                <p className="text-xs opacity-90 truncate px-4">{event.title}</p>
                {/* ENHANCED: Mobile sync status */}
                <div className="flex items-center justify-center gap-2 mt-1">
                  {getSyncStatusIcon()}
                  <span className="text-xs opacity-75">
                    {persistenceState.isOnline ? 
                      (persistenceState.syncStatus === 'synced' ? 'Synced' : 
                       persistenceState.syncStatus === 'pending' ? 'Syncing...' : 'Sync Error') 
                      : 'Offline Mode'}
                  </span>
                  {persistenceState.lastSaved && (
                    <span className="text-xs opacity-60">
                      • Saved {persistenceState.lastSaved.toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="p-2 active:scale-95"
                  title="Create New Carpool"
                >
                  <Plus size={20} />
                </button>
                {onOpenSettings && (
                  <button
                    onClick={onOpenSettings}
                    className="p-2 -mr-2 active:scale-95"
                    title="Settings"
                  >
                    <Settings size={20} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Enhanced Event Info with sync controls */}
          <div className="bg-blue-50 dark:bg-gray-800 px-4 py-3 border-b dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="text-blue-600 dark:text-blue-400" size={16} />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white text-sm">
                    {eventDateStr} • {eventTime}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {event.location || 'Location TBD'}
                  </p>
                </div>
              </div>
              {/* ENHANCED: Manual sync button for mobile */}
              {persistenceState.isOnline && persistenceState.syncStatus === 'pending' && (
                <button
                  onClick={syncPendingChanges}
                  className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg active:scale-95"
                  title="Sync Now"
                >
                  <RefreshCw size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : carpoolGroups.length > 0 ? (
              <div className="p-4 space-y-3">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  My Carpools ({carpoolGroups.length})
                </h4>
                {carpoolGroups.map((group) => (
                  <div
                    key={group.id}
                    className="bg-white dark:bg-gray-800 rounded-lg p-4 border dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-medium text-gray-900 dark:text-white">
                            {group.name}
                          </h5>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(group.status)}`}>
                            {getStatusIcon(group.status)}
                            {group.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Users size={12} />
                            {group.participant_count} people
                          </span>
                          {group.creator_id === userId && (
                            <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                              <Crown size={12} />
                              Creator
                            </span>
                          )}
                        </div>
                        {group.meetup_location && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            📍 {group.meetup_location}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Participants */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex -space-x-2">
                        {group.participants.slice(0, 4).map((participant, idx) => (
                          <div
                            key={participant.id}
                            className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-medium border-2 border-white dark:border-gray-800"
                            title={participant.user_name}
                          >
                            {participant.user_name.charAt(0).toUpperCase()}
                          </div>
                        ))}
                        {group.participants.length > 4 && (
                          <div className="w-6 h-6 bg-gray-400 text-white rounded-full flex items-center justify-center text-xs font-medium border-2 border-white dark:border-gray-800">
                            +{group.participants.length - 4}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => openCarpool(group)}
                        className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-1"
                      >
                        <MessageCircle size={14} />
                        {group.status === 'active' ? 'Join Chat' : 'View Chat'}
                      </button>
                      
                      {group.creator_id === userId && (
                        <>
                          {group.status === 'active' && (
                            <button
                              onClick={() => archiveCarpool(group.id)}
                              className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                              title="Archive"
                            >
                              <Archive size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => setShowDeleteConfirm(group.id)}
                            className="px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                  <Car className="mx-auto mb-4 text-gray-300" size={64} />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    No Carpools Yet
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Create your first carpool group to start coordinating with friends!
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center gap-2 mx-auto"
                  >
                    <Plus size={20} />
                    Create Carpool
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Create Carpool Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-60">
            <div className="bg-white dark:bg-gray-800 rounded-t-2xl p-6 w-full max-w-lg safe-area-bottom">
              <h3 className="text-lg font-semibold mb-4">Create New Carpool</h3>
              <input
                type="text"
                value={newCarpoolName}
                onChange={(e) => setNewCarpoolName(e.target.value)}
                placeholder="e.g. Main Group, Sarah's Car, Backup Plan"
                className="w-full p-3 border dark:border-gray-700 rounded-lg mb-4 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 p-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={createNewCarpool}
                  disabled={!newCarpoolName.trim()}
                  className="flex-1 p-3 bg-blue-500 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 px-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full">
              <h3 className="text-lg font-semibold mb-3">Delete Carpool?</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                This will permanently delete the carpool and all its messages. This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 p-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteCarpool(showDeleteConfirm)}
                  className="flex-1 p-3 bg-red-500 text-white rounded-lg font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Carpool Modal with persistence services */}
        {showCarpoolModal && selectedCarpool && (
          <EventCarpoolModal
            isOpen={showCarpoolModal}
            onClose={() => {
              setShowCarpoolModal(false);
              setSelectedCarpool(null);
              setPersistenceState(prev => ({ ...prev, currentCarpoolId: null }));
              loadCarpoolGroups();
            }}
            event={event}
            userId={userId}
            carpoolGroupId={selectedCarpool.id}
            showToast={showToast}
            isMobile={isMobile}
            onOpenSettings={onOpenSettings}
            // ENHANCED: Pass persistence services to EventCarpoolModal
            persistenceServices={{
              saveCarpoolData,
              loadCarpoolData,
              persistenceState,
              syncPendingChanges
            }}
          />
        )}
      </>
    );
  }

  // Desktop version - ENHANCED with persistence dashboard
  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
          {/* Enhanced Desktop Header with sync dashboard */}
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
                {/* ENHANCED: Desktop sync status dashboard */}
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <div className="flex items-center gap-2">
                    {getSyncStatusIcon()}
                    <span className="text-blue-200">
                      {persistenceState.isOnline ? 
                        (persistenceState.syncStatus === 'synced' ? 'All data synced' : 
                         persistenceState.syncStatus === 'pending' ? 'Syncing changes...' : 'Sync error') 
                        : 'Offline mode active'}
                    </span>
                  </div>
                  {persistenceState.lastSaved && (
                    <div className="flex items-center gap-1">
                      <Save size={12} />
                      <span className="text-blue-300">
                        Last saved: {persistenceState.lastSaved.toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                  {persistenceState.isOnline && persistenceState.syncStatus === 'pending' && (
                    <button
                      onClick={syncPendingChanges}
                      className="px-2 py-1 bg-white/20 hover:bg-white/30 rounded text-xs"
                    >
                      Sync Now
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Plus size={20} />
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
                  ✕
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Content */}
          <div className="p-6 h-[70vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : carpoolGroups.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    My Carpools ({carpoolGroups.length})
                  </h3>
                  {/* ENHANCED: Desktop sync controls */}
                  <div className="flex items-center gap-2">
                    {persistenceState.saveError && (
                      <div className="text-red-600 text-sm">
                        Error: {persistenceState.saveError}
                      </div>
                    )}
                    {persistenceState.isSaving && (
                      <div className="flex items-center gap-2 text-blue-600 text-sm">
                        <RefreshCw size={14} className="animate-spin" />
                        Saving...
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {carpoolGroups.map((group) => (
                    <div
                      key={group.id}
                      className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {group.name}
                            </h4>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${getStatusColor(group.status)}`}>
                              {getStatusIcon(group.status)}
                              {group.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <Users size={14} />
                              {group.participant_count} participants
                            </span>
                            {group.creator_id === userId && (
                              <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                                <Crown size={14} />
                                You created this
                              </span>
                            )}
                          </div>
                          {group.meetup_location && (
                            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                              📍 Meetup: {group.meetup_location}
                            </p>
                          )}
                          {group.departure_time && (
                            <p className="text-sm text-gray-500 dark:text-gray-500">
                              🕐 Departure: {group.departure_time}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Participants Grid */}
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Participants:</p>
                        <div className="flex flex-wrap gap-2">
                          {group.participants.map((participant) => (
                            <div
                              key={participant.id}
                              className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full text-sm"
                            >
                              <div className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">
                                {participant.user_name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-gray-700 dark:text-gray-300">
                                {participant.user_name}
                                {participant.user_id === userId && ' (You)'}
                              </span>
                              {participant.role === 'creator' && <Crown size={12} className="text-purple-500" />}
                              {participant.role === 'driver' && <Car size={12} className="text-green-500" />}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3">
                        <button
                          onClick={() => openCarpool(group)}
                          className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                        >
                          <MessageCircle size={16} />
                          {group.status === 'active' ? 'Join Chat' : 'View Chat'}
                        </button>
                        
                        {group.creator_id === userId && (
                          <div className="flex gap-2">
                            {group.status === 'active' && (
                              <button
                                onClick={() => archiveCarpool(group.id)}
                                className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                title="Archive carpool"
                              >
                                <Archive size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => setShowDeleteConfirm(group.id)}
                              className="px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                              title="Delete carpool"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Last Activity */}
                      <div className="mt-3 pt-3 border-t dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          Last activity: {new Date(group.last_activity).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Car className="mx-auto mb-4 text-gray-300" size={80} />
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                    No Carpools Yet
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
                    Create your first carpool group to start coordinating transportation with friends for this event!
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-8 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center gap-2 mx-auto"
                  >
                    <Plus size={20} />
                    Create Your First Carpool
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Modal - Desktop */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Create New Carpool Group</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
              Give your carpool group a name to help organize multiple coordination efforts.
            </p>
            <input
              type="text"
              value={newCarpoolName}
              onChange={(e) => setNewCarpoolName(e.target.value)}
              placeholder="e.g. Main Group, Sarah's Car, Backup Plan"
              className="w-full p-3 border dark:border-gray-700 rounded-lg mb-4 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 p-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createNewCarpool}
                disabled={!newCarpoolName.trim()}
                className="flex-1 p-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                Create Carpool
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation - Desktop */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Delete Carpool?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This will permanently delete the carpool group and all its messages. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 p-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteCarpool(showDeleteConfirm)}
                className="flex-1 p-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Carpool Modal with persistence services */}
      {showCarpoolModal && selectedCarpool && (
        <EventCarpoolModal
          isOpen={showCarpoolModal}
          onClose={() => {
            setShowCarpoolModal(false);
            setSelectedCarpool(null);
            setPersistenceState(prev => ({ ...prev, currentCarpoolId: null }));
            loadCarpoolGroups();
          }}
          event={event}
          userId={userId}
          carpoolGroupId={selectedCarpool.id}
          showToast={showToast}
          isMobile={isMobile}
          onOpenSettings={onOpenSettings}
          // ENHANCED: Pass persistence services to EventCarpoolModal
          persistenceServices={{
            saveCarpoolData,
            loadCarpoolData,
            persistenceState,
            syncPendingChanges
          }}
        />
      )}
    </>
  );
};

export default CarpoolManager;
