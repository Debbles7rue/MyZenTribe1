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

// Popular categories for quick filtering
const CATEGORIES = [
  { value: "all", label: "All", emoji: "🌟" },
  { value: "drum circle", label: "Drum Circles", emoji: "🥁" },
  { value: "meditation", label: "Meditation", emoji: "🧘" },
  { value: "yoga", label: "Yoga", emoji: "🧘‍♀️" },
  { value: "sound bath", label: "Sound Baths", emoji: "🔔" },
  { value: "breathwork", label: "Breathwork", emoji: "💨" },
  { value: "wellness", label: "Wellness", emoji: "💚" },
  { value: "nature", label: "Nature", emoji: "🌿" },
];

export default function MapPage() {
  const [pins, setPins] = useState<MapPin[]>([]);
  const [communities, setCommunities] = useState<MapCommunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddPin, setShowAddPin] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number]>([32.7767, -96.7970]); // Default to Dallas
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

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
    // Category filter
    if (selectedCategory !== "all") {
      const hasCategory = pin.categories?.some(cat => 
        cat.toLowerCase().includes(selectedCategory.toLowerCase())
      ) || pin.name?.toLowerCase().includes(selectedCategory.toLowerCase());
      
      if (!hasCategory) return false;
    }

    // Search filter
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

  // Handle category button click
  const handleCategoryClick = (category: string) => {
    if (selectedCategory === category && category !== "all") {
      // If clicking the same category, toggle it off (show all)
      setSelectedCategory("all");
    } else {
      setSelectedCategory(category);
    }
    setSearchQuery(""); // Clear search when using category filters
  };

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

        {/* Category Filter Buttons */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => handleCategoryClick(cat.value)}
                className={`px-4 py-2 rounded-full transition-all ${
                  selectedCategory === cat.value
                    ? "bg-purple-600 text-white shadow-md transform scale-105"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
              >
                <span className="mr-1">{cat.emoji}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search and Controls */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <input
              type="text"
              placeholder="Search by name or location..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedCategory("all"); // Clear category filter when searching
              }}
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

          {/* Stats and Active Filter */}
          <div className="flex justify-between items-center mt-4">
            <div className="flex gap-6 text-sm text-gray-600">
              <span>{filteredPins.length} of {pins.length} locations</span>
              <span>{communities.length} communities</span>
            </div>
            {(selectedCategory !== "all" || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedCategory("all");
                  setSearchQuery("");
                }}
                className="text-sm text-purple-600 hover:text-purple-700"
              >
                Clear filters ✕
              </button>
            )}
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
                  {selectedCategory !== "all" 
                    ? `No ${CATEGORIES.find(c => c.value === selectedCategory)?.label.toLowerCase()} in this area`
                    : "Try adjusting your search"}
                </div>
                <button
                  onClick={() => {
                    setSelectedCategory("all");
                    setSearchQuery("");
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Show all locations
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
        {selectedCategory !== "all" && (
          <div className="mt-4 bg-purple-50 border border-purple-200 rounded-lg px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-purple-700">
                Showing: <strong>{CATEGORIES.find(c => c.value === selectedCategory)?.label}</strong>
              </span>
              <span className="text-purple-600">({filteredPins.length} locations)</span>
            </div>
            <button
              onClick={() => setSelectedCategory("all")}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              Show all →
            </button>
          </div>
        )}

        {/* Legend */}
        <div className="mt-6 bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-semibold mb-3">Quick Tips</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600">
            <div>🔍 Click any pin to see details and contact info</div>
            <div>🎯 Use category buttons for quick filtering</div>
            <div>📍 Zoom in/out to explore different areas</div>
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
