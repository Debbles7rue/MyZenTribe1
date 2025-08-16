"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { supabase } from "@/lib/supabaseClient";

type Tab = "karma" | "good";

type PostRow = {
  id: string;
  user_id: string;
  kind: Tab;
  title: string | null;
  content: string;
  is_anonymous: boolean;
  created_at: string; // ISO
};

type ReactionCount = Record<string, number>;

const pageBg: React.CSSProperties = {
  background: "linear-gradient(180deg, #EAFBF3 0%, #F4FFF9 100%)",
  minHeight: "100vh",
};

const cardTitle: React.CSSProperties = { fontWeight: 700, marginBottom: 6 };

export default function KarmaPage() {
  const [tab, setTab] = useState<Tab>("karma");

  // auth
  const [userId, setUserId] = useState<string | null>(null);
  const [myName, setMyName] = useState<string>("You");
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        const prof = await supabase.from("profiles").select("full_name").eq("id", uid).maybeSingle();
        if (!prof.error && prof.data?.full_name) setMyName(prof.data.full_name);
      }
    });
  }, []);

  // composer
  const [content, setContent] = useState("");
  const [goodNewsAnon, setGoodNewsAnon] = useState<boolean>(true); // good-news only toggle
  const [posting, setPosting] = useState(false);
  const canPost = content.trim().length > 0 && !!userId;

  // feed
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [supports, setSupports] = useState<ReactionCount>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Posts
      const { data: rows, error: err } = await supabase
        .from("good_news_posts")
        .select("id,user_id,kind,title,content,is_anonymous,created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (err) throw err;
      setPosts((rows ?? []) as PostRow[]);

      // Reaction counts (supports)
      const { data: reacts, error: rErr } = await supabase
        .from("good_news_reactions")
        .select("post_id, count: post_id", { count: "exact", head: false });
      // If your reactions table doesn't support this form, we'll fall back to grouping manually:
      if (!rErr && Array.isArray(reacts)) {
        const map: ReactionCount = {};
        for (const r of reacts as any[]) {
          const id = r.post_id as string;
          map[id] = (map[id] ?? 0) + 1;
        }
        setSupports(map);
      } else {
        // try manual grouping if needed
        const { data: allRe, error: rAllErr } = await supabase
          .from("good_news_reactions")
          .select("post_id");
        if (!rAllErr) {
          const map: ReactionCount = {};
          for (const r of (allRe ?? []) as any[]) {
            const id = r.post_id as string;
            map[id] = (map[id] ?? 0) + 1;
          }
          setSupports(map);
        }
      }
    } catch (e: any) {
      setError(e?.message || "Could not load posts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Post create
  const onPost = async () => {
    if (!canPost) return;
    setPosting(true);
    setError(null);
    try {
      const isAnon = tab === "karma" ? true : !!goodNewsAnon;
      const insert = {
        user_id: userId,
        kind: tab,
        title: null,
        content: content.trim(),
        is_anonymous: isAnon,
      };
      const { data, error: err } = await supabase
        .from("good_news_posts")
        .insert(insert)
        .select("id,user_id,kind,title,content,is_anonymous,created_at")
        .single();
      if (err) throw err;
      if (data) setPosts((prev) => [data as PostRow, ...prev]);
      setContent("");
    } catch (e: any) {
      setError(e?.message || "Posting failed.");
    } finally {
      setPosting(false);
    }
  };

  // Delete own post
  const onDelete = async (id: string, ownerId: string) => {
    if (!userId || userId !== ownerId) return alert("You can only delete your own post.");
    if (!confirm("Delete this post?")) return;
    const { error: err } = await supabase.from("good_news_posts").delete().eq("id", id);
    if (err) return alert(err.message || "Delete failed");
    setPosts((prev) => prev.filter((p) => p.id !== id));
    // remove any support counts we were showing
    setSupports((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  // Support / reaction
  const onSupport = async (id: string) => {
    if (!userId) return;
    // naive: allow multiple supports; if you add a unique constraint later, handle upsert
    const { error: err } = await supabase
      .from("good_news_reactions")
      .insert({ post_id: id, user_id: userId });
    if (err) {
      // If uniqueness exists, we can just ignore duplicate
      if (!`${err.message}`.toLowerCase().includes("duplicate")) {
        return alert(err.message || "Could not support");
      }
    }
    setSupports((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  };

  // Filter by tab
  const filtered = useMemo(() => posts.filter((p) => p.kind === tab), [posts, tab]);

  return (
    <div className="page-wrap" style={pageBg}>
      <div className="page">
        <div className="container-app">
          <div className="header-bar" style={{ marginBottom: 12 }}>
            <h1 className="page-title" style={{ marginBottom: 0 }}>
              Karma Corner
            </h1>
            <div className="controls">
              <Link href="/profile" className="btn">
                Back to profile
              </Link>
            </div>
          </div>

          {/* Welcome blurb */}
          <section className="card p-3" style={{ marginBottom: 12 }}>
            <div style={cardTitle}>Welcome! Share an act of kindness or a good-news story.</div>
            <ul className="muted" style={{ marginLeft: 18, listStyle: "disc" }}>
              <li>
                <strong>Karma</strong> posts are always anonymous (keep the ego out!).
              </li>
              <li>
                <strong>Good News</strong> can be anonymous or credited to you.
              </li>
              <li>Kindness only. No politics.</li>
            </ul>
          </section>

          {/* Tabs */}
          <div className="card p-3" style={{ marginBottom: 12 }}>
            <div className="controls" style={{ gap: 8, marginBottom: 10 }}>
              <button
                className={`btn ${tab === "karma" ? "btn-brand" : "btn-neutral"}`}
                onClick={() => setTab("karma")}
              >
                Karma
              </button>
              <button
                className={`btn ${tab === "good" ? "btn-brand" : "btn-neutral"}`}
                onClick={() => setTab("good")}
              >
                Good News
              </button>
            </div>

            {/* Composer */}
            <div className="stack">
              <textarea
                className="input"
                rows={4}
                placeholder={
                  tab === "karma"
                    ? "What kindness or challenge did you do? (kept anonymous)"
                    : "Share a good-news story or something uplifting…"
                }
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              {tab === "good" ? (
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={goodNewsAnon}
                    onChange={(e) => setGoodNewsAnon(e.target.checked)}
                  />
                  <span>Post anonymously</span>
                </label>
              ) : (
                <div className="muted">
                  Posting as: <strong>Anonymous</strong> (required for Karma)
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="controls">
                <button
                  className="btn btn-brand"
                  onClick={onPost}
                  disabled={!canPost || posting}
                  aria-disabled={!canPost || posting}
                >
                  {posting ? "Posting…" : "Post"}
                </button>
              </div>
            </div>
          </div>

          {/* Feed */}
          <section className="stack">
            {loading && <p className="muted">Loading…</p>}
            {!loading && filtered.length === 0 && (
              <div className="card p-3 muted">No posts yet. Be the first to share!</div>
            )}

            {filtered.map((p) => {
              const when = format(new Date(p.created_at), "MMM d");
              const who = p.is_anonymous ? "Anonymous" : myName;
              const count = supports[p.id] ?? 0;
              return (
                <article key={p.id} className="card p-3">
                  <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 6 }}>
                    {p.kind === "karma" ? "Karma" : "Good News"} • {when} • {who}
                  </div>
                  {p.title && <h3 style={{ margin: "0 0 6px 0" }}>{p.title}</h3>}
                  <div style={{ whiteSpace: "pre-wrap" }}>{p.content}</div>

                  <div className="controls" style={{ marginTop: 10, gap: 8 }}>
                    {userId === p.user_id && (
                      <button className="btn btn-neutral" onClick={() => onDelete(p.id, p.user_id)}>
                        Delete
                      </button>
                    )}
                    <button className="btn btn-neutral" onClick={() => onSupport(p.id)}>
                      Support {count > 0 ? `(${count})` : ""}
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        </div>
      </div>
    </div>
  );
}
