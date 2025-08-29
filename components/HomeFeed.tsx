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

      {/* Bottom buttons */}
      <div className="mt-8 flex justify-center gap-3">
        <a className="btn" href="/contact">Contact</a>
        <a className="btn" href="/suggestions">Suggestions</a>
        <a className="btn btn-brand" href="/donate">Donations</a>
      </div>
    </div>
  );
}
