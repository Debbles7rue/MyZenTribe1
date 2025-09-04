"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabaseClient";
import type { MapPin, MapCommunity } from "@/components/community/MapExplorerClient";

// Dynamically import the modal to avoid SSR issues
const AddPinModal = dynamic(
  () => import("@/components/community/AddPinModal"),
  { ssr: false }
);

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
  const [categorySearch, setCategorySearch] = useState("");

  useEffect(() => {
    loadMapData();
    // Only try to get location on the client side
    if (typeof window !== "undefined") {
      getUserLocation();
    }
  }, []);

  async function getUserLocation() {
    // Double-check we're on client side
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation([position.coords.latitude, position.coords.longitude]);
      },
      (error) => {
        console.log("Location access denied, using default");
      }
    );
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

  // Filter pins based on search and category
  const filteredPins = pins.filter(pin => {
    // Category filter (type-in search)
    if (categorySearch) {
      const categoryQuery = categorySearch.toLowerCase();
      const hasCategory = pin.categories?.some(cat => 
        cat.toLowerCase().includes(categoryQuery)
      ) || pin.name?.toLowerCase().includes(categoryQuery);
      
      if (!hasCategory) return false;
    }

    // Location/Zip search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        pin.name?.toLowerCase().includes(query) ||
        pin.address?.toLowerCase().includes(query) ||
        pin.categories?.some(cat => cat.toLowerCase().includes(query))
      );
    }

    return true;
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
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Communities Map</h1>
          <p className="text-gray-600">
            Discover meditation circles, drum circles, wellness events, and more in your area
          </p>
        </div>

        {/* Search and Controls */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col gap-4">
            {/* Top Row: Search fields */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Location/Zip Search */}
              <input
                type="text"
                placeholder="Search by zip, location, or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              
              {/* Category Search with Datalist */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  list="category-suggestions"
                  placeholder="Type category (e.g., drum circle, yoga...)"
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <datalist id="category-suggestions">
                  <option value="Drum Circles" />
                  <option value="Meditation" />
                  <option value="Yoga" />
                  <option value="Sound Baths" />
                  <option value="Breathwork" />
                  <option value="Wellness" />
                  <option value="Nature" />
                  <option value="Healing" />
                  <option value="Ecstatic Dance" />
                  <option value="Reiki" />
                  <option value="Qi Gong" />
                  <option value="Support Groups" />
                  <option value="Kirtan" />
                  <option value="Sacred Ceremony" />
                </datalist>
              </div>
            </div>

            {/* Bottom Row: Buttons and Stats */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddPin(true)}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                >
                  + Add Pin
                </button>
                <a
                  href="/communities"
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  Browse Communities
                </a>
              </div>

              {/* Stats and Clear Filters */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  {filteredPins.length} of {pins.length} locations
                </span>
                {categorySearch && (
                  <button
                    onClick={() => setCategorySearch("")}
                    className="text-sm text-purple-600 hover:text-purple-700"
                  >
                    Clear category ✕
                  </button>
                )}
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-sm text-purple-600 hover:text-purple-700"
                  >
                    Clear search ✕
                  </button>
                )}
              </div>
            </div>
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
          ) : filteredPins.length === 0 ? (
            <div className="bg-gray-50 rounded-xl" style={{ height: 560 }}>
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <div className="text-6xl mb-4">📍</div>
                <div className="text-xl font-semibold mb-2">No locations found</div>
                <div className="text-sm mb-4">
                  {categorySearch
                    ? `No ${categorySearch.toLowerCase()} locations in this area`
                    : "Try adjusting your search"}
                </div>
                <button
                  onClick={() => {
                    setCategorySearch("");
                    setSearchQuery("");
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Clear all filters
                </button>
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

        {/* Active Filter Notice */}
        {categorySearch && (
          <div className="mt-4 bg-purple-50 border border-purple-200 rounded-lg px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-purple-700">
                Filtering by category: <strong>{categorySearch}</strong>
              </span>
              <span className="text-purple-600">({filteredPins.length} locations)</span>
            </div>
            <button
              onClick={() => setCategorySearch("")}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              Show all →
            </button>
          </div>
        )}

        {/* Quick Tips */}
        <div className="mt-6 bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-semibold mb-3">Quick Tips</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600">
            <div>🔍 Click any pin to see details and contact info</div>
            <div>📍 Use search to find locations by zip or city</div>
            <div>🎯 Type any category to filter (drum, yoga, etc.)</div>
            <div>➕ Add your own wellness location to help others</div>
          </div>
        </div>
      </div>

      {/* Add Pin Modal - only render on client */}
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
