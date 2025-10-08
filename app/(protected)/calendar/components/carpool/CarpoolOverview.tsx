// app/(protected)/calendar/components/carpool/CarpoolOverview.tsx

import React from 'react';
import {
  Car, Users, MapPin, Clock, DollarSign, UserPlus,
  Share2, Activity, Route, Bell, Camera, CloudRain,
  Phone, Sparkles, Navigation, TrendingUp, Settings,
  Edit, Save, RefreshCw, Wifi, WifiOff, Sync, SyncOff,
  Database, AlertCircle, CheckCircle, Crown, MessageCircle
} from 'lucide-react';
import type { CarpoolOverviewProps } from './types';
import { formatEventTime } from './utils';

// Enhanced props interface to include missing functionality
interface EnhancedCarpoolOverviewProps extends CarpoolOverviewProps {
  // Sync status
  persistenceState?: {
    currentCarpoolId: string | null;
    isSaving: boolean;
    lastSaved: Date | null;
    saveError: string | null;
    isOnline: boolean;
    syncStatus: 'synced' | 'pending' | 'error';
  };
  onSaveData?: () => void;
  onSyncPendingChanges?: () => void;
  
  // Profile and friend management
  onOpenProfileSettings?: () => void;
  onOpenFriendInvite?: () => void;
  showToast?: (toast: { type: string; message: string }) => void;
  
  // Enhanced driver status
  tempEventDetails?: {
    meetupLocation: string;
    departureTime: string;
    notes: string;
  };
  
  // Car details management
  onSaveCarDetails?: () => void;
  isEditingCarDetails?: boolean;
  tempCarDetails?: {
    seats: number;
    make: string;
    color: string;
  };
}

