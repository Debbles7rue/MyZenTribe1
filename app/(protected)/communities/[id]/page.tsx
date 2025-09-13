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
  created_by: string;
}

export default function CommunityDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [community, setCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadCommunity();
  }, [params.id]);

  async function loadCommunity() {
    console.log("Loading community:", params.id);
    setLoading(true);

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
    }

    // Load community details
    const { data: communityData, error } = await supabase
      .from("communities")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error) {
      console.error("Error loading community:", error);
      router.push("/communities");
      return;
    }

    if (communityData) {
      setCommunity(communityData);
      
      // Check if user is admin (creator or has admin role)
      if (user) {
        if (communityData.created_by === user.id) {
          setIsAdmin(true);
        } else {
          // Check member role
          const { data: memberData } = await supabase
            .from("community_members")
            .select("role")
            .eq("community_id", params.id)
            .eq("user_id", user.id)
            .single();
          
          setIsAdmin(memberData?.role === "admin");
        }
      }
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#EDE7F6] to-[#F6EFE5] p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#EDE7F6] to-[#F6EFE5] p-6">
        <div className="text-center">
          <p>Community not found</p>
          <Link href="/communities" className="text-purple-600 hover:underline mt-4 inline-block">
            Back to Communities
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EDE7F6] to-[#F6EFE5] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                {community.title}
              </h1>
              {community.about && (
                <p className="text-gray-600 mb-4">{community.about}</p>
              )}
              <div className="flex gap-2">
                {community.category && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                    {community.category}
                  </span>
                )}
                {community.zip && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                    📍 {community.zip}
                  </span>
                )}
                {community.visibility === "private" && (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
                    Private
                  </span>
                )}
              </div>
            </div>
            
            {isAdmin && (
              <div className="flex gap-2">
                <Link
                  href={`/communities/${params.id}/edit`}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Edit
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Simple Actions */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => router.push("/meditation?type=group")}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
            >
              🧘 Group Meditation
            </button>
            {isAdmin && (
              <button
                onClick={() => {
                  const link = `${window.location.origin}/communities/${params.id}`;
                  navigator.clipboard.writeText(link);
                  alert("Invite link copied!");
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                📋 Copy Invite Link
              </button>
            )}
            <Link
              href="/communities"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              ← Back to Communities
            </Link>
          </div>
        </div>

        {/* Basic Info */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Community Info</h2>
          <div className="space-y-2 text-gray-600">
            <p>Community ID: {community.id}</p>
            <p>Created: {new Date(community.created_at || '').toLocaleDateString()}</p>
            {isAdmin && <p className="text-purple-600 font-medium">You are an admin of this community</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
