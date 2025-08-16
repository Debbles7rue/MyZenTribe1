// app/communities/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
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
  visibility: "public" | "private";
  join_question: string | null;
  invite_token: string; // uuid
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

type Pending = {
  user_id: string;
  note: string | null;
  created_at: string;
};

type Tab = "discussion" | "events" | "about";

export default function CommunityPage() {
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

  // private join
  const [requestNote, setRequestNote] = useState("");
  const [hasPending, setHasPending] = useState(false);

  // admin pending list
  const [pending, setPending] = useState<Pending[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  async function load() {
    if (!communityId) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("communities")
      .select(
        "id,title,category,zip,photo_url,about,created_by,created_at,visibility,join_question,invite_token"
      )
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
        .select("role,status,note")
        .eq("community_id", communityId)
        .eq("user_id", userId)
        .maybeSingle();

      setIsMember(m?.status === "member");
      setIsAdmin(m?.role === "admin");
      setHasPending(m?.status === "pending");
      setRequestNote(m?.note ?? "");
    } else {
      setIsMember(false);
      setIsAdmin(false);
      setHasPending(false);
    }

    // auto-accept invites (?invite=TOKEN) – safe because we read window directly (no Suspense needed)
    if (data && userId) {
      const token = typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("invite")
        : null;

      if (token && token === data.invite_token) {
        // add or update membership to "member"
        const { data: exists } = await supabase
          .from("community_members")
          .select("status")
          .eq("community_id", communityId)
          .eq("user_id", userId)
          .maybeSingle();

        if (!exists) {
          await supabase.from("community_members").insert({
            community_id: communityId,
            user_id: userId,
            role: "member",
            status: "member",
            note: "via invite link",
          });
        } else if (exists.status !== "member") {
          await supabase
            .from("community_members")
            .update({ status: "member", note: "via invite link" })
            .eq("community_id", communityId)
            .eq("user_id", userId);
        }

        setIsMember(true);
        setHasPending(false);
      }
    }

    // posts & events
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

    // admin: load pending requests
    if (data?.visibility === "private" && isAdmin) {
      const { data: pend } = await supabase
        .from("community_members")
        .select("user_id,note,created_at")
        .eq("community_id", communityId)
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      setPending(pend ?? []);
    } else {
      setPending([]);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, communityId]);

  async function joinPublic() {
    if (!userId || !communityId) return;
    await supabase.from("community_members").insert({
      community_id: communityId,
      user_id: userId,
      role: "member",
      status: "member",
    });
    await load();
  }

  async function requestPrivate() {
    if (!userId || !communityId) return;
    await supabase.from("community_members").insert({
      community_id: communityId,
      user_id: userId,
      role: "member",
      status: "pending",
      note: requestNote.trim() || null,
    });
    setHasPending(true);
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
    if (error) return alert(error.message);
    setNewPost("");
    await load();
  }

  async function deletePost(id: string) {
    if (!confirm("Delete this post?")) return;
    await supabase.from("community_posts").delete().eq("id", id);
    await load();
  }

  // admin: approve / reject
  async function approve(user_id: string) {
    await supabase
      .from("community_members")
      .update({ status: "member" })
      .eq("community_id", communityId)
      .eq("user_id", user_id);
    await load();
  }
  async function reject(user_id: string) {
    await supabase
      .from("community_members")
      .delete()
      .eq("community_id", communityId)
      .eq("user_id", user_id);
    await load();
  }

  const inviteUrl =
    typeof window !== "undefined" && c
      ? `${window.location.origin}/communities/${c.id}?invite=${c.invite_token}`
      : "";

  const bg: React.CSSProperties = { background: "linear-gradient(#FFF7DB, #ffffff)", minHeight: "100vh" };

  return (
    <div className="page-wrap" style={bg}>
      <div className="page">
        <div className="container-app">
          <div className="header-bar">
            <h1 className="page-title" style={{ marginBottom: 0 }}>Community</h1>
            <div className="controls">
              <Link href="/communities" className="btn">Back</Link>

              {/* Join/Leave logic */}
              {!isMember ? (
                c?.visibility === "public" ? (
                  <button className="btn btn-brand" onClick={joinPublic}>Join</button>
                ) : hasPending ? (
                  <button className="btn" disabled>Request pending</button>
                ) : (
                  <button className="btn btn-brand" onClick={requestPrivate}>Request to join</button>
                )
              ) : (
                <button className="btn" onClick={leave}>Leave</button>
              )}
            </div>
          </div>

          {/* identity card */}
          <div className="card p-3">
            <div style={{ display: "grid", gridTemplateColumns: "96px 1fr auto", gap: 12 }}>
              <div
                style={{
                  width: 96, height: 96, borderRadius: 16,
                  background: c?.photo_url ? `center / cover no-repeat url(${c.photo_url})` : "linear-gradient(135deg,#c4a6ff,#ff8a65)",
                }}
              />
              <div>
                <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                  <strong style={{ fontSize: 20 }}>{c?.title || "Untitled"}</strong>
                  {c?.category && <span className="tag">{c.category}</span>}
                  {c?.zip && <span className="muted">· {c.zip}</span>}
                  <span className="tag">{c?.visibility === "private" ? "Private" : "Public"}</span>
                  {isAdmin && <span className="tag">Admin</span>}
                </div>
                {c?.about && <p className="muted" style={{ marginTop: 6 }}>{c.about}</p>}
              </div>

              {/* Invite link */}
              {c && (
                <div className="right" style={{ display: "flex", gap: 8, alignItems: "start" }}>
                  <button
                    className="btn btn-neutral"
                    onClick={async () => {
                      if (!inviteUrl) return;
                      try {
                        await navigator.clipboard.writeText(inviteUrl);
                        alert("Invite link copied!");
                      } catch {
                        prompt("Copy the invite link:", inviteUrl);
                      }
                    }}
                  >
                    Invite link
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Private: request form if not a member and not pending */}
          {c?.visibility === "private" && !isMember && !hasPending && (
            <div className="card p-3 mt-2">
              <h3 style={{ marginTop: 0 }}>Request to join</h3>
              <p className="muted" style={{ marginTop: 0 }}>
                {c.join_question || "Tell the admins a little about why you’d like to join."}
              </p>
              <textarea
                className="input"
                rows={3}
                placeholder="Your answer…"
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
              />
              <div className="right" style={{ marginTop: 8 }}>
                <button className="btn btn-brand" onClick={requestPrivate}>Send request</button>
              </div>
            </div>
          )}

          {/* Admin: pending approvals */}
          {c?.visibility === "private" && isAdmin && (
            <div className="card p-3 mt-2">
              <h3 style={{ marginTop: 0 }}>Pending requests</h3>
              {pending.length === 0 && <p className="muted">None right now.</p>}
              <div className="stack">
                {pending.map((p) => (
                  <div key={p.user_id} className="card p-3">
                    <div className="muted" style={{ fontSize: 12 }}>
                      Requested on {format(new Date(p.created_at), "MMM d, h:mma")}
                    </div>
                    {p.note && <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{p.note}</div>}
                    <div className="right" style={{ marginTop: 8, display: "flex", gap: 8 }}>
                      <button className="btn btn-brand" onClick={() => approve(p.user_id)}>Approve</button>
                      <button className="btn" onClick={() => reject(p.user_id)}>Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                          <button className="btn btn-neutral" onClick={() => deletePost(p.id)}>Delete</button>
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
                      <input className="input" type="datetime-local" value={evWhen} onChange={(e) => setEvWhen(e.target.value)} />
                    </div>
                    <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                      <input className="input" placeholder="Location" value={evWhere} onChange={(e) => setEvWhere(e.target.value)} />
                      <input className="input" placeholder="Details (optional)" value={evDetails} onChange={(e) => setEvDetails(e.target.value)} />
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