const CarpoolOverview: React.FC<EnhancedCarpoolOverviewProps> = ({
  event,
  carpoolStats,
  aiSuggestions,
  onQuickAction,
  driverStatus,
  onSetDriverStatus,
  carDetails,
  onEditCarDetails,
  onEditEventDetails,
  isMobile = false,
  // Enhanced props
  persistenceState,
  onSaveData,
  onSyncPendingChanges,
  onOpenProfileSettings,
  onOpenFriendInvite,
  showToast,
  tempEventDetails,
  onSaveCarDetails,
  isEditingCarDetails,
  tempCarDetails
}) => {
  const { eventTime, eventDateStr } = formatEventTime(event.start_time);

  // Enhanced sync status icon helper
  const getSyncStatusIcon = () => {
    if (!persistenceState?.isOnline) {
      return <WifiOff size={16} className="text-orange-500" title="Offline" />;
    }
    
    switch (persistenceState?.syncStatus) {
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

  // Enhanced driver status display
  const getDriverStatusDisplay = () => {
    switch (driverStatus) {
      case 'driver':
        return {
          text: 'You are driving',
          icon: <Car size={16} className="text-green-600" />,
          bgColor: 'bg-green-100 dark:bg-green-900/30',
          textColor: 'text-green-800 dark:text-green-200'
        };
      case 'rider':
        return {
          text: 'You need a ride',
          icon: <UserPlus size={16} className="text-blue-600" />,
          bgColor: 'bg-blue-100 dark:bg-blue-900/30',
          textColor: 'text-blue-800 dark:text-blue-200'
        };
      default:
        return null;
    }
  };

  // Fixed friend invite handler
  const handleFriendInvite = () => {
    if (onOpenFriendInvite) {
      onOpenFriendInvite();
    } else {
      showToast?.({ 
        type: 'info', 
        message: 'Friend invite feature coming soon!' 
      });
    }
  };

  // Fixed profile settings handler
  const handleProfileSettings = () => {
    if (onOpenProfileSettings) {
      onOpenProfileSettings();
    } else {
      showToast?.({ 
        type: 'info', 
        message: 'Profile settings feature coming soon!' 
      });
    }
  };

  if (isMobile) {
    return (
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950">
        {/* Enhanced Event Header Card with Sync Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg m-4 p-4 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {event.title}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {eventDateStr} • {eventTime} • {event.location || 'Madison Square Garden'}
              </p>
              {/* Enhanced: Mobile sync status */}
              {persistenceState && (
                <div className="flex items-center gap-2 mt-2">
                  {getSyncStatusIcon()}
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {persistenceState.isOnline ? 
                      (persistenceState.syncStatus === 'synced' ? 'Synced' : 
                       persistenceState.syncStatus === 'pending' ? 'Syncing...' : 'Sync Error') 
                      : 'Offline'}
                  </span>
                  {persistenceState.lastSaved && (
                    <span className="text-xs text-gray-400">
                      • {persistenceState.lastSaved.toLocaleTimeString()}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="text-right">
              <p className="text-blue-600 dark:text-blue-400 font-semibold">Carpool Coordination</p>
              <p className="text-blue-500 dark:text-blue-400 text-sm font-medium">
                {carpoolStats.totalFriends} friends invited
              </p>
              {/* Enhanced: Quick access buttons */}
              <div className="flex gap-1 mt-2">
                <button
                  onClick={handleProfileSettings}
                  className="p-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded active:scale-95"
                  title="Profile Settings"
                >
                  <Settings size={14} />
                </button>
                {onSaveData && (
                  <button
                    onClick={onSaveData}
                    disabled={persistenceState?.isSaving}
                    className="p-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded active:scale-95 disabled:opacity-50"
                    title="Save Now"
                  >
                    <Save size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Enhanced: Driver Status Display */}
          {driverStatus !== 'none' && (
            <div className={`p-3 rounded-lg mb-4 ${getDriverStatusDisplay()?.bgColor}`}>
              <div className={`text-sm font-medium flex items-center gap-2 ${getDriverStatusDisplay()?.textColor}`}>
                {getDriverStatusDisplay()?.icon}
                {getDriverStatusDisplay()?.text}
              </div>
              {driverStatus === 'driver' && carDetails && (
                <div className="text-xs mt-1 text-gray-600 dark:text-gray-400">
                  {carDetails.make} {carDetails.color} • {carDetails.seats} seats available
                  <button
                    onClick={onEditCarDetails}
                    className="ml-2 text-blue-600 dark:text-blue-400 underline"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          )}

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

          {/* Enhanced: Quick Driver Status Actions */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={() => onSetDriverStatus('driver')}
              className={`p-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
                driverStatus === 'driver' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <Car size={16} />
              I can drive
            </button>
            <button
              onClick={() => onSetDriverStatus('rider')}
              className={`p-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
                driverStatus === 'rider' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <UserPlus size={16} />
              I need a ride
            </button>
          </div>
        </div>

        {/* Enhanced Quick Actions */}
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onQuickAction('offer-drive')}
              className="p-4 bg-blue-500 text-white rounded-xl font-medium active:scale-95 flex items-center gap-2"
            >
              <Car size={20} />
              <span>Offer to Drive</span>
            </button>
            <button
              onClick={() => onQuickAction('need-ride')}
              className="p-4 bg-green-500 text-white rounded-xl font-medium active:scale-95 flex items-center gap-2"
            >
              <UserPlus size={20} />
              <span>Need a Ride</span>
            </button>
            <button
              onClick={() => onQuickAction('suggest-meetup')}
              className="p-4 bg-purple-500 text-white rounded-xl font-medium active:scale-95 flex items-center gap-2"
            >
              <MapPin size={20} />
              <span>Suggest Meetup</span>
            </button>
            <button
              onClick={() => onQuickAction('running-late')}
              className="p-4 bg-orange-500 text-white rounded-xl font-medium active:scale-95 flex items-center gap-2"
            >
              <Clock size={20} />
              <span>Running Late</span>
            </button>
            <button
              onClick={() => onQuickAction('share-location')}
              className="p-4 bg-blue-600 text-white rounded-xl font-medium active:scale-95 flex items-center gap-2"
            >
              <Share2 size={20} />
              <span>Share Location</span>
            </button>
            <button
              onClick={() => onQuickAction('quick-poll')}
              className="p-4 bg-orange-600 text-white rounded-xl font-medium active:scale-95 flex items-center gap-2"
            >
              <Activity size={20} />
              <span>Quick Poll</span>
            </button>
            {/* FIXED: Friend invite button with proper handler */}
            <button
              onClick={handleFriendInvite}
              className="p-4 bg-pink-500 text-white rounded-xl font-medium active:scale-95 flex items-center gap-2"
            >
              <UserPlus size={20} />
              <span>Invite Friends</span>
            </button>
            {/* FIXED: Profile settings button with proper handler */}
            <button
              onClick={handleProfileSettings}
              className="p-4 bg-gray-500 text-white rounded-xl font-medium active:scale-95 flex items-center gap-2"
            >
              <Settings size={20} />
              <span>Profile Setup</span>
            </button>
          </div>
        </div>

        {/* Enhanced Smart Carpool Features */}
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Smart Carpool Features</h3>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => showToast?.({ type: 'info', message: 'Smart routing coming soon!' })}
              className="p-4 bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl text-left hover:shadow-md transition-all active:scale-95"
            >
              <Route className="text-blue-600 dark:text-blue-400 mb-2" size={24} />
              <h4 className="font-medium text-gray-900 dark:text-white text-sm">Smart Route Planning</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                AI optimizes pickup order and suggests best meetup spots
              </p>
            </button>
            
            <button 
              onClick={() => showToast?.({ type: 'info', message: 'Expense splitting coming soon!' })}
              className="p-4 bg-gradient-to-r from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 rounded-xl text-left hover:shadow-md transition-all active:scale-95"
            >
              <DollarSign className="text-green-600 dark:text-green-400 mb-2" size={24} />
              <h4 className="font-medium text-gray-900 dark:text-white text-sm">Expense Splitting</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Auto-calculate gas costs and split evenly
              </p>
            </button>
            
            <button 
              onClick={() => showToast?.({ type: 'info', message: 'Smart notifications coming soon!' })}
              className="p-4 bg-gradient-to-r from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl text-left hover:shadow-md transition-all active:scale-95"
            >
              <Bell className="text-purple-600 dark:text-purple-400 mb-2" size={24} />
              <h4 className="font-medium text-gray-900 dark:text-white text-sm">Smart Notifications</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Get alerts for departures, delays, and updates
              </p>
            </button>

            <button 
              onClick={() => showToast?.({ type: 'info', message: 'Car photos feature coming soon!' })}
              className="p-4 bg-gradient-to-r from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30 rounded-xl text-left hover:shadow-md transition-all active:scale-95"
            >
              <Camera className="text-orange-600 dark:text-orange-400 mb-2" size={24} />
              <h4 className="font-medium text-gray-900 dark:text-white text-sm">Car Photos</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Share car/license plate photos for easy identification
              </p>
            </button>

            <button 
              onClick={() => showToast?.({ type: 'info', message: 'Weather alerts coming soon!' })}
              className="p-4 bg-gradient-to-r from-blue-100 to-cyan-200 dark:from-blue-900/30 dark:to-cyan-800/30 rounded-xl text-left hover:shadow-md transition-all active:scale-95"
            >
              <CloudRain className="text-blue-600 dark:text-blue-400 mb-2" size={24} />
              <h4 className="font-medium text-gray-900 dark:text-white text-sm">Weather Alerts</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Automatic departure time adjustments for weather
              </p>
            </button>

            <button 
              onClick={() => showToast?.({ type: 'info', message: 'Emergency contacts coming soon!' })}
              className="p-4 bg-gradient-to-r from-red-100 to-pink-200 dark:from-red-900/30 dark:to-pink-800/30 rounded-xl text-left hover:shadow-md transition-all active:scale-95"
            >
              <Phone className="text-red-600 dark:text-red-400 mb-2" size={24} />
              <h4 className="font-medium text-gray-900 dark:text-white text-sm">Emergency Contacts</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Shared emergency contacts within carpool group
              </p>
            </button>
          </div>
        </div>

        {/* Enhanced AI Suggestions */}
        {aiSuggestions && (
          <div className="p-4">
            <div className="bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-xl p-4">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Sparkles className="text-yellow-500" size={16} />
                AI Suggestions
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="text-blue-500 mt-0.5" size={14} />
                  <p className="font-medium text-gray-900 dark:text-white">
                    Best meetup spot: {aiSuggestions.meetupSpot}
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="text-orange-500 mt-0.5" size={14} />
                  <p className="font-medium text-gray-900 dark:text-white">
                    Optimal departure time: {aiSuggestions.departureTime}
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Route className="text-green-500 mt-0.5" size={14} />
                  <p className="font-medium text-gray-900 dark:text-white">
                    Recommended route: {aiSuggestions.route}
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <DollarSign className="text-purple-500 mt-0.5" size={14} />
                  <p className="font-medium text-gray-900 dark:text-white">
                    Parking suggestion: {aiSuggestions.parking}
                  </p>
                </div>
                {/* Enhanced: Apply suggestions button */}
                <button
                  onClick={() => {
                    if (onEditEventDetails) {
                      onEditEventDetails();
                    }
                    showToast?.({ type: 'info', message: 'Edit event details to apply AI suggestions!' });
                  }}
                  className="w-full mt-3 p-2 bg-purple-500 text-white rounded-lg text-sm font-medium active:scale-95"
                >
                  Apply AI Suggestions
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced: Meetup Details Display */}
        {tempEventDetails && (tempEventDetails.meetupLocation || tempEventDetails.departureTime) && (
          <div className="p-4">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
              <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2 flex items-center gap-2">
                <MapPin size={16} />
                Carpool Details
              </h4>
              {tempEventDetails.meetupLocation && (
                <p className="text-green-700 dark:text-green-300 text-sm mb-1">
                  📍 Meetup: {tempEventDetails.meetupLocation}
                </p>
              )}
              {tempEventDetails.departureTime && (
                <p className="text-green-700 dark:text-green-300 text-sm mb-1">
                  🕐 Departure: {tempEventDetails.departureTime}
                </p>
              )}
              {tempEventDetails.notes && (
                <p className="text-green-700 dark:text-green-300 text-sm">
                  📝 Notes: {tempEventDetails.notes}
                </p>
              )}
              <button
                onClick={onEditEventDetails}
                className="mt-2 px-3 py-1 bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 rounded text-sm hover:bg-green-300 dark:hover:bg-green-700 transition-colors flex items-center gap-1"
              >
                <Edit size={12} />
                Edit Details
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Enhanced Desktop version
  return (
    <div className="space-y-6">
      {/* Enhanced Event Info Banner with Sync Status */}
      <div className="bg-blue-50 dark:bg-gray-800 rounded-xl p-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {event.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {eventDateStr} • {eventTime} • {event.location || 'TBD'}
            </p>
            {/* Enhanced: Desktop sync status */}
            {persistenceState && (
              <div className="flex items-center gap-4 mt-2 text-sm">
                <div className="flex items-center gap-2">
                  {getSyncStatusIcon()}
                  <span className="text-gray-600 dark:text-gray-400">
                    {persistenceState.isOnline ? 
                      (persistenceState.syncStatus === 'synced' ? 'All data synced' : 
                       persistenceState.syncStatus === 'pending' ? 'Syncing changes...' : 'Sync error') 
                      : 'Offline mode active'}
                  </span>
                </div>
                {persistenceState.lastSaved && (
                  <div className="flex items-center gap-1">
                    <Save size={12} />
                    <span className="text-gray-500 dark:text-gray-500">
                      Last saved: {persistenceState.lastSaved.toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-blue-600 dark:text-blue-400 font-semibold">Carpool Active</p>
            <p className="text-blue-500 dark:text-blue-400 text-sm">
              {carpoolStats.totalFriends} friends invited
            </p>
            {/* Enhanced: Quick action buttons */}
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleProfileSettings}
                className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-sm hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors flex items-center gap-1"
              >
                <Settings size={12} />
                Profile
              </button>
              <button
                onClick={handleFriendInvite}
                className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded text-sm hover:bg-green-200 dark:hover:bg-green-800/50 transition-colors flex items-center gap-1"
              >
                <UserPlus size={12} />
                Invite Friends
              </button>
              {onSaveData && (
                <button
                  onClick={onSaveData}
                  disabled={persistenceState?.isSaving}
                  className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  <Save size={12} />
                  Save
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center">
          <div className="bg-blue-100 dark:bg-blue-900/30 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
            <Users className="text-blue-600 dark:text-blue-400" size={24} />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{carpoolStats.needingRides}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Need Rides</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center">
          <div className="bg-green-100 dark:bg-green-900/30 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
            <Car className="text-green-600 dark:text-green-400" size={24} />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{carpoolStats.driversAvailable}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Drivers Available</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center">
          <div className="bg-purple-100 dark:bg-purple-900/30 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
            <DollarSign className="text-purple-600 dark:text-purple-400" size={24} />
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{carpoolStats.estimatedSavings}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Est. Savings/Person</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center">
          <div className="bg-orange-100 dark:bg-orange-900/30 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
            <TrendingUp className="text-orange-600 dark:text-orange-400" size={24} />
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">-4.2 kg</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">CO₂ Saved</p>
        </div>
      </div>

      {/* Enhanced Driver Status Management */}
      {driverStatus !== 'none' && (
        <div className={`rounded-xl p-4 ${getDriverStatusDisplay()?.bgColor}`}>
          <h4 className={`font-semibold mb-2 flex items-center gap-2 ${getDriverStatusDisplay()?.textColor}`}>
            {getDriverStatusDisplay()?.icon}
            {getDriverStatusDisplay()?.text}
          </h4>
          {driverStatus === 'driver' && carDetails && (
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <p className="mb-2">
                {carDetails.make} {carDetails.color} • {carDetails.seats} seats available
              </p>
              <button
                onClick={onEditCarDetails}
                className="px-3 py-1 bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 rounded text-sm hover:bg-green-300 dark:hover:bg-green-700 transition-colors flex items-center gap-1"
              >
                <Edit size={12} />
                Edit Car Details
              </button>
            </div>
          )}
        </div>
      )}

      {/* Enhanced Quick Actions Grid */}
      <div>
        <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h4>
        <div className="grid grid-cols-4 gap-3">
          <button
            onClick={() => onQuickAction('offer-drive')}
            className="p-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium flex items-center gap-2"
          >
            <Car size={18} />
            Offer to Drive
          </button>
          <button
            onClick={() => onQuickAction('need-ride')}
            className="p-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium flex items-center gap-2"
          >
            <UserPlus size={18} />
            Need a Ride
          </button>
          <button
            onClick={() => onQuickAction('suggest-meetup')}
            className="p-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium flex items-center gap-2"
          >
            <MapPin size={18} />
            Suggest Meetup
          </button>
          <button
            onClick={() => onQuickAction('running-late')}
            className="p-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium flex items-center gap-2"
          >
            <Clock size={18} />
            Running Late
          </button>
          <button
            onClick={() => onQuickAction('share-location')}
            className="p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
          >
            <Share2 size={18} />
            Share Location
          </button>
          <button
            onClick={() => onQuickAction('quick-poll')}
            className="p-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium flex items-center gap-2"
          >
            <Activity size={18} />
            Quick Poll
          </button>
          {/* FIXED: Friend invite button */}
          <button
            onClick={handleFriendInvite}
            className="p-4 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors font-medium flex items-center gap-2"
          >
            <UserPlus size={18} />
            Invite Friends
          </button>
          {/* FIXED: Profile settings button */}
          <button
            onClick={handleProfileSettings}
            className="p-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium flex items-center gap-2"
          >
            <Settings size={18} />
            Profile Setup
          </button>
        </div>
      </div>

      {/* Enhanced AI Suggestions with Apply Button */}
      {aiSuggestions && (
        <div className="bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-xl p-6">
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="text-yellow-500" size={20} />
            AI Suggestions
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div className="flex items-start gap-2">
              <MapPin className="text-blue-500 mt-0.5" size={16} />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Best meetup spot:</p>
                <p className="text-gray-600 dark:text-gray-400">{aiSuggestions.meetupSpot}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="text-orange-500 mt-0.5" size={16} />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Optimal departure time:</p>
                <p className="text-gray-600 dark:text-gray-400">{aiSuggestions.departureTime}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Route className="text-green-500 mt-0.5" size={16} />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Recommended route:</p>
                <p className="text-gray-600 dark:text-gray-400">{aiSuggestions.route}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <DollarSign className="text-purple-500 mt-0.5" size={16} />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Parking suggestion:</p>
                <p className="text-gray-600 dark:text-gray-400">{aiSuggestions.parking}</p>
              </div>
            </div>
          </div>
          {/* Enhanced: Apply suggestions button */}
          <button
            onClick={() => {
              if (onEditEventDetails) {
                onEditEventDetails();
              }
              showToast?.({ type: 'info', message: 'Edit event details to apply AI suggestions!' });
            }}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 transition-colors flex items-center gap-2"
          >
            <Sparkles size={16} />
            Apply AI Suggestions
          </button>
        </div>
      )}

      {/* Enhanced: Carpool Details Display */}
      {tempEventDetails && (tempEventDetails.meetupLocation || tempEventDetails.departureTime) && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
          <h4 className="font-semibold text-green-800 dark:text-green-200 mb-3 flex items-center gap-2">
            <MapPin size={16} />
            Current Carpool Plans
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {tempEventDetails.meetupLocation && (
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">Meetup Location:</p>
                <p className="text-green-700 dark:text-green-300">{tempEventDetails.meetupLocation}</p>
              </div>
            )}
            {tempEventDetails.departureTime && (
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">Departure Time:</p>
                <p className="text-green-700 dark:text-green-300">{tempEventDetails.departureTime}</p>
              </div>
            )}
          </div>
          {tempEventDetails.notes && (
            <div className="mt-3">
              <p className="font-medium text-green-800 dark:text-green-200">Notes:</p>
              <p className="text-green-700 dark:text-green-300">{tempEventDetails.notes}</p>
            </div>
          )}
          <button
            onClick={onEditEventDetails}
            className="mt-3 px-3 py-1 bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 rounded text-sm hover:bg-green-300 dark:hover:bg-green-700 transition-colors flex items-center gap-1"
          >
            <Edit size={12} />
            Edit Carpool Details
          </button>
        </div>
      )}
    </div>
  );
};

export default CarpoolOverview;
