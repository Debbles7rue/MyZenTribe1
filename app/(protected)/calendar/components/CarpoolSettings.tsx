// app/(protected)/calendar/components/CarpoolSettings.tsx

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Car, MapPin, Settings, Plus, X, Navigation, 
  Shield, DollarSign, Clock, Users, Trash2, Edit,
  Save, AlertCircle, CheckCircle, Globe, Eye, EyeOff,
  Camera, Upload, User, Sparkles, Star, Lock, Heart,
  Music, Cigarette, PawPrint, Coffee, Award, Zap,
  ChevronDown
} from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface CarpoolSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  showToast?: (toast: { type: string; message: string }) => void;
}

interface CarpoolPreferences {
  id?: string;
  // Profile Info (NEW)
  display_name: string;
  profile_picture_url?: string;
  bio: string;
  driving_style: 'chill' | 'efficient' | 'adventurous' | 'cautious';
  fun_fact: string;
  favorite_road_trip_snack: string;
  // Vehicle Info
  willing_to_drive: boolean;
  car_make: string;
  car_color: string;
  car_year?: number;
  car_seats: number;
  car_picture_url?: string; // NEW
  license_plate?: string;
  // Location & Privacy
  default_pickup_radius: number;
  location_privacy: 'full' | 'street' | 'area' | 'city' | 'hidden'; // NEW
  home_address?: string;
  home_city?: string;
  home_state?: string;
  home_zip?: string;
  // Preferences
  cost_sharing_enabled: boolean;
  auto_share_location: boolean;
  allow_smoking: boolean; // NEW
  allow_pets: boolean; // NEW
  allow_food_drinks: boolean; // NEW
  music_preferences: string; // NEW
  // Safety
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  drivers_license_verified: boolean; // NEW
  insurance_verified: boolean; // NEW
  background_check_completed: boolean; // NEW
  // Other
  pickup_locations: PickupLocation[];
  notifications_enabled: boolean;
  share_car_details_publicly: boolean;
  max_detour_minutes: number;
  total_trips_completed: number; // NEW
}

interface PickupLocation {
  id?: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  is_default: boolean;
  location_type: 'home' | 'work' | 'transit' | 'other';
  notes?: string;
}

