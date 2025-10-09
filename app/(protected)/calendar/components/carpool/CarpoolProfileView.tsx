// app/(protected)/calendar/components/carpool/CarpoolProfileView.tsx

import React, { useState, useEffect } from 'react';
import {
  User, Car, MapPin, Shield, Star, Award, Phone, Music,
  Coffee, Cigarette, PawPrint, Clock, DollarSign, Users,
  CheckCircle, XCircle, AlertCircle, MessageCircle, X,
  ChevronRight, Navigation, Calendar, Heart, Sparkles,
  EyeOff, UserPlus
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

interface CarpoolProfileViewProps {
  userId: string;
  viewerId: string; // The person viewing the profile
  isOpen: boolean;
  onClose: () => void;
  onInviteToCarpool?: (userId: string) => void;
  onSendMessage?: (userId: string) => void;
  isMobile?: boolean;
}

interface PublicCarpoolProfile {
  // Public info
  display_name: string;
  profile_picture_url?: string;
  car_picture_url?: string;
  bio?: string;
  driving_style: string;
  fun_fact?: string;
  favorite_road_trip_snack?: string;
  
  // Car info (always public for carpools)
  car_make: string;
  car_model: string;
  car_color: string;
  car_year?: number;
  available_seats: number;
  
  // Location (based on privacy settings)
  location_display?: string;
  preferred_pickup_locations?: string[];
  max_detour_minutes: number;
  carpool_radius_miles: number;
  
  // Preferences (public)
  advance_notice_hours: number;
  split_gas_costs: boolean;
  split_parking_costs: boolean;
  allow_smoking: boolean;
  allow_pets: boolean;
  allow_food_drinks: boolean;
  music_preferences: string;
  
  // Verification status (public)
  drivers_license_verified: boolean;
  insurance_verified: boolean;
  background_check_completed: boolean;
  
  // Stats (public)
  safe_driver_rating?: number;
  total_trips_completed: number;
  member_since?: string;
  
  // Contact (only if friends or in same carpool)
  phone_number?: string;
  can_contact: boolean;
}

const CarpoolProfileView: React.FC<CarpoolProfileViewProps> = ({
  userId,
  viewerId,
  isOpen,
  onClose,
  onInviteToCarpool,
  onSendMessage,
  isMobile = false
}) => {
  const [profile, setProfile] = useState<PublicCarpoolProfile | null>(null);
  const [fullProfile, setFullProfile] = useState<any>(null); // Store full profile for map data
  const [loading, setLoading] = useState(true);
  const [isFriend, setIsFriend] = useState(false);
  const [inSameCarpool, setInSameCarpool] = useState(false);
  const [viewerLocation, setViewerLocation] = useState<{lat: number; lng: number} | null>(null);

  // Helper function to calculate distance between two coordinates
  const calculateDistance = (point1: {lat: number; lng: number}, point2: {lat: number; lng: number}): string => {
    const R = 3959; // Earth's radius in miles
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance.toFixed(1);
  };

  useEffect(() => {
    if (isOpen && userId) {
      loadProfile();
      loadViewerLocation();
    }
  }, [isOpen, userId]);

  const loadViewerLocation = async () => {
    try {
      // Load viewer's profile to get their location for distance calculation
      const { data: viewerProfile } = await supabase
        .from('carpool_profiles')
        .select('home_latitude, home_longitude')
        .eq('user_id', viewerId)
        .single();

      if (viewerProfile?.home_latitude && viewerProfile?.home_longitude) {
        setViewerLocation({
          lat: viewerProfile.home_latitude,
          lng: viewerProfile.home_longitude
        });
      }
    } catch (error) {
      console.error('Error loading viewer location:', error);
    }
  };

  const loadProfile = async () => {
    try {
      setLoading(true);
      
      // Load the full profile from database
      const { data: profileData, error } = await supabase
        .from('carpool_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !profileData) {
        console.error('Profile not found');
        return;
      }

      // Store full profile for map data access
      setFullProfile(profileData);

      // Check if viewer and profile owner are friends
      const { data: friendData } = await supabase
        .from('friendships')
        .select('*')
        .or(`user_id.eq.${viewerId},friend_id.eq.${viewerId}`)
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
        .single();
      
      const areFriends = !!friendData;
      setIsFriend(areFriends);

      // Check if in same carpool
      const { data: carpoolData } = await supabase
        .from('carpool_participants')
        .select('group_id')
        .eq('user_id', viewerId);

      const viewerGroups = carpoolData?.map(c => c.group_id) || [];
      
      const { data: targetCarpoolData } = await supabase
        .from('carpool_participants')
        .select('group_id')
        .eq('user_id', userId)
        .in('group_id', viewerGroups);

      const inCarpool = (targetCarpoolData?.length || 0) > 0;
      setInSameCarpool(inCarpool);

      // Build public profile based on privacy settings
      const publicProfile: PublicCarpoolProfile = {
        display_name: profileData.display_name || 'Anonymous',
        profile_picture_url: profileData.profile_picture_url,
        car_picture_url: profileData.car_picture_url,
        bio: profileData.bio,
        driving_style: profileData.driving_style,
        fun_fact: profileData.fun_fact,
        favorite_road_trip_snack: profileData.favorite_road_trip_snack,
        
        // Car details are always visible for carpool participants
        car_make: profileData.car_make,
        car_model: profileData.car_model,
        car_color: profileData.car_color,
        car_year: profileData.car_year,
        available_seats: profileData.available_seats,
        
        // Location based on privacy settings
        location_display: getLocationDisplay(profileData, areFriends || inCarpool),
        preferred_pickup_locations: profileData.preferred_pickup_locations,
        max_detour_minutes: profileData.max_detour_minutes,
        carpool_radius_miles: profileData.carpool_radius_miles,
        
        // Preferences
        advance_notice_hours: profileData.advance_notice_hours,
        split_gas_costs: profileData.split_gas_costs,
        split_parking_costs: profileData.split_parking_costs,
        allow_smoking: profileData.allow_smoking,
        allow_pets: profileData.allow_pets,
        allow_food_drinks: profileData.allow_food_drinks,
        music_preferences: profileData.music_preferences,
        
        // Verification
        drivers_license_verified: profileData.drivers_license_verified,
        insurance_verified: profileData.insurance_verified,
        background_check_completed: profileData.background_check_completed,
        
        // Stats
        safe_driver_rating: profileData.safe_driver_rating,
        total_trips_completed: profileData.total_trips_completed,
        member_since: profileData.created_at,
        
        // Contact info only for friends or carpool members
        phone_number: (areFriends || inCarpool) ? profileData.phone_number : undefined,
        can_contact: areFriends || inCarpool
      };

      setProfile(publicProfile);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLocationDisplay = (fullProfile: any, hasAccess: boolean): string => {
    if (!fullProfile.home_city) return 'Location not set';
    
    switch (fullProfile.location_privacy) {
      case 'full':
        return hasAccess 
          ? `${fullProfile.home_address}, ${fullProfile.home_city}, ${fullProfile.home_state}`
          : `${fullProfile.home_city}, ${fullProfile.home_state}`;
      case 'street':
        return hasAccess
          ? `Near ${fullProfile.home_address?.split(' ').slice(1).join(' ')}, ${fullProfile.home_city}`
          : `${fullProfile.home_city}, ${fullProfile.home_state}`;
      case 'area':
        return `Near ${fullProfile.home_city}, ${fullProfile.home_state}`;
      case 'city':
        return `${fullProfile.home_city}, ${fullProfile.home_state}`;
      case 'hidden':
        return hasAccess ? `${fullProfile.home_city}, ${fullProfile.home_state}` : 'Location private';
      default:
        return 'Location not set';
    }
  };

  const getVerificationCount = () => {
    if (!profile) return 0;
    let count = 0;
    if (profile.drivers_license_verified) count++;
    if (profile.insurance_verified) count++;
    if (profile.background_check_completed) count++;
    return count;
  };

  const getDrivingStyleEmoji = (style: string) => {
    switch (style) {
      case 'chill': return '😎';
      case 'efficient': return '⚡';
      case 'adventurous': return '🎢';
      case 'cautious': return '🛡️';
      default: return '🚗';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`bg-white dark:bg-gray-900 rounded-2xl shadow-2xl ${
        isMobile ? 'w-full max-w-lg' : 'w-full max-w-2xl'
      } max-h-[90vh] overflow-hidden`}>
        
        {/* Header with gradient background */}
        <div className="relative bg-gradient-to-r from-green-500 to-blue-600 p-6 pb-20">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2 rounded-full hover:bg-white/20 transition-all"
          >
            <X size={24} />
          </button>
          
          {/* Profile picture and basic info */}
          <div className="flex items-end gap-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-white p-1">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center overflow-hidden">
                  {profile?.profile_picture_url ? (
                    <img 
                      src={profile.profile_picture_url} 
                      alt={profile.display_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={40} className="text-white" />
                  )}
                </div>
              </div>
              {/* Verification badge */}
              {profile && getVerificationCount() > 0 && (
                <div className="absolute -bottom-2 -right-2 bg-green-500 text-white text-xs font-bold rounded-full w-8 h-8 flex items-center justify-center border-2 border-white">
                  ✓{getVerificationCount()}
                </div>
              )}
            </div>
            
            <div className="flex-1 text-white">
              <h2 className="text-2xl font-bold">{profile?.display_name || 'Loading...'}</h2>
              <div className="flex items-center gap-4 text-white/90 text-sm mt-1">
                <span className="flex items-center gap-1">
                  <Car size={14} />
                  {profile?.car_make} {profile?.car_model}
                </span>
                <span className="flex items-center gap-1">
                  <Users size={14} />
                  {profile?.available_seats} seats
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="bg-white dark:bg-gray-800 -mt-12 mx-6 rounded-xl shadow-lg p-4 relative z-10">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {profile?.total_trips_completed || 0}
              </div>
              <div className="text-xs text-gray-500">Trips</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-500">
                {profile?.safe_driver_rating ? '⭐'.repeat(Math.round(profile.safe_driver_rating)) : '—'}
              </div>
              <div className="text-xs text-gray-500">Rating</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {profile?.carpool_radius_miles || 0}mi
              </div>
              <div className="text-xs text-gray-500">Radius</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-300px)]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : profile ? (
            <div className="space-y-6">
              {/* Bio and personality */}
              {profile.bio && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">About</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">{profile.bio}</p>
                </div>
              )}

              {/* Fun facts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                  <div className="text-sm font-medium text-purple-800 dark:text-purple-200">
                    Driving Style {getDrivingStyleEmoji(profile.driving_style)}
                  </div>
                  <div className="text-xs text-purple-600 dark:text-purple-300 capitalize">
                    {profile.driving_style.replace('_', ' ')}
                  </div>
                </div>
                {profile.favorite_road_trip_snack && (
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
                    <div className="text-sm font-medium text-orange-800 dark:text-orange-200">
                      Favorite Snack 🍿
                    </div>
                    <div className="text-xs text-orange-600 dark:text-orange-300">
                      {profile.favorite_road_trip_snack}
                    </div>
                  </div>
                )}
              </div>

              {/* Car details */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Car size={18} />
                  Vehicle Details
                </h3>
                {profile.car_picture_url && (
                  <img 
                    src={profile.car_picture_url} 
                    alt="Car"
                    className="w-full h-32 object-cover rounded-lg mb-3"
                  />
                )}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Vehicle:</span>
                      <span className="ml-2 font-medium">{profile.car_year} {profile.car_make} {profile.car_model}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Color:</span>
                      <span className="ml-2 font-medium">{profile.car_color}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Location & availability with MAP */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <MapPin size={18} />
                  Location & Availability
                </h3>
                
                {/* Map display based on privacy settings */}
                <div className="mb-3 rounded-lg overflow-hidden border dark:border-gray-700">
                  <div className="bg-gray-100 dark:bg-gray-800 p-2 text-xs text-gray-600 dark:text-gray-400 flex items-center justify-between">
                    <span>
                      Privacy: <strong className="text-gray-900 dark:text-white">{fullProfile?.location_privacy || 'area'}</strong>
                    </span>
                    {fullProfile?.location_privacy === 'full' && (
                      <span className="text-green-600 font-medium">📍 Exact location shown</span>
                    )}
                    {fullProfile?.location_privacy === 'street' && (
                      <span className="text-blue-600 font-medium">🏘️ Street level shown</span>
                    )}
                    {fullProfile?.location_privacy === 'area' && (
                      <span className="text-orange-600 font-medium">📌 General area shown (~500m)</span>
                    )}
                    {fullProfile?.location_privacy === 'city' && (
                      <span className="text-purple-600 font-medium">🏙️ City only shown (~2km)</span>
                    )}
                    {fullProfile?.location_privacy === 'hidden' && (
                      <span className="text-gray-600 font-medium">🔒 Location hidden</span>
                    )}
                  </div>
                  
                  {/* Map Container */}
                  {fullProfile?.location_privacy !== 'hidden' && fullProfile?.home_latitude && fullProfile?.home_longitude ? (
                    <div className="h-48 bg-gray-200 dark:bg-gray-700 relative">
                      {/* This would be your actual map component */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <MapPin size={32} className="mx-auto mb-2 text-gray-400" />
                          <p className="text-sm text-gray-600 dark:text-gray-400">Map View</p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            {profile.location_display}
                          </p>
                          {/* In production, replace with actual map showing:
                              - Exact pin if privacy = 'full'
                              - Street-level circle if privacy = 'street' (~100m radius)
                              - Area circle if privacy = 'area' (~500m radius)
                              - City circle if privacy = 'city' (~2km radius)
                          */}
                        </div>
                      </div>
                      
                      {/* Distance indicator */}
                      {viewerLocation && (
                        <div className="absolute bottom-2 left-2 bg-white dark:bg-gray-800 rounded-lg px-2 py-1 text-xs font-medium shadow-lg">
                          ~{calculateDistance(viewerLocation, {lat: fullProfile.home_latitude, lng: fullProfile.home_longitude})} miles away
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-48 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <div className="text-center">
                        <EyeOff size={32} className="mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-500">Location not shared</p>
                        <p className="text-xs text-gray-400 mt-1">User has chosen to keep location private</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Pickup locations if shared */}
                {profile.preferred_pickup_locations && profile.preferred_pickup_locations.length > 0 && (
                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Preferred Pickup Spots
                    </h4>
                    <div className="space-y-1">
                      {profile.preferred_pickup_locations.map((location, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <ChevronRight size={12} />
                          <span>{location}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Navigation size={14} className="text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">
                      <strong>Shows as:</strong> {profile.location_display}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">
                      {profile.advance_notice_hours} hours advance notice needed
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">
                      Willing to detour up to {profile.max_detour_minutes} minutes
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Car size={14} className="text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">
                      Carpools within {profile.carpool_radius_miles} miles
                    </span>
                  </div>
                </div>

                {/* Privacy notice */}
                {fullProfile?.location_privacy === 'full' && (
                  <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-blue-700 dark:text-blue-300">
                    <strong>Note:</strong> This user has chosen to share their exact address for easier coordination. Please respect their privacy.
                  </div>
                )}
              </div>

              {/* Preferences */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Carpool Preferences</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    {profile.split_gas_costs ? 
                      <CheckCircle size={16} className="text-green-500" /> : 
                      <XCircle size={16} className="text-red-500" />
                    }
                    <span>Split gas costs</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {profile.split_parking_costs ? 
                      <CheckCircle size={16} className="text-green-500" /> : 
                      <XCircle size={16} className="text-red-500" />
                    }
                    <span>Split parking</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Cigarette size={16} className={profile.allow_smoking ? 'text-orange-500' : 'text-gray-300'} />
                    <span>{profile.allow_smoking ? 'Smoking OK' : 'No smoking'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <PawPrint size={16} className={profile.allow_pets ? 'text-brown-500' : 'text-gray-300'} />
                    <span>{profile.allow_pets ? 'Pets OK' : 'No pets'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Coffee size={16} className={profile.allow_food_drinks ? 'text-brown-600' : 'text-gray-300'} />
                    <span>{profile.allow_food_drinks ? 'Food/drinks OK' : 'No food/drinks'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Music size={16} className="text-purple-500" />
                    <span>{profile.music_preferences}</span>
                  </div>
                </div>
              </div>

              {/* Verification badges */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Shield size={18} />
                  Verification
                </h3>
                <div className="space-y-2">
                  {[
                    { verified: profile.drivers_license_verified, label: "Driver's License", icon: '🪪' },
                    { verified: profile.insurance_verified, label: 'Auto Insurance', icon: '📋' },
                    { verified: profile.background_check_completed, label: 'Background Check', icon: '✅' }
                  ].map((item, index) => (
                    <div 
                      key={index}
                      className={`flex items-center justify-between p-2 rounded-lg ${
                        item.verified 
                          ? 'bg-green-50 dark:bg-green-900/20' 
                          : 'bg-gray-50 dark:bg-gray-800'
                      }`}
                    >
                      <span className="text-sm flex items-center gap-2">
                        {item.icon} {item.label}
                      </span>
                      {item.verified && (
                        <span className="text-green-600 text-xs font-medium">Verified</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact info (only if allowed) */}
              {profile.can_contact && profile.phone_number && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Phone size={16} className="text-blue-600" />
                      <span className="text-sm font-medium">Contact</span>
                    </div>
                    <a 
                      href={`tel:${profile.phone_number}`}
                      className="text-blue-600 text-sm font-medium hover:underline"
                    >
                      {profile.phone_number}
                    </a>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">Profile not found</p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex gap-3">
            {profile?.can_contact && onSendMessage && (
              <button
                onClick={() => onSendMessage(userId)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <MessageCircle size={18} />
                Message
              </button>
            )}
            {onInviteToCarpool && !inSameCarpool && (
              <button
                onClick={() => onInviteToCarpool(userId)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                <UserPlus size={18} />
                Invite to Carpool
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarpoolProfileView;
