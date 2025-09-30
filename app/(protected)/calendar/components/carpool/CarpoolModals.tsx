// app/(protected)/calendar/components/carpool/CarpoolModals.tsx

import React from 'react';
import {
  X, Shield, DollarSign, Navigation, Info
} from 'lucide-react';
import type { CarpoolModalsProps } from './types';

const CarpoolModals: React.FC<CarpoolModalsProps> = ({
  showPoll,
  onClosePoll,
  newPollQuestion,
  onPollQuestionChange,
  onCreatePoll,
  showEditCarDetails,
  onCloseEditCarDetails,
  tempCarDetails,
  onTempCarDetailsChange,
  onSaveCarDetails,
  showEditEventDetails,
  onCloseEditEventDetails,
  tempEventDetails,
  onTempEventDetailsChange,
  onSaveEventDetails,
  showNewCarpoolConfirm,
  onCloseNewCarpoolConfirm,
  onStartNewCarpool,
  showInfo,
  onCloseInfo,
  isMobile = false
}) => {
  // Poll Creation Modal
  const PollModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
      <div className={`bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md mx-4 ${
        isMobile ? 'max-w-lg' : ''
      }`}>
        <h3 className="text-lg font-semibold mb-4">Create Poll</h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
          Ask your carpool group a question to help coordinate your trip.
        </p>
        <input
          type="text"
          value={newPollQuestion}
          onChange={(e) => onPollQuestionChange(e.target.value)}
          placeholder="What should we vote on?"
          className="w-full p-3 border dark:border-gray-700 rounded-lg mb-4 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Default options: Yes, No, Maybe (you can customize after creating)
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClosePoll}
            className={`flex-1 p-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors ${
              isMobile ? 'active:scale-98' : ''
            }`}
          >
            Cancel
          </button>
          <button
            onClick={onCreatePoll}
            disabled={!newPollQuestion.trim()}
            className={`flex-1 p-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 ${
              isMobile ? 'active:scale-98' : ''
            }`}
          >
            Create Poll
          </button>
        </div>
      </div>
    </div>
  );

  // Car Details Editing Modal
  const CarDetailsModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
      <div className={`bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md mx-4 ${
        isMobile ? 'max-w-lg' : ''
      }`}>
        <h3 className="text-lg font-semibold mb-4">Edit Car Details</h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
          Help others identify your car and understand capacity.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Car Make/Model
            </label>
            <input
              type="text"
              value={tempCarDetails.make}
              onChange={(e) => onTempCarDetailsChange({ ...tempCarDetails, make: e.target.value })}
              placeholder="e.g. Honda Civic, Toyota Prius"
              className="w-full p-3 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Car Color
            </label>
            <input
              type="text"
              value={tempCarDetails.color}
              onChange={(e) => onTempCarDetailsChange({ ...tempCarDetails, color: e.target.value })}
              placeholder="e.g. Blue, Red, Silver"
              className="w-full p-3 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Available Seats
            </label>
            <select
              value={tempCarDetails.seats}
              onChange={(e) => onTempCarDetailsChange({ ...tempCarDetails, seats: parseInt(e.target.value) })}
              className="w-full p-3 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[1,2,3,4,5,6,7,8].map(num => (
                <option key={num} value={num}>{num} seat{num > 1 ? 's' : ''}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Include yourself in the count
            </p>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => {
              onCloseEditCarDetails();
            }}
            className={`flex-1 p-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors ${
              isMobile ? 'active:scale-98' : ''
            }`}
          >
            Cancel
          </button>
          <button
            onClick={onSaveCarDetails}
            className={`flex-1 p-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors ${
              isMobile ? 'active:scale-98' : ''
            }`}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );

  // Event Details Editing Modal
  const EventDetailsModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
      <div className={`bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md mx-4 ${
        isMobile ? 'max-w-lg' : ''
      }`}>
        <h3 className="text-lg font-semibold mb-4">Edit Carpool Details</h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
          Set meetup location and departure time for your carpool group.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Meetup Location
            </label>
            <input
              type="text"
              value={tempEventDetails.meetupLocation}
              onChange={(e) => onTempEventDetailsChange({ ...tempEventDetails, meetupLocation: e.target.value })}
              placeholder="e.g. Central Park Main Entrance, Starbucks on 5th Ave"
              className="w-full p-3 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Where should everyone meet before heading to the event?
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Departure Time
            </label>
            <input
              type="time"
              value={tempEventDetails.departureTime}
              onChange={(e) => onTempEventDetailsChange({ ...tempEventDetails, departureTime: e.target.value })}
              className="w-full p-3 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              When should the group leave the meetup location?
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Additional Notes
            </label>
            <textarea
              value={tempEventDetails.notes}
              onChange={(e) => onTempEventDetailsChange({ ...tempEventDetails, notes: e.target.value })}
              placeholder="e.g. Look for the blue Honda in parking spot 12, I'll be wearing a red jacket"
              rows={3}
              className="w-full p-3 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Any special instructions for finding the car or driver
            </p>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => {
              onCloseEditEventDetails();
            }}
            className={`flex-1 p-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors ${
              isMobile ? 'active:scale-98' : ''
            }`}
          >
            Cancel
          </button>
          <button
            onClick={onSaveEventDetails}
            className={`flex-1 p-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors ${
              isMobile ? 'active:scale-98' : ''
            }`}
          >
            Save & Share
          </button>
        </div>
      </div>
    </div>
  );

  // New Carpool Confirmation Modal
  const NewCarpoolConfirmModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
      <div className={`bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md mx-4 ${
        isMobile ? 'max-w-lg' : ''
      }`}>
        <h3 className="text-lg font-semibold mb-4">Start New Carpool?</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          This will clear the current chat history and start a fresh carpool group for this event. You can invite different friends and start new coordination.
        </p>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-6">
          <p className="text-yellow-800 dark:text-yellow-200 text-sm">
            <strong>Note:</strong> This action cannot be undone. All current messages and polls will be lost.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCloseNewCarpoolConfirm}
            className={`flex-1 p-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors ${
              isMobile ? 'active:scale-98' : ''
            }`}
          >
            Cancel
          </button>
          <button
            onClick={onStartNewCarpool}
            className={`flex-1 p-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors ${
              isMobile ? 'active:scale-98' : ''
            }`}
          >
            Start New Carpool
          </button>
        </div>
      </div>
    </div>
  );

  // Info Modal
  const InfoModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
      <div className={`bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm mx-4 ${
        isMobile ? 'max-w-md' : ''
      }`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">About Carpool</h3>
          <button
            onClick={onCloseInfo}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={20} />
          </button>
        </div>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Coordinate rides with friends to save money and reduce emissions. Share locations, split costs, and arrive together!
        </p>
        
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3">
            <Shield className="text-green-500 flex-shrink-0" size={16} />
            <span className="text-sm">Safe verified friends only</span>
          </div>
          <div className="flex items-center gap-3">
            <DollarSign className="text-blue-500 flex-shrink-0" size={16} />
            <span className="text-sm">Auto-split gas & parking costs</span>
          </div>
          <div className="flex items-center gap-3">
            <Navigation className="text-purple-500 flex-shrink-0" size={16} />
            <span className="text-sm">Real-time location sharing</span>
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 mb-4">
          <h4 className="font-medium text-green-800 dark:text-green-200 text-sm mb-1">Environmental Impact</h4>
          <p className="text-xs text-green-700 dark:text-green-300">
            Every shared ride helps reduce traffic congestion and carbon emissions. Together, we can make a difference!
          </p>
        </div>

        <button
          onClick={onCloseInfo}
          className={`w-full p-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors ${
            isMobile ? 'active:scale-98' : ''
          }`}
        >
          Got it!
        </button>
      </div>
    </div>
  );

  // Mobile-specific modal adjustments
  if (isMobile) {
    // For mobile, render modals that slide up from bottom
    return (
      <>
        {showPoll && (
          <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-60">
            <div className="bg-white dark:bg-gray-800 rounded-t-2xl p-6 w-full max-w-lg safe-area-bottom animate-slide-up">
              <h3 className="text-lg font-semibold mb-4">Create Poll</h3>
              <input
                type="text"
                value={newPollQuestion}
                onChange={(e) => onPollQuestionChange(e.target.value)}
                placeholder="What should we vote on?"
                className="w-full p-3 border dark:border-gray-700 rounded-lg mb-4 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={onClosePoll}
                  className="flex-1 p-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium active:scale-98"
                >
                  Cancel
                </button>
                <button
                  onClick={onCreatePoll}
                  className="flex-1 p-3 bg-blue-500 text-white rounded-lg font-medium active:scale-98"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {showEditCarDetails && <CarDetailsModal />}
        {showEditEventDetails && <EventDetailsModal />}
        {showNewCarpoolConfirm && <NewCarpoolConfirmModal />}
        
        {showInfo && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 px-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full">
              <h3 className="text-lg font-semibold mb-3">About Carpool</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Coordinate rides with friends to save money and reduce emissions.
              </p>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2">
                  <Shield className="text-green-500" size={16} />
                  <span className="text-xs">Safe verified friends only</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="text-blue-500" size={16} />
                  <span className="text-xs">Auto-split gas & parking</span>
                </div>
                <div className="flex items-center gap-2">
                  <Navigation className="text-purple-500" size={16} />
                  <span className="text-xs">Real-time location sharing</span>
                </div>
              </div>
              <button
                onClick={onCloseInfo}
                className="w-full p-3 bg-blue-500 text-white rounded-lg font-medium active:scale-98"
              >
                Got it!
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop version - render all modals normally
  return (
    <>
      {showPoll && <PollModal />}
      {showEditCarDetails && <CarDetailsModal />}
      {showEditEventDetails && <EventDetailsModal />}
      {showNewCarpoolConfirm && <NewCarpoolConfirmModal />}
      {showInfo && <InfoModal />}
    </>
  );
};

export default CarpoolModals;
