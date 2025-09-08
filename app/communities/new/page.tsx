"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

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
  
  // Mobile-specific states
  const [showFilters, setShowFilters] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  useEffect(() => {
    loadUser();
    loadCommunities();
  }, []);

  async function loadUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      
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
    if (!showPrivate && c.visibility === "private") return false;
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesSearch = 
        c.title?.toLowerCase().includes(search) ||
        c.about?.toLowerCase().includes(search) ||
        c.category?.toLowerCase().includes(search);
      if (!matchesSearch) return false;
    }
    
    if (categoryFilter && c.category !== categoryFilter) return false;
    
    if (zipFilter) {
      if (!c.zip) return false;
      if (radiusFilter === "exact") {
        if (c.zip !== zipFilter) return false;
      } else if (radiusFilter === "nearby") {
        if (!c.zip.startsWith(zipFilter.slice(0, 3))) return false;
      }
    }
    
    return true;
  });

  // Check if any filters are active
  const hasActiveFilters = searchTerm || categoryFilter || zipFilter;

  // Clear all filters
  function clearFilters() {
    setSearchTerm("");
    setCategoryFilter("");
    setZipFilter("");
    setShowFilters(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#EDE7F6] to-[#F6EFE5] pb-20">
        <div className="container mx-auto px-4 py-4 max-w-7xl">
          <div className="animate-pulse">
            <div className="h-10 bg-gray-200 rounded w-2/3 mb-6"></div>
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-2xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EDE7F6] to-[#F6EFE5] pb-24">
      {/* Mobile-optimized Header - Sticky */}
      <div className="sticky top-0 z-40 bg-gradient-to-b from-[#EDE7F6] to-[#EDE7F6]/95 backdrop-blur-sm border-b border-purple-100">
        <div className="container mx-auto px-4 py-3 max-w-7xl">
          <div className="flex justify-between items-center">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Communities</h1>
            <Link
              href="/communities/map"
              className="p-2 bg-white rounded-full shadow-sm"
              aria-label="Map view"
            >
              <span className="text-xl">🗺️</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 max-w-7xl">
        {/* Mobile Search Bar - Always visible */}
        <div className="mb-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search communities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 pr-12 border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white shadow-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-500"
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Filter Toggle Button - Mobile optimized */}
        <div className="mb-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`w-full px-4 py-3 rounded-xl font-medium transition-colors flex items-center justify-between ${
              hasActiveFilters 
                ? "bg-purple-600 text-white" 
                : "bg-white text-gray-700 border"
            }`}
          >
            <span className="flex items-center gap-2">
              <span>🎯</span>
              <span>Filters</span>
              {hasActiveFilters && (
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                  Active
                </span>
              )}
            </span>
            <span className="text-xl">{showFilters ? "−" : "+"}</span>
          </button>
        </div>

        {/* Collapsible Filters - Mobile optimized */}
        {showFilters && (
          <div className="bg-white rounded-2xl shadow-sm p-4 mb-4 animate-in slide-in-from-top">
            <div className="space-y-3">
              {/* Category Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <button
                  onClick={() => setShowCategoryPicker(!showCategoryPicker)}
                  className="w-full px-4 py-3 border rounded-xl text-left bg-white flex justify-between items-center"
                >
                  <span className={categoryFilter ? "text-gray-900" : "text-gray-500"}>
                    {categoryFilter || "Select category..."}
                  </span>
                  <span>▼</span>
                </button>
                
                {showCategoryPicker && (
                  <div className="mt-2 max-h-60 overflow-y-auto border rounded-xl p-2 bg-white">
                    <button
                      onClick={() => {
                        setCategoryFilter("");
                        setShowCategoryPicker(false);
                      }}
                      className="w-full px-3 py-2 text-left text-gray-600 hover:bg-gray-50 rounded-lg"
                    >
                      All Categories
                    </button>
                    {Object.entries(CATEGORY_STRUCTURE).map(([main, subs]) => (
                      <div key={main} className="mt-2">
                        <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase">
                          {main}
                        </div>
                        {subs.map(sub => (
                          <button
                            key={sub}
                            onClick={() => {
                              setCategoryFilter(sub);
                              setShowCategoryPicker(false);
                            }}
                            className={`w-full px-3 py-2 text-left rounded-lg ${
                              categoryFilter === sub 
                                ? "bg-purple-100 text-purple-700" 
                                : "hover:bg-gray-50"
                            }`}
                          >
                            {sub}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ZIP Code with Radius */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    placeholder="ZIP code"
                    value={zipFilter}
                    onChange={(e) => setZipFilter(e.target.value.replace(/\D/g, '').slice(0, 5))}
                    maxLength={5}
                    className="flex-1 px-4 py-3 border rounded-xl text-base"
                  />
                  <select
                    value={radiusFilter}
                    onChange={(e) => setRadiusFilter(e.target.value)}
                    className="px-4 py-3 border rounded-xl bg-white"
                    disabled={!zipFilter}
                  >
                    <option value="exact">Exact</option>
                    <option value="nearby">Nearby</option>
                  </select>
                </div>
              </div>

              {/* Privacy Toggle */}
              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-700 font-medium">Show Private Communities</span>
                <input
                  type="checkbox"
                  checked={showPrivate}
                  onChange={(e) => setShowPrivate(e.target.checked)}
                  className="w-6 h-6 text-purple-600 rounded"
                />
              </label>

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="w-full py-3 text-purple-600 font-medium"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          </div>
        )}

        {/* Active Filter Pills - Horizontal scroll on mobile */}
        {hasActiveFilters && !showFilters && (
          <div className="mb-4 overflow-x-auto">
            <div className="flex gap-2 pb-2">
              {categoryFilter && (
                <button
                  onClick={() => setCategoryFilter("")}
                  className="flex items-center gap-1 px-3 py-2 bg-purple-100 text-purple-700 rounded-full whitespace-nowrap text-sm"
                >
                  {categoryFilter}
                  <span className="ml-1 text-lg">×</span>
                </button>
              )}
              {zipFilter && (
                <button
                  onClick={() => setZipFilter("")}
                  className="flex items-center gap-1 px-3 py-2 bg-purple-100 text-purple-700 rounded-full whitespace-nowrap text-sm"
                >
                  📍 {zipFilter}
                  <span className="ml-1 text-lg">×</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Map Section - Smaller on mobile */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
          <Link href="/communities/map" className="block">
            <div className="relative bg-gradient-to-br from-purple-50 to-blue-50 p-8 sm:p-12" style={{ height: "150px" }}>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-2">🗺️</div>
                  <p className="text-sm font-medium text-gray-700">Tap to view map</p>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Results Count */}
        <div className="mb-3 text-gray-600 text-sm flex justify-between items-center">
          <span>{filteredCommunities.length} communities</span>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-purple-600 text-sm"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Communities List - Mobile optimized cards */}
        {filteredCommunities.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="max-w-md mx-auto">
              <div className="text-5xl mb-4">🌱</div>
              <p className="text-gray-600 mb-2">No communities found</p>
              <p className="text-sm text-gray-500 mb-6">
                Be the first to create one in your area!
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCommunities.map(community => (
              <div
                key={community.id}
                className="bg-white rounded-2xl shadow-sm overflow-hidden"
              >
                {/* Cover Image - Smaller on mobile */}
                <div className="h-24 sm:h-32 relative">
                  {community.cover_url || community.photo_url ? (
                    <img
                      src={community.cover_url || community.photo_url || ""}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400" />
                  )}
                  {community.visibility === "private" && (
                    <span className="absolute top-2 right-2 px-2 py-1 bg-black/50 text-white text-xs rounded-full">
                      Private
                    </span>
                  )}
                </div>

                {/* Community Info - Optimized for mobile */}
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">
                    {community.title}
                  </h3>

                  {/* Category & Location on same line */}
                  <div className="flex items-center gap-2 mb-2 text-sm">
                    {community.category && (
                      <span className="text-purple-600">
                        {community.category}
                      </span>
                    )}
                    {community.category && community.zip && (
                      <span className="text-gray-400">•</span>
                    )}
                    {community.zip && (
                      <span className="text-gray-600">
                        📍 {community.zip}
                      </span>
                    )}
                  </div>

                  {/* About - Show less on mobile */}
                  {community.about && (
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {community.about}
                    </p>
                  )}

                  {/* Members and Action - Side by side */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {community.member_count || 0} members
                    </span>
                    
                    {userMemberships.has(community.id) ? (
                      <Link
                        href={`/communities/${community.id}`}
                        className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-full font-medium text-sm"
                      >
                        View
                      </Link>
                    ) : (
                      <button
                        onClick={() => joinCommunity(community.id, community.visibility)}
                        className="px-6 py-2.5 bg-purple-600 text-white rounded-full font-medium text-sm"
                      >
                        {community.visibility === "private" ? "Request" : "Join"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sticky Create Button - Mobile optimized */}
      <div className="fixed bottom-6 right-6 z-50 lg:hidden">
        <Link
          href="/communities/new"
          className="flex items-center justify-center w-14 h-14 bg-purple-600 text-white rounded-full shadow-lg"
          aria-label="Create community"
        >
          <span className="text-2xl">+</span>
        </Link>
      </div>

      {/* Desktop Create Button */}
      <div className="hidden lg:block fixed bottom-6 right-6 z-50">
        <Link
          href="/communities/new"
          className="px-6 py-3 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition font-medium"
        >
          Create Community
        </Link>
      </div>
    </div>
  );
}
