"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import dynamic from "next/dynamic";

// Dynamic import of map to avoid SSR issues
const MapExplorerClient = dynamic(
  () => import("@/components/community/MapExplorerClient"),
  { 
    ssr: false,
    loading: () => (
      <div className="bg-gray-100 rounded-xl animate-pulse" style={{ height: 400 }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">Loading map...</div>
        </div>
      </div>
    )
  }
);

interface Community {
  id: string;
  title: string;
  about: string | null;
  category: string | null;
  zip: string | null;
  visibility: string;
  photo_url: string | null;
  cover_url: string | null;
  created_at: string;
  created_by: string;
  member_count?: number;
}

interface MapPin {
  id: string;
  community_id: string;
  name: string | null;
  lat: number;
  lng: number;
  address: string | null;
  categories?: string[] | null;
  contact_phone: string | null;
  contact_email: string | null;
  website_url: string | null;
}

// Main categories with subcategories
const CATEGORY_STRUCTURE = {
  "Wellness": [
    "Yoga",
    "Meditation", 
    "Breathwork",
    "Qi Gong",
    "Tai Chi",
    "Reiki",
    "Sound Healing",
    "Energy Work"
  ],
  "Music & Sound": [
    "Drum Circle",
    "Sound Bath",
    "Kirtan",
    "Singing Circle",
    "Music Jam",
    "Ecstatic Dance"
  ],
  "Spiritual": [
    "Spiritual Growth",
    "Sacred Ceremony",
    "Prayer Circle",
    "Mindfulness",
    "Buddhist",
    "Christian",
    "Interfaith"
  ],
  "Support": [
    "Recovery",
    "Grief Support",
    "Men's Circle",
    "Women's Circle",
    "Parenting",
    "Mental Health"
  ],
  "Creative": [
    "Art & Creativity",
    "Writing",
    "Poetry",
    "Crafts",
    "Photography",
    "Dance"
  ],
  "Nature": [
    "Nature Walks",
    "Community Garden",
    "Environmental",
    "Hiking",
    "Outdoor Activities"
  ],
  "Learning": [
    "Workshops",
    "Book Club",
    "Language Exchange",
    "Skills Sharing",
    "Lectures"
  ]
};

// Flatten categories for search
const ALL_CATEGORIES = Object.entries(CATEGORY_STRUCTURE).flatMap(([main, subs]) => 
  [main, ...subs]
);

export default function CommunitiesPage() {
  const router = useRouter();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [zipFilter, setZipFilter] = useState("");
  const [radiusFilter, setRadiusFilter] = useState("exact");
  const [showPrivate, setShowPrivate] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userMemberships, setUserMemberships] = useState<Set<string>>(new Set());
  
  // Map related state
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [mapPins, setMapPins] = useState<MapPin[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number]>([32.7767, -96.7970]); // Default Dallas
  const [mapLoading, setMapLoading] = useState(true);

  useEffect(() => {
    loadUser();
    loadCommunities();
    loadMapData();
    getUserLocation();
  }, []);

  async function getUserLocation() {
    if (typeof window !== "undefined" && "geolocation" in navigator) {
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
    setMapLoading(true);
    
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

      // Transform data for the map
      const pins: MapPin[] = (circlesData || []).map(circle => ({
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

      setMapPins(pins);
    } catch (error) {
      console.error("Error loading map data:", error);
    } finally {
      setMapLoading(false);
    }
  }

  async function loadUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      
      // Load user's community memberships
      const { data: memberships } = await supabase
        .from("community_members")
        .select("community_id")
        .eq("user_id", user.id)
        .eq("status", "member");
      
      if (memberships) {
        setUserMemberships(new Set(memberships.map(m => m.community_id)));
      }
    }
  }

  async function loadCommunities() {
    setLoading(true);
    
    let query = supabase
      .from("communities")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    const { data: communitiesData, error } = await query;

    if (error) {
      console.error("Error loading communities:", error);
      setLoading(false);
      return;
    }

    // Get member counts for each community
    const communitiesWithCounts = await Promise.all(
      (communitiesData || []).map(async (community) => {
        const { count } = await supabase
          .from("community_members")
          .select("*", { count: "exact", head: true })
          .eq("community_id", community.id)
          .eq("status", "member");
        
        return {
          ...community,
          member_count: count || 0
        };
      })
    );

    setCommunities(communitiesWithCounts);
    setLoading(false);
  }

  async function joinCommunity(communityId: string, visibility: string) {
    if (!userId) {
      router.push("/signin");
      return;
    }

    const isPrivate = visibility === "private";
    const { error } = await supabase
      .from("community_members")
      .insert({
        community_id: communityId,
        user_id: userId,
        role: "member",
        status: isPrivate ? "pending" : "member"
      });

    if (!error) {
      if (!isPrivate) {
        setUserMemberships(prev => new Set(prev).add(communityId));
      }
      alert(isPrivate ? "Join request sent! The community owner will review your request." : "Successfully joined the community!");
      loadCommunities();
    } else if (error.message.includes("duplicate")) {
      alert("You already have a pending request or are a member of this community.");
    }
  }

  // Filter communities
  const filteredCommunities = communities.filter(c => {
    // Private filter
    if (!showPrivate && c.visibility === "private") return false;
    
    // Search filter (searches title, about, and category)
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesSearch = 
        c.title?.toLowerCase().includes(search) ||
        c.about?.toLowerCase().includes(search) ||
        c.category?.toLowerCase().includes(search);
      if (!matchesSearch) return false;
    }
    
    // Category filter
    if (categoryFilter && c.category !== categoryFilter) return false;
    
    // Zip filter
    if (zipFilter) {
      if (!c.zip) return false;
      if (radiusFilter === "exact") {
        if (c.zip !== zipFilter) return false;
      } else if (radiusFilter === "nearby") {
        // Match first 3 digits of zip for "nearby"
        if (!c.zip.startsWith(zipFilter.slice(0, 3))) return false;
      }
    }
    
    return true;
  });

  // Filter map pins based on same criteria
  const filteredPins = mapPins.filter(pin => {
    if (categoryFilter) {
      const hasCategory = pin.categories?.some(cat => 
        cat.toLowerCase().includes(categoryFilter.toLowerCase())
      ) || pin.name?.toLowerCase().includes(categoryFilter.toLowerCase());
      
      if (!hasCategory) return false;
    }

    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      return (
        pin.name?.toLowerCase().includes(query) ||
        pin.address?.toLowerCase().includes(query) ||
        pin.categories?.some(cat => cat.toLowerCase().includes(query))
      );
    }

    return true;
  });

  // Convert communities to map format
  const communitiesById = communities.reduce((acc, comm) => {
    acc[comm.id] = {
      id: comm.id,
      title: comm.title,
      category: comm.category
    };
    return acc;
  }, {} as Record<string, any>);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#EDE7F6] to-[#F6EFE5]">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <div className="animate-pulse">
            <div className="h-10 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded-2xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EDE7F6] to-[#F6EFE5]">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Discover Communities</h1>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Link
              href="/communities/new"
              className="flex-1 sm:flex-initial px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition shadow-sm text-center"
            >
              Create Community
            </Link>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
          {/* Mobile: Stack vertically */}
          <div className="flex flex-col lg:grid lg:grid-cols-12 gap-3">
            {/* Search Bar */}
            <div className="lg:col-span-4">
              <input
                type="text"
                placeholder="Search communities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            
            {/* Category Filter with Datalist */}
            <div className="lg:col-span-3">
              <input
                type="text"
                list="category-suggestions"
                placeholder="Type or select category..."
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <datalist id="category-suggestions">
                {Object.entries(CATEGORY_STRUCTURE).map(([main, subs]) => (
                  <optgroup key={main} label={main}>
                    {subs.map(sub => (
                      <option key={sub} value={sub} />
                    ))}
                  </optgroup>
                ))}
              </datalist>
            </div>

            {/* Zip Code */}
            <div className="lg:col-span-2">
              <input
                type="text"
                placeholder="ZIP code"
                value={zipFilter}
                onChange={(e) => setZipFilter(e.target.value.replace(/\D/g, '').slice(0, 5))}
                maxLength={5}
                className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Radius */}
            <div className="lg:col-span-2">
              <select
                value={radiusFilter}
                onChange={(e) => setRadiusFilter(e.target.value)}
                className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                disabled={!zipFilter}
              >
                <option value="exact">Exact ZIP</option>
                <option value="nearby">Nearby (~25mi)</option>
              </select>
            </div>

            {/* Show Private Toggle */}
            <div className="lg:col-span-1 flex items-center justify-center lg:justify-start">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPrivate}
                  onChange={(e) => setShowPrivate(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <span className="text-gray-700 text-sm whitespace-nowrap">Private</span>
              </label>
            </div>
          </div>

          {/* Active Filters (Mobile-friendly) */}
          {(searchTerm || categoryFilter || zipFilter) && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
              {searchTerm && (
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs sm:text-sm flex items-center gap-1">
                  Search: {searchTerm}
                  <button onClick={() => setSearchTerm("")} className="ml-1 hover:text-purple-900">×</button>
                </span>
              )}
              {categoryFilter && (
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs sm:text-sm flex items-center gap-1">
                  {categoryFilter}
                  <button onClick={() => setCategoryFilter("")} className="ml-1 hover:text-purple-900">×</button>
                </span>
              )}
              {zipFilter && (
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs sm:text-sm flex items-center gap-1">
                  ZIP: {zipFilter}
                  <button onClick={() => setZipFilter("")} className="ml-1 hover:text-purple-900">×</button>
                </span>
              )}
              <button
                onClick={() => {
                  setSearchTerm("");
                  setCategoryFilter("");
                  setZipFilter("");
                }}
                className="text-purple-600 hover:text-purple-700 text-xs sm:text-sm"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* MAP SECTION - Right below search */}
        <div className="bg-white rounded-2xl shadow-md p-4 mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold text-gray-800">Community Map</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode("map")}
                className={`px-3 py-1 rounded-lg text-sm ${
                  viewMode === "map" ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-700"
                }`}
              >
                Map
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`px-3 py-1 rounded-lg text-sm ${
                  viewMode === "grid" ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-700"
                }`}
              >
                List
              </button>
              <Link
                href="/communities/map"
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
              >
                Full Map →
              </Link>
            </div>
          </div>

          {/* Map or placeholder */}
          {viewMode === "map" ? (
            mapLoading ? (
              <div className="bg-gray-100 rounded-xl animate-pulse" style={{ height: 400 }}>
                <div className="flex items-center justify-center h-full">
                  <div className="text-gray-500">Loading map data...</div>
                </div>
              </div>
            ) : filteredPins.length === 0 ? (
              <div className="bg-gray-50 rounded-xl" style={{ height: 400 }}>
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <div className="text-6xl mb-4">📍</div>
                  <div className="text-xl font-semibold mb-2">No locations on map</div>
                  <div className="text-sm mb-4">
                    {categoryFilter ? `No ${categoryFilter.toLowerCase()} locations found` : "No pinned locations yet"}
                  </div>
                  <Link
                    href="/communities/map"
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Add Location
                  </Link>
                </div>
              </div>
            ) : (
              <MapExplorerClient
                center={userLocation}
                pins={filteredPins}
                communitiesById={communitiesById}
                height={400}
              />
            )
          ) : (
            <div className="p-8 text-center bg-gray-50 rounded-xl">
              <p className="text-gray-600 mb-4">
                Switch to map view to see community locations
              </p>
              <button
                onClick={() => setViewMode("map")}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Show Map
              </button>
            </div>
          )}

          {/* Map stats */}
          <div className="mt-3 text-sm text-gray-600 flex justify-between">
            <span>{filteredPins.length} locations on map</span>
            <Link href="/communities/map" className="text-purple-600 hover:text-purple-700">
              Open full map view →
            </Link>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 text-gray-600 text-sm sm:text-base">
          {filteredCommunities.length} {filteredCommunities.length === 1 ? "community" : "communities"} found
        </div>

        {/* Communities Grid - Responsive */}
        {filteredCommunities.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 sm:p-12 text-center">
            <div className="max-w-md mx-auto">
              <p className="text-gray-500 text-base sm:text-lg mb-4">No communities found matching your criteria.</p>
              <p className="text-purple-600 font-medium mb-6">Be the first to create one!</p>
              <Link
                href="/communities/new"
                className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                Create Community
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredCommunities.map(community => (
              <div
                key={community.id}
                className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all flex flex-col"
              >
                {/* Cover Image or Gradient */}
                <div className="h-32 rounded-t-2xl overflow-hidden">
                  {community.cover_url || community.photo_url ? (
                    <img
                      src={community.cover_url || community.photo_url || ""}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400" />
                  )}
                </div>

                {/* Community Info */}
                <div className="p-4 sm:p-6 flex-1 flex flex-col">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-800 flex-1">
                        {community.title}
                      </h3>
                      {community.visibility === "private" && (
                        <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                          Private
                        </span>
                      )}
                    </div>

                    {community.about && (
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {community.about}
                      </p>
                    )}

                    {/* Category & ZIP */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {community.category && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                          {community.category}
                        </span>
                      )}
                      {community.zip && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          📍 {community.zip}
                        </span>
                      )}
                    </div>

                    {/* Member Count */}
                    <div className="text-sm text-gray-500">
                      {community.member_count || 0} members
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="mt-4">
                    {userMemberships.has(community.id) ? (
                      <Link
                        href={`/communities/${community.id}`}
                        className="block w-full text-center px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm sm:text-base"
                      >
                        View Community
                      </Link>
                    ) : (
                      <button
                        onClick={() => joinCommunity(community.id, community.visibility)}
                        className="w-full px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium text-sm sm:text-base"
                      >
                        {community.visibility === "private" ? "Request to Join" : "Join Community"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
