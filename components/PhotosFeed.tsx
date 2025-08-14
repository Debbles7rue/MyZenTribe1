"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Post = {
  id: string;
  image_path: string;
  caption: string | null;
  visibility: "friends" | "acquaintance" | "restricted" | "public";
  created_at: string;
  url: string;       // derived public URL from storage
  tags: string[];    // tagged user emails (simple display for now)
};

const VISIBILITY_OPTIONS = [
  { value: "friends", label: "Friends" },
  { value: "acquaintance", label: "Acquaintances" },
  { value: "restricted", label: "Restricted only" },
  { value: "public", label: "Public" },
] as const;

export default function PhotosFeed({ userId }: { userId: string | null }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [tags, setTags] = useState(""); // comma-separated emails for now
  const [visibility, setVisibility] = useState<"friends"|"acquaintance"|"restricted"|"public">("friends");

  const canPost = useMemo(() => !!userId, [userId]);

  async function listPosts() {
    if (!userId) return setPosts([]);
    // list files from storage by prefix; then join with DB posts
    const { data: rows } = await supabase
      .from("photo_posts")
      .select("id, image_path, caption, visibility, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const items = await Promise.all((rows ?? []).map(async (r) => {
      const { data: pub } = supabase.storage.from("event-photos").getPublicUrl(r.image_path);
      const { data: tagsRows } = await supabase
        .from("photo_tags")
        .select("tagged_user_id")
        .eq("post_id", r.id);
      // For display, fetch tagged emails (lightweight; could be cached)
      let emails: string[] = [];
      if (tagsRows?.length) {
        const ids = tagsRows.map(t => t.tagged_user_id);
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", ids);
        emails = (profs ?? []).map(p => p.full_name ?? p.id);
      }
      return {
        id: r.id,
        image_path: r.image_path,
        caption: r.caption,
        visibility: r.visibility as Post["visibility"],
        created_at: r.created_at,
        url: pub.publicUrl,
        tags: emails,
      };
    }));

    setPosts(items);
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setUploading(true);
    try {
      const filename = `${Date.now()}-${file.name}`;
      const path = `${userId}/${filename}`;

      const up = await supabase.storage.from("event-photos").upload(path, file, {
        cacheControl: "3600", upsert: false,
      });
      if (up.error) throw up.error;

      // create DB row for post
      const ins = await supabase.from("photo_posts").insert({
        user_id: userId,
        image_path: path,
        caption: caption.trim() || null,
        visibility,
      }).select().single();
      if (ins.error) throw ins.error;

      // tags: comma-separated emails -> (we'd map to user ids in a proper flow)
      const emails = tags.split(",").map(s => s.trim()).filter(Boolean);
      // naive mapping: try to find profiles by full_name (or later by email when stored)
      if (emails.length) {
        const { data: maybe } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("full_name", emails);
        const rows = (maybe ?? []).map(p => ({ post_id: ins.data.id, tagged_user_id: p.id }));
        if (rows.length) {
          await supabase.from("photo_tags").insert(rows);
        }
      }

      setCaption("");
      setTags("");
      setVisibility("friends");
      await listPosts();
    } catch (err: any) {
      alert(err.message || "Upload failed");
    } finally {
      setUploading(false);
      e.currentTarget.value = "";
    }
  }

  useEffect(() => { listPosts(); }, [userId]);

  return (
    <section className="card p-3">
      <h2 className="section-title">Photos</h2>

      {canPost && (
        <div className="stack" style={{ marginBottom: 10 }}>
          <label className="field">
            <span className="label">Caption</span>
            <input className="input" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Say something about this moment…" />
          </label>

          <label className="field">
            <span className="label">Tag friends (names)</span>
            <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Type names, separated by commas" />
          </label>

          <label className="field">
            <span className="label">Who can see this photo?</span>
            <select className="select" value={visibility} onChange={(e)=>setVisibility(e.target.value as any)}>
              {VISIBILITY_OPTIONS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
          </label>

          <label className="btn btn-brand" style={{ width: "fit-content" }}>
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={onUpload} />
            {uploading ? "Uploading…" : "Upload photo"}
          </label>
        </div>
      )}

      <div className="columns">
        {posts.map(p => (
          <div key={p.id} className="card p-3">
            <img src={p.url} alt={p.caption ?? p.image_path} style={{ width: "100%", borderRadius: 12, marginBottom: 8 }} />
            {p.caption && <div style={{ marginBottom: 6 }}>{p.caption}</div>}
            <div className="muted" style={{ fontSize: 12 }}>
              Visibility: {p.visibility}{p.tags.length ? ` • Tagged: ${p.tags.join(", ")}` : ""}
            </div>
          </div>
        ))}
      </div>

      {!posts.length && <p className="muted">No photos yet. Share your first memory!</p>}
    </section>
  );
}
