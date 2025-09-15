// app/profile/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

// Type definition
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

  // Get user
  useEffect(() => { 
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  // Load profile
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

  // Save function
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
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <h2>Loading profile...</h2>
      </div>
    );
  }

  if (!userId) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <h2>Please log in</h2>
        <Link href="/login">Go to Login</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2rem" }}>
        <h1>Your Profile</h1>
        <button onClick={() => setEditMode(!editMode)}>
          {editMode ? "Cancel" : "Edit"}
        </button>
      </div>

      {status && (
        <div style={{ padding: "1rem", background: "#f0f0f0", marginBottom: "1rem", borderRadius: "8px" }}>
          {status}
        </div>
      )}

      <div style={{ background: "white", padding: "2rem", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
        {editMode ? (
          <div>
            <div style={{ marginBottom: "1rem" }}>
              <label>Name:</label>
              <input
                type="text"
                value={profile.full_name || ""}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label>Username:</label>
              <input
                type="text"
                value={profile.username || ""}
                onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label>Bio:</label>
              <textarea
                value={profile.bio || ""}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                rows={3}
                style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label>Location:</label>
              <input
                type="text"
                value={profile.location_text || ""}
                onChange={(e) => setProfile({ ...profile, location_text: e.target.value })}
                style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
              />
            </div>

            <button
              onClick={save}
              disabled={saving}
              style={{ padding: "0.75rem 2rem", background: "#7c3aed", color: "white", border: "none", borderRadius: "4px", cursor: saving ? "not-allowed" : "pointer" }}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        ) : (
          <div>
            <h2>{profile.full_name || "Member"}</h2>
            {profile.username && <p>@{profile.username}</p>}
            {profile.bio && <p style={{ marginTop: "1rem" }}>{profile.bio}</p>}
            {profile.location_text && <p>📍 {profile.location_text}</p>}
            {profile.website_url && (
              <p>
                🌐 <a href={profile.website_url} target="_blank" rel="noopener noreferrer">
                  {profile.website_url}
                </a>
              </p>
            )}
          </div>
        )}
      </div>

      <div style={{ marginTop: "2rem" }}>
        <Link href="/friends" style={{ marginRight: "1rem" }}>Friends</Link>
        <Link href="/messages" style={{ marginRight: "1rem" }}>Messages</Link>
        <Link href="/gratitude">Gratitude</Link>
      </div>
    </div>
  );
}
