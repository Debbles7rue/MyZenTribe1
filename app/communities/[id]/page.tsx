// app/communities/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { supabase } from "@/lib/supabaseClient";

type Community = {
  id: string;
  title: string;
  category: string | null;
  zip: string | null;
  photo_url: string | null;
  about: string | null;
  created_by: string | null;
  created_at: string;
};

type Post = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
};

type Event = {
  id: string;
  user_id: string;
  title: string;
  details: string | null;
  start_at: string;
  location: string | null;
  created_at: string;
};

type Tab = "discussion" | "events" | "about";

export default function CommunityPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const communityId = params?.id;

  const [userId, setUserId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("discussion");

  const [c, setC] = useState<Community | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [loading, setLoading] = useState(true);

  // posts
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);

  // events
  const [events, setEvents] = useState<Event[]>([]);
  const [evTitle, setEvTitle] = useState("");
  const [evWhen, setEvWhen] = useState(""); // datetime-local
  const [evWhere, setEvWhere] = useState("");
  const [evDetails, setEvDetails] = useState("");
  const [savingEvent, setSavingEvent] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  async function load() {
    if (!communityId) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("communities")
      .select("id,title,category,zip,photo_url,about,created_by,created_at")
      .eq("id", communityId)
      .maybeSingle();

    if (error) {
      console.error(error);
      setC(null);
      setLoading(false);
      return;
    }
    setC(data);

    // membership & role
    if (userId) {
      const { data: m } = await supabase
        .from("community_members")
        .select("role")
        .eq("community_id", communityId)
        .eq("user_id", userId)
        .maybeSingle();

      setIsMember(!!m);
      setIsAdmin(m?.role === "admin");
    } else {
      setIsMember(false);
      setIsAdmin(false);
    }

    // posts and events
    const [{ data: pr }, { data: er }] = await Promise.all([
      supabase
        .from("community_posts")
        .select("id,user_id,content,created_at")
        .eq("community_id", communityId)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("community_events")
        .select("id,user_id,title,details,start_at,location,created_at")
        .eq("community_id", communityId)
        .order("start_at", { ascending: true })
        .limit(100),
    ]);

    setPosts(pr ?? []);
    setEvents(er ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, communityId]);

  async function join() {
    if (!userId || !communityId) return;
    await supabase.from("community_members").insert({
      community_id: communityId,
      user_id: userId,
      role: "member",
      status: "member",
    });
    await load();
  }

  async function leave() {
    if (!userId || !communityId) return;
    await supabase.from("community_members").delete().eq("community_id", communityId).eq("user_id", userId);
    await load();
  }

  async function submitPost() {
    if (!userId || !communityId || !newPost.trim()) return;
    setPosting(true);
    const { error } = await supabase.from("community_posts").insert({
      community_id: communityId,
      user_id: userId,
      content: newPost.trim(),
    });
    setPosting(false);
    if (error) {
      alert(error.message);
      return;
    }
    setNewPost("");
    await load();
  }

  async function deletePost(id: string) {
    if (!confirm("Delete this post?")) return;
    await supabase.from("community_posts").delete().eq("id", id);
    await load();
  }

  async function addEvent() {
    if (!userId || !communityId || !evTitle.trim() || !evWhen) return;
    setSavingEvent(true);
    const { error } = await supabase.from("community_events").insert({
      community_id: communityId,
      user_id: userId,
      title: evTitle.trim(),
      details: evDetails.trim() || null,
      start_at: new Date(evWhen).toISOString(),
      location: evWhere.trim() || null,
    });
    setSavingEvent(false);
    if (error) {
      alert(error.message);
      return;
    }
    setEvTitle("");
    setEvWhen("");
    setEvWhere("");
    setEvDetails("");
    await load();
  }

  const bg: React.CSSProperties = {
    background: "linear-gradient(#FFF7DB, #ffffff)",
    minHeight: "100vh",
  };

  return (
    <div className="page-wrap" style={bg}>
      <div className="page">
        <div className="container-app">
          <div className="header-bar">
            <h1 className="page-title" style={{ marginBottom: 0 }}>
              Community
            </h1>
            <div className="controls">
              <Link href="/communities" className="btn">
                Back
              </Link>
              {!isMember ? (
                <button className="btn btn-brand" onClick={join}>
                  Join
                </button>
              ) : (
                <button className="btn" onClick={leave}>
                  Leave
                </button>
              )}
            </div>
          </div>

          {/* identity card */}
          <div className="card p-3">
            <div style={{ display: "grid", gridTemplateColumns: "96px 1fr", gap: 12 }}>
              <div
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 16,
                  background:
                    c?.photo_url ? `center / cover no-repeat url(${c.photo_url})` : "linear-gradient(135deg,#c4a6ff,#ff8a65)",
                }}
              />
              <div>
                <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                  <strong style={{ fontSize: 20 }}>{c?.title || "Untitled"}</strong>
                  {c?.category && <span className="tag">{c.category}</span>}
                  {c?.zip && <span className="muted">· {c.zip}</span>}
                  {isAdmin && <span className="tag">Admin</span>}
                </div>
                {c?.about && <p className="muted" style={{ marginTop: 6 }}>{c.about}</p>}
              </div>
            </div>
          </div>

          {/* tabs */}
          <div className="card p-3 mt-2">
            <div className="segmented" role="tablist" aria-label="Community tabs">
              <button className={`seg-btn ${tab === "discussion" ? "active" : ""}`} onClick={() => setTab("discussion")}>
                Discussion
              </button>
              <button className={`seg-btn ${tab === "events" ? "active" : ""}`} onClick={() => setTab("events")}>
                What’s happening
              </button>
              <button className={`seg-btn ${tab === "about" ? "active" : ""}`} onClick={() => setTab("about")}>
                About
              </button>
            </div>

            {/* DISCUSSION */}
            {tab === "discussion" && (
              <div className="stack" style={{ marginTop: 12 }}>
                {isMember ? (
                  <div className="stack">
                    <textarea
                      className="input"
                      rows={3}
                      placeholder="Start a discussion…"
                      value={newPost}
                      onChange={(e) => setNewPost(e.target.value)}
                    />
                    <div className="right">
                      <button className="btn btn-brand" onClick={submitPost} disabled={posting}>
                        {posting ? "Posting…" : "Post"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="muted">Join to post.</p>
                )}

                <div className="stack">
                  {posts.length === 0 && <p className="muted">No posts yet.</p>}
                  {posts.map((p) => (
                    <div key={p.id} className="card p-3">
                      <div className="muted" style={{ fontSize: 12 }}>
                        {format(new Date(p.created_at), "MMM d")} · {p.user_id === userId ? "You" : "Member"}
                      </div>
                      <div style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{p.content}</div>
                      {p.user_id === userId && (
                        <div className="right" style={{ marginTop: 8 }}>
                          <button className="btn btn-neutral" onClick={() => deletePost(p.id)}>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* EVENTS */}
            {tab === "events" && (
              <div className="stack" style={{ marginTop: 12 }}>
                {isMember ? (
                  <div className="card p-3">
                    <h3 style={{ marginTop: 0 }}>Add an event</h3>
                    <div className="grid" style={{ gridTemplateColumns: "1.2fr 1fr", gap: 8 }}>
                      <input className="input" placeholder="Title" value={evTitle} onChange={(e) => setEvTitle(e.target.value)} />
                      <input
                        className="input"
                        type="datetime-local"
                        value={evWhen}
                        onChange={(e) => setEvWhen(e.target.value)}
                      />
                    </div>
                    <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                      <input
                        className="input"
                        placeholder="Location (address, city, etc.)"
                        value={evWhere}
                        onChange={(e) => setEvWhere(e.target.value)}
                      />
                      <input
                        className="input"
                        placeholder="Details (optional)"
                        value={evDetails}
                        onChange={(e) => setEvDetails(e.target.value)}
                      />
                    </div>
                    <div className="right" style={{ marginTop: 8 }}>
                      <button className="btn btn-brand" onClick={addEvent} disabled={savingEvent}>
                        {savingEvent ? "Saving…" : "Save event"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="muted">Join to add events.</p>
                )}

                <div className="stack">
                  {events.length === 0 && <p className="muted">No upcoming events yet.</p>}
                  {events.map((ev) => (
                    <div key={ev.id} className="card p-3">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <strong>{ev.title}</strong>
                        <span className="muted">{format(new Date(ev.start_at), "EEE, MMM d • h:mma")}</span>
                      </div>
                      {ev.location && <div className="muted" style={{ marginTop: 4 }}>{ev.location}</div>}
                      {ev.details && <div style={{ marginTop: 6 }}>{ev.details}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ABOUT */}
            {tab === "about" && (
              <div className="stack" style={{ marginTop: 12 }}>
                <div className="muted">Category: {c?.category || "—"}</div>
                <div className="muted">ZIP: {c?.zip || "—"}</div>
                <div style={{ whiteSpace: "pre-wrap" }}>{c?.about || "No description yet."}</div>
              </div>
            )}
          </div>

          {loading && <p className="muted mt-2">Loading…</p>}
        </div>
      </div>
    </div>
  );
}
