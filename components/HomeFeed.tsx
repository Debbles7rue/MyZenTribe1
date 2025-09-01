"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { createPost, listHomeFeed, Post } from "@/lib/posts";
import PostCard from "@/components/PostCard";
import { getEmergencySettings } from "@/lib/sos";
import type { EmergencySettings } from "@/lib/sos";

// Dynamically import modal to avoid SSR issues
const EditSOSModal = dynamic(() => import("@/components/EditSOSModal"), { 
  ssr: false 
});

export default function HomeFeed() {
  const [rows, setRows] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [privacy, setPrivacy] = useState<Post["privacy"]>("friends");
  const [saving, setSaving] = useState(false);
  
  // SOS-related state
  const [showEditModal, setShowEditModal] = useState(false);
  const [sosSettings, setSosSettings] = useState<EmergencySettings | null>(null);
  const [sosLoading, setSosLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { rows } = await listHomeFeed();
    setRows(rows);
    setLoading(false);
  }

  // Load SOS settings
  async function loadSOSSettings() {
    setSosLoading(true);
    const settings = await getEmergencySettings();
    setSosSettings(settings);
    setSosLoading(false);
  }

  useEffect(() => { 
    load();
    loadSOSSettings();
  }, []);

  async function post() {
    if (!body.trim()) return;
    setSaving(true);
    await createPost(body.trim(), privacy);
    setBody("");
    setSaving(false);
    await load();
  }

  const handleSOSClick = async () => {
    if (!sosSettings?.sos_enabled) {
      // If not configured, open setup modal
      setShowEditModal(true);
    } else {
      // If configured, send SOS
      if (confirm("Send SOS alert to your emergency contact?")) {
        try {
          const { supabase } = await import("@/lib/supabaseClient");
          
          // Get location if available
          let lat = null, lon = null;
          if ("geolocation" in navigator) {
            try {
              const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                  enableHighAccuracy: true,
                  timeout: 8000,
                  maximumAge: 0
                });
              });
              lat = position.coords.latitude;
              lon = position.coords.longitude;
            } catch (e) {
              // Location not available, continue without it
            }
          }

          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            alert("Please log in first.");
            return;
          }

          const { error } = await supabase.from("sos_incidents").insert({
            user_id: user.id,
            kind: "sos",
            message: "Emergency — please check on me.",
            lat,
            lon,
            status: "open",
          });

          if (error) {
            alert(`Could not send SOS. ${error.message}`);
          } else {
            alert("SOS sent! Your emergency contact has been notified.");
          }
        } catch (e: any) {
          alert(`Could not send SOS. ${e?.message || "Unknown error"}`);
        }
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      {/* Composer */}
      <div className="card p-3 mb-4">
        <textarea
          className="input"
          rows={3}
          placeholder="Share something with your friends…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="mt-2 flex items-center gap-2">
          <select className="input w-[150px]" value={privacy} onChange={(e) => setPrivacy(e.target.value as any)}>
            <option value="friends">Friends</option>
            <option value="public">Public</option>
            <option value="private">Only me</option>
          </select>
          <button className="btn btn-brand ml-auto" onClick={post} disabled={saving || !body.trim()}>
            {saving ? "Posting…" : "Post"}
          </button>
        </div>
      </div>

      {/* Feed */}
      {loading ? (
        <div className="muted">Loading…</div>
      ) : rows.length ? (
        <div className="stack gap-3">
          {rows.map((p) => (
            <PostCard key={p.id} post={p} onChanged={load} />
          ))}
        </div>
      ) : (
        <div className="card p-4 text-center">
          <div className="text-lg font-medium">No posts yet</div>
          <div className="muted mt-1">Say hello with your first post above.</div>
        </div>
      )}

      {/* SOS Section */}
      <div className="mt-8 mb-4">
        <div className="card p-4" style={{
          background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
          border: "none",
        }}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex-1">
              <h3 className="text-white font-semibold text-lg mb-1">Emergency SOS</h3>
              <p className="text-white/90 text-sm">
                {sosSettings?.sos_enabled ? (
                  <>Contact: {sosSettings.emergency_contact_name || "Set"}</>
                ) : (
                  "Set up your emergency contact"
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSOSClick}
                className="px-6 py-3 bg-white text-red-600 rounded-lg font-semibold hover:bg-gray-100 transition-all"
                disabled={sosLoading}
              >
                {sosLoading ? "..." : sosSettings?.sos_enabled ? "SOS" : "Setup"}
              </button>
              <button
                onClick={() => setShowEditModal(true)}
                className="px-4 py-3 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-all"
                aria-label="Edit emergency settings"
              >
                <svg 
                  className="w-5 h-5" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" 
                  />
                </svg>
                <span className="sr-only">Edit</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom buttons */}
      <div className="mt-4 flex justify-center gap-3 flex-wrap">
        <a className="btn" href="/contact">Contact</a>
        <a className="btn" href="/suggestions">Suggestions</a>
        <a className="btn btn-brand" href="/donate">Donations</a>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <EditSOSModal 
          onClose={() => setShowEditModal(false)}
          onSaved={() => {
            loadSOSSettings();
            setShowEditModal(false);
          }}
        />
      )}
    </div>
  );
}
