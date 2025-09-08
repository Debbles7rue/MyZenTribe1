"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

interface Community {
  id: string;
  name: string;
  description: string | null;
  region: string | null;
  tags: string[] | null;
  is_private: boolean;
  created_at: string;
  created_by: string;
  member_count?: number;
  cover_url?: string | null;
}

const SUGGESTED_TAGS = [
  "Drum Circle",
  "Meditation", 
  "Yoga",
  "Breathwork",
  "Sound Healing",
  "Ecstatic Dance",
  "Mindfulness",
  "Wellness",
  "Spiritual Growth",
  "Community Garden",
  "Art & Creativity",
  "Music",
  "Healing",
  "Nature",
  "Workshops",
  "Retreats",
  "Qi Gong",
  "Sound Bath",
  "Kirtan",
  "Reiki"
];

const REGIONS = [
  "Online Only",
  "Dallas-Fort Worth",
  "Austin",
  "Houston",
  "San Antonio",
  "Phoenix",
  "Los Angeles",
  "San Francisco",
  "New York",
  "Chicago",
  "Miami",
  "Seattle",
  "Denver",
  "Portland",
  "Other"
];

export default function CommunitiesPage() {
  const router = useRouter();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [showPrivate, setShowPrivate] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userMemberships, setUserMemberships] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");

  useEffect(() => {
    loadUser();
    loadCommunities();
  }, []);

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
    
    const { data: communitiesData, error } = await supabase
      .from("communities")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });

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

  async function joinCommunity(communityId: string, isPrivate: boolean) {
    if (!userId) {
      router.push("/signin");
      return;
    }

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

  const filteredCommunities = communities.filter(c => {
    if (!showPrivate && c.is_private) return false;
    if (searchTerm && !c.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !(c.description || "").toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (selectedTag && !c.tags?.includes(selectedTag)) return false;
    if (selectedRegion && selectedRegion !== "All Regions" && c.region !== selectedRegion) return false;
    return true;
  });

  // Get all unique tags from communities
  const allTags = Array.from(new Set(communities.flatMap(c => c.tags || [])));

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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Discover Communities</h1>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => router.push("/communities/map")}
              className="px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition shadow-sm flex items-center gap-2"
            >
              <span>🗺️</span>
              <span>Map View</span>
            </button>
            <button
              onClick={() => router.push("/communities/create")}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition shadow-sm"
            >
              Create Community
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Search Bar */}
            <div className="md:col-span-4">
              <input
                type="text"
                placeholder="Search communities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            
            {/* Tag Filter */}
            <div className="md:col-span-3">
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              >
                <option value="">All Tags</option>
                {SUGGESTED_TAGS.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
                {allTags.filter(tag => !SUGGESTED_TAGS.includes(tag)).map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>

            {/* Region Filter */}
            <div className="md:col-span-3">
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              >
                <option value="">All Regions</option>
                {REGIONS.map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>

            {/* Show Private Toggle */}
            <div className="md:col-span-2 flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPrivate}
                  onChange={(e) => setShowPrivate(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <span className="text-gray-700 text-sm whitespace-nowrap">Show Private</span>
              </label>
            </div>
          </div>

          {/* Active Filters */}
          {(searchTerm || selectedTag || selectedRegion) && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
              {searchTerm && (
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm flex items-center gap-1">
                  Search: {searchTerm}
                  <button onClick={() => setSearchTerm("")} className="ml-1 hover:text-purple-900">×</button>
                </span>
              )}
              {selectedTag && (
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm flex items-center gap-1">
                  Tag: {selectedTag}
                  <button onClick={() => setSelectedTag("")} className="ml-1 hover:text-purple-900">×</button>
                </span>
              )}
              {selectedRegion && (
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm flex items-center gap-1">
                  Region: {selectedRegion}
                  <button onClick={() => setSelectedRegion("")} className="ml-1 hover:text-purple-900">×</button>
                </span>
              )}
              <button
                onClick={() => {
                  setSearchTerm("");
                  setSelectedTag("");
                  setSelectedRegion("");
                }}
                className="text-purple-600 hover:text-purple-700 text-sm"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="mb-4 text-gray-600">
          {filteredCommunities.length} {filteredCommunities.length === 1 ? "community" : "communities"} found
        </div>

        {/* Communities Grid */}
        {filteredCommunities.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="max-w-md mx-auto">
              <p className="text-gray-500 text-lg mb-4">No communities found matching your criteria.</p>
              <p className="text-purple-600 font-medium">Be the first to create one!</p>
              <button
                onClick={() => router.push("/communities/create")}
                className="mt-6 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                Create Community
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCommunities.map(community => (
              <div
                key={community.id}
                className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all p-6 flex flex-col"
              >
                {/* Cover Image or Gradient */}
                <div className="h-32 -m-6 mb-4 rounded-t-2xl overflow-hidden">
                  {community.cover_url ? (
                    <img
                      src={community.cover_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400" />
                  )}
                </div>

                {/* Community Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-semibold text-gray-800 flex-1">
                      {community.name}
                    </h3>
                    {community.is_private && (
                      <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        Private
                      </span>
                    )}
                  </div>

                  {community.description && (
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {community.description}
                    </p>
                  )}

                  {/* Tags */}
                  {community.tags && community.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {community.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {community.tags.length > 3 && (
                        <span className="text-xs text-gray-500 px-2 py-1">
                          +{community.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Meta Info */}
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span>{community.member_count || 0} members</span>
                    {community.region && (
                      <span className="text-xs">{community.region}</span>
                    )}
                  </div>
                </div>

                {/* Action Button */}
                <div>
                  {userMemberships.has(community.id) ? (
                    <Link
                      href={`/communities/${community.id}`}
                      className="block w-full text-center px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
                    >
                      View Community
                    </Link>
                  ) : (
                    <button
                      onClick={() => joinCommunity(community.id, community.is_private)}
                      className="w-full px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
                    >
                      {community.is_private ? "Request to Join" : "Join Community"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
