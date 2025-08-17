"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabaseClient";
import SiteHeader from "@/components/SiteHeader";

// Leaflet needs window; use dynamic import
const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then(m => m.Popup), { ssr: false });

type Community = {
  id: string;
  title: string;
  category: string | null;
  zip: string | null;
  about: string | null;
  photo_url: string | null;
  created_by: string;
  created_at: string;
};

type Member = {
  user_id: string;
  role: "admin" | "member";
  status: "member" | "pending";
};

type Post = {
  id: string;
  community_id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_post_id: string | null;
};

type Event = {
  id: string;
  community_id: string;
  user_id: string;
  title: string;
  start_at: string;
  end_at: string | null;
  location: string | null;
  description: string | null;
};

type Listing = {
  id: string;
  community_id: string;
  user_id: string;
  title: string | null;
  place_name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  schedule: string | null;
};

export default function CommunityPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  const [c, setC] = useState<Community | null>(null);
  const [me, setMe] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"discussion" | "events" | "map" | "about">("discussion");
  const [editing, setEditing] = useState(false);

  // discussion state
  const [newPost, setNewPost] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);

  // events state
  const [events, setEvents] = useState<Event[]>([]);
  const [evtTitle, setEvtTitle] = useState("");
  const [evtStart, setEvtStart] = useState("");
  const [evtEnd, setEvtEnd] = useState("");
  const [evtLoc, setEvtLoc] = useState("");
  const [evtDesc, setEvtDesc] = useState("");

  // listings state (map)
  const [listings, setListings] = useState<Listing[]>([]);
  const [listTitle, setListTitle] = useState("");
  const [listPlace, setListPlace] = useState("");
  const [listAddr, setListAddr] = useState("");
  const [listLat, setListLat] = useState<string>("");
  const [listLng, setListLng] = useState<string>("");
  const [listSchedule, setListSchedule] = useState("");

  // edit community
  const [photoUrl, setPhotoUrl] = useState("");
  const [about, setAbout] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!params?.id) return;
      setLoading(true);
      try {
        const { data: comm } = await supabase
          .from("communities")
          .select("*")
          .eq("id", params.id)
          .maybeSingle();

        if (!comm) {
          setLoading(false);
          return;
        }

        setC(comm as Community);
        setPhotoUrl(comm.photo_url ?? "");
        setAbout(comm.about ?? "");

        if (userId) {
          const { data: m } = await supabase
            .from("community_members")
            .select("user_id, role, status")
            .eq("community_id", params.id)
            .eq("user_id", userId)
            .maybeSingle();
          setMe(m as Member | null);
        }

        // load top-level posts
        const { data: p } = await supabase
          .from("community_posts")
          .select("*")
          .eq("community_id", params.id)
          .is("parent_post_id", null)
          .order("created_at", { ascending: false });
        setPosts((p ?? []) as Post[]);

        // load events
        const { data: ev } = await supabase
          .from("community_events")
          .select("*")
          .eq("community_id", params.id)
          .order("start_at", { ascending: true });
        setEvents((ev ?? []) as Event[]);

        // load listings
        const { data: ls } = await supabase
          .from("community_listings")
          .select("*")
          .eq("community_id", params.id)
          .order("created_at", { ascending: false });
        setListings((ls ?? []) as Listing[]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params?.id, userId]);

  const isAdmin = !!me && (me.role === "admin" || c?.created_by === userId);
  const isMember = !!me && me.status === "member";

  async function createPost() {
    if (!userId || !c?.id || !newPost.trim()) return;
    const { data, error } = await supabase.from("community_posts").insert({
      community_id: c.id,
      user_id: userId,
      content: newPost.trim(),
      parent_post_id: null,
    }).select().maybeSingle();
    if (error) return alert(error.message);
    setPosts([data as Post, ...posts]);
    setNewPost("");
  }

  async function replyTo(postId: string, text: string) {
    if (!userId || !c?.id || !text.trim()) return;
    const { error } = await supabase.from("community_posts").insert({
      community_id: c.id,
      user_id: userId,
      content: text.trim(),
      parent_post_id: postId,
    });
    if (error) alert(error.message);
  }

  async function createEvent() {
    if (!userId || !c?.id || !evtTitle.trim() || !evtStart) return;
    const payload = {
      community_id: c.id,
      user_id: userId,
      title: evtTitle.trim(),
      start_at: new Date(evtStart).toISOString(),
      end_at: evtEnd ? new Date(evtEnd).toISOString() : null,
      location: evtLoc || null,
      description: evtDesc || null,
    };
    const { data, error } = await supabase
      .from("community_events")
      .insert(payload)
      .select()
      .maybeSingle();
    if (error) return alert(error.message);
    setEvents([data as Event, ...events]);
    setEvtTitle(""); setEvtStart(""); setEvtEnd(""); setEvtLoc(""); setEvtDesc("");
  }

  async function saveEventToMe(eventId: string) {
    if (!userId) return;
    const { error } = await supabase.from("user_event_saves").insert({
      user_id: userId,
      event_id: eventId,
    });
    if (error) return alert(error.message);
    alert("Saved to your calendar.");
  }

  async function createListing() {
    if (!userId || !c?.id || !listPlace.trim()) return;
    const payload = {
      community_id: c.id,
      user_id: userId,
      title: listTitle || null,
      place_name: listPlace.trim(),
      address: listAddr || null,
      lat: listLat ? Number(listLat) : null,
      lng: listLng ? Number(listLng) : null,
      schedule: listSchedule || null,
    };
    const { data, error } = await supabase
      .from("community_listings")
      .insert(payload)
      .select()
      .maybeSingle();
    if (error) return alert(error.message);
    setListings([data as Listing, ...listings]);
    setListTitle(""); setListPlace(""); setListAddr(""); setListLat(""); setListLng(""); setListSchedule("");
  }

  async function saveCommunity() {
    if (!c || !isAdmin) return;
    const { error } = await supabase.from("communities").update({
      photo_url: photoUrl || null,
      about: about || null,
    }).eq("id", c.id);
    if (error) return alert(error.message);
    alert("Saved.");
    setEditing(false);
  }

  return (
    <div className="page-wrap">
      <SiteHeader />

      {/* buttery sunshine page background */}
      <div className="page" style={{ background: "linear-gradient(#fff7e0,#fffaf0)" }}>
        <div className="container-app">

          <div className="section-row">
            <h1 className="page-title" style={{ marginBottom: 0 }}>{c?.title || "Community"}</h1>
            <div className="controls">
              <button className="btn" onClick={() => router.back()}>Back</button>
              {isMember && <span className="badge">Joined</span>}
              {isAdmin && (
                <button className="btn" onClick={() => setEditing(!editing)}>
                  {editing ? "Done" : "Edit"}
                </button>
              )}
            </div>
          </div>

          {c?.photo_url && !editing && (
            <div className="card p-0 mb-2" style={{ overflow: "hidden" }}>
              {/* cover photo */}
              <img src={c.photo_url} alt={c.title} style={{ width: "100%", height: 280, objectFit: "cover" }} />
            </div>
          )}

          {editing && (
            <section className="card p-3 mb-2">
              <h2 className="section-title">Edit community</h2>
              <div className="stack">
                <label className="field">
                  <span className="label">Cover photo URL</span>
                  <input className="input" value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} placeholder="https://…" />
                </label>
                <label className="field">
                  <span className="label">About</span>
                  <textarea className="input" rows={4} value={about} onChange={e => setAbout(e.target.value)} />
                </label>
                <div className="right">
                  <button className="btn btn-brand" onClick={saveCommunity}>Save</button>
                </div>
              </div>
            </section>
          )}

          {/* meta row */}
          {c && (
            <div className="muted mb-2">
              {c.category && <>{c.category} · </>}
              {c.zip && <>{c.zip} · </>}
              Created {format(new Date(c.created_at), "MMM d, yyyy")}
            </div>
          )}

          {/* tabs */}
          <div className="segmented mb-2" role="tablist">
            <button className={`seg-btn ${tab === "discussion" ? "active" : ""}`} onClick={() => setTab("discussion")}>
              Discussion
            </button>
            <button className={`seg-btn ${tab === "events" ? "active" : ""}`} onClick={() => setTab("events")}>
              What’s happening
            </button>
            <button className={`seg-btn ${tab === "map" ? "active" : ""}`} onClick={() => setTab("map")}>
              Circles & Map
            </button>
            <button className={`seg-btn ${tab === "about" ? "active" : ""}`} onClick={() => setTab("about")}>
              About
            </button>
          </div>

          {/* DISCUSSION */}
          {tab === "discussion" && (
            <section className="card p-3">
              <h2 className="section-title">Discussion</h2>

              {isMember ? (
                <div className="mb-2">
                  <textarea
                    className="input"
                    rows={3}
                    placeholder="Start a new discussion…"
                    value={newPost}
                    onChange={e => setNewPost(e.target.value)}
                  />
                  <div className="right" style={{ marginTop: 8 }}>
                    <button className="btn btn-brand" onClick={createPost} disabled={!newPost.trim()}>
                      Post
                    </button>
                  </div>
                </div>
              ) : (
                <p className="muted">Join to post.</p>
              )}

              {posts.length === 0 && <p className="muted">No posts yet.</p>}
              <div className="stack">
                {posts.map(p => (
                  <PostItem key={p.id} post={p} onReply={replyTo} />
                ))}
              </div>
            </section>
          )}

          {/* EVENTS */}
          {tab === "events" && (
            <section className="card p-3">
              <h2 className="section-title">What’s happening</h2>

              {isMember && (
                <div className="grid mb-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
                  <label className="field">
                    <span className="label">Title</span>
                    <input className="input" value={evtTitle} onChange={e => setEvtTitle(e.target.value)} />
                  </label>
                  <label className="field">
                    <span className="label">Start</span>
                    <input className="input" type="datetime-local" value={evtStart} onChange={e => setEvtStart(e.target.value)} />
                  </label>
                  <label className="field">
                    <span className="label">End (optional)</span>
                    <input className="input" type="datetime-local" value={evtEnd} onChange={e => setEvtEnd(e.target.value)} />
                  </label>
                  <label className="field">
                    <span className="label">Location</span>
                    <input className="input" value={evtLoc} onChange={e => setEvtLoc(e.target.value)} />
                  </label>
                  <label className="field" style={{ gridColumn: "1 / -1" }}>
                    <span className="label">Description</span>
                    <textarea className="input" rows={3} value={evtDesc} onChange={e => setEvtDesc(e.target.value)} />
                  </label>
                  <div className="right" style={{ gridColumn: "1 / -1" }}>
                    <button className="btn btn-brand" onClick={createEvent} disabled={!evtTitle || !evtStart}>
                      Add event
                    </button>
                  </div>
                </div>
              )}

              <div className="stack">
                {events.length === 0 && <p className="muted">No events yet.</p>}
                {events.map(e => (
                  <div key={e.id} className="card p-2">
                    <div className="section-row">
                      <div>
                        <strong>{e.title}</strong>
                        <div className="muted" style={{ fontSize: 12 }}>
                          {format(new Date(e.start_at), "EEE, MMM d p")}
                          {e.end_at && <> – {format(new Date(e.end_at), "p")}</>}
                          {e.location && <> · {e.location}</>}
                        </div>
                      </div>
                      <div className="controls">
                        <button className="btn" onClick={() => saveEventToMe(e.id)}>Save to my calendar</button>
                      </div>
                    </div>
                    {e.description && <p className="mt-1">{e.description}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* MAP + LISTINGS */}
          {tab === "map" && (
            <section className="card p-3">
              <h2 className="section-title">Drum circles & map</h2>
              <p className="muted" style={{ marginTop: -6 }}>
                Add a circle so others can find it. Click a pin for details.
              </p>

              {isMember && (
                <div className="grid mb-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
                  <label className="field">
                    <span className="label">Display name (optional)</span>
                    <input className="input" value={listTitle} onChange={e => setListTitle(e.target.value)} />
                  </label>
                  <label className="field">
                    <span className="label">Place name</span>
                    <input className="input" value={listPlace} onChange={e => setListPlace(e.target.value)} placeholder="Park, studio, etc." />
                  </label>
                  <label className="field">
                    <span className="label">Address (optional)</span>
                    <input className="input" value={listAddr} onChange={e => setListAddr(e.target.value)} />
                  </label>
                  <label className="field">
                    <span className="label">Schedule (optional)</span>
                    <input className="input" value={listSchedule} onChange={e => setListSchedule(e.target.value)} placeholder="1st & 3rd Thu @ 7pm" />
                  </label>
                  <label className="field">
                    <span className="label">Latitude (optional)</span>
                    <input className="input" value={listLat} onChange={e => setListLat(e.target.value)} placeholder="33.12345" />
                  </label>
                  <label className="field">
                    <span className="label">Longitude (optional)</span>
                    <input className="input" value={listLng} onChange={e => setListLng(e.target.value)} placeholder="-96.12345" />
                  </label>
                  <div className="right" style={{ gridColumn: "1 / -1" }}>
                    <button className="btn btn-brand" onClick={createListing} disabled={!listPlace.trim()}>
                      Add circle
                    </button>
                  </div>
                </div>
              )}

              {/* map */}
              <div className="mb-2" style={{ height: 360, borderRadius: 12, overflow: "hidden" }}>
                <MapContainer
                  center={[33.1, -96.1]}
                  zoom={9}
                  style={{ height: "100%", width: "100%" }}
                  scrollWheelZoom
                >
                  <TileLayer
                    attribution='&copy; OpenStreetMap'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {listings
                    .filter(l => typeof l.lat === "number" && typeof l.lng === "number")
                    .map(l => (
                      <Marker key={l.id} position={[Number(l.lat), Number(l.lng)] as any}>
                        <Popup>
                          <strong>{l.title || l.place_name}</strong>
                          {l.address && <div className="muted">{l.address}</div>}
                          {l.schedule && <div className="muted">{l.schedule}</div>}
                        </Popup>
                      </Marker>
                    ))}
                </MapContainer>
              </div>

              <h3 style={{ margin: "10px 0 6px" }}>All circles</h3>
              {listings.length === 0 && <p className="muted">No circles yet.</p>}
              <div className="stack">
                {listings.map(l => (
                  <div key={l.id} className="card p-2">
                    <strong>{l.title || l.place_name}</strong>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {l.address || "No address"} {l.schedule && <> · {l.schedule}</>}
                      {(l.lat != null && l.lng != null) && <> · ({l.lat}, {l.lng})</>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ABOUT */}
          {tab === "about" && (
            <section className="card p-3">
              <h2 className="section-title">About</h2>
              {c?.about ? <div style={{ whiteSpace: "pre-wrap" }}>{c.about}</div> : <p className="muted">No description yet.</p>}
            </section>
          )}

          {loading && <p className="muted mt-2">Loading…</p>}
        </div>
      </div>
    </div>
  );
}

/** Child component: simple post item with quick reply */
function PostItem({ post, onReply }: { post: Post; onReply: (id: string, text: string) => void }) {
  const [reply, setReply] = useState("");
  const [replies, setReplies] = useState<Post[] | null>(null);
  const [open, setOpen] = useState(false);

  async function loadReplies() {
    const { data } = await supabase
      .from("community_posts")
      .select("*")
      .eq("parent_post_id", post.id)
      .order("created_at", { ascending: true });
    setReplies((data ?? []) as Post[]);
  }

  useEffect(() => {
    if (open && replies === null) loadReplies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function send() {
    if (!reply.trim()) return;
    await onReply(post.id, reply);
    setReply("");
    setReplies(null); // reload next open
    setOpen(true);
    loadReplies();
  }

  return (
    <div className="card p-2">
      <div>{post.content}</div>
      <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
        {format(new Date(post.created_at), "MMM d, p")}
      </div>

      <div className="section-row" style={{ marginTop: 8 }}>
        <div className="grid" style={{ gridTemplateColumns: "1fr auto", gap: 8 }}>
          <input className="input" value={reply} onChange={e => setReply(e.target.value)} placeholder="Reply…" />
          <button className="btn" onClick={send}>Reply</button>
        </div>
        <button className="btn" onClick={() => setOpen(!open)}>
          {open ? "Hide replies" : "View replies"}
        </button>
      </div>

      {open && (
        <div className="stack mt-1">
          {(replies ?? []).length === 0 && <p className="muted">No replies yet.</p>}
          {(replies ?? []).map(r => (
            <div key={r.id} className="card p-2" style={{ background: "#fafafa" }}>
              {r.content}
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                {format(new Date(r.created_at), "MMM d, p")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
