// components/CarpoolProfileSettings.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { 
  Car, MapPin, Phone, User, Shield, Save, Edit, 
  Users, Clock, DollarSign, Settings, Home, AlertCircle
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

interface CarpoolProfile {
  id?: string;
  user_id: string;
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
  preferred_pickup_locations: string[];
  max_detour_minutes: number;
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
    auto_share_location: true,
    send_arrival_notifications: true,
    allow_carpool_invites: true,
    preferred_departure_buffer: 10
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'car' | 'location' | 'contact' | 'preferences' | 'safety'>('car');
  const [newPickupLocation, setNewPickupLocation] = useState('');

  // Load existing carpool profile
  useEffect(() => {
    const loadCarpoolProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('carpool_profiles')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          throw error;
        }

        if (data) {
          setProfile(data);
        }
      } catch (error) {
        console.error('Failed to load carpool profile:', error);
        showToast?.({ type: 'info', message: 'Creating new carpool profile' });
      } finally {
        setLoading(false);
      }
    };

    loadCarpoolProfile();
  }, [userId, showToast]);

  const handleInputChange = (field: keyof CarpoolProfile, value: any) => {
    setProfile(prev => ({ ...prev, [field]: value }));
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
        // Update existing profile
        const { error } = await supabase
          .from('carpool_profiles')
          .update(saveData)
          .eq('id', profile.id);
        
        if (error) throw error;
      } else {
        // Create new profile
        const { data, error } = await supabase
          .from('carpool_profiles')
          .insert([{ ...saveData, created_at: new Date().toISOString() }])
          .select()
          .single();
        
        if (error) throw error;
        if (data) setProfile(data);
      }

      showToast?.({ type: 'success', message: 'Carpool profile saved successfully!' });
      onSave?.(profile);
      
      if (isModal && onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Failed to save carpool profile:', error);
      showToast?.({ type: 'error', message: 'Failed to save carpool profile' });
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'car', label: 'Vehicle', icon: Car },
    { id: 'location', label: 'Location', icon: MapPin },
    { id: 'contact', label: 'Contact', icon: Phone },
    { id: 'preferences', label: 'Preferences', icon: Settings },
    { id: 'safety', label: 'Safety', icon: Shield }
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
      case 'car':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Vehicle Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Make *
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
                  Model *
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
                  Color *
                </label>
                <input
                  type="text"
                  value={profile.car_color}
                  onChange={(e) => handleInputChange('car_color', e.target.value)}
                  placeholder="Blue, Red, Silver, etc."
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Year
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
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  License Plate
                </label>
                <input
                  type="text"
                  value={profile.car_license_plate}
                  onChange={(e) => handleInputChange('car_license_plate', e.target.value.toUpperCase())}
                  placeholder="ABC-1234"
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Total Seats *
                </label>
                <select
                  value={profile.total_seats}
                  onChange={(e) => {
                    const total = parseInt(e.target.value);
                    handleInputChange('total_seats', total);
                    // Ensure available seats doesn't exceed total - 1 (driver)
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
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Available Seats for Passengers
              </label>
              <select
                value={profile.available_seats}
                onChange={(e) => handleInputChange('available_seats', parseInt(e.target.value))}
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {Array.from({ length: profile.total_seats }, (_, i) => i).map(num => (
                  <option key={num} value={num}>{num} passenger{num !== 1 ? 's' : ''}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                How many passengers can you typically take?
              </p>
            </div>
          </div>
        );

      case 'location':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Location & Pickup</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Home Address
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
                  City *
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
                  State *
                </label>
                <input
                  type="text"
                  value={profile.home_state}
                  onChange={(e) => handleInputChange('home_state', e.target.value)}
                  placeholder="TX"
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Preferred Pickup Locations
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newPickupLocation}
                  onChange={(e) => setNewPickupLocation(e.target.value)}
                  placeholder="Coffee shop, mall, etc."
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
                    <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded">
                      <span className="text-sm">{location}</span>
                      <button
                        onClick={() => removePickupLocation(location)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Maximum Detour Time: {profile.max_detour_minutes} minutes
              </label>
              <input
                type="range"
                min="5"
                max="30"
                value={profile.max_detour_minutes}
                onChange={(e) => handleInputChange('max_detour_minutes', parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>5 min</span>
                <span>30 min</span>
              </div>
            </div>
          </div>
        );

      case 'contact':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Contact Information</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                value={profile.phone_number}
                onChange={(e) => handleInputChange('phone_number', e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            
            <div className="border-t dark:border-gray-600 pt-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Emergency Contact</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Emergency Contact Name
                  </label>
                  <input
                    type="text"
                    value={profile.emergency_contact_name}
                    onChange={(e) => handleInputChange('emergency_contact_name', e.target.value)}
                    placeholder="Full name"
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Emergency Contact Phone
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
          </div>
        );

      case 'preferences':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Carpool Preferences</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Carpool Radius: {profile.carpool_radius_miles} miles
                </label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={profile.carpool_radius_miles}
                  onChange={(e) => handleInputChange('carpool_radius_miles', parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>5 mi</span>
                  <span>50 mi</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Advance Notice: {profile.advance_notice_hours} hours
                </label>
                <input
                  type="range"
                  min="1"
                  max="48"
                  value={profile.advance_notice_hours}
                  onChange={(e) => handleInputChange('advance_notice_hours', parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>1 hr</span>
                  <span>48 hrs</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-white">Cost Sharing</h4>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={profile.split_gas_costs}
                  onChange={(e) => handleInputChange('split_gas_costs', e.target.checked)}
                  className="rounded text-green-600 focus:ring-green-500"
                />
                <span className="text-sm">Split gas costs with passengers</span>
              </label>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={profile.split_parking_costs}
                  onChange={(e) => handleInputChange('split_parking_costs', e.target.checked)}
                  className="rounded text-green-600 focus:ring-green-500"
                />
                <span className="text-sm">Split parking costs with passengers</span>
              </label>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-white">Vehicle Rules</h4>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={profile.allow_smoking}
                  onChange={(e) => handleInputChange('allow_smoking', e.target.checked)}
                  className="rounded text-green-600 focus:ring-green-500"
                />
                <span className="text-sm">Allow smoking</span>
              </label>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={profile.allow_pets}
                  onChange={(e) => handleInputChange('allow_pets', e.target.checked)}
                  className="rounded text-green-600 focus:ring-green-500"
                />
                <span className="text-sm">Allow pets</span>
              </label>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={profile.allow_food_drinks}
                  onChange={(e) => handleInputChange('allow_food_drinks', e.target.checked)}
                  className="rounded text-green-600 focus:ring-green-500"
                />
                <span className="text-sm">Allow food and drinks</span>
              </label>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Music Preferences
              </label>
              <select
                value={profile.music_preferences}
                onChange={(e) => handleInputChange('music_preferences', e.target.value)}
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="Driver chooses">Driver chooses</option>
                <option value="No music">No music</option>
                <option value="Group decides">Group decides</option>
                <option value="Passengers choose">Passengers choose</option>
              </select>
            </div>
          </div>
        );

      case 'safety':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Safety & Verification</h3>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <h4 className="font-medium text-yellow-800 dark:text-yellow-200">Safety First</h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Verification helps build trust in the carpool community. Some features may require verification.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-white">Verification Status</h4>
              
              <div className="space-y-2">
                <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={profile.drivers_license_verified}
                      onChange={(e) => handleInputChange('drivers_license_verified', e.target.checked)}
                      className="rounded text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm">Driver's License Verified</span>
                  </div>
                  {profile.drivers_license_verified && (
                    <span className="text-green-600 text-sm">✓ Verified</span>
                  )}
                </label>
                
                <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={profile.insurance_verified}
                      onChange={(e) => handleInputChange('insurance_verified', e.target.checked)}
                      className="rounded text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm">Auto Insurance Verified</span>
                  </div>
                  {profile.insurance_verified && (
                    <span className="text-green-600 text-sm">✓ Verified</span>
                  )}
                </label>
                
                <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={profile.background_check_completed}
                      onChange={(e) => handleInputChange('background_check_completed', e.target.checked)}
                      className="rounded text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm">Background Check Completed</span>
                  </div>
                  {profile.background_check_completed && (
                    <span className="text-green-600 text-sm">✓ Verified</span>
                  )}
                </label>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-white">Safety Settings</h4>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={profile.auto_share_location}
                  onChange={(e) => handleInputChange('auto_share_location', e.target.checked)}
                  className="rounded text-green-600 focus:ring-green-500"
                />
                <span className="text-sm">Auto-share location during carpool trips</span>
              </label>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={profile.send_arrival_notifications}
                  onChange={(e) => handleInputChange('send_arrival_notifications', e.target.checked)}
                  className="rounded text-green-600 focus:ring-green-500"
                />
                <span className="text-sm">Send arrival notifications to emergency contact</span>
              </label>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={profile.allow_carpool_invites}
                  onChange={(e) => handleInputChange('allow_carpool_invites', e.target.checked)}
                  className="rounded text-green-600 focus:ring-green-500"
                />
                <span className="text-sm">Allow friends to invite me to carpools</span>
              </label>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const containerClass = isModal 
    ? "bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
    : "bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700";

  const content = (
    <div className={containerClass}>
      {/* Header */}
      <div className="p-6 border-b dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Carpool Profile Settings</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
              Set up your carpool information once and use it everywhere
            </p>
          </div>
          {isModal && onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <Car size={24} />
            </button>
          )}
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2 mt-4 overflow-x-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === id
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
        <TabContent />
      </div>

      {/* Footer */}
      <div className="p-6 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            * Required fields
          </div>
          <div className="flex gap-3">
            {isModal && onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !profile.car_make || !profile.car_model || !profile.car_color || !profile.phone_number || !profile.home_city || !profile.home_state}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Profile
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
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        {content}
      </div>
    );
  }

  return content;
};

export default CarpoolProfileSettings;
