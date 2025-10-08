// app/(protected)/calendar/components/CarpoolManagerUI.tsx
// NEW: Pure UI component that uses the useCarpoolManager hook

import React, { useState } from 'react';
import {
  Car, Users, Plus, MessageCircle, Archive, Trash2, Clock,
  MapPin, Calendar, ChevronRight, Settings, RefreshCw,
  CheckCircle, AlertCircle, Crown, Save,
  Wifi, WifiOff, Sync, SyncOff, Database, X
} from 'lucide-react';
import EventCarpoolModal from './EventCarpoolModal';
import { useCarpoolManager } from './CarpoolManager';
import type { DBEvent } from '@/lib/types';
import type { CarpoolManagerUIProps } from './carpool/types';

const CarpoolManagerUI: React.FC<CarpoolManagerUIProps> = ({
  isOpen,
  onClose,
  event,
  userId,
  showToast,
  isMobile = false,
  onOpenSettings
}) => {
  // Use the service layer hook
  const {
    carpoolGroups,
    loading,
    selectedCarpool,
    persistenceState,
    loadCarpoolGroups,
    createNewCarpool,
    archiveCarpool,
    deleteCarpool,
    openCarpool,
    setSelectedCarpool,
    getSyncStatusIcon,
    getStatusColor,
    getStatusIcon,
    syncPendingChanges
  } = useCarpoolManager(event, userId, showToast);

  // Local UI state
  const [showCarpoolModal, setShowCarpoolModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCarpoolName, setNewCarpoolName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Helper functions
  const handleCreateNewCarpool = async () => {
    await createNewCarpool(newCarpoolName);
    setNewCarpoolName('');
    setShowCreateModal(false);
  };

  const handleOpenCarpool = (group: any) => {
    openCarpool(group);
    setShowCarpoolModal(true);
  };

  const handleDeleteCarpool = async (groupId: string) => {
    await deleteCarpool(groupId);
    setShowDeleteConfirm(null);
  };

  // Render sync status icon with proper component
  const renderSyncStatusIcon = () => {
    const { icon, className, title } = getSyncStatusIcon();
    const iconSize = 16;
    
    switch (icon) {
      case 'WifiOff': return <WifiOff size={iconSize} className={className} title={title} />;
      case 'Sync': return <Sync size={iconSize} className={className} title={title} />;
      case 'RefreshCw': return <RefreshCw size={iconSize} className={className} title={title} />;
      case 'SyncOff': return <SyncOff size={iconSize} className={className} title={title} />;
      default: return <Database size={iconSize} className={className} title={title} />;
    }
  };

  // Render status icon with proper component
  const renderStatusIcon = (status: string) => {
    const iconName = getStatusIcon(status);
    switch (iconName) {
      case 'AlertCircle': return <AlertCircle size={14} />;
      case 'CheckCircle': return <CheckCircle size={14} />;
      case 'Archive': return <Archive size={14} />;
      default: return <Clock size={14} />;
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

  // MOBILE VERSION
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
                {/* Mobile sync status */}
                <div className="flex items-center justify-center gap-2 mt-1">
                  {renderSyncStatusIcon()}
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
              {/* Manual sync button for mobile */}
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
                            {renderStatusIcon(group.status)}
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
                        onClick={() => handleOpenCarpool(group)}
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

        {/* Create Carpool Modal - Mobile */}
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
                  onClick={handleCreateNewCarpool}
                  disabled={!newCarpoolName.trim()}
                  className="flex-1 p-3 bg-blue-500 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal - Mobile */}
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
                  onClick={() => showDeleteConfirm && handleDeleteCarpool(showDeleteConfirm)}
                  className="flex-1 p-3 bg-red-500 text-white rounded-lg font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Carpool Modal */}
        {showCarpoolModal && selectedCarpool && (
          <EventCarpoolModal
            isOpen={showCarpoolModal}
            onClose={() => {
              setShowCarpoolModal(false);
              setSelectedCarpool(null);
              loadCarpoolGroups();
            }}
            event={event}
            userId={userId}
            carpoolGroupId={selectedCarpool.id}
            showToast={showToast}
            isMobile={isMobile}
            onOpenSettings={onOpenSettings}
          />
        )}
      </>
    );
  }

  // DESKTOP VERSION
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
                {/* Desktop sync status dashboard */}
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <div className="flex items-center gap-2">
                    {renderSyncStatusIcon()}
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
                  <X size={20} />
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
                  {/* Desktop sync controls */}
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
                              {renderStatusIcon(group.status)}
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
                          onClick={() => handleOpenCarpool(group)}
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
                onClick={handleCreateNewCarpool}
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
                onClick={() => showDeleteConfirm && handleDeleteCarpool(showDeleteConfirm)}
                className="flex-1 p-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Carpool Modal */}
      {showCarpoolModal && selectedCarpool && (
        <EventCarpoolModal
          isOpen={showCarpoolModal}
          onClose={() => {
            setShowCarpoolModal(false);
            setSelectedCarpool(null);
            loadCarpoolGroups();
          }}
          event={event}
          userId={userId}
          carpoolGroupId={selectedCarpool.id}
          showToast={showToast}
          isMobile={isMobile}
          onOpenSettings={onOpenSettings}
        />
      )}
    </>
  );
};

export default CarpoolManagerUI;
