"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import { supabase } from "@/lib/supabaseClient";

type Community = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  location_scope: string | null;
  created_by: string;
  created_at: string;
};

type Member = { community_id: string; user_id: string; status: "member" | "pending" | "banned" };

type Post = {
  id: string;
  community_id: string;
  user_id: string;
  title: string | null;
  content: string;
  created_at: string;
};

type Event = {
  id: string;
  community_id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  venue: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  lat: number | null;
  lng: number | null;
  is_verified: boolean;
  created_at: string;
};

const POLITICS_WORDS = [
  "politic","election","president","vote","ballot","campaign","congress","senate","house",
  "democrat","republican","gop","left","right","liberal","conservative",
  "biden","trump","kamala","harris","pence","obama","clinton",
  "israel","palestine","gaza","ukraine","russia","war"
];
function looksPolitical(text: string) {
  const hay = text.toLowerCase();
  return POLITICS_WORDS.some(w => hay.includes(w));
}

type Tab = "discussion" | "events" | "about";

export default function CommunityPage() {
  const params = useParams<{ id: string }>();
  const communityId = params?.id;
  const [tab, setTab] = useState<Tab>("discussion");

  const [userId, setUserId] = useState<string | null>(null);
  const [community, setCommunity] = useState<Community | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);

  // discussion
  const [posts, setPosts] = useState<Post[]>([]);
  const [postTitle, setPostTitle] = useState("");
  const [postBody, setPostBody] = useState("");
  const [posting, setPosting] = useState(false);

  // events
  const [events, setEvents] = useState<Event[]>([]);
  const [evTitle, setEvTitle] = useState("");
  const [evDesc, setEvDesc] = useState("");
  const [evStart, setEvStart] = useState("");
  const [evEnd, setEvEnd] = useState("");
  const [evVenue, setEvVenue] = useState("");
  const [evCity, setEvCity] = useState("");
  const [evState, setEvState] = useState("");
  const [evZip, setEvZip] = useState("");
  const [creatingEvent, setCreatingEvent] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  async function loadAll() {
    if (!communityId) return;
    setLoading(true);

    const { data: c } = await supabase.from("communities").select("*").eq("id", communityId).maybeSingle();
    setCommunity((c ?? null) as Community | null);

    const { data: m } = await supabase
      .from("community_members")
      .select("*")
      .eq("community_id", communityId)
      .eq("user_id", userId ?? "");
    setIsMember((m ?? []).length > 0);

    const { data: p } = await supabase
      .from("community_posts")
      .select("*")
      .eq("community_id", communityId)
      .order("created_at", { ascending: false })
      .limit(100);
    setPosts((p ?? []) as Post[]);

    const { data: e } = await supabase
      .from("community_events")
      .select("*")
      .eq("community_id", communityId)
      .order("start_at", { ascending: false })
      .limit(100);
    setEvents((e ?? []) as Event[]);

    setLoading(false);
  }

  useEffect(() => { loadAll(); }, [communityId, userId]);

  async function join() {
    if (!userId || !communityId) { alert("Please sign in."); return; }
    const { error } = await supabase.from("community_members").insert([{ community_id: communityId, user_id: userId, status: "member" }]);
    if (error) { alert(error.message); return; }
    setIsMember(true);
  }

  async function leave() {
    if (!userId || !communityId) return;
    const { error } = await supabase.from("community_members").delete().eq("community_id", communityId).eq("user_id", userId);
    if (error) { alert(error.message); return; }
    setIsMember(false);
  }

  async function submitPost() {
    if (!userId || !communityId) return;
    const text = `${postTitle} ${postBody}`.trim();
    if (looksPolitical(text)) { alert("Thanks for sharing! Communities are politics-free."); return; }

    setPosting(true);
    const { data, error } = await supabase
      .from("community_posts")
      .insert([{ community_id: communityId, user_id: userId, title: postTitle.trim() || null, content: postBody.trim() }])
      .select("*")
      .single();
    setPosting(false);
    if (error) { alert(error.message); return; }
    setPosts(prev => [data as Post, ...prev]);
    setPostTitle(""); setPostBody("");
  }

  async function createEvent() {
    if (!userId || !communityId) return;
    if (!evTitle || !evStart) { alert("Please add a title and start time."); return; }
    const text = `${evTitle} ${evDesc} ${evVenue} ${evCity} ${evState}`;
    if (looksPolitical(text)) { alert("Events must be non-political."); return; }

    setCreatingEvent(true);
    const payload = {
      community_id: communityId,
      user_id: userId,
      title: evTitle.trim(),
      description: evDesc.trim() || null,
      start_at: new Date(evStart).toISOString(),
      end_at: evEnd ? new Date(evEnd).toISOString() : null,
      venue: evVenue.trim() || null,
      city: evCity.trim() || null,
      state: evState.trim() || null,
      zip: evZip.trim() || null,
      lat: null, lng: null
    };
    const { data, error } = await supabase.from("community_events").insert([payload]).select("*").single();
    setCreatingEvent(false);
    if (error) { alert(error.message); return; }
    setEvents(prev => [data as Event, ...prev]);
    setEvTitle(""); setEvDesc(""); setEvStart(""); setEvEnd(""); setEvVenue(""); setEvCity(""); setEvState(""); setEvZip("");
  }

  return (
    <div className="page-wrap">
      <SiteHeader />
      <div
        className="page"
        style={{
          background: "linear-gradient(180deg, #FFF7D6 0%, #FFFFFF 360px)"
        }}
      >
        <div className="container-app">
          <div className="header-bar">
            <h1 className="page-title" style={{ marginBottom: 0 }}>{community?.name ?? "Community"}</h1>
            <div className="controls">
              <Link className="btn btn-neutral" href="/communities">Back</Link>
              {isMember ? (
                <button className="btn" onClick={leave}>Leave</button>
              ) : (
                <button className="btn btn-brand" onClick={join}>Join</button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="segmented" role="tablist" aria-label="Community sections">
            <button className={`seg-btn ${tab === "discussion" ? "active" : ""}`} onClick={() => setTab("discussion")} role="tab" aria-selected={tab==="discussion"}>Discussion</button>
            <button className={`seg-btn ${tab === "events" ? "active" : ""}`} onClick={() => setTab("events")} role="tab" aria-selected={tab==="events"}>What’s happening</button>
            <button className={`seg-btn ${tab === "about" ? "active" : ""}`} onClick={() => setTab("about")} role="tab" aria-selected={tab==="about"}>About</button>
          </div>

          {loading && <p className="muted mt-3">Loading…</p>}

          {/* Discussion */}
          {!loading && tab === "discussion" && (
            <div className="stack">
              {isMember && (
                <section className="card p-3">
                  <h2 className="section-title">Start a discussion</h2>
                  <div className="grid gap-3">
                    <input className="input" placeholder="Optional title" value={postTitle} onChange={e => setPostTitle(e.target.value)} />
                    <textarea className="input" rows={4} placeholder="Share something with the community…" value={postBody} onChange={e => setPostBody(e.target.value)} />
                    <div className="right">
                      <button className="btn btn-brand" onClick={submitPost} disabled={posting || !postBody.trim()}>
                        {posting ? "Posting…" : "Post"}
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {posts.length === 0 ? (
                <p className="muted">No posts yet.</p>
              ) : (
                posts.map(p => (
                  <article key={p.id} className="card p-3">
                    <div className="muted text-xs mb-1">
                      {new Date(p.created_at).toLocaleString([], { month: "short", day: "numeric" })} • Member
                    </div>
                    {p.title && <h3 style={{ marginTop: 0 }}>{p.title}</h3>}
                    <div style={{ whiteSpace: "pre-wrap" }}>{p.content}</div>
                  </article>
                ))
              )}
            </div>
          )}

          {/* Events */}
          {!loading && tab === "events" && (
            <div className="stack">
              {isMember && (
                <section className="card p-3">
                  <h2 className="section-title">Add an event</h2>
                  <div className="grid gap-3">
                    <input className="input" placeholder="Event title" value={evTitle} onChange={e => setEvTitle(e.target.value)} />
                    <textarea className="input" rows={3} placeholder="Description (optional)" value={evDesc} onChange={e => setEvDesc(e.target.value)} />
                    <div className="grid sm:grid-cols-2 gap-3">
                      <label className="grid gap-1">
                        <span className="text-sm">Starts</span>
                        <input className="input" type="datetime-local" value={evStart} onChange={e => setEvStart(e.target.value)} />
                      </label>
                      <label className="grid gap-1">
                        <span className="text-sm">Ends (optional)</span>
                        <input className="input" type="datetime-local" value={evEnd} onChange={e => setEvEnd(e.target.value)} />
                      </label>
                    </div>
                    <input className="input" placeholder="Venue (optional)" value={evVenue} onChange={e => setEvVenue(e.target.value)} />
                    <div className="grid sm:grid-cols-3 gap-3">
                      <input className="input" placeholder="City" value={evCity} onChange={e => setEvCity(e.target.value)} />
                      <input className="input" placeholder="State" value={evState} onChange={e => setEvState(e.target.value)} />
                      <input className="input" placeholder="ZIP" value={evZip} onChange={e => setEvZip(e.target.value)} />
                    </div>
                    <div className="right">
                      <button className="btn btn-brand" onClick={createEvent} disabled={creatingEvent || !evTitle || !evStart}>
                        {creatingEvent ? "Saving…" : "Save event"}
                      </button>
                    </div>
                    <p className="muted text-sm">Verified events are highlighted once a community admin confirms them.</p>
                  </div>
                </section>
              )}

              {events.length === 0 ? (
                <p className="muted">No events yet.</p>
              ) : (
                events.map(e => (
                  <article key={e.id} className="card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="muted text-xs mb-1">
                          {new Date(e.start_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} {e.end_at ? "– " + new Date(e.end_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                        </div>
                        <h3 style={{ marginTop: 0 }}>{e.title}</h3>
                        {e.description && <div style={{ whiteSpace: "pre-wrap" }}>{e.description}</div>}
                        <div className="muted text-sm mt-1">
                          {[e.venue, e.city, e.state, e.zip].filter(Boolean).join(" • ")}
                        </div>
                      </div>
                      {e.is_verified && (
                        <span className="rounded-full px-2 py-1 text-xs" style={{ background: "#E9FFF2", border: "1px solid #c6f6d5", color: "#256F4D" }}>
                          Verified
                        </span>
                      )}
                    </div>
                  </article>
                ))
              )}
            </div>
          )}

          {/* About */}
          {!loading && tab === "about" && (
            <section className="card p-3">
              <h2 className="section-title">About this community</h2>
              <div className="grid gap-2">
                <div><strong>Category:</strong> {community?.category}{community?.subcategory ? ` • ${community.subcategory}` : ""}</div>
                {community?.location_scope && <div><strong>Area:</strong> {community.location_scope}</div>}
                {community?.description && <div style={{ whiteSpace: "pre-wrap" }}>{community.description}</div>}
                <div className="muted text-sm">Keep it kind. No politics. Respect differences. Safety first when sharing info.</div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
