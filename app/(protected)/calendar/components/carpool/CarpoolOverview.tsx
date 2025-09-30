// app/(protected)/calendar/components/carpool/CarpoolOverview.tsx

import React from 'react';
import {
  Car, Users, MapPin, Clock, DollarSign, UserPlus,
  Share2, Activity, Route, Bell, Camera, CloudRain,
  Phone, Sparkles, Navigation, TrendingUp
} from 'lucide-react';
import type { CarpoolOverviewProps } from './types';
import { formatEventTime } from './utils';

const CarpoolOverview: React.FC<CarpoolOverviewProps> = ({
  event,
  carpoolStats,
  aiSuggestions,
  onQuickAction,
  driverStatus,
  onSetDriverStatus,
  carDetails,
  onEditCarDetails,
  onEditEventDetails,
  isMobile = false
}) => {
  const { eventTime, eventDateStr } = formatEventTime(event.start_time);

  if (isMobile) {
    return (
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
          </div>
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
    );
  }

  // Desktop version
  return (
    <div className="space-y-6">
      {/* Event Info Banner */}
      <div className="bg-blue-50 dark:bg-gray-800 rounded-xl p-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {event.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {eventDateStr} • {eventTime} • {event.location || 'TBD'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-blue-600 dark:text-blue-400 font-semibold">Carpool Active</p>
            <p className="text-blue-500 dark:text-blue-400 text-sm">
              {carpoolStats.totalFriends} friends invited
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
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

      {/* Quick Actions Grid */}
      <div>
        <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h4>
        <div className="grid grid-cols-3 gap-3">
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
        </div>
      </div>

      {/* Car Details & Edit Buttons */}
      {driverStatus === 'driver' && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
          <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">Your Car Details</h4>
          <p className="text-green-700 dark:text-green-300">
            {carDetails.make} {carDetails.color} • {carDetails.seats} seats available
          </p>
          <button
            onClick={onEditCarDetails}
            className="mt-2 px-3 py-1 bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 rounded text-sm hover:bg-green-300 dark:hover:bg-green-700 transition-colors"
          >
            Edit Car Details
          </button>
        </div>
      )}

      {/* AI Suggestions */}
      {aiSuggestions && (
        <div className="bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-xl p-6">
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="text-yellow-500" size={20} />
            AI Suggestions
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
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
        </div>
      )}
    </div>
  );
};

export default CarpoolOverview;
