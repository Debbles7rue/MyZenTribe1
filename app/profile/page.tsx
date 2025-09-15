// app/profile/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location_text?: string | null;
  location_is_public?: boolean | null;
  show_mutuals: boolean | null;
  username?: string | null;
  cover_url?: string | null;
  tagline?: string | null;
  interests?: string[] | null;
  website_url?: string | null;
  social_links?: any | null;
  languages?: string[] | null;
  visibility?: string | null;
  discoverable?: boolean | null;
  allow_messages?: string | null;
  allow_tags?: string | null;
  phone?: string | null;
  birthday?: string | null;
  internal_notes?: string | null;
};

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  
  const [profile, setProfile] = useState<Profile>({
    id: "",
    full_name: "",
    avatar_url: "",
    bio: "",
    location_text: "",
    location_is_public: false,
    show_mutuals: true,
    username: "",
    cover_url: "",
    tagline: "",
    interests: [],
    website_url: "",
    social_links: {},
    languages: [],
    visibility: "public",
    discoverable: true,
    allow_messages: "friends",
    phone: "",
    birthday: "",
    internal_notes: "",
  });

  useEffect(() => { 
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      setLoading(true);
      try {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();
        
        if (data) {
          setProfile({
            ...profile,
            ...data,
            id: data.id
          });
        }
      } catch (err) {
        console.error("Profile load error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    setStatus("Saving...");
    
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: userId,
          full_name: profile.full_name,
          bio: profile.bio,
          location_text: profile.location_text,
          location_is_public: profile.location_is_public,
          username: profile.username,
          tagline: profile.tagline,
          website_url: profile.website_url,
          interests: profile.interests,
          languages: profile.languages,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      setStatus("Saved ✅");
      setEditMode(false);
      setTimeout(() => setStatus(null), 3000);
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Please log in</h2>
          <Link href="/login" className="text-purple-600 hover:text-purple-700 underline">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
            Your Profile
          </h1>
          <button
            onClick={() => setEditMode(!editMode)}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            {editMode ? "Cancel" : "Edit"}
          </button>
        </div>

        {/* Status Message */}
        {status && (
          <div className={`p-4 rounded-lg mb-6 ${
            status.includes("Error") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
          }`}>
            {status}
          </div>
        )}

        {/* Main Profile Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Cover Image Area */}
          <div className="h-48 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400"></div>
          
          {/* Profile Content */}
          <div className="px-8 py-6">
            {/* Avatar Placeholder */}
            <div className="w-32 h-32 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full -mt-20 mb-4 border-4 border-white shadow-lg flex items-center justify-center">
              <span className="text-white text-4xl font-bold">
                {profile.full_name?.charAt(0)?.toUpperCase() || "?"}
              </span>
            </div>

            {editMode ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={profile.full_name || ""}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <input
                    type="text"
                    value={profile.username || ""}
                    onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="@username"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                  <textarea
                    value={profile.bio || ""}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Tell us about yourself..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={profile.location_text || ""}
                    onChange={(e) => setProfile({ ...profile, location_text: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="City, State"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input
                    type="url"
                    value={profile.website_url || ""}
                    onChange={(e) => setProfile({ ...profile, website_url: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="https://yourwebsite.com"
                  />
                </div>

                <button
                  onClick={save}
                  disabled={saving}
                  className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            ) : (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  {profile.full_name || "Member"}
                </h2>
                {profile.username && (
                  <p className="text-gray-600 mb-3">@{profile.username}</p>
                )}
                {profile.tagline && (
                  <p className="text-purple-600 font-medium mb-3">{profile.tagline}</p>
                )}
                {profile.bio && (
                  <p className="text-gray-700 mb-4">{profile.bio}</p>
                )}
                <div className="space-y-2 text-gray-600">
                  {profile.location_text && (
                    <p className="flex items-center gap-2">
                      <span>📍</span> {profile.location_text}
                    </p>
                  )}
                  {profile.website_url && (
                    <p className="flex items-center gap-2">
                      <span>🌐</span>
                      <a 
                        href={profile.website_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-purple-600 hover:text-purple-700 underline"
                      >
                        {profile.website_url.replace(/^https?:\/\//, "")}
                      </a>
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="flex gap-4 mt-8 justify-center">
          <Link 
            href="/friends" 
            className="px-6 py-3 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-purple-600 font-medium"
          >
            👥 Friends
          </Link>
          <Link 
            href="/messages" 
            className="px-6 py-3 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-purple-600 font-medium"
          >
            💬 Messages
          </Link>
          <Link 
            href="/gratitude" 
            className="px-6 py-3 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-purple-600 font-medium"
          >
            🙏 Gratitude
          </Link>
        </div>
      </div>
    </div>
  );
}
