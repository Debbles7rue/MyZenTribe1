"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabaseClient";
import type { MapPin, MapCommunity } from "@/components/community/MapExplorerClient";
import AddPinModal from "@/components/community/AddPinModal";

// Dynamic import to avoid SSR issues with Leaflet
const MapExplorerClient = dynamic(
  () => import("@/components/community/MapExplorerClient"),
  { 
    ssr: false,
    loading: () => (
      <div className="bg-gray-100 rounded-xl animate-pulse" style={{ height: 560 }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">Loading map...</div>
        </div>
      </div>
    )
  }
);

export default function MapPage() {
  const [pins, setPins] = useState<MapPin[]>([]);
  const [communities, setCommunities] = useState<MapCommunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddPin, setShowAddPin] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number]>([32.7767, -96.7970]); // Default to Dallas
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadMapData();
    getUserLocation();
  }, []);

  async function getUserLocation() {
    // Try to get user's location
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.log("Location access denied, using default");
        }
      );
    }
  }

  async function loadMapData() {
    setLoading(true);
    
    try {
      // Load community circles (pins on the map)
      const { data: circlesData, error: circlesError } = await supabase
        .from("community_circles")
        .select(`
          id,
          community_id,
          name,
          lat,
          lng,
          address,
          categories,
          contact_phone,
          contact_email,
          website_url
        `)
        .order("created_at", { ascending: false });

      if (circlesError) {
        console.error("Error loading circles:", circlesError);
      }

      // Load communities data
      const { data: communitiesData, error: communitiesError } = await supabase
        .from("communities")
        .select("id, name, description, tags");

      if (communitiesError) {
        console.error("Error loading communities:", communitiesError);
      }

      // Transform data for the map
      const mapPins: MapPin[] = (circlesData || []).map(circle => ({
        id: circle.id,
        community_id: circle.community_id || "",
        name: circle.name,
        lat: circle.lat,
        lng: circle.lng,
        address: circle.address,
        categories: circle.categories,
        contact_phone: circle.contact_phone,
        contact_email: circle.contact_email,
        website_url: circle.website_url,
      }));

      const mapCommunities: MapCommunity[] = (communitiesData || []).map(comm => ({
        id: comm.id,
        title: comm.name,
        category: comm.tags?.[0] || null, // Use first tag as category
      }));

      setPins(mapPins);
      setCommunities(mapCommunities);
    } catch (error) {
      console.error("Error loading map data:", error);
    } finally {
      setLoading(false);
    }
  }

  // Filter pins based on search
  const filteredPins = pins.filter(pin => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      pin.name?.toLowerCase().includes(query) ||
      pin.address?.toLowerCase().includes(query) ||
      pin.categories?.some(cat => cat.toLowerCase().includes(query))
    );
  });

  // Convert communities array to object for MapExplorerClient
  const communitiesById = communities.reduce((acc, comm) => {
    acc[comm.id] = comm;
    return acc;
  }, {} as Record<string, MapCommunity>);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EDE7F6] to-[#F6EFE5]">
      <div className="container-app py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Community Map</h1>
          <p className="text-gray-600">
            Discover meditation circles, drum circles, wellness events, and more in your area
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <input
              type="text"
              placeholder="Search by name, location, or activity..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            
            {/* Add Pin Button */}
            <button
              onClick={() => setShowAddPin(true)}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              + Add Location
            </button>
          </div>

          {/* Stats */}
          <div className="flex gap-6 mt-4 text-sm text-gray-600">
            <span>{filteredPins.length} locations</span>
            <span>{communities.length} communities</span>
          </div>
        </div>

        {/* Map */}
        <div className="bg-white rounded-xl shadow-md p-4">
          {loading ? (
            <div className="bg-gray-100 rounded-xl animate-pulse" style={{ height: 560 }}>
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-500">Loading map data...</div>
              </div>
            </div>
          ) : (
            <MapExplorerClient
              center={userLocation}
              pins={filteredPins}
              communitiesById={communitiesById}
              height={560}
            />
          )}
        </div>

        {/* Legend */}
        <div className="mt-6 bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-semibold mb-3">Map Legend</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-600 rounded-full"></div>
              <span>Community Events</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-600 rounded-full"></div>
              <span>Wellness Centers</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-600 rounded-full"></div>
              <span>Meditation Spaces</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-600 rounded-full"></div>
              <span>Drum Circles</span>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-purple-50 border border-purple-200 rounded-xl p-4">
          <h3 className="font-semibold text-purple-900 mb-2">How to Use the Map</h3>
          <ul className="space-y-1 text-sm text-purple-700">
            <li>• Click on any pin to see details and contact information</li>
            <li>• Use the search bar to find specific activities or locations</li>
            <li>• Click "Add Location" to add your own meditation or wellness space</li>
            <li>• Zoom in to see locations in your specific area</li>
          </ul>
        </div>
      </div>

      {/* Add Pin Modal */}
      {showAddPin && (
        <AddPinModal
          communities={communities}
          onClose={() => setShowAddPin(false)}
          onSaved={() => {
            setShowAddPin(false);
            loadMapData(); // Refresh the map
          }}
        />
      )}
    </div>
  );
}
