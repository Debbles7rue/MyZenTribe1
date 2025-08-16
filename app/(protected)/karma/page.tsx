"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { supabase } from "@/lib/supabaseClient";

type GoodNewsType = "personal" | "kindness" | "link" | "shoutout";

type Post = {
  id: string;
  user_id: string;
  type: GoodNewsType;
  content: string;
  link_url: string | null;
  image_url: string | null;
  created_at: string;
};

type Reaction = {
  id: string;
  post_id: string;
  user_id: string;
  emoji: string;
};

export default function KarmaPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [type, setType] = useState<GoodNewsType>("personal");
  const [content, setContent] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  // load posts + reactions
  async function load() {
    setLoading(true);
    setError(null);
    try {
      const { data: p, error: pe } = await supabase
        .from("good_news_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (pe) throw pe;

      const ids = (p ?? []).map((x) => x.id);
      let rx: Reaction[] = [];
      if (ids.length) {
        const { data: r, error: re } = await supabase
          .from("good_news_reactions")
          .select("id, post_id, user_id, emoji")
          .in("post_id", ids);
        if (re) throw re;
        rx = (r ?? []) as Reaction[];
      }

      setPosts((p ?? []) as Post[]);
      setReactions(rx);
    } catch (e: any) {
      setError(e?.message || "Could not load the karma feed.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // reaction helpers
  const reactionsByPost = useMemo(() => {
    const map = new Map<string, { count: number; mine: boolean }>();
    for (const p of posts) map.set(p.id, { count: 0, mine: false });
    for (const r of reactions) {
      const it = map.get(r.post_id);
      if (it) {
        it.count += 1;
        if (r.user_id === userId) it.mine = true;
      }
    }
    return map;
  }, [reactions, posts, userId]);

  async function toggleStar(postId: string) {
    if (!userId) {
      alert("Please sign in to react.");
      return;
    }
    const mine = reactions.find((r) => r.post_id === postId && r.user_id === userId && r.emoji === "🌟");
    try {
      if (mine) {
        const { error } = await supabase
          .from("good_news_reactions")
          .delete()
          .eq("id", mine.id)
          .eq("user_id", userId);
        if (error) throw error;
        setReactions((prev) => prev.filter((r) => r.id !== mine.id));
      } else {
        const { data, error } = await supabase
          .from("good_news_reactions")
          .insert([{ post_id: postId, user_id: userId, emoji: "🌟" }])
          .select()
          .single();
        if (error) throw error;
        setReactions((prev) => [...prev, data as Reaction]);
      }
    } catch (e: any) {
      alert(e?.message || "Could not update reaction.");
    }
  }

  async function submitPost() {
    if (!userId) {
      alert("Please sign in to post.");
      return;
    }
    const text = content.trim();
    const link = linkUrl.trim() || null;
    if (!text) return;

    setSaving(true);
    setError(null);
    try {
      const payload = { user_id: userId, type, content: text, link_url: link };
      const { data, error } = await supabase
        .from("good_news_posts")
        .insert([payload])
        .select("*")
        .single();
      if (error) throw error;

      setPosts((prev) => [data as Post, ...prev]);
      setContent("");
      setLinkUrl("");
      setType("personal");
    } catch (e: any) {
      setError(e?.message || "Could not post.");
    } finally {
      setSaving(false);
    }
  }

  async function deletePost(id: string, authorId: string) {
    if (!userId || userId !== authorId) return;
    if (!confirm("Delete this post?")) return;
    try {
      const { error } = await supabase
        .from("good_news_posts")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw error;
      setPosts((prev) => prev.filter((p) => p.id !== id));
      setReactions((prev) => prev.filter((r) => r.post_id !== id));
    } catch (e: any) {
      alert(e?.message || "Delete failed.");
    }
  }

  // UI
  return (
    <div className="page-wrap">
      <SiteHeader />
      <div className="page">
        <div className="container-app mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="header-bar">
            <h1 className="page-title" style={{ marginBottom: 0 }}>Good News & Karma Corner</h1>
            <div className="controls">
              <Link className="btn btn-neutral" href="/profile">Back to profile</Link>
            </div>
          </div>
          <div className="h-px" style={{ background: "rgba(196,181,253,.6)", margin: "12px 0 16px" }} />

          {/* Composer */}
          <section className="card p-3">
            <h2 className="section-title" style={{ marginTop: 0 }}>Share something uplifting</h2>
            <div className="grid gap-3">
              <div className="flex flex-wrap gap-2">
                {(["personal", "kindness", "link", "shoutout"] as GoodNewsType[]).map((t) => (
                  <button
                    key={t}
                    className={`btn ${type === t ? "btn-brand" : "btn-neutral"}`}
                    onClick={() => setType(t)}
                    type="button"
                  >
                    {t === "personal" && "Personal win"}
                    {t === "kindness" && "Kindness sighting"}
                    {t === "link" && "Uplifting link"}
                    {t === "shoutout" && "Shoutout"}
                  </button>
                ))}
              </div>

              <textarea
                className="input"
                rows={3}
                placeholder={
                  type === "personal"
                    ? "What went right today?"
                    : type === "kindness"
                    ? "What act of kindness did you notice?"
                    : type === "link"
                    ? "Write a short note about the story…"
                    : "Who do you want to appreciate, and why?"
                }
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />

              {type === "link" && (
                <input
                  className="input"
                  placeholder="Optional link to the story (https://…)"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                />
              )}

              <div className="right">
                <button className="btn btn-brand" onClick={submitPost} disabled={saving || !content.trim()}>
                  {saving ? "Posting…" : "Post"}
                </button>
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>
          </section>

          {/* Feed */}
          <div className="stack" style={{ marginTop: 12 }}>
            {loading && <p className="muted">Loading feed…</p>}
            {!loading && posts.length === 0 && (
              <p className="muted">Be the first to share some good news ✨</p>
            )}
            {!loading &&
              posts.map((p) => {
                const rx = reactionsByPost.get(p.id) || { count: 0, mine: false };
                const when = new Date(p.created_at).toLocaleString([], { month: "short", day: "numeric" });
                return (
                  <article key={p.id} className="card p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="muted text-xs uppercase tracking-wide" style={{ marginBottom: 4 }}>
                          {p.type === "personal" && "Personal win"}
                          {p.type === "kindness" && "Kindness sighting"}
                          {p.type === "link" && "Uplifting link"}
                          {p.type === "shoutout" && "Shoutout"}
                          {" • "}{when}
                        </div>
                        <div style={{ whiteSpace: "pre-wrap" }}>{p.content}</div>
                        {p.link_url && (
                          <div style={{ marginTop: 6 }}>
                            <a className="underline text-sm" href={p.link_url} target="_blank" rel="noreferrer">
                              Open link
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Delete if author */}
                      {userId === p.user_id && (
                        <button className="btn btn-neutral" onClick={() => deletePost(p.id, p.user_id)}>
                          Delete
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-3" style={{ marginTop: 10 }}>
                      <button
                        className={`btn ${rx.mine ? "btn-brand" : "btn-neutral"}`}
                        onClick={() => toggleStar(p.id)}
                        type="button"
                        aria-pressed={rx.mine}
                      >
                        🌟 {rx.count || ""}
                      </button>
                    </div>
                  </article>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
