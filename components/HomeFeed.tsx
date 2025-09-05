// components/HomeFeed.tsx
"use client";

import { useEffect, useState } from "react";
import { createPost, listHomeFeed, Post } from "@/lib/posts";
import PostCard from "@/components/PostCard";
import SOSFloatingButton from "@/components/SOSFloatingButton";
import { Heart, MessageSquare, Gift } from "lucide-react";

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
    <div className="max-w-2xl mx-auto p-4 sm:p-6 pb-24">
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

      {/* Action Buttons Section */}
      <div className="mt-12 mb-8">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
          <h3 className="text-center text-lg font-semibold text-gray-700 mb-6">
            Connect & Support
          </h3>
          
          {/* Main Action Buttons */}
          <div className="grid grid-cols-3 gap-3">
            <a 
              href="/contact" 
              className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-xl transition-all duration-200 group"
            >
              <MessageSquare className="w-7 h-7 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-purple-700">Contact</span>
            </a>
            
            <a 
              href="/suggestions" 
              className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-xl transition-all duration-200 group"
            >
              <Heart className="w-7 h-7 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-blue-700">Ideas</span>
            </a>
            
            <a 
              href="/donate" 
              className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-pink-50 to-pink-100 hover:from-pink-100 hover:to-pink-200 rounded-xl transition-all duration-200 group"
            >
              <Gift className="w-7 h-7 text-pink-600 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-pink-700">Donate</span>
            </a>
          </div>
        </div>
      </div>

      {/* SOS Floating Button */}
      <SOSFloatingButton />
    </div>
  );
}
