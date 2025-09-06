// components/HomeFeed.tsx
"use client";

import { useEffect, useState } from "react";
import { createPost, listHomeFeed, Post } from "@/lib/posts";
import PostCard from "@/components/PostCard";
import SOSFloatingButton from "@/components/SOSFloatingButton";

export default function HomeFeed() {
  const [rows, setRows] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [privacy, setPrivacy] = useState<Post["privacy"]>("friends");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { rows } = await listHomeFeed();
    setRows(rows);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function post() {
    if (!body.trim()) return;
    setSaving(true);
    await createPost(body.trim(), privacy);
    setBody("");
    setSaving(false);
    await load();
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      {/* Composer - Mobile Optimized with Media Upload */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 mb-5 sm:mb-6">
        <textarea
          className="w-full p-2 sm:p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-base"
          rows={3}
          placeholder="Share something with your friends…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        
        {/* Media Upload Section */}
        <div className="mt-3 flex flex-wrap items-center gap-2 pb-3 border-b border-gray-100">
          <button
            type="button"
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={() => document.getElementById('photo-upload')?.click()}
          >
            📷 Photo
          </button>
          <button
            type="button"
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={() => document.getElementById('video-upload')?.click()}
          >
            🎥 Video
          </button>
          <button
            type="button"
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={() => document.getElementById('gif-upload')?.click()}
          >
            ✨ GIF
          </button>
          
          {/* Hidden file inputs */}
          <input
            id="photo-upload"
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => console.log('Photos selected:', e.target.files)}
          />
          <input
            id="video-upload"
            type="file"
            accept="video/*"
            style={{ display: 'none' }}
            onChange={(e) => console.log('Video selected:', e.target.files)}
          />
          <input
            id="gif-upload"
            type="file"
            accept="image/gif"
            style={{ display: 'none' }}
            onChange={(e) => console.log('GIF selected:', e.target.files)}
          />
        </div>
        
        <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <select 
            className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-base"
            value={privacy} 
            onChange={(e) => setPrivacy(e.target.value as any)}
          >
            <option value="friends">Friends</option>
            <option value="public">Public</option>
            <option value="private">Only me</option>
          </select>
          <button 
            className="sm:ml-auto px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 text-base min-h-[44px]"
            onClick={post} 
            disabled={saving || !body.trim()}
          >
            {saving ? "Posting…" : "Post"}
          </button>
        </div>
      </div>

      {/* Feed */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-32 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-48 mx-auto"></div>
          </div>
        </div>
      ) : rows.length ? (
        <div className="space-y-4">
          {rows.map((p) => (
            <PostCard key={p.id} post={p} onChanged={load} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="text-xl font-semibold text-gray-700">No posts yet</div>
          <div className="text-gray-500 mt-2">Say hello with your first post above.</div>
        </div>
      )}

      {/* Bottom Action Buttons */}
      <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3 mb-20">
        <a 
          href="/contact" 
          className="px-4 py-3 bg-white border-2 border-purple-200 text-purple-700 rounded-xl font-medium hover:bg-purple-50 hover:border-purple-300 transition-all text-center shadow-sm"
        >
          📧 Contact
        </a>
        <a 
          href="/suggestions" 
          className="px-4 py-3 bg-white border-2 border-green-200 text-green-700 rounded-xl font-medium hover:bg-green-50 hover:border-green-300 transition-all text-center shadow-sm"
        >
          💡 Suggestions
        </a>
        <a 
          href="/donate" 
          className="px-4 py-3 bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-xl font-medium hover:shadow-lg transition-all text-center"
        >
          💝 Donations
        </a>
        <a 
          href="/safety" 
          className="px-4 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg transition-all text-center"
        >
          🆘 SOS Setup
        </a>
      </div>

      {/* Floating SOS Button - will appear in bottom right */}
      <SOSFloatingButton />
    </div>
  );
}
