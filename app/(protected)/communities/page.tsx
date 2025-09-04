// app/(protected)/communities/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Community = {
  id: string;
  name: string;
  description: string | null;
  is_private: boolean;
  region: string | null;
  tags: string[];
  member_count?: number;
  creator_id: string;
  created_at: string;
};

const SUGGESTED_TAGS = [
  "Drum Circle", "Sound Bath", "Qi Gong", "Yoga", "Zen Tangle",
  "Meditation", "Wellness", "Healing", "Nature", "Art",
  "Music", "Dance", "Mindfulness", "Breathwork", "Energy Work"
];

const REGIONS = [
  "North America", "South America", "Europe", "Asia", 
  "Africa", "Australia", "Middle East", "Online Only"
];

export default function CommunitiesPage() {
  const router = useRouter();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [filteredCommunities, setFilteredCommunities] = useState<Community[]>([]);
  const [myCommunities, setMyCommunities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [showPrivateOnly, setShowPrivateOnly] = useState(false);

  useEffect(() => {
    loadCommunities();
  }, []);

  useEffect(() => {
    filterCommunities();
  }, [communities, searchQuery, selectedTag, selectedRegion, showPrivateOnly]);

  async function loadCommunities() {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);

      // Load all communities with member counts
      const { data: communitiesData, error: communitiesError } = await supabase
        .from("communities")
        .select(`
          *,
          community_members(count)
        `)
        .order("created_at", { ascending: false });

      if (communitiesError) throw communitiesError;

      // Get user's community memberships
      if (user?.id) {
        const { data: membershipData } = await supabase
          .from("community_members")
          .select("community_id")
          .eq("user_id", user.id);

        const memberCommunityIds = membershipData?.map(m => m.community_id) || [];
        setMyCommunities(memberCommunityIds);
      }

      // Process communities with member count
      const processedCommunities = communitiesData?.map((c: any) => ({
        ...c,
        member_count: c.community_members?.[0]?.count || 0,
        tags: c.tags || []
      })) || [];

      setCommunities(processedCommunities);
      setFilteredCommunities(processedCommunities);
    } catch (error) {
      console.error("Error loading communities:", error);
    } finally {
      setLoading(false);
    }
  }

  function filterCommunities() {
    let filtered = [...communities];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Tag filter
    if (selectedTag) {
      filtered = filtered.filter(c =>
        c.tags?.includes(selectedTag)
      );
    }

    // Region filter
    if (selectedRegion) {
      filtered = filtered.filter(c =>
        c.region === selectedRegion
      );
    }

    // Private filter
    if (showPrivateOnly) {
      filtered = filtered.filter(c => c.is_private);
    }

    setFilteredCommunities(filtered);
  }

  async function joinCommunity(communityId: string, isPrivate: boolean) {
    if (!userId) {
      alert("Please sign in to join communities");
      return;
    }

    try {
      if (isPrivate) {
        // For private communities, create a join request (pending status)
        const { error } = await supabase
          .from("community_join_requests")
          .insert({
            community_id: communityId,
            user_id: userId,
            status: "pending"
          });

        if (error) throw error;
        alert("Join request sent! The community moderators will review your request.");
      } else {
        // For public communities, join immediately
        const { error } = await supabase
          .from("community_members")
          .insert({
            community_id: communityId,
            user_id: userId,
            role: "member"
          });

        if (error) throw error;
        setMyCommunities([...myCommunities, communityId]);
      }
    } catch (error) {
      console.error("Error joining community:", error);
      alert("Failed to join community");
    }
  }

  async function leaveCommunity(communityId: string) {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from("community_members")
        .delete()
        .eq("community_id", communityId)
        .eq("user_id", userId);

      if (error) throw error;
      setMyCommunities(myCommunities.filter(id => id !== communityId));
    } catch (error) {
      console.error("Error leaving community:", error);
      alert("Failed to leave community");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container-app py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container-app py-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Communities
              </h1>
              <p className="text-gray-600 mt-1">
                Find your tribe and connect with like-minded souls
              </p>
            </div>
            <Link
              href="/communities/create"
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:opacity-90 transition"
            >
              Create Community
            </Link>
          </div>

          {/* Search and Filters */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <input
              type="text"
              placeholder="Search communities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
            />

            <div className="flex flex-wrap gap-4">
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Tags</option>
                {SUGGESTED_TAGS.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>

              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Regions</option>
                {REGIONS.map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showPrivateOnly}
                  onChange={(e) => setShowPrivateOnly(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-gray-700">Private Communities Only</span>
              </label>
            </div>

            <div className="text-sm text-gray-600">
              Found {filteredCommunities.length} communities
            </div>
          </div>
        </div>
      </div>

      {/* Communities Grid */}
      <div className="container-app py-8">
        {filteredCommunities.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">No communities found</p>
            <Link
              href="/communities/create"
              className="text-purple-600 hover:underline"
            >
              Create the first one!
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCommunities.map(community => {
              const isMember = myCommunities.includes(community.id);
              const isOwner = community.creator_id === userId;

              return (
                <div
                  key={community.id}
                  className="bg-white rounded-xl shadow-sm border hover:shadow-lg transition-shadow overflow-hidden"
                >
                  {/* Community Header */}
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {community.name}
                      </h3>
                      {community.is_private && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          🔒 Private
                        </span>
                      )}
                    </div>

                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {community.description || "No description yet"}
                    </p>

                    {/* Tags */}
                    {community.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {community.tags.slice(0, 3).map(tag => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full"
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
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                      <span>{community.member_count || 0} members</span>
                      {community.region && <span>{community.region}</span>}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {isOwner ? (
                        <Link
                          href={`/communities/${community.id}/settings`}
                          className="flex-1 px-4 py-2 bg-purple-600 text-white text-center rounded-lg hover:bg-purple-700 transition"
                        >
                          Manage
                        </Link>
                      ) : isMember ? (
                        <>
                          <Link
                            href={`/communities/${community.id}`}
                            className="flex-1 px-4 py-2 bg-purple-600 text-white text-center rounded-lg hover:bg-purple-700 transition"
                          >
                            View
                          </Link>
                          <button
                            onClick={() => leaveCommunity(community.id)}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                          >
                            Leave
                          </button>
                        </>
                      ) : (
                        <>
                          <Link
                            href={`/communities/${community.id}`}
                            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 text-center rounded-lg hover:bg-gray-300 transition"
                          >
                            View
                          </Link>
                          <button
                            onClick={() => joinCommunity(community.id, community.is_private)}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                          >
                            {community.is_private ? "Request" : "Join"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
