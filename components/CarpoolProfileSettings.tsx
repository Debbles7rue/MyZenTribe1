// components/CarpoolProfileSettings.tsx
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Car, MapPin, Phone, User, Shield, Save, Edit, Camera,
  Users, Clock, DollarSign, Settings, Home, AlertCircle,
  Lock, Eye, EyeOff, Upload, X, Check, Sparkles, Heart,
  Music, Cigarette, PawPrint, Coffee, Star, Award, Zap
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

interface CarpoolProfile {
  id?: string;
  user_id: string;
  // Profile Pictures
  profile_picture_url?: string;
  car_picture_url?: string;
  // Car Information
  car_make: string;
  car_model: string;
  car_color: string;
  car_year: number | null;
  car_license_plate: string;
  total_seats: number;
  available_seats: number;
  // Location Information
  home_address: string;
  home_city: string;
  home_state: string;
  home_zip: string;
  location_privacy: 'full' | 'street' | 'area' | 'city' | 'hidden';
  preferred_pickup_locations: string[];
  max_detour_minutes: number;
  // Profile Info
  display_name: string;
  bio: string;
  driving_style: 'chill' | 'efficient' | 'adventurous' | 'cautious';
  fun_fact: string;
  favorite_road_trip_snack: string;
  // Contact & Emergency
  phone_number: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  // Preferences
  carpool_radius_miles: number;
  advance_notice_hours: number;
  split_gas_costs: boolean;
  split_parking_costs: boolean;
  allow_smoking: boolean;
  allow_pets: boolean;
  allow_food_drinks: boolean;
  music_preferences: string;
  // Safety & Verification
  drivers_license_verified: boolean;
  insurance_verified: boolean;
  background_check_completed: boolean;
  safe_driver_rating: number;
  total_trips_completed: number;
  // Settings
  auto_share_location: boolean;
  send_arrival_notifications: boolean;
  allow_carpool_invites: boolean;
  preferred_departure_buffer: number;
  created_at?: string;
  updated_at?: string;
}

interface CarpoolProfileSettingsProps {
  userId: string;
  onSave?: (profile: CarpoolProfile) => void;
  showToast?: (toast: { type: string; message: string }) => void;
  isModal?: boolean;
  onClose?: () => void;
}

