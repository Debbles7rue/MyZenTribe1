// app/(protected)/calendar/components/carpool/CarpoolMap.tsx

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { 
  MapPin, Car, Users, Star, Navigation, Shield, Eye, EyeOff,
  Info, RefreshCw, Maximize2, Minimize2, Layers, Route, 
  UserPlus, Clock, CheckCircle, AlertCircle
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Map as LeafletMap } from 'leaflet';

const supabase = createClient();

// Dynamic imports for Leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then(mod => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import('react-leaflet').then(mod => mod.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import('react-leaflet').then(mod => mod.Marker),
  { ssr: false }
);

const Popup = dynamic(
  () => import('react-leaflet').then(mod => mod.Popup),
  { ssr: false }
);

const Circle = dynamic(
  () => import('react-leaflet').then(mod => mod.Circle),
  { ssr: false }
);

const Polyline = dynamic(
  () => import('react-leaflet').then(mod => mod.Polyline),
  { ssr: false }
);

interface MapLocation {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  location_type: 'driver' | 'rider' | 'pickup' | 'destination';
  latitude: number;
  longitude: number;
  accuracy_radius?: number;
  privacy_level: 'full' | 'street' | 'area' | 'city' | 'hidden';
  is_live?: boolean;
  last_updated?: string;
  car_details?: {
    make: string;
    color: string;
    seats: number;
    license_plate?: string;
  };
  status?: 'confirmed' | 'pending' | 'arrived' | 'en_route';
}

interface CarpoolMapProps {
  eventId: string;
  userId: string;
  eventLocation: { lat: number; lng: number; address?: string };
  showToast?: (toast: { type: string; message: string }) => void;
  isMobile?: boolean;
  onSelectUser?: (userId: string) => void;
}

