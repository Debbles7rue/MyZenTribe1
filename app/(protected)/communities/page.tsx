"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

interface Community {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  is_private: boolean;
  region: string | null;
  tags: string[] | null;
  created_at: string;
  member_count?: number;
  owner?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export default function CommunitiesPage() {
  const router = useRouter();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [filterRegion, setFilterRegion] = useState("");
  const [showPrivate, setShowPrivate] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userMemberships, setUserMemberships] = useState<Set<string>>(new Set());

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
        .eq("user_id", user.id);
      
      if (memberships) {
        setUserMemberships(new Set(memberships.map(m => m.community_id)));
      }
    }
  }

  async function loadCommunities() {
    setLoading(true);
    
    // Get communities with member counts
    const { data: communitiesData, error } = await supabase
      .from("communities")
      .select(`
        *,
        owner:profiles!owner_id (
          full_name,
          avatar_url
        )
      `)
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
          .eq("community_id", community.id);
        
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
        status: isPrivate ? "pending" : "approved"
      });

    if (!error) {
      setUserMemberships(prev => new Set(prev).add(communityId));
      if (isPrivate) {
        alert("Join request sent! The community owner will review your request.");
      } else {
        alert("Successfully joined the community!");
      }
      loadCommunities(); // Refresh counts
    }
  }

  const filteredCommunities = communities.filter(c => {
    if (!showPrivate && c.is_private) return false;
    if (searchTerm && !c.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !(c.description || "").toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterTag && !c.tags?.includes(filterTag)) return false;
    if (filterRegion && filterRegion !== "all" && c.region !== filterRegion) return false;
    return true;
  });

  // Get unique tags and regions for filters
  const allTags = Array.from(new Set(communities.flatMap(c => c.tags || [])));
  const allRegions = Array.from(new Set(communities.map(c => c.region).filter(Boolean)));

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#EDE7F6] to-[#F6EFE5]">
        <div className="max-w-6xl mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EDE7F6] to-[#F6EFE5]">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Discover Communities</h1>
          <Link
            href="/communities/create"
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            Create Community
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Search communities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Tags</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>

            <select
              value={filterRegion}
              onChange={(e) => setFilterRegion(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Regions</option>
              <option value="Online Only">Online Only</option>
              {allRegions.filter(r => r !== "Online Only").map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showPrivate}
                onChange={(e) => setShowPrivate(e.target.checked)}
                className="rounded text-purple-600"
              />
              <span className="text-gray-700">Show Private</span>
            </label>
          </div>
        </div>

        {/* Communities Grid */}
        {filteredCommunities.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">No communities found matching your criteria.</p>
            <Link
              href="/communities/create"
              className="text-purple-600 hover:text-purple-700 font-medium"
            >
              Be the first to create one!
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCommunities.map(community => (
              <div
                key={community.id}
                className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6"
              >
                {/* Community Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <Link
                      href={`/communities/${community.id}`}
                      className="text-xl font-semibold text-gray-800 hover:text-purple-600 transition"
                    >
                      {community.name}
                    </Link>
                    {community.is_private && (
                      <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        Private
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
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
                      <span className="text-xs text-gray-500">
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

                {/* Owner */}
                {community.owner && (
                  <div className="flex items-center gap-2 mb-4">
                    {community.owner.avatar_url && (
                      <img
                        src={community.owner.avatar_url}
                        alt=""
                        className="w-6 h-6 rounded-full"
                      />
                    )}
                    <span className="text-xs text-gray-500">
                      by {community.owner.full_name || "Anonymous"}
                    </span>
                  </div>
                )}

                {/* Action Button */}
                <div>
                  {userMemberships.has(community.id) ? (
                    <Link
                      href={`/communities/${community.id}`}
                      className="block w-full text-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                    >
                      View Community
                    </Link>
                  ) : (
                    <button
                      onClick={() => joinCommunity(community.id, community.is_private)}
                      className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
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