const CarpoolProfileSettings: React.FC<CarpoolProfileSettingsProps> = ({
  userId,
  onSave,
  showToast,
  isModal = false,
  onClose
}) => {
  const [profile, setProfile] = useState<CarpoolProfile>({
    user_id: userId,
    display_name: '',
    bio: '',
    driving_style: 'chill',
    fun_fact: '',
    favorite_road_trip_snack: '',
    car_make: '',
    car_model: '',
    car_color: '',
    car_year: null,
    car_license_plate: '',
    total_seats: 5,
    available_seats: 4,
    home_address: '',
    home_city: '',
    home_state: '',
    home_zip: '',
    location_privacy: 'area',
    preferred_pickup_locations: [],
    max_detour_minutes: 15,
    phone_number: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    carpool_radius_miles: 20,
    advance_notice_hours: 2,
    split_gas_costs: true,
    split_parking_costs: true,
    allow_smoking: false,
    allow_pets: false,
    allow_food_drinks: true,
    music_preferences: 'Driver chooses',
    drivers_license_verified: false,
    insurance_verified: false,
    background_check_completed: false,
    safe_driver_rating: 5,
    total_trips_completed: 0,
    auto_share_location: true,
    send_arrival_notifications: true,
    allow_carpool_invites: true,
    preferred_departure_buffer: 10
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'car' | 'location' | 'preferences' | 'safety'>('profile');
  const [newPickupLocation, setNewPickupLocation] = useState('');
  const [uploadingProfilePic, setUploadingProfilePic] = useState(false);
  const [uploadingCarPic, setUploadingCarPic] = useState(false);
  const [profileCompletion, setProfileCompletion] = useState(0);

  const profilePicInputRef = useRef<HTMLInputElement>(null);
  const carPicInputRef = useRef<HTMLInputElement>(null);

  // Color options for car
  const carColors = [
    { value: 'Black', hex: '#000000' },
    { value: 'White', hex: '#FFFFFF' },
    { value: 'Silver', hex: '#C0C0C0' },
    { value: 'Gray', hex: '#808080' },
    { value: 'Blue', hex: '#0000FF' },
    { value: 'Red', hex: '#FF0000' },
    { value: 'Green', hex: '#00FF00' },
    { value: 'Yellow', hex: '#FFFF00' },
    { value: 'Orange', hex: '#FFA500' },
    { value: 'Brown', hex: '#A52A2A' },
    { value: 'Purple', hex: '#800080' },
    { value: 'Gold', hex: '#FFD700' }
  ];

  // Calculate profile completion
  useEffect(() => {
    const requiredFields = [
      profile.display_name,
      profile.phone_number,
      profile.car_make,
      profile.car_model,
      profile.car_color,
      profile.home_city,
      profile.home_state
    ];
    const filledFields = requiredFields.filter(field => field && field !== '').length;
    const completion = Math.round((filledFields / requiredFields.length) * 100);
    setProfileCompletion(completion);
  }, [profile]);

  // Load existing carpool profile
  useEffect(() => {
    const loadCarpoolProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('carpool_profiles')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data) {
          setProfile(data);
        }
      } catch (error) {
        console.error('Failed to load carpool profile:', error);
        showToast?.({ type: 'info', message: 'Setting up your carpool profile' });
      } finally {
        setLoading(false);
      }
    };

    loadCarpoolProfile();
  }, [userId, showToast]);

  const handleInputChange = (field: keyof CarpoolProfile, value: any) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleProfilePicUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingProfilePic(true);
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}_profile_${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName);

      handleInputChange('profile_picture_url', publicUrl);
      showToast?.({ type: 'success', message: 'Profile picture uploaded!' });
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

      handleInputChange('car_picture_url', publicUrl);
      showToast?.({ type: 'success', message: 'Car picture uploaded!' });
    } catch (error) {
      console.error('Upload error:', error);
      showToast?.({ type: 'error', message: 'Failed to upload car picture' });
    } finally {
      setUploadingCarPic(false);
    }
  };

  const addPickupLocation = () => {
    if (newPickupLocation.trim() && !profile.preferred_pickup_locations.includes(newPickupLocation.trim())) {
      setProfile(prev => ({
        ...prev,
        preferred_pickup_locations: [...prev.preferred_pickup_locations, newPickupLocation.trim()]
      }));
      setNewPickupLocation('');
    }
  };

  const removePickupLocation = (location: string) => {
    setProfile(prev => ({
      ...prev,
      preferred_pickup_locations: prev.preferred_pickup_locations.filter(loc => loc !== location)
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const saveData = {
        ...profile,
        updated_at: new Date().toISOString()
      };

      if (profile.id) {
        const { error } = await supabase
          .from('carpool_profiles')
          .update(saveData)
          .eq('id', profile.id);
        
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('carpool_profiles')
          .insert([{ ...saveData, created_at: new Date().toISOString() }])
          .select()
          .single();
        
        if (error) throw error;
        if (data) setProfile(data);
      }

      showToast?.({ type: 'success', message: 'Profile saved successfully! 🎉' });
      onSave?.(profile);
      
      if (isModal && onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Failed to save carpool profile:', error);
      showToast?.({ type: 'error', message: 'Failed to save profile' });
    } finally {
      setSaving(false);
    }
  };

  const getLocationPrivacyDisplay = () => {
    if (!profile.home_address && !profile.home_city) return 'Not set';
    
    switch (profile.location_privacy) {
      case 'full':
        return `${profile.home_address}, ${profile.home_city}, ${profile.home_state} ${profile.home_zip}`;
      case 'street':
        return `${profile.home_address?.split(' ').slice(1).join(' ')}, ${profile.home_city}`;
      case 'area':
        return `Near ${profile.home_city}, ${profile.home_state}`;
      case 'city':
        return `${profile.home_city}, ${profile.home_state}`;
      case 'hidden':
        return 'Location hidden';
      default:
        return 'Not set';
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User, emoji: '👤' },
    { id: 'car', label: 'Vehicle', icon: Car, emoji: '🚗' },
    { id: 'location', label: 'Location', icon: MapPin, emoji: '📍' },
    { id: 'preferences', label: 'Preferences', icon: Settings, emoji: '⚙️' },
    { id: 'safety', label: 'Safety', icon: Shield, emoji: '🛡️' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const TabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Profile Information
            </h3>

            {/* Profile Picture Upload */}
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden">
                  {profile.profile_picture_url ? (
                    <img 
                      src={profile.profile_picture_url} 
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
                  value={profile.display_name}
                  onChange={(e) => handleInputChange('display_name', e.target.value)}
                  placeholder="How you want to be called"
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Driving Style 🚗
                </label>
                <select
                  value={profile.driving_style}
                  onChange={(e) => handleInputChange('driving_style', e.target.value)}
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
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
                value={profile.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="Tell potential carpool buddies a bit about yourself..."
                rows={3}
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fun Fact 🎉
                </label>
                <input
                  type="text"
                  value={profile.fun_fact}
                  onChange={(e) => handleInputChange('fun_fact', e.target.value)}
                  placeholder="Share something interesting!"
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Favorite Road Trip Snack 🍿
                </label>
                <input
                  type="text"
                  value={profile.favorite_road_trip_snack}
                  onChange={(e) => handleInputChange('favorite_road_trip_snack', e.target.value)}
                  placeholder="Chips, candy, fruit..."
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            {/* Stats & Achievements */}
            <div className="bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-xl p-4">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Award className="text-yellow-500" size={16} />
                Carpool Stats
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{profile.total_trips_completed || 0}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Trips Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {profile.safe_driver_rating ? '⭐'.repeat(Math.round(profile.safe_driver_rating)) : '—'}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Driver Rating</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{profileCompletion}%</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Profile Complete</div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'car':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Vehicle Information</h3>
            
            {/* Car Picture Upload */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative">
                  <div className="w-32 h-24 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                    {profile.car_picture_url ? (
                      <img 
                        src={profile.car_picture_url} 
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
                  Make * 🏷️
                </label>
                <input
                  type="text"
                  value={profile.car_make}
                  onChange={(e) => handleInputChange('car_make', e.target.value)}
                  placeholder="Honda, Toyota, Ford, etc."
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Model * 🚙
                </label>
                <input
                  type="text"
                  value={profile.car_model}
                  onChange={(e) => handleInputChange('car_model', e.target.value)}
                  placeholder="Civic, Camry, Focus, etc."
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Color * 🎨
                </label>
                <div className="flex gap-2">
                  <select
                    value={profile.car_color}
                    onChange={(e) => handleInputChange('car_color', e.target.value)}
                    className="flex-1 px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select color</option>
                    {carColors.map(color => (
                      <option key={color.value} value={color.value}>{color.value}</option>
                    ))}
                  </select>
                  {profile.car_color && (
                    <div 
                      className="w-10 h-10 rounded-lg border-2 border-gray-300"
                      style={{ 
                        backgroundColor: carColors.find(c => c.value === profile.car_color)?.hex || '#ccc' 
                      }}
                    />
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Year 📅
                </label>
                <input
                  type="number"
                  value={profile.car_year || ''}
                  onChange={(e) => handleInputChange('car_year', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="2020"
                  min="1990"
                  max={new Date().getFullYear() + 1}
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  License Plate 🔖
                </label>
                <input
                  type="text"
                  value={profile.car_license_plate}
                  onChange={(e) => handleInputChange('car_license_plate', e.target.value.toUpperCase())}
                  placeholder="ABC-1234"
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 font-mono uppercase"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Total Seats * 💺
                </label>
                <select
                  value={profile.total_seats}
                  onChange={(e) => {
                    const total = parseInt(e.target.value);
                    handleInputChange('total_seats', total);
                    if (profile.available_seats >= total) {
                      handleInputChange('available_seats', total - 1);
                    }
                  }}
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {[2, 3, 4, 5, 6, 7, 8].map(num => (
                    <option key={num} value={num}>{num} seats</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Available Seats for Passengers 👥
              </label>
              <div className="flex items-center gap-2">
                {Array.from({ length: profile.total_seats }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => handleInputChange('available_seats', i)}
                    className={`w-12 h-12 rounded-lg border-2 transition-all ${
                      i === 0 
                        ? 'bg-blue-500 text-white border-blue-500' 
                        : i <= profile.available_seats 
                          ? 'bg-green-100 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-300' 
                          : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                    }`}
                    disabled={i === 0}
                  >
                    {i === 0 ? '🚗' : i <= profile.available_seats ? '✓' : i}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Click to set how many passengers you can take (driver seat is always occupied)
              </p>
            </div>
          </div>
        );

      case 'location':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Location & Privacy</h3>
            
            {/* Location Privacy Settings */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4">
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
                      profile.location_privacy === option.value 
                        ? 'bg-purple-100 dark:bg-purple-900/30 border-2 border-purple-500' 
                        : 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        value={option.value}
                        checked={profile.location_privacy === option.value}
                        onChange={(e) => handleInputChange('location_privacy', e.target.value)}
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
                  <strong>Your location will appear as:</strong><br />
                  <span className="text-purple-600 dark:text-purple-400">{getLocationPrivacyDisplay()}</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Home Address 🏠
                </label>
                <input
                  type="text"
                  value={profile.home_address}
                  onChange={(e) => handleInputChange('home_address', e.target.value)}
                  placeholder="123 Main Street"
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  City * 🏙️
                </label>
                <input
                  type="text"
                  value={profile.home_city}
                  onChange={(e) => handleInputChange('home_city', e.target.value)}
                  placeholder="Austin"
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  State * 📍
                </label>
                <input
                  type="text"
                  value={profile.home_state}
                  onChange={(e) => handleInputChange('home_state', e.target.value)}
                  placeholder="TX"
                  maxLength={2}
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 uppercase"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Preferred Pickup Locations 🚏
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newPickupLocation}
                  onChange={(e) => setNewPickupLocation(e.target.value)}
                  placeholder="Coffee shop, mall, park & ride..."
                  className="flex-1 px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  onKeyPress={(e) => e.key === 'Enter' && addPickupLocation()}
                />
                <button
                  onClick={addPickupLocation}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Add
                </button>
              </div>
              
              {profile.preferred_pickup_locations.length > 0 && (
                <div className="space-y-2">
                  {profile.preferred_pickup_locations.map((location, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <span className="text-sm flex items-center gap-2">
                        <MapPin size={14} className="text-green-600" />
                        {location}
                      </span>
                      <button
                        onClick={() => removePickupLocation(location)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Maximum Detour Time: <span className="text-green-600 font-bold">{profile.max_detour_minutes}</span> minutes ⏱️
              </label>
              <input
                type="range"
                min="5"
                max="30"
                step="5"
                value={profile.max_detour_minutes}
                onChange={(e) => handleInputChange('max_detour_minutes', parseInt(e.target.value))}
                className="w-full accent-green-600"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>5 min</span>
                <span>15 min</span>
                <span>30 min</span>
              </div>
            </div>
          </div>
        );

      case 'preferences':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Carpool Preferences</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Carpool Radius: <span className="text-green-600 font-bold">{profile.carpool_radius_miles}</span> miles 📏
                </label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={profile.carpool_radius_miles}
                  onChange={(e) => handleInputChange('carpool_radius_miles', parseInt(e.target.value))}
                  className="w-full accent-green-600"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>5 mi</span>
                  <span>25 mi</span>
                  <span>50 mi</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Advance Notice: <span className="text-green-600 font-bold">{profile.advance_notice_hours}</span> hours ⏰
                </label>
                <input
                  type="range"
                  min="1"
                  max="48"
                  value={profile.advance_notice_hours}
                  onChange={(e) => handleInputChange('advance_notice_hours', parseInt(e.target.value))}
                  className="w-full accent-green-600"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>1 hr</span>
                  <span>24 hrs</span>
                  <span>48 hrs</span>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <DollarSign className="text-green-600" size={20} />
                Cost Sharing
              </h4>
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={profile.split_gas_costs}
                    onChange={(e) => handleInputChange('split_gas_costs', e.target.checked)}
                    className="w-5 h-5 rounded text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm">Split gas costs with passengers ⛽</span>
                </label>
                
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={profile.split_parking_costs}
                    onChange={(e) => handleInputChange('split_parking_costs', e.target.checked)}
                    className="w-5 h-5 rounded text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm">Split parking costs with passengers 🅿️</span>
                </label>
              </div>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Vehicle Rules</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={profile.allow_smoking}
                    onChange={(e) => handleInputChange('allow_smoking', e.target.checked)}
                    className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm flex items-center gap-1">
                    <Cigarette size={14} className={profile.allow_smoking ? 'text-orange-500' : 'text-gray-400'} />
                    {profile.allow_smoking ? 'Smoking allowed' : 'No smoking'}
                  </span>
                </label>
                
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={profile.allow_pets}
                    onChange={(e) => handleInputChange('allow_pets', e.target.checked)}
                    className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm flex items-center gap-1">
                    <PawPrint size={14} className={profile.allow_pets ? 'text-brown-500' : 'text-gray-400'} />
                    {profile.allow_pets ? 'Pets welcome' : 'No pets'}
                  </span>
                </label>
                
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={profile.allow_food_drinks}
                    onChange={(e) => handleInputChange('allow_food_drinks', e.target.checked)}
                    className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm flex items-center gap-1">
                    <Coffee size={14} className={profile.allow_food_drinks ? 'text-brown-600' : 'text-gray-400'} />
                    {profile.allow_food_drinks ? 'Food & drinks OK' : 'No food or drinks'}
                  </span>
                </label>
                
                <div>
                  <select
                    value={profile.music_preferences}
                    onChange={(e) => handleInputChange('music_preferences', e.target.value)}
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="Driver chooses">🎵 Driver picks music</option>
                    <option value="No music">🔇 No music</option>
                    <option value="Group decides">👥 Group decides</option>
                    <option value="Passengers choose">🎧 Passengers pick</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );

      case 'safety':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Safety & Verification</h3>
            
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <h4 className="font-medium text-yellow-800 dark:text-yellow-200">Safety First! 🛡️</h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Verification helps build trust in the carpool community. Verified profiles get more matches!
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <Award className="text-purple-600" size={20} />
                Verification Badges
              </h4>
              
              <div className="space-y-2">
                {[
                  { 
                    field: 'drivers_license_verified', 
                    label: "Driver's License", 
                    icon: '🪪',
                    benefit: 'Proves you\'re a licensed driver'
                  },
                  { 
                    field: 'insurance_verified', 
                    label: 'Auto Insurance', 
                    icon: '📋',
                    benefit: 'Shows your vehicle is insured'
                  },
                  { 
                    field: 'background_check_completed', 
                    label: 'Background Check', 
                    icon: '✅',
                    benefit: 'Maximum trust & safety'
                  }
                ].map(item => (
                  <label 
                    key={item.field}
                    className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition-all ${
                      profile[item.field as keyof CarpoolProfile] 
                        ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-500' 
                        : 'bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-green-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={profile[item.field as keyof CarpoolProfile] as boolean}
                        onChange={(e) => handleInputChange(item.field as keyof CarpoolProfile, e.target.checked)}
                        className="w-5 h-5 rounded text-green-600 focus:ring-green-500"
                      />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {item.icon} {item.label}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {item.benefit}
                        </div>
                      </div>
                    </div>
                    {profile[item.field as keyof CarpoolProfile] && (
                      <span className="text-green-600 font-medium text-sm flex items-center gap-1">
                        <Check size={16} />
                        Verified
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            <div className="border-t dark:border-gray-700 pt-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Contact Information</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone Number * 📱
                  </label>
                  <input
                    type="tel"
                    value={profile.phone_number}
                    onChange={(e) => handleInputChange('phone_number', e.target.value)}
                    placeholder="(555) 123-4567"
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Emergency Contact Name 🆘
                  </label>
                  <input
                    type="text"
                    value={profile.emergency_contact_name}
                    onChange={(e) => handleInputChange('emergency_contact_name', e.target.value)}
                    placeholder="Full name"
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Emergency Contact Phone ☎️
                  </label>
                  <input
                    type="tel"
                    value={profile.emergency_contact_phone}
                    onChange={(e) => handleInputChange('emergency_contact_phone', e.target.value)}
                    placeholder="(555) 123-4567"
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-white">Safety Settings</h4>
              
              <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <input
                  type="checkbox"
                  checked={profile.auto_share_location}
                  onChange={(e) => handleInputChange('auto_share_location', e.target.checked)}
                  className="w-5 h-5 rounded text-green-600 focus:ring-green-500"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Auto-share location during trips 📍
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Let your carpool buddies track your location
                  </p>
                </div>
              </label>
              
              <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <input
                  type="checkbox"
                  checked={profile.send_arrival_notifications}
                  onChange={(e) => handleInputChange('send_arrival_notifications', e.target.checked)}
                  className="w-5 h-5 rounded text-green-600 focus:ring-green-500"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Send arrival notifications 🔔
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Notify emergency contact when you arrive
                  </p>
                </div>
              </label>
              
              <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <input
                  type="checkbox"
                  checked={profile.allow_carpool_invites}
                  onChange={(e) => handleInputChange('allow_carpool_invites', e.target.checked)}
                  className="w-5 h-5 rounded text-green-600 focus:ring-green-500"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Allow carpool invites 💌
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Friends can invite you to join their carpools
                  </p>
                </div>
              </label>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const containerClass = isModal 
    ? "bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
    : "bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 shadow-lg";

  const content = (
    <div className={containerClass}>
      {/* Header */}
      <div className="p-6 border-b dark:border-gray-700 bg-gradient-to-r from-green-500 to-blue-600">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Sparkles className="text-yellow-300" />
              Carpool Profile Settings
            </h2>
            <p className="text-green-100 text-sm mt-1">
              Set up your profile once and carpool with confidence! 🚗✨
            </p>
          </div>
          {isModal && onClose && (
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          )}
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
        
        {/* Tabs */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
          {tabs.map(({ id, label, icon: Icon, emoji }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === id
                  ? 'bg-white text-green-600 shadow-lg scale-105'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <span className="text-lg">{emoji}</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 overflow-y-auto max-h-[calc(90vh-250px)]">
        <TabContent />
      </div>

      {/* Footer */}
      <div className="p-6 border-t dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Star className="text-yellow-500" size={16} />
              Complete your profile to get more carpool matches!
            </span>
          </div>
          <div className="flex gap-3">
            {isModal && onClose && (
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all hover:scale-105"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving || profileCompletion < 40}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 shadow-lg"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Profile
                  {profileCompletion === 100 && ' 🎉'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
        {content}
      </div>
    );
  }

  return content;
};

export default CarpoolProfileSettings;