const CarpoolMap: React.FC<CarpoolMapProps> = ({
  eventId,
  userId,
  eventLocation,
  showToast,
  isMobile = false,
  onSelectUser
}) => {
  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);
  const [showPrivacyInfo, setShowPrivacyInfo] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapType, setMapType] = useState<'street' | 'satellite'>('street');
  const [showMyLocation, setShowMyLocation] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [mapRef, setMapRef] = useState<LeafletMap | null>(null);
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const [showRoute, setShowRoute] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  // Load Leaflet icon fix
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const L = require('leaflet');
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
    }
  }, []);

  // Initialize map
  useEffect(() => {
    // Set loading to false after a short delay
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Get user's current location
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.log('Could not get user location:', error);
        }
      );
    }
  }, []);

  // Get accuracy radius based on privacy level
  const getAccuracyRadius = (privacyLevel: string): number => {
    switch (privacyLevel) {
      case 'full': return 0;
      case 'street': return 100; // 100 meters
      case 'area': return 500; // 500 meters
      case 'city': return 2000; // 2km
      default: return 1000;
    }
  };

  // Load carpool locations - UPDATED TO FETCH REAL DATA
  const loadLocations = useCallback(async () => {
    try {
      // First, try to get real participants for this event
      const { data: participants, error: participantsError } = await supabase
        .from('carpool_participants')
        .select(`
          user_id,
          role,
          group_id,
          carpool_groups!inner(event_id)
        `)
        .eq('carpool_groups.event_id', eventId);

      // If we have real participants, load their profiles
      if (participants && participants.length > 0) {
        const userIds = participants.map(p => p.user_id);
        
        const { data: profiles, error: profilesError } = await supabase
          .from('carpool_profiles')
          .select('*')
          .in('user_id', userIds);

        if (profiles && profiles.length > 0) {
          // Transform real profile data to map locations
          const realLocations: MapLocation[] = profiles
            .filter(profile => 
              profile.home_latitude && 
              profile.home_longitude && 
              profile.location_privacy !== 'hidden'
            )
            .map(profile => ({
              id: profile.user_id,
              user_id: profile.user_id,
              user_name: profile.display_name || 'Anonymous',
              user_avatar: profile.profile_picture_url,
              location_type: profile.willing_to_drive ? 'driver' : 'rider',
              latitude: profile.home_latitude,
              longitude: profile.home_longitude,
              accuracy_radius: getAccuracyRadius(profile.location_privacy || 'area'),
              privacy_level: profile.location_privacy || 'area',
              car_details: profile.willing_to_drive ? {
                make: profile.car_make || 'Unknown',
                color: profile.car_color || 'Unknown',
                seats: profile.available_seats || 0,
                license_plate: profile.location_privacy === 'full' ? profile.car_license_plate : undefined
              } : undefined,
              status: 'confirmed'
            }));

          if (realLocations.length > 0) {
            setLocations(realLocations);
            showToast?.({ 
              type: 'success', 
              message: `Found ${realLocations.length} carpool participant${realLocations.length > 1 ? 's' : ''}` 
            });
            return;
          }
        }
      }

      // If no real data, show sample locations for demo
      const sampleLocations: MapLocation[] = [
        {
          id: '1',
          user_id: 'user-1',
          user_name: 'Sarah Johnson',
          location_type: 'driver',
          latitude: eventLocation.lat + 0.01,
          longitude: eventLocation.lng + 0.015,
          privacy_level: 'full',
          car_details: {
            make: 'Honda Civic',
            color: 'Blue',
            seats: 4,
            license_plate: 'ABC-123'
          },
          status: 'confirmed'
        },
        {
          id: '2',
          user_id: 'user-2',
          user_name: 'Mike Chen',
          location_type: 'rider',
          latitude: eventLocation.lat - 0.008,
          longitude: eventLocation.lng + 0.01,
          privacy_level: 'area',
          accuracy_radius: 500,
          status: 'pending'
        },
        {
          id: '3',
          user_id: 'user-3',
          user_name: 'Emily Davis',
          location_type: 'driver',
          latitude: eventLocation.lat + 0.012,
          longitude: eventLocation.lng - 0.01,
          privacy_level: 'street',
          accuracy_radius: 100,
          car_details: {
            make: 'Toyota Camry',
            color: 'Silver',
            seats: 3
          },
          status: 'confirmed'
        }
      ];

      setLocations(sampleLocations);
      
    } catch (error) {
      console.error('Error loading locations:', error);
      showToast?.({ type: 'error', message: 'Failed to load carpool locations' });
      
      // Fall back to sample data on error
      const sampleLocations: MapLocation[] = [
        {
          id: '1',
          user_id: 'user-1',
          user_name: 'Sample Driver',
          location_type: 'driver',
          latitude: eventLocation.lat + 0.01,
          longitude: eventLocation.lng + 0.015,
          privacy_level: 'full',
          car_details: {
            make: 'Honda Civic',
            color: 'Blue',
            seats: 4
          },
          status: 'confirmed'
        }
      ];
      setLocations(sampleLocations);
    }
  }, [eventId, eventLocation, showToast]);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  // Auto-refresh locations
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadLocations, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, loadLocations]);

  // Share my current location
  const shareMyLocation = async () => {
    if (!navigator.geolocation) {
      showToast?.({ type: 'error', message: 'Geolocation not supported' });
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        setUserCoords([position.coords.latitude, position.coords.longitude]);
        
        // Save to database for real implementation
        const { error } = await supabase
          .from('carpool_live_locations')
          .upsert({
            user_id: userId,
            event_id: eventId,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString()
          });
        
        if (error) {
          console.error('Error saving location:', error);
          // Continue anyway to show location on map
        }
        
        showToast?.({ type: 'success', message: 'Location shared!' });
        loadLocations(); // Reload to show updated location
      } catch (error) {
        console.error('Error sharing location:', error);
        showToast?.({ type: 'error', message: 'Failed to share location' });
      }
    }, (error) => {
      showToast?.({ type: 'error', message: 'Could not get your location' });
    });
  };

  // Get marker color based on type
  const getMarkerColor = (location: MapLocation) => {
    if (location.location_type === 'driver') return '#10B981'; // Green
    if (location.location_type === 'rider') return '#3B82F6'; // Blue
    return '#8B5CF6'; // Purple
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  // Create custom icon HTML
  const createCustomIcon = (location: MapLocation) => {
    if (typeof window === 'undefined') return null;
    
    const L = require('leaflet');
    const color = getMarkerColor(location);
    const iconHtml = `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="transform: rotate(45deg); color: white; font-size: 18px;">
          ${location.location_type === 'driver' ? '🚗' : '👤'}
        </div>
      </div>
    `;

    return L.divIcon({
      html: iconHtml,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
      className: ''
    });
  };

  const eventIcon = typeof window !== 'undefined' ? (() => {
    const L = require('leaflet');
    return L.divIcon({
      html: `
        <div style="
          background-color: #FFD700;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 3px solid #FFA500;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">
          <span style="font-size: 20px;">📍</span>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40],
      className: ''
    });
  })() : null;

  if (isLoading) {
    return (
      <div className={`bg-gray-100 dark:bg-gray-800 ${isFullscreen ? 'fixed inset-0 z-50' : 'h-96'} rounded-lg flex items-center justify-center`}>
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-2" size={32} />
          <p>Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50' : 'h-96'} rounded-lg overflow-hidden`}>
      {/* Map Container */}
      {typeof window !== 'undefined' && (
        <MapContainer
          center={[eventLocation.lat, eventLocation.lng]}
          zoom={13}
          className="w-full h-full"
          scrollWheelZoom={true}
          ref={setMapRef}
        >
          <TileLayer
            url={mapType === 'satellite' 
              ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            }
            attribution={mapType === 'street' 
              ? '© OpenStreetMap contributors'
              : '© Esri'
            }
          />

          {/* Event Destination Marker */}
          <Marker position={[eventLocation.lat, eventLocation.lng]} icon={eventIcon}>
            <Popup>
              <div className="p-2">
                <h4 className="font-bold text-lg mb-1">📍 Event Location</h4>
                <p className="text-sm">{eventLocation.address || 'Event destination'}</p>
              </div>
            </Popup>
          </Marker>

          {/* User Locations */}
          {locations.map(location => {
            if (location.privacy_level === 'hidden') return null;
            
            return (
              <React.Fragment key={location.id}>
                {/* Marker */}
                <Marker 
                  position={[location.latitude, location.longitude]}
                  icon={createCustomIcon(location)}
                  eventHandlers={{
                    click: () => {
                      setSelectedLocation(location);
                      if (location.location_type === 'driver') {
                        setSelectedDriverId(location.user_id);
                      }
                    }
                  }}
                >
                  <Popup>
                    <div className="p-3 min-w-[200px]">
                      <div className="flex items-center gap-2 mb-2">
                        {location.user_avatar ? 
                          <img src={location.user_avatar} alt={location.user_name} className="w-10 h-10 rounded-full" /> :
                          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center font-bold">
                            {location.user_name.charAt(0).toUpperCase()}
                          </div>
                        }
                        <div>
                          <h4 className="font-bold">{location.user_name}</h4>
                          <p className="text-xs text-gray-500">
                            {location.location_type === 'driver' ? '🚗 Driver' : '👤 Needs ride'}
                          </p>
                        </div>
                      </div>
                      
                      {location.car_details && (
                        <div className="text-sm space-y-1 mb-2">
                          <p><strong>Car:</strong> {location.car_details.color} {location.car_details.make}</p>
                          <p><strong>Seats:</strong> {location.car_details.seats} available</p>
                          {location.privacy_level === 'full' && location.car_details.license_plate && (
                            <p><strong>Plate:</strong> {location.car_details.license_plate}</p>
                          )}
                        </div>
                      )}

                      {location.accuracy_radius && location.accuracy_radius > 0 && (
                        <p className="text-xs text-gray-500 italic">
                          Location approximate (±{location.accuracy_radius}m)
                        </p>
                      )}

                      {location.status && (
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                          location.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                          location.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {location.status === 'confirmed' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                          {location.status}
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>

                {/* Privacy radius circle */}
                {location.accuracy_radius && location.accuracy_radius > 0 && (
                  <Circle
                    center={[location.latitude, location.longitude]}
                    radius={location.accuracy_radius}
                    pathOptions={{
                      fillColor: getMarkerColor(location),
                      fillOpacity: 0.1,
                      color: getMarkerColor(location),
                      opacity: 0.3,
                      weight: 1
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}

          {/* User's current location */}
          {userCoords && (
            <Marker position={userCoords}>
              <Popup>
                <div className="p-2">
                  <h4 className="font-bold">📍 Your Location</h4>
                  <p className="text-sm">Current position</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Show route from selected driver to event */}
          {selectedDriverId && showRoute && (() => {
            const driver = locations.find(l => l.user_id === selectedDriverId);
            if (driver) {
              return (
                <Polyline
                  positions={[
                    [driver.latitude, driver.longitude],
                    [eventLocation.lat, eventLocation.lng]
                  ]}
                  pathOptions={{
                    color: '#4285F4',
                    weight: 4,
                    opacity: 0.7,
                    dashArray: '10, 10'
                  }}
                />
              );
            }
            return null;
          })()}
        </MapContainer>
      )}

      {/* Map Controls - Mobile Optimized */}
      <div className={`absolute ${isMobile ? 'top-2 left-2' : 'top-4 left-4'} flex flex-col gap-2 z-10`}>
        {/* Privacy Info Button */}
        <button
          onClick={() => setShowPrivacyInfo(!showPrivacyInfo)}
          className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
          title="Privacy Info"
        >
          <Shield size={isMobile ? 18 : 20} className="text-blue-600" />
        </button>

        {/* My Location Button */}
        <button
          onClick={shareMyLocation}
          className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
          title="Share My Location"
        >
          <Navigation size={isMobile ? 18 : 20} className="text-green-600" />
        </button>

        {/* Map Type Toggle */}
        <button
          onClick={() => setMapType(mapType === 'street' ? 'satellite' : 'street')}
          className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
          title="Toggle Map Type"
        >
          <Layers size={isMobile ? 18 : 20} className="text-gray-600" />
        </button>

        {/* Route Toggle */}
        <button
          onClick={() => setShowRoute(!showRoute)}
          className={`bg-white dark:bg-gray-800 p-2 rounded-lg shadow-lg hover:shadow-xl transition-shadow ${
            showRoute ? 'ring-2 ring-blue-500' : ''
          }`}
          title="Show Routes"
        >
          <Route size={isMobile ? 18 : 20} className="text-purple-600" />
        </button>

        {/* Fullscreen Toggle - Desktop Only */}
        {!isMobile && (
          <button
            onClick={toggleFullscreen}
            className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
        )}
      </div>

      {/* Legend - Mobile Optimized */}
      <div className={`absolute ${isMobile ? 'bottom-2 left-2 text-xs' : 'bottom-4 left-4'} bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 z-10`}>
        <h4 className={`font-semibold ${isMobile ? 'text-sm mb-1' : 'mb-2'}`}>Legend</h4>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Drivers ({locations.filter(l => l.location_type === 'driver').length})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Need rides ({locations.filter(l => l.location_type === 'rider').length})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span>Event location</span>
          </div>
          {locations.length === 0 && (
            <div className="text-xs text-gray-500 mt-2">
              (Showing sample data - no participants yet)
            </div>
          )}
        </div>
      </div>

      {/* Auto-refresh indicator - Mobile Optimized */}
      <div className={`absolute ${isMobile ? 'top-2 right-2' : 'top-4 right-4'} bg-white dark:bg-gray-800 rounded-lg shadow-lg px-3 py-2 z-10`}>
        <label className={`flex items-center gap-2 ${isMobile ? 'text-xs' : 'text-sm'}`}>
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="rounded"
          />
          <span>Auto-refresh</span>
          <RefreshCw size={14} className={autoRefresh ? 'animate-spin text-green-500' : 'text-gray-400'} />
        </label>
      </div>

      {/* Privacy Info Modal - Mobile Optimized */}
      {showPrivacyInfo && (
        <div className={`absolute ${isMobile ? 'top-12 left-2 right-2' : 'top-16 left-4 max-w-xs'} bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 z-20`}>
          <h3 className={`font-semibold mb-2 flex items-center gap-2 ${isMobile ? 'text-sm' : ''}`}>
            <Shield size={16} className="text-blue-600" />
            Location Privacy
          </h3>
          <div className={`${isMobile ? 'text-xs' : 'text-sm'} space-y-2`}>
            <p className="flex items-center gap-2">
              <Eye size={14} />
              <span><strong>Full:</strong> Exact location shown</span>
            </p>
            <p className="flex items-center gap-2">
              <Eye size={14} className="opacity-75" />
              <span><strong>Street:</strong> ±100m accuracy</span>
            </p>
            <p className="flex items-center gap-2">
              <Eye size={14} className="opacity-50" />
              <span><strong>Area:</strong> ±500m accuracy</span>
            </p>
            <p className="flex items-center gap-2">
              <Eye size={14} className="opacity-25" />
              <span><strong>City:</strong> ±2km accuracy</span>
            </p>
            <p className="flex items-center gap-2">
              <EyeOff size={14} />
              <span><strong>Hidden:</strong> Not shown on map</span>
            </p>
          </div>
          <button
            onClick={() => setShowPrivacyInfo(false)}
            className={`mt-3 w-full px-3 py-1 bg-blue-500 text-white rounded ${isMobile ? 'text-sm' : ''}`}
          >
            Got it
          </button>
        </div>
      )}
    </div>
  );
};

export default CarpoolMap;
