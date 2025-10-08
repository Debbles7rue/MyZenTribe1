// app/(protected)/calendar/components/carpool/CarpoolMap.tsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  MapPin, Car, Users, Star, Navigation, Shield, Eye, EyeOff,
  Info, RefreshCw, Maximize2, Minimize2, Layers, Route
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

interface MapLocation {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  location_type: 'driver' | 'rider' | 'pickup' | 'destination';
  latitude: number;
  longitude: number;
  accuracy_radius?: number; // For privacy - shows approximate area
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

// Google Maps types
declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
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
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid'>('roadmap');
  const [showMyLocation, setShowMyLocation] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);
  const directionsServiceRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);

  // Load Google Maps Script
  useEffect(() => {
    const loadGoogleMaps = () => {
      if (window.google) {
        initializeMap();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places,geometry`;
      script.async = true;
      script.defer = true;
      script.onload = initializeMap;
      document.head.appendChild(script);
    };

    loadGoogleMaps();
  }, []);

  // Initialize Map
  const initializeMap = useCallback(() => {
    if (!mapRef.current || !window.google) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: eventLocation,
      zoom: 12,
      mapTypeId: mapType,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ],
      mapTypeControl: !isMobile,
      fullscreenControl: !isMobile,
      streetViewControl: false
    });

    googleMapRef.current = map;
    directionsServiceRef.current = new window.google.maps.DirectionsService();
    directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
      map: map,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: '#4285F4',
        strokeOpacity: 0.8,
        strokeWeight: 4
      }
    });

    // Add event destination marker
    const destinationMarker = new window.google.maps.Marker({
      position: eventLocation,
      map: map,
      title: 'Event Destination',
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        fillColor: '#FFD700',
        fillOpacity: 1,
        strokeColor: '#FFA500',
        strokeWeight: 2,
        scale: 12
      },
      zIndex: 1000
    });

    const destinationInfo = new window.google.maps.InfoWindow({
      content: `
        <div class="p-2">
          <h4 class="font-bold">Event Destination</h4>
          <p class="text-sm">${eventLocation.address || 'Event location'}</p>
        </div>
      `
    });

    destinationMarker.addListener('click', () => {
      destinationInfo.open(map, destinationMarker);
    });

    markersRef.current.push(destinationMarker);
    setIsLoading(false);
  }, [eventLocation, mapType, isMobile]);

  // Load carpool locations
  const loadLocations = useCallback(async () => {
    try {
      // Load user locations from carpool_preferences and carpool_groups
      const { data: carpoolData, error } = await supabase
        .from('carpool_preferences')
        .select(`
          user_id,
          display_name,
          profile_picture_url,
          car_make,
          car_color,
          car_seats,
          license_plate,
          location_privacy,
          home_latitude,
          home_longitude,
          auto_share_location,
          willing_to_drive
        `)
        .in('user_id', await getCarpoolParticipants(eventId));

      if (error) throw error;

      // Transform data into MapLocation format
      const mapLocations: MapLocation[] = (carpoolData || [])
        .filter(user => user.auto_share_location && user.home_latitude && user.home_longitude)
        .map(user => ({
          id: user.user_id,
          user_id: user.user_id,
          user_name: user.display_name || 'Anonymous',
          user_avatar: user.profile_picture_url,
          location_type: user.willing_to_drive ? 'driver' : 'rider',
          latitude: user.home_latitude,
          longitude: user.home_longitude,
          accuracy_radius: getAccuracyRadius(user.location_privacy),
          privacy_level: user.location_privacy || 'area',
          is_live: false,
          car_details: user.willing_to_drive ? {
            make: user.car_make,
            color: user.car_color,
            seats: user.car_seats,
            license_plate: user.location_privacy === 'full' ? user.license_plate : undefined
          } : undefined,
          status: 'confirmed'
        }));

      setLocations(mapLocations);
      updateMapMarkers(mapLocations);

      // Subscribe to real-time updates
      const subscription = supabase
        .channel(`carpool-locations-${eventId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'carpool_live_locations',
          filter: `event_id=eq.${eventId}`
        }, payload => {
          loadLocations(); // Reload on changes
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error('Error loading locations:', error);
      showToast?.({ type: 'error', message: 'Failed to load carpool locations' });
    }
  }, [eventId, showToast]);

  // Get carpool participants for this event
  const getCarpoolParticipants = async (eventId: string): Promise<string[]> => {
    const { data } = await supabase
      .from('carpool_groups')
      .select('participants, driver_id')
      .eq('event_id', eventId);

    const participants = new Set<string>();
    data?.forEach(group => {
      participants.add(group.driver_id);
      if (group.participants) {
        const parsed = JSON.parse(group.participants);
        parsed.forEach((p: string) => participants.add(p));
      }
    });

    return Array.from(participants);
  };

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

  // Update markers on map
  const updateMapMarkers = useCallback((locations: MapLocation[]) => {
    if (!googleMapRef.current || !window.google) return;

    // Clear existing markers (except destination)
    markersRef.current.slice(1).forEach(marker => marker.setMap(null));
    markersRef.current = [markersRef.current[0]]; // Keep destination marker

    // Add new markers
    locations.forEach(location => {
      if (location.privacy_level === 'hidden') return;

      // Adjust position slightly for privacy if needed
      const position = location.accuracy_radius > 0 ? 
        offsetLocation(location.latitude, location.longitude, location.accuracy_radius) :
        { lat: location.latitude, lng: location.longitude };

      // Create custom marker icon
      const icon = getMarkerIcon(location);

      const marker = new window.google.maps.Marker({
        position,
        map: googleMapRef.current,
        title: location.user_name,
        icon,
        animation: location.is_live ? window.google.maps.Animation.BOUNCE : undefined
      });

      // Create info window content
      const infoContent = `
        <div class="p-3 min-w-[200px]">
          <div class="flex items-center gap-2 mb-2">
            ${location.user_avatar ? 
              `<img src="${location.user_avatar}" alt="${location.user_name}" class="w-10 h-10 rounded-full">` :
              `<div class="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                ${location.user_name.charAt(0).toUpperCase()}
              </div>`
            }
            <div>
              <h4 class="font-bold">${location.user_name}</h4>
              <p class="text-xs text-gray-500">${location.location_type === 'driver' ? 'Driver' : 'Needs ride'}</p>
            </div>
          </div>
          ${location.car_details ? `
            <div class="text-sm">
              <p><strong>Car:</strong> ${location.car_details.color} ${location.car_details.make}</p>
              <p><strong>Seats:</strong> ${location.car_details.seats} available</p>
              ${location.car_details.license_plate ? `<p><strong>Plate:</strong> ${location.car_details.license_plate}</p>` : ''}
            </div>
          ` : ''}
          ${location.accuracy_radius > 0 ? `
            <p class="text-xs text-gray-500 mt-2">
              <em>Location approximate (±${location.accuracy_radius}m)</em>
            </p>
          ` : ''}
          ${location.is_live ? `
            <p class="text-xs text-green-500 mt-1">
              Live location • ${new Date(location.last_updated || '').toLocaleTimeString()}
            </p>
          ` : ''}
        </div>
      `;

      const infoWindow = new window.google.maps.InfoWindow({
        content: infoContent
      });

      marker.addListener('click', () => {
        // Close previous info window
        if (infoWindowRef.current) {
          infoWindowRef.current.close();
        }
        infoWindow.open(googleMapRef.current, marker);
        infoWindowRef.current = infoWindow;
        setSelectedLocation(location);
        
        // Show route to destination
        if (location.location_type === 'driver') {
          calculateRoute(position, eventLocation);
        }
      });

      markersRef.current.push(marker);
    });

    // Fit bounds to show all markers
    if (markersRef.current.length > 1) {
      const bounds = new window.google.maps.LatLngBounds();
      markersRef.current.forEach(marker => {
        bounds.extend(marker.getPosition());
      });
      googleMapRef.current.fitBounds(bounds);
    }
  }, [eventLocation]);

  // Get custom marker icon based on location type
  const getMarkerIcon = (location: MapLocation) => {
    if (!window.google) return null;

    const colors = {
      driver: '#10B981', // Green
      rider: '#3B82F6', // Blue
      pickup: '#8B5CF6', // Purple
      destination: '#F59E0B' // Orange
    };

    const icons = {
      driver: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z',
      rider: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
      pickup: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
      destination: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'
    };

    return {
      path: window.google.maps.SymbolPath.CIRCLE,
      fillColor: colors[location.location_type],
      fillOpacity: location.privacy_level === 'full' ? 1 : 0.6,
      strokeColor: '#FFFFFF',
      strokeWeight: 2,
      scale: location.location_type === 'driver' ? 10 : 8
    };
  };

  // Offset location for privacy
  const offsetLocation = (lat: number, lng: number, radiusMeters: number) => {
    const earthRadius = 6371000; // Earth's radius in meters
    const offsetLat = (Math.random() - 0.5) * (radiusMeters / earthRadius) * (180 / Math.PI);
    const offsetLng = (Math.random() - 0.5) * (radiusMeters / earthRadius) * (180 / Math.PI) / Math.cos(lat * Math.PI / 180);
    
    return {
      lat: lat + offsetLat,
      lng: lng + offsetLng
    };
  };

  // Calculate route
  const calculateRoute = (origin: any, destination: any) => {
    if (!directionsServiceRef.current || !directionsRendererRef.current) return;

    directionsServiceRef.current.route({
      origin,
      destination,
      travelMode: window.google.maps.TravelMode.DRIVING,
      unitSystem: window.google.maps.UnitSystem.IMPERIAL
    }, (result: any, status: any) => {
      if (status === 'OK') {
        directionsRendererRef.current.setDirections(result);
        
        // Display route info
        const route = result.routes[0];
        const duration = route.legs[0].duration.text;
        const distance = route.legs[0].distance.text;
        
        showToast?.({
          type: 'info',
          message: `Route: ${distance}, ${duration}`
        });
      }
    });
  };

  // Share my current location
  const shareMyLocation = async () => {
    if (!navigator.geolocation) {
      showToast?.({ type: 'error', message: 'Geolocation not supported' });
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
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

        if (error) throw error;
        
        showToast?.({ type: 'success', message: 'Location shared!' });
        loadLocations();
      } catch (error) {
        console.error('Error sharing location:', error);
        showToast?.({ type: 'error', message: 'Failed to share location' });
      }
    }, (error) => {
      showToast?.({ type: 'error', message: 'Could not get your location' });
    });
  };

  // Auto-refresh locations
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(loadLocations, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, loadLocations]);

  // Initial load
  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  return (
    <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50' : 'h-96 rounded-lg overflow-hidden'}`}>
      {/* Map Container */}
      <div ref={mapRef} className="w-full h-full" />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="animate-spin mx-auto mb-2" size={32} />
            <p>Loading map...</p>
          </div>
        </div>
      )}

      {/* Map Controls */}
      <div className="absolute top-4 left-4 flex flex-col gap-2">
        {/* Privacy Info Button */}
        <button
          onClick={() => setShowPrivacyInfo(!showPrivacyInfo)}
          className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
          title="Privacy Info"
        >
          <Shield size={20} className="text-blue-600" />
        </button>

        {/* My Location Button */}
        {showMyLocation && (
          <button
            onClick={shareMyLocation}
            className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
            title="Share My Location"
          >
            <Navigation size={20} className="text-green-600" />
          </button>
        )}

        {/* Map Type Toggle */}
        <button
          onClick={() => setMapType(mapType === 'roadmap' ? 'satellite' : 'roadmap')}
          className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
          title="Toggle Map Type"
        >
          <Layers size={20} className="text-gray-600" />
        </button>

        {/* Fullscreen Toggle */}
        {!isMobile && (
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3">
        <h4 className="font-semibold text-sm mb-2">Legend</h4>
        <div className="space-y-1 text-xs">
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
        </div>
      </div>

      {/* Auto-refresh indicator */}
      <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg px-3 py-2">
        <label className="flex items-center gap-2 text-sm">
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

      {/* Privacy Info Modal */}
      {showPrivacyInfo && (
        <div className="absolute top-16 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 max-w-xs z-10">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Shield size={16} className="text-blue-600" />
            Location Privacy
          </h3>
          <div className="text-sm space-y-2">
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
            className="mt-3 w-full px-3 py-1 bg-blue-500 text-white rounded text-sm"
          >
            Got it
          </button>
        </div>
      )}
    </div>
  );
};

export default CarpoolMap;
