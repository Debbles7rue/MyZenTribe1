"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { supabase } from "@/lib/supabaseClient";

type Kind = "karma" | "news";
type GoodNewsType = "personal" | "kindness" | "link" | "shoutout";

type Post = {
  id: string;
  user_id: string;
  type: GoodNewsType;
  title: string | null;
  content: string;
  link_url: string | null;
  image_url: string | null;
  anonymous: boolean;
  created_at: string;
};

type Reaction = {
  id: string;
  post_id: string;
  user_id: string;
  emoji: string;
};

type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
};

const POLITICS_WORDS = [
  "politic","election","president","vote","ballot","campaign","congress","senate","house",
  "democrat","republican","gop","left","right","liberal","conservative",
  "biden","trump","kamala","harris","pence","obama","clinton",
  "israel","palestine","gaza","ukraine","russia","war"
];

function looksPolitical(text: string, url: string) {
  const hay = (text + " " + (url || "")).toLowerCase();
  return POLITICS_WORDS.some((w) => hay.includes(w));
}

/** Inline comments component (anonymous, supportive) */
function SupportComments({ postId, userId }: { postId: string; userId: string | null }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchComments() {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("good_news_comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true })
        .limit(100);
      if (error) throw error;
      setItems((data ?? []) as Comment[]);
    } catch (e: any) {
      setError(e?.message || "Could not load comments.");
    } finally {
      setLoading(false);
    }
  }

  async function addComment() {
    if (!userId) {
      alert("Please sign in to comment.");
      return;
    }
    const content = text.trim();
    if (!content) return;
    if (content.length > 500) {
      alert("Please keep comments under 500 characters.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("good_news_comments")
        .insert([{ post_id: postId, user_id: userId, content }])
        .select("*")
        .single();
      if (error) throw error;
      setItems((prev) => [...prev, data as Comment]);
      setText("");
    } catch (e: any) {
      setError(e?.message || "Could not add comment.");
    } finally {
      setSaving(false);
    }
  }

  async function removeComment(id: string) {
    if (!userId) return;
    try {
      const { error } = await supabase
        .from("good_news_comments")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw error;
      setItems((prev) => prev.filter((c) => c.id !== id));
    } catch (e: any) {
      alert(e?.message || "Could not delete comment.");
    }
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && items.length === 0) fetchComments();
  }

  return (
    <div className="mt-2">
      <button className="btn btn-neutral" onClick={toggle} type="button">
        {open ? "Hide support" : "Support"}
      </button>

      {open && (
        <div
          className="rounded-xl p-3 mt-2"
          style={{
            background: "#E9FFF2", // light mint
            border: "1px solid #c6f6d5",
          }}
        >
          {loading && <p className="muted">Loading support…</p>}
          {!loading && items.length === 0 && (
            <p className="muted">Be the first to leave a kind word 💚</p>
          )}

          {!loading &&
            items.map((c) => (
              <div key={c.id} className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="muted text-xs">Anonymous • {new Date(c.created_at).toLocaleString([], { month: "short", day: "numeric" })}</div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{c.content}</div>
                </div>
                {userId === c.user_id && (
                  <button className="btn btn-neutral" onClick={() => removeComment(c.id)}>
                    Delete
                  </button>
                )}
              </div>
            ))}

          <div className="mt-2 grid gap-2">
            <textarea
              className="input"
              rows={2}
              placeholder="Leave a kind, supportive note…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="right">
              <button className="btn btn-brand" onClick={addComment} disabled={saving || !text.trim()}>
                {saving ? "Sending…" : "Send support"}
              </button>
            </div>
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function KarmaPage() {
  const [userId, setUserId] = useState<string | null>(null);

  // composer state
  const [kind, setKind] = useState<Kind>("karma");
  const [anonymous, setAnonymous] = useState(true); // forced true for karma
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  // data
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  // keep anonymity default with kind
  useEffect(() => {
    setAnonymous(kind === "karma" ? true : false);
  }, [kind]);

  // load posts + reactions
  async function load() {
    setLoading(true);
    setError(null);
    try {
      const { data: p, error: pe } = await supabase
        .from("good_news_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (pe) throw pe;

      setPosts((p ?? []) as Post[]);

      const ids = (p ?? []).map((x: any) => x.id);
      if (ids.length) {
        const { data: r, error: re } = await supabase
          .from("good_news_reactions")
          .select("id, post_id, user_id, emoji")
          .in("post_id", ids);
        if (re) throw re;
        setReactions((r ?? []) as Reaction[]);
      } else {
        setReactions([]);
      }
    } catch (e: any) {
      setError(e?.message || "Could not load the feed.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  // reactions summary
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
    const ttl = title.trim() || null;
    const link = linkUrl.trim() || null;
    if (!text) return;

    if (looksPolitical(`${ttl ?? ""} ${text}`, link ?? "")) {
      setError("Thanks for sharing! Karma Corner is politics-free. Please rephrase or choose a different story.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const type: GoodNewsType =
        kind === "news" ? (link ? "link" : "personal") : "kindness";

      const payload = {
        user_id: userId,
        type,
        title: ttl,
        content: text,
        link_url: link,
        anonymous: kind === "karma" ? true : anonymous,
      };

      const { data, error } = await supabase
        .from("good_news_posts")
        .insert([payload])
        .select("*")
        .single();
      if (error) throw error;

      setPosts((prev) => [data as Post, ...prev]);
      setTitle("");
      setContent("");
      setLinkUrl("");
      setAnonymous(kind === "karma" ? true : false);
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

  return (
    <div className="page-wrap">
      <SiteHeader />
      {/* Mint gradient background to polish the page */}
      <div
        className="page"
        style={{
          background: "linear-gradient(180deg, #F1FFF7 0%, #FFFFFF 70%)",
          minHeight: "100vh",
        }}
      >
        <div className="container-app mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="header-bar">
            <h1 className="page-title" style={{ marginBottom: 0 }}>Karma Corner</h1>
            <div className="controls">
              <Link className="btn btn-neutral" href="/profile">Back to profile</Link>
            </div>
          </div>

          <div
            className="rounded-xl p-3 mb-3"
            style={{
              background: "#E9FFF2",
              border: "1px solid #c6f6d5",
            }}
          >
            <strong>Welcome!</strong> Share an act of kindness or a good-news story.
            <div className="mt-1 text-sm" style={{ color: "#3f624f" }}>
              <ul className="list-disc ml-5">
                <li><b>Karma</b> posts are <i>always anonymous</i> (keeps the ego out).</l
