// app/(protected)/calendar/components/carpool/CarpoolSidebars.tsx

import React from 'react';
import {
  Car, Users, Plus, UserPlus, MapPin, Clock, Share2, Activity,
  Route, DollarSign, Bell, Camera, CloudRain, Phone, CheckCircle
} from 'lucide-react';
import type { CarpoolSidebarsProps } from './types';

const CarpoolSidebars: React.FC<CarpoolSidebarsProps> = ({
  selectedFriends,
  onFriendToggle,
  carpoolData,
  event,
  onShowPoll,
  onShowEditCarDetails,
  onShowEditEventDetails,
  onQuickAction,
  showToast,
  isMobile = false
}) => {
  // Don't render sidebars on mobile - they're handled differently
  if (isMobile) {
    return null;
  }

  return (
    <>
      {/* Left Sidebar - Quick Actions & Features */}
      <div className="w-80 bg-gray-50 dark:bg-gray-800 p-6 border-r dark:border-gray-700">
        {/* Quick Actions */}
        <div className="space-y-3 mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onQuickAction('offer-drive')}
              className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <Car size={16} />
              Offer to Drive
            </button>
            <button
              onClick={() => onQuickAction('need-ride')}
              className="p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <UserPlus size={16} />
              Need a Ride
            </button>
            <button
              onClick={() => onQuickAction('suggest-meetup')}
              className="p-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <MapPin size={16} />
              Suggest Meetup
            </button>
            <button
              onClick={() => onQuickAction('running-late')}
              className="p-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <Clock size={16} />
              Running Late
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onQuickAction('share-location')}
              className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <Share2 size={16} />
              Share Location
            </button>
            <button
              onClick={() => onQuickAction('quick-poll')}
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
            <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-700 rounded-lg hover:shadow-md transition-shadow cursor-pointer">
              <Route className="text-blue-500 mt-0.5" size={16} />
              <div>
                <p className="text-sm font-medium">Smart Route Planning</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">AI optimizes pickup order and suggests best meetup spots</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-700 rounded-lg hover:shadow-md transition-shadow cursor-pointer">
              <DollarSign className="text-green-500 mt-0.5" size={16} />
              <div>
                <p className="text-sm font-medium">Expense Splitting</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Auto-calculate gas costs and split evenly</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-700 rounded-lg hover:shadow-md transition-shadow cursor-pointer">
              <Bell className="text-purple-500 mt-0.5" size={16} />
              <div>
                <p className="text-sm font-medium">Smart Notifications</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Get alerts for departures, delays, and updates</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-700 rounded-lg hover:shadow-md transition-shadow cursor-pointer">
              <Camera className="text-orange-500 mt-0.5" size={16} />
              <div>
                <p className="text-sm font-medium">Car Photos</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Share car/license plate photos for easy identification</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-700 rounded-lg hover:shadow-md transition-shadow cursor-pointer">
              <CloudRain className="text-blue-500 mt-0.5" size={16} />
              <div>
                <p className="text-sm font-medium">Weather Alerts</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Automatic departure time adjustments for weather</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-700 rounded-lg hover:shadow-md transition-shadow cursor-pointer">
              <Phone className="text-red-500 mt-0.5" size={16} />
              <div>
                <p className="text-sm font-medium">Emergency Contacts</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Shared emergency contacts within carpool group</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Access Buttons */}
        <div className="space-y-2">
          <button
            onClick={onShowPoll}
            className="w-full px-3 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg text-sm font-medium hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors flex items-center gap-2"
          >
            <Activity size={16} />
            Create Poll
          </button>
          <button
            onClick={onShowEditCarDetails}
            className="w-full px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-2"
          >
            <Car size={16} />
            Edit Car Details
          </button>
          <button
            onClick={onShowEditEventDetails}
            className="w-full px-3 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg text-sm font-medium hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors flex items-center gap-2"
          >
            <MapPin size={16} />
            Edit Meetup Details
          </button>
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
                      onFriendToggle(friend.friend_id);
                    } else {
                      onFriendToggle(friend.friend_id);
                    }
                  }}
                  className="rounded text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                      {friend.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900 dark:text-white">{friend.name}</p>
                      <div className="flex items-center gap-1">
                        {friend.safe_to_carpool && (
                          <CheckCircle size={12} className="text-green-500" />
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {friend.safe_to_carpool ? 'Verified for carpooling' : 'Not verified'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Friend status indicators */}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {friend.has_car && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs">
                        <Car size={10} />
                        Has car
                      </span>
                    )}
                    {friend.needs_ride && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs">
                        <UserPlus size={10} />
                        Needs ride
                      </span>
                    )}
                    {friend.distance && (
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-xs">
                        {friend.distance} miles away
                      </span>
                    )}
                  </div>
                </div>
              </label>
            ))}
            
            {selectedFriends.length > 0 && (
              <div className="pt-4 border-t dark:border-gray-600">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-3">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                    {selectedFriends.length} friend{selectedFriends.length > 1 ? 's' : ''} selected
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    They'll receive an invitation to join your carpool group
                  </p>
                </div>
                
                <button
                  onClick={() => {
                    if (carpoolData.createCarpoolGroup) {
                      carpoolData.createCarpoolGroup(event.id, selectedFriends, "Let's carpool together!");
                      showToast?.({ type: 'success', message: `Invitations sent to ${selectedFriends.length} friend${selectedFriends.length > 1 ? 's' : ''}!` });
                    }
                  }}
                  className="w-full p-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  Send Invites ({selectedFriends.length})
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="mx-auto mb-3 text-gray-300" size={48} />
            <p className="text-gray-500 dark:text-gray-400 mb-4">No friends available</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
              Add friends to your network to start carpooling together
            </p>
            <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm">
              <Plus className="inline mr-1" size={14} />
              Invite Friends
            </button>
          </div>
        )}

        {/* Carpool Safety Tips */}
        <div className="mt-6 pt-6 border-t dark:border-gray-600">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3 text-sm">Safety Tips</h4>
          <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-start gap-2">
              <CheckCircle size={12} className="text-green-500 mt-0.5 flex-shrink-0" />
              <span>Only carpool with verified friends</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle size={12} className="text-green-500 mt-0.5 flex-shrink-0" />
              <span>Share trip details with someone you trust</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle size={12} className="text-green-500 mt-0.5 flex-shrink-0" />
              <span>Meet in well-lit public places</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle size={12} className="text-green-500 mt-0.5 flex-shrink-0" />
              <span>Keep emergency contacts updated</span>
            </div>
          </div>
        </div>

        {/* Environmental Impact */}
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <h4 className="font-medium text-green-800 dark:text-green-200 text-sm mb-1">🌱 Environmental Impact</h4>
          <p className="text-xs text-green-700 dark:text-green-300">
            Carpooling to this event will save approximately <strong>4.2 kg of CO₂</strong> and reduce traffic congestion.
          </p>
        </div>
      </div>
    </>
  );
};

export default CarpoolSidebars;