const CarpoolSettings: React.FC<CarpoolSettingsProps> = ({
  isOpen,
  onClose,
  userId,
  showToast
}) => {
  const [preferences, setPreferences] = useState<CarpoolPreferences>({
    display_name: '',
    bio: '',
    driving_style: 'chill',
    fun_fact: '',
    favorite_road_trip_snack: '',
    willing_to_drive: false,
    car_make: '',
    car_color: '',
    car_seats: 4,
    license_plate: '',
    default_pickup_radius: 5,
    location_privacy: 'area',
    home_address: '',
    home_city: '',
    home_state: '',
    home_zip: '',
    cost_sharing_enabled: true,
    auto_share_location: false,
    allow_smoking: false,
    allow_pets: false,
    allow_food_drinks: true,
    music_preferences: 'Driver chooses',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    drivers_license_verified: false,
    insurance_verified: false,
    background_check_completed: false,
    pickup_locations: [],
    notifications_enabled: true,
    share_car_details_publicly: false,
    max_detour_minutes: 15,
    total_trips_completed: 0
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'vehicle' | 'locations' | 'preferences' | 'safety'>('profile');
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [newLocation, setNewLocation] = useState<PickupLocation>({
    name: '',
    address: '',
    is_default: false,
    location_type: 'other',
    notes: ''
  });
  const [editingLocation, setEditingLocation] = useState<PickupLocation | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [uploadingProfilePic, setUploadingProfilePic] = useState(false);
  const [uploadingCarPic, setUploadingCarPic] = useState(false);
  const [profileCompletion, setProfileCompletion] = useState(0);

  const profilePicInputRef = useRef<HTMLInputElement>(null);
  const carPicInputRef = useRef<HTMLInputElement>(null);

  // Car color options
  const carColors = [
    { value: 'Black', hex: '#000000' },
    { value: 'White', hex: '#FFFFFF' },
    { value: 'Silver', hex: '#C0C0C0' },
    { value: 'Gray', hex: '#808080' },
    { value: 'Blue', hex: '#0000FF' },
    { value: 'Red', hex: '#FF0000' },
    { value: 'Green', hex: '#008000' },
    { value: 'Brown', hex: '#964B00' },
    { value: 'Gold', hex: '#FFD700' }
  ];

  // Calculate profile completion
  useEffect(() => {
    const requiredFields = [
      preferences.display_name,
      preferences.car_make,
      preferences.car_color,
      preferences.home_city,
      preferences.home_state,
      preferences.emergency_contact_name
    ];
    const filledFields = requiredFields.filter(field => field && field !== '').length;
    const completion = Math.round((filledFields / requiredFields.length) * 100);
    setProfileCompletion(completion);
  }, [preferences]);

  // Load existing preferences
  useEffect(() => {
    if (isOpen && userId) {
      loadPreferences();
    }
  }, [isOpen, userId]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      
      const { data: prefData, error: prefError } = await supabase
        .from('carpool_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (prefError && prefError.code !== 'PGRST116') {
        console.error('Error loading preferences:', prefError);
      }

      const { data: locData, error: locError } = await supabase
        .from('carpool_pickup_locations')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false });

      if (locError) {
        console.error('Error loading locations:', locError);
      }

      if (prefData) {
        setPreferences({
          ...prefData,
          pickup_locations: locData || []
        });
      } else {
        setPreferences(prev => ({
          ...prev,
          pickup_locations: locData || []
        }));
      }
    } catch (error) {
      console.error('Error loading carpool settings:', error);
      showToast?.({ type: 'error', message: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePicUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingProfilePic(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}_profile_${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName);

      setPreferences(prev => ({ ...prev, profile_picture_url: publicUrl }));
      showToast?.({ type: 'success', message: 'Profile picture uploaded! 📸' });
    } catch (error) {
      console.error('Upload error:', error);
      showToast?.({ type: 'error', message: 'Failed to upload profile picture' });
    } finally {
      setUploadingProfilePic(false);
    }
  };

  const handleCarPicUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingCarPic(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}_car_${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from('car-pictures')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('car-pictures')
        .getPublicUrl(fileName);

      setPreferences(prev => ({ ...prev, car_picture_url: publicUrl }));
      showToast?.({ type: 'success', message: 'Car picture uploaded! 🚗' });
    } catch (error) {
      console.error('Upload error:', error);
      showToast?.({ type: 'error', message: 'Failed to upload car picture' });
    } finally {
      setUploadingCarPic(false);
    }
  };

  const getLocationPrivacyDisplay = () => {
    if (!preferences.home_address && !preferences.home_city) return 'Not set';
    
    switch (preferences.location_privacy) {
      case 'full':
        return `${preferences.home_address}, ${preferences.home_city}, ${preferences.home_state} ${preferences.home_zip}`;
      case 'street':
        return `${preferences.home_address?.split(' ').slice(1).join(' ')}, ${preferences.home_city}`;
      case 'area':
        return `Near ${preferences.home_city}, ${preferences.home_state}`;
      case 'city':
        return `${preferences.home_city}, ${preferences.home_state}`;
      case 'hidden':
        return 'Location hidden';
      default:
        return 'Not set';
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      if (preferences.willing_to_drive) {
        if (!preferences.car_make || !preferences.car_color) {
          showToast?.({ type: 'error', message: 'Please fill in car make and color' });
          setSaving(false);
          return;
        }
      }

      const prefData = {
        user_id: userId,
        display_name: preferences.display_name,
        profile_picture_url: preferences.profile_picture_url,
        bio: preferences.bio,
        driving_style: preferences.driving_style,
        fun_fact: preferences.fun_fact,
        favorite_road_trip_snack: preferences.favorite_road_trip_snack,
        willing_to_drive: preferences.willing_to_drive,
        car_make: preferences.car_make,
        car_color: preferences.car_color,
        car_year: preferences.car_year,
        car_seats: preferences.car_seats,
        car_picture_url: preferences.car_picture_url,
        license_plate: preferences.license_plate,
        default_pickup_radius: preferences.default_pickup_radius,
        location_privacy: preferences.location_privacy,
        home_address: preferences.home_address,
        home_city: preferences.home_city,
        home_state: preferences.home_state,
        home_zip: preferences.home_zip,
        cost_sharing_enabled: preferences.cost_sharing_enabled,
        auto_share_location: preferences.auto_share_location,
        allow_smoking: preferences.allow_smoking,
        allow_pets: preferences.allow_pets,
        allow_food_drinks: preferences.allow_food_drinks,
        music_preferences: preferences.music_preferences,
        emergency_contact_name: preferences.emergency_contact_name,
        emergency_contact_phone: preferences.emergency_contact_phone,
        drivers_license_verified: preferences.drivers_license_verified,
        insurance_verified: preferences.insurance_verified,
        background_check_completed: preferences.background_check_completed,
        notifications_enabled: preferences.notifications_enabled,
        share_car_details_publicly: preferences.share_car_details_publicly,
        max_detour_minutes: preferences.max_detour_minutes,
        total_trips_completed: preferences.total_trips_completed,
        updated_at: new Date().toISOString()
      };

      const { error: prefError } = await supabase
        .from('carpool_preferences')
        .upsert(prefData, { onConflict: 'user_id' });

      if (prefError) throw prefError;

      showToast?.({ type: 'success', message: 'Settings saved successfully! 🎉' });
    } catch (error) {
      console.error('Error saving preferences:', error);
      showToast?.({ type: 'error', message: 'Failed to save preferences' });
    } finally {
      setSaving(false);
    }
  };

  const addLocation = async () => {
    if (!newLocation.name || !newLocation.address) {
      showToast?.({ type: 'error', message: 'Please fill in name and address' });
      return;
    }

    try {
      if (newLocation.is_default) {
        await supabase
          .from('carpool_pickup_locations')
          .update({ is_default: false })
          .eq('user_id', userId);
      }

      const { data, error } = await supabase
        .from('carpool_pickup_locations')
        .insert({
          user_id: userId,
          name: newLocation.name,
          address: newLocation.address,
          location_type: newLocation.location_type,
          is_default: newLocation.is_default,
          notes: newLocation.notes,
          latitude: newLocation.latitude,
          longitude: newLocation.longitude
        })
        .select()
        .single();

      if (error) throw error;

      setPreferences(prev => ({
        ...prev,
        pickup_locations: [...prev.pickup_locations, data]
      }));

      setNewLocation({
        name: '',
        address: '',
        is_default: false,
        location_type: 'other',
        notes: ''
      });
      setShowAddLocation(false);
      showToast?.({ type: 'success', message: 'Location added!' });
    } catch (error) {
      console.error('Error adding location:', error);
      showToast?.({ type: 'error', message: 'Failed to add location' });
    }
  };

  const updateLocation = async () => {
    if (!editingLocation?.id || !editingLocation.name || !editingLocation.address) {
      showToast?.({ type: 'error', message: 'Please fill in name and address' });
      return;
    }

    try {
      if (editingLocation.is_default) {
        await supabase
          .from('carpool_pickup_locations')
          .update({ is_default: false })
          .eq('user_id', userId)
          .neq('id', editingLocation.id);
      }

      const { error } = await supabase
        .from('carpool_pickup_locations')
        .update({
          name: editingLocation.name,
          address: editingLocation.address,
          location_type: editingLocation.location_type,
          is_default: editingLocation.is_default,
          notes: editingLocation.notes,
          latitude: editingLocation.latitude,
          longitude: editingLocation.longitude
        })
        .eq('id', editingLocation.id);

      if (error) throw error;

      setPreferences(prev => ({
        ...prev,
        pickup_locations: prev.pickup_locations.map(loc => 
          loc.id === editingLocation.id ? editingLocation : loc
        )
      }));

      setEditingLocation(null);
      showToast?.({ type: 'success', message: 'Location updated!' });
    } catch (error) {
      console.error('Error updating location:', error);
      showToast?.({ type: 'error', message: 'Failed to update location' });
    }
  };

  const deleteLocation = async (locationId: string) => {
    try {
      const { error } = await supabase
        .from('carpool_pickup_locations')
        .delete()
        .eq('id', locationId);

      if (error) throw error;

      setPreferences(prev => ({
        ...prev,
        pickup_locations: prev.pickup_locations.filter(loc => loc.id !== locationId)
      }));

      setShowDeleteConfirm(null);
      showToast?.({ type: 'success', message: 'Location deleted!' });
    } catch (error) {
      console.error('Error deleting location:', error);
      showToast?.({ type: 'error', message: 'Failed to delete location' });
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (editingLocation) {
            setEditingLocation(prev => prev ? ({
              ...prev,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            }) : null);
          } else {
            setNewLocation(prev => ({
              ...prev,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            }));
          }
          showToast?.({ type: 'success', message: 'Location captured!' });
        },
        (error) => {
          console.error('Geolocation error:', error);
          showToast?.({ type: 'error', message: 'Could not get location' });
        }
      );
    } else {
      showToast?.({ type: 'error', message: 'Geolocation not supported' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Sparkles className="text-yellow-300" />
                Carpool Profile & Settings
              </h2>
              <p className="text-green-100 mt-1">Set up your profile once, carpool with confidence!</p>
            </div>
            <button
              onClick={onClose}
              className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          
          {/* Profile Completion Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-white text-sm mb-1">
              <span>Profile Completion</span>
              <span className="font-bold">{profileCompletion}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div 
                className="bg-white rounded-full h-2 transition-all duration-500"
                style={{ width: `${profileCompletion}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b dark:border-gray-700 bg-white dark:bg-gray-900">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-4 px-6 text-sm font-medium transition-colors ${
              activeTab === 'profile'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <User className="inline mr-2" size={16} />
            Profile
          </button>
          <button
            onClick={() => setActiveTab('vehicle')}
            className={`flex-1 py-4 px-6 text-sm font-medium transition-colors ${
              activeTab === 'vehicle'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Car className="inline mr-2" size={16} />
            Vehicle
          </button>
          <button
            onClick={() => setActiveTab('locations')}
            className={`flex-1 py-4 px-6 text-sm font-medium transition-colors ${
              activeTab === 'locations'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <MapPin className="inline mr-2" size={16} />
            Locations
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`flex-1 py-4 px-6 text-sm font-medium transition-colors ${
              activeTab === 'preferences'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Settings className="inline mr-2" size={16} />
            Preferences
          </button>
          <button
            onClick={() => setActiveTab('safety')}
            className={`flex-1 py-4 px-6 text-sm font-medium transition-colors ${
              activeTab === 'safety'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Shield className="inline mr-2" size={16} />
            Safety
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading settings...</p>
            </div>
          ) : (
            <>
              {/* Profile Tab (NEW) */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  {/* Profile Picture */}
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden">
                        {preferences.profile_picture_url ? (
                          <img 
                            src={preferences.profile_picture_url} 
                            alt="Profile" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User size={40} className="text-white" />
                        )}
                      </div>
                      <button
                        onClick={() => profilePicInputRef.current?.click()}
                        className="absolute bottom-0 right-0 bg-green-600 text-white p-2 rounded-full hover:bg-green-700 transition-colors"
                        disabled={uploadingProfilePic}
                      >
                        {uploadingProfilePic ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        ) : (
                          <Camera size={16} />
                        )}
                      </button>
                      <input
                        ref={profilePicInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePicUpload}
                        className="hidden"
                      />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">Profile Picture</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Upload a photo so friends can recognize you
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Display Name *
                      </label>
                      <input
                        type="text"
                        value={preferences.display_name}
                        onChange={(e) => setPreferences(prev => ({ ...prev, display_name: e.target.value }))}
                        placeholder="How you want to be called"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Driving Style 🚗
                      </label>
                      <select
                        value={preferences.driving_style}
                        onChange={(e) => setPreferences(prev => ({ ...prev, driving_style: e.target.value as any }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="chill">😎 Chill Cruiser</option>
                        <option value="efficient">⚡ Efficient Commuter</option>
                        <option value="adventurous">🎢 Adventurous Driver</option>
                        <option value="cautious">🛡️ Safety First</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Bio / About Me
                    </label>
                    <textarea
                      value={preferences.bio}
                      onChange={(e) => setPreferences(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="Tell potential carpool buddies a bit about yourself..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Fun Fact 🎉
                      </label>
                      <input
                        type="text"
                        value={preferences.fun_fact}
                        onChange={(e) => setPreferences(prev => ({ ...prev, fun_fact: e.target.value }))}
                        placeholder="Share something interesting!"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Favorite Road Trip Snack 🍿
                      </label>
                      <input
                        type="text"
                        value={preferences.favorite_road_trip_snack}
                        onChange={(e) => setPreferences(prev => ({ ...prev, favorite_road_trip_snack: e.target.value }))}
                        placeholder="Chips, candy, fruit..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-xl p-4">
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <Award className="text-yellow-500" size={16} />
                      Carpool Stats
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{preferences.total_trips_completed || 0}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Trips Completed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {preferences.drivers_license_verified ? '✓' : '—'}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Verified</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{profileCompletion}%</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Complete</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Vehicle Tab */}
              {activeTab === 'vehicle' && (
                <div className="space-y-6">
                  {/* Driving Willingness */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.willing_to_drive}
                        onChange={(e) => setPreferences(prev => ({
                          ...prev,
                          willing_to_drive: e.target.checked
                        }))}
                        className="w-5 h-5 text-blue-600 rounded"
                      />
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          I'm willing to drive
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Enable this to offer rides to friends
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Car Details */}
                  {preferences.willing_to_drive && (
                    <div className="space-y-4">
                      {/* Car Picture Upload */}
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="w-32 h-24 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                              {preferences.car_picture_url ? (
                                <img 
                                  src={preferences.car_picture_url} 
                                  alt="Car" 
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Car size={32} className="text-gray-400" />
                              )}
                            </div>
                            <button
                              onClick={() => carPicInputRef.current?.click()}
                              className="absolute bottom-2 right-2 bg-green-600 text-white p-1.5 rounded-full hover:bg-green-700 transition-colors"
                              disabled={uploadingCarPic}
                            >
                              {uploadingCarPic ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                              ) : (
                                <Camera size={14} />
                              )}
                            </button>
                            <input
                              ref={carPicInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleCarPicUpload}
                              className="hidden"
                            />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">Car Photo</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Help riders identify your car easily
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Car Make/Model * 🏷️
                          </label>
                          <input
                            type="text"
                            value={preferences.car_make}
                            onChange={(e) => setPreferences(prev => ({
                              ...prev,
                              car_make: e.target.value
                            }))}
                            placeholder="e.g. Honda Civic"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Car Color * 🎨
                          </label>
                          <div className="flex gap-2">
                            <select
                              value={preferences.car_color}
                              onChange={(e) => setPreferences(prev => ({
                                ...prev,
                                car_color: e.target.value
                              }))}
                              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                              required
                            >
                              <option value="">Select color</option>
                              {carColors.map(color => (
                                <option key={color.value} value={color.value}>{color.value}</option>
                              ))}
                            </select>
                            {preferences.car_color && (
                              <div 
                                className="w-10 h-10 rounded-lg border-2 border-gray-300"
                                style={{ 
                                  backgroundColor: carColors.find(c => c.value === preferences.car_color)?.hex || '#ccc' 
                                }}
                              />
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Available Seats
                          </label>
                          <select
                            value={preferences.car_seats}
                            onChange={(e) => setPreferences(prev => ({
                              ...prev,
                              car_seats: parseInt(e.target.value)
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          >
                            <option value={1}>1 seat</option>
                            <option value={2}>2 seats</option>
                            <option value={3}>3 seats</option>
                            <option value={4}>4 seats</option>
                            <option value={5}>5 seats</option>
                            <option value={6}>6 seats</option>
                            <option value={7}>7 seats</option>
                            <option value={8}>8 seats</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            License Plate (Optional) 🔖
                          </label>
                          <input
                            type="text"
                            value={preferences.license_plate}
                            onChange={(e) => setPreferences(prev => ({
                              ...prev,
                              license_plate: e.target.value.toUpperCase()
                            }))}
                            placeholder="e.g. ABC-123"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono uppercase"
                          />
                        </div>
                      </div>

                      {/* Privacy Toggle */}
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferences.share_car_details_publicly}
                            onChange={(e) => setPreferences(prev => ({
                              ...prev,
                              share_car_details_publicly: e.target.checked
                            }))}
                            className="w-5 h-5 text-blue-600 rounded"
                          />
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                              {preferences.share_car_details_publicly ? <Eye size={16} /> : <EyeOff size={16} />}
                              Share car details publicly
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              When enabled, your car details will be visible to carpool participants
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Driving Preferences */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Pickup Radius: <span className="text-green-600 font-bold">{preferences.default_pickup_radius}</span> miles
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="25"
                        value={preferences.default_pickup_radius}
                        onChange={(e) => setPreferences(prev => ({
                          ...prev,
                          default_pickup_radius: parseInt(e.target.value)
                        }))}
                        className="w-full accent-green-600"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>1 mile</span>
                        <span>25 miles</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Max Detour Time: <span className="text-green-600 font-bold">{preferences.max_detour_minutes}</span> minutes
                      </label>
                      <input
                        type="range"
                        min="5"
                        max="30"
                        value={preferences.max_detour_minutes}
                        onChange={(e) => setPreferences(prev => ({
                          ...prev,
                          max_detour_minutes: parseInt(e.target.value)
                        }))}
                        className="w-full accent-green-600"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>5 min</span>
                        <span>30 min</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Pickup Locations Tab */}
              {activeTab === 'locations' && (
                <div className="space-y-4">
                  {/* Location Privacy Settings */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Lock className="text-purple-600" size={20} />
                      <h4 className="font-medium text-gray-900 dark:text-white">Location Privacy Settings</h4>
                    </div>
                    
                    <div className="space-y-2">
                      {[
                        { value: 'full', label: 'Full Address', icon: Eye, preview: '123 Main St, Austin, TX 78701' },
                        { value: 'street', label: 'Street Only', icon: Eye, preview: 'Main St, Austin' },
                        { value: 'area', label: 'Area Only', icon: Eye, preview: 'Near Austin, TX' },
                        { value: 'city', label: 'City Only', icon: Eye, preview: 'Austin, TX' },
                        { value: 'hidden', label: 'Hidden', icon: EyeOff, preview: 'Location hidden' }
                      ].map(option => (
                        <label 
                          key={option.value}
                          className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                            preferences.location_privacy === option.value 
                              ? 'bg-purple-100 dark:bg-purple-900/30 border-2 border-purple-500' 
                              : 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-purple-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              value={option.value}
                              checked={preferences.location_privacy === option.value}
                              onChange={(e) => setPreferences(prev => ({ ...prev, location_privacy: e.target.value as any }))}
                              className="text-purple-600 focus:ring-purple-500"
                            />
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                <option.icon size={16} />
                                {option.label}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                Shows as: "{option.preview}"
                              </div>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                    
                    <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>Your location appears as:</strong><br />
                        <span className="text-purple-600 dark:text-purple-400">{getLocationPrivacyDisplay()}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Pickup Locations
                    </h3>
                    <button
                      onClick={() => setShowAddLocation(true)}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                    >
                      <Plus size={16} />
                      Add Location
                    </button>
                  </div>

                  {/* Existing Locations */}
                  <div className="space-y-3">
                    {preferences.pickup_locations.map((location) => (
                      <div
                        key={location.id}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {location.name}
                            </h4>
                            {location.is_default && (
                              <span className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full text-xs">
                                Default
                              </span>
                            )}
                            <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full text-xs capitalize">
                              {location.location_type}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {location.address}
                          </p>
                          {location.notes && (
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              Note: {location.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingLocation(location)}
                            className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(location.id!)}
                            className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {preferences.pickup_locations.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <MapPin className="mx-auto mb-3" size={48} />
                      <p>No pickup locations configured</p>
                      <p className="text-sm">Add locations for quick carpool coordination</p>
                    </div>
                  )}

                  {/* Add/Edit Location Modal */}
                  {(showAddLocation || editingLocation) && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-semibold mb-4">
                          {editingLocation ? 'Edit Pickup Location' : 'Add Pickup Location'}
                        </h3>
                        
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">Location Name *</label>
                            <input
                              type="text"
                              value={editingLocation ? editingLocation.name : newLocation.name}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (editingLocation) {
                                  setEditingLocation(prev => prev ? { ...prev, name: value } : null);
                                } else {
                                  setNewLocation(prev => ({ ...prev, name: value }));
                                }
                              }}
                              placeholder="e.g. Home, Office, Coffee Shop"
                              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-2">Address *</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={editingLocation ? editingLocation.address : newLocation.address}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (editingLocation) {
                                    setEditingLocation(prev => prev ? { ...prev, address: value } : null);
                                  } else {
                                    setNewLocation(prev => ({ ...prev, address: value }));
                                  }
                                }}
                                placeholder="123 Main St, City, State"
                                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                              />
                              <button
                                onClick={getCurrentLocation}
                                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                                title="Use current location"
                              >
                                <Navigation size={16} />
                              </button>
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-2">Type</label>
                            <select
                              value={editingLocation ? editingLocation.location_type : newLocation.location_type}
                              onChange={(e) => {
                                const value = e.target.value as 'home' | 'work' | 'transit' | 'other';
                                if (editingLocation) {
                                  setEditingLocation(prev => prev ? { ...prev, location_type: value } : null);
                                } else {
                                  setNewLocation(prev => ({ ...prev, location_type: value }));
                                }
                              }}
                              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                            >
                              <option value="home">Home</option>
                              <option value="work">Work</option>
                              <option value="transit">Transit Hub</option>
                              <option value="other">Other</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
                            <input
                              type="text"
                              value={editingLocation ? editingLocation.notes || '' : newLocation.notes || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (editingLocation) {
                                  setEditingLocation(prev => prev ? { ...prev, notes: value } : null);
                                } else {
                                  setNewLocation(prev => ({ ...prev, notes: value }));
                                }
                              }}
                              placeholder="e.g. Use side entrance, Free parking"
                              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                            />
                          </div>
                          
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={editingLocation ? editingLocation.is_default : newLocation.is_default}
                              onChange={(e) => {
                                const value = e.target.checked;
                                if (editingLocation) {
                                  setEditingLocation(prev => prev ? { ...prev, is_default: value } : null);
                                } else {
                                  setNewLocation(prev => ({ ...prev, is_default: value }));
                                }
                              }}
                              className="rounded"
                            />
                            <span className="text-sm">Set as default pickup location</span>
                          </label>
                        </div>
                        
                        <div className="flex gap-3 mt-6">
                          <button
                            onClick={() => {
                              setShowAddLocation(false);
                              setEditingLocation(null);
                            }}
                            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={editingLocation ? updateLocation : addLocation}
                            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                          >
                            {editingLocation ? 'Update' : 'Add'} Location
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Delete Confirmation Modal */}
                  {showDeleteConfirm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full">
                        <h3 className="text-lg font-semibold mb-4">Delete Location?</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                          This location will be permanently removed.
                        </p>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setShowDeleteConfirm(null)}
                            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => deleteLocation(showDeleteConfirm)}
                            className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Preferences Tab */}
              {activeTab === 'preferences' && (
                <div className="space-y-6">
                  {/* Vehicle Rules */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Vehicle Rules</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={preferences.allow_smoking}
                          onChange={(e) => setPreferences(prev => ({ ...prev, allow_smoking: e.target.checked }))}
                          className="w-5 h-5 rounded text-blue-600"
                        />
                        <span className="text-sm">🚬 {preferences.allow_smoking ? 'Smoking allowed' : 'No smoking'}</span>
                      </label>
                      
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={preferences.allow_pets}
                          onChange={(e) => setPreferences(prev => ({ ...prev, allow_pets: e.target.checked }))}
                          className="w-5 h-5 rounded text-blue-600"
                        />
                        <span className="text-sm">🐾 {preferences.allow_pets ? 'Pets welcome' : 'No pets'}</span>
                      </label>
                      
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={preferences.allow_food_drinks}
                          onChange={(e) => setPreferences(prev => ({ ...prev, allow_food_drinks: e.target.checked }))}
                          className="w-5 h-5 rounded text-blue-600"
                        />
                        <span className="text-sm">☕ {preferences.allow_food_drinks ? 'Food & drinks OK' : 'No food/drinks'}</span>
                      </label>
                      
                      <div>
                        <select
                          value={preferences.music_preferences}
                          onChange={(e) => setPreferences(prev => ({ ...prev, music_preferences: e.target.value }))}
                          className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          <option value="Driver chooses">🎵 Driver picks music</option>
                          <option value="No music">🔇 No music</option>
                          <option value="Group decides">👥 Group decides</option>
                          <option value="Passengers choose">🎧 Passengers pick</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">Cost Sharing</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Automatically calculate and split gas/parking costs
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences.cost_sharing_enabled}
                        onChange={(e) => setPreferences(prev => ({
                          ...prev,
                          cost_sharing_enabled: e.target.checked
                        }))}
                        className="w-5 h-5 text-blue-600 rounded"
                      />
                    </label>

                    <label className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">Auto-Share Location</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Automatically share your location during carpools
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences.auto_share_location}
                        onChange={(e) => setPreferences(prev => ({
                          ...prev,
                          auto_share_location: e.target.checked
                        }))}
                        className="w-5 h-5 text-blue-600 rounded"
                      />
                    </label>

                    <label className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">Notifications</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Receive notifications for carpool updates and messages
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences.notifications_enabled}
                        onChange={(e) => setPreferences(prev => ({
                          ...prev,
                          notifications_enabled: e.target.checked
                        }))}
                        className="w-5 h-5 text-blue-600 rounded"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Safety Tab */}
              {activeTab === 'safety' && (
                <div className="space-y-6">
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="text-yellow-600 dark:text-yellow-400 mt-0.5" size={20} />
                      <div>
                        <h3 className="font-medium text-yellow-800 dark:text-yellow-200">Safety First 🛡️</h3>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                          Verification helps build trust in the carpool community. Verified profiles get more matches!
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Verification Badges */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                      <Award className="text-purple-600" size={20} />
                      Verification Badges
                    </h4>
                    
                    <div className="space-y-2">
                      {[
                        { field: 'drivers_license_verified', label: "Driver's License", icon: '🪪' },
                        { field: 'insurance_verified', label: 'Auto Insurance', icon: '📋' },
                        { field: 'background_check_completed', label: 'Background Check', icon: '✅' }
                      ].map(item => (
                        <label 
                          key={item.field}
                          className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition-all ${
                            preferences[item.field as keyof CarpoolPreferences] 
                              ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-500' 
                              : 'bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={preferences[item.field as keyof CarpoolPreferences] as boolean}
                              onChange={(e) => setPreferences(prev => ({ ...prev, [item.field]: e.target.checked }))}
                              className="w-5 h-5 rounded text-green-600"
                            />
                            <span className="font-medium">
                              {item.icon} {item.label}
                            </span>
                          </div>
                          {preferences[item.field as keyof CarpoolPreferences] && (
                            <span className="text-green-600 text-sm">✓ Verified</span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Emergency Contact Name *
                      </label>
                      <input
                        type="text"
                        value={preferences.emergency_contact_name}
                        onChange={(e) => setPreferences(prev => ({
                          ...prev,
                          emergency_contact_name: e.target.value
                        }))}
                        placeholder="e.g. John Smith"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Emergency Contact Phone
                      </label>
                      <input
                        type="tel"
                        value={preferences.emergency_contact_phone}
                        onChange={(e) => setPreferences(prev => ({
                          ...prev,
                          emergency_contact_phone: e.target.value
                        }))}
                        placeholder="e.g. (555) 123-4567"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Star className="text-yellow-500" size={16} />
                Complete your profile to get more matches!
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={savePreferences}
                disabled={saving}
                className="px-6 py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save Settings
                    {profileCompletion === 100 && ' 🎉'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarpoolSettings;
