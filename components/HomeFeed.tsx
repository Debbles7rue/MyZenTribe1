// components/HomeFeed.tsx
"use client";

import { useEffect, useState } from "react";
import { createPost, listHomeFeed, Post } from "@/lib/posts";
import PostCard from "@/components/PostCard";

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
    <div className="max-w-2xl mx-auto">
      {/* Composer */}
      <div className="card p-4 mb-6 bg-white rounded-xl shadow-sm">
        <textarea
          className="input w-full"
          rows={3}
          placeholder="Share something with your friends…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="mt-3 flex items-center gap-3">
          <select 
            className="input w-[150px]" 
            value={privacy} 
            onChange={(e) => setPrivacy(e.target.value as any)}
          >
            <option value="friends">Friends</option>
            <option value="public">Public</option>
            <option value="private">Only me</option>
          </select>
          <button 
            className="btn btn-brand ml-auto" 
            onClick={post} 
            disabled={saving || !body.trim()}
          >
            {saving ? "Posting…" : "Post"}
          </button>
        </div>
      </div>

      {/* Feed */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading…</div>
      ) : rows.length ? (
        <div className="space-y-4">
          {rows.map((p) => (
            <PostCard key={p.id} post={p} onChanged={load} />
          ))}
        </div>
      ) : (
        <div className="card p-8 text-center bg-white rounded-xl shadow-sm">
          <div className="text-lg font-medium">No posts yet</div>
          <div className="text-gray-500 mt-1">Say hello with your first post above.</div>
        </div>
      )}

      {/* Bottom buttons - styled nicely without the large SOS */}
      <div className="mt-8 flex justify-center gap-3 pb-8">
        <a 
          className="px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 rounded-lg shadow-sm transition-all hover:shadow-md font-medium"
          href="/contact"
        >
          Contact
        </a>
        <a 
          className="px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 rounded-lg shadow-sm transition-all hover:shadow-md font-medium"
          href="/suggestions"
        >
          Suggestions
        </a>
        <a 
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-sm transition-all hover:shadow-md font-medium"
          href="/donate"
        >
          Donations
        </a>
      </div>
    </div>
  );
}
