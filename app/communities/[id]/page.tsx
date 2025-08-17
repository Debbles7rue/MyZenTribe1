// app/communities/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { format } from "date-fns";
import { supabase } from "@/lib/supabaseClient";
import { Calendar, momentLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import moment from "moment";
import CommunityPhotoUploader from "@/components/CommunityPhotoUploader";

// (Keep using your AddCircleForm and Leaflet map client)
const AddCircleForm = dynamic(() => import("@/components/AddCircleForm"), { ssr: false });

// If you already have a date-fns localizer, swap this import:
// import { localizer } from "@/lib/localizer";
const localizer = momentLocalizer(moment);

type Community = {
  id: string;
  title: string;
  category: string | null;
  zip: string | null;
  about: string | null;
  created_at: string;
  photo_url: string | null;
  cover_image_url?: string | null;
  created_by?: string | null; // owner if present in your table
};

type Circle = {
  id: string;
  community_id: string;
  name: string | null;
  lat: number;
  lng: number;
  created_at: string;
};

type Topic = {
  id: string;
  title: string;
  posts_count?: number | null;
  updated_at: string;
};

type FeedEvent = {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  visibility: string;
  created_at: string;
  // view adds:
  feed_community_id?: string | null;
};

export default function CommunityPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const communityId = params.id;

  const [me, setMe] = useState<string | null>(null);
  const [community, setCommunity] = useState<Community | null>(null);

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"discussion" | "happening" | "about" | "circles">("discussion");

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Community>>({});

  // Discussions
  const [topics, setTopics] = useState<Topic[]>([]);
  const [q, setQ] = useState("");

  // Circles
  const [showAdd, setShowAdd] = useState(false);
  const [circles, setCircles] = useState<Circle[]>([]);

  // Calendar feed
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const calEvents = useMemo(
    () =>
      events.map((e) => ({
        id: e.id,
        title: e.title,
        start: new Date(e.start_time),
        end: new Date(e.end_time),
        allDay: false,
      })),
    [events]
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    let alive = true;

    async function run() {
      setLoading(true);

      // Community
      const { data: c, error: cErr } = await supabase
        .from("communities")
        .select("*")
        .eq("id", communityId)
        .single();

      if (!alive) return;
      if (cErr) {
        console.error(cErr);
        router.push("/communities");
        return;
      }
      setCommunity(c as Community);
      setForm({
        title: c?.title ?? "",
        category: c?.category ?? "",
        zip: c?.zip ?? "",
        about: c?.about ?? "",
        cover_image_url: c?.cover_image_url ?? c?.photo_url ?? "",
      });

      // Circles
      const { data: cData, error: cErr2 } = await supabase
        .from("community_circles")
        .select("*")
        .eq("community_id", communityId)
        .order("created_at", { ascending: false });
      if (!alive) return;
      if (cErr2) console.error(cErr2);
      setCircles((cData || []) as Circle[]);

      // Discussions list (if table exists)
      const { data: tData, error: tErr } = await supabase
        .from("community_topics")
        .select("id,title,posts_count,updated_at")
        .eq("community_id", communityId)
        .order("updated_at", { ascending: false });
      if (!alive) return;
      if (tErr) {
        // table might not exist yet — show graceful empty state
        setTopics([]);
      } else {
        setTopics((tData || []) as Topic[]);
      }

      // Calendar feed via view; fall back to explicit event_communities pivot if the view isn’t present
      let nextEvents: FeedEvent[] = [];
      const { data: vData, error: vErr } = await supabase
        .from("community_feed_events")
        .select("*")
        .eq("feed_community_id", communityId)
        .gte("end_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(200);

      if (!vErr && vData) {
        nextEvents = vData as any;
      } else {
        // Fallback (explicit tag only)
        const { data: fallback, error: fErr } = await supabase
          .from("events")
          .select("id,title,description,start_time,end_time,visibility,created_at,event_communities!inner(community_id)")
          .eq("event_communities.community_id", communityId)
          .eq("visibility", "public")
          .gte("end_time", new Date().toISOString())
          .order("start_time", { ascending: true })
          .limit(200);
        if (!fErr && fallback) nextEvents = fallback as any;
      }

      setEvents(nextEvents);
      setLoading(false);
    }

    run();
    return () => {
      alive = false;
    };
  }, [communityId, router]);

  const created = useMemo(
    () => (community ? format(new Date(community.created_at), "MMM d, yyyy") : ""),
    [community]
  );

  const isOwner = useMemo(() => {
    if (!community || !me) return false;
    // prefer explicit created_by if available; otherwise allow anyone (turn off if you add RLS)
    if (typeof community.created_by === "string") return community.created_by === me;
    return false;
  }, [community, me]);

  async function saveEdits() {
    if (!community) return;
    const patch: Partial<Community> = {
      title: form.title ?? community.title,
      category: form.category ?? community.category,
      zip: form.zip ?? community.zip,
      about: form.about ?? community.about,
      cover_image_url: form.cover_image_url ?? community.cover_image_url ?? community.photo_url ?? null,
    };
    const { error } = await supabase.from("communities").update(patch).eq("id", community.id);
    if (error) {
      alert(error.message || "Save failed");
      return;
    }
    setCommunity({ ...community, ...patch });
    setEditing(false);
  }

  // Filter topics (client)
  const filteredTopics = useMemo(() => {
    const qv = q.trim().toLowerCase();
    if (!qv) return topics;
    return topics.filter((t) => (t.title || "").toLowerCase().includes(qv));
  }, [q, topics]);

  if (loading) {
    return (
      <div className="page-wrap">
        <div className="page">
          <div className="container-app">Loading…</div>
        </div>
      </div>
    );
  }

  if (!community) return null;

  return (
    <div className="page-wrap">
      <div className="page">
        <div className="container-app">
          {/* Breadcrumb + Created date */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Link href="/communities" className="btn btn-neutral">← All communities</Link>
            </div>
            <span className="muted">Created {created}</span>
          </div>

          {/* Cover + Title */}
          {community.cover_image_url || community.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={community.cover_image_url ?? community.photo_url ?? ""}
              alt=""
              className="w-full h-auto rounded-2xl mb-4"
              style={{ maxBlockSize: 360, objectFit: "cover" }}
            />
          ) : null}

          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <h1 className="page-title" style={{ marginBottom: 2 }}>{community.title}</h1>
              <div className="muted">
                {community.category || "General"} · {community.zip || "—"}
              </div>
            </div>
            {isOwner && (
              <button className="btn btn-brand" onClick={() => setEditing((v) => !v)}>
                {editing ? "Close editor" : "Edit"}
              </button>
            )}
          </div>

          {/* Inline editor (owner only) */}
          {isOwner && editing && (
            <section className="card p-4 mb-4">
              <div className="grid" style={{ gridTemplateColumns: "minmax(260px, 1fr) 1fr", gap: 16 }}>
                <div>
                  <CommunityPhotoUploader
                    value={form.cover_image_url || ""}
                    onChange={(url) => setForm((f) => ({ ...f, cover_image_url: url }))}
                    label="Cover photo"
                    communityId={community.id}
                    disabled={false}
                  />
                </div>
                <div className="space-y-3">
                  <div className="field">
                    <div className="label">Title</div>
                    <input
                      className="input"
                      value={form.title ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    />
                  </div>
                  <div className="field">
                    <div className="label">Category</div>
                    <input
                      className="input"
                      value={form.category ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    />
                  </div>
                  <div className="field">
                    <div className="label">ZIP</div>
                    <input
                      className="input"
                      value={form.zip ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, zip: e.target.value.slice(0, 5) }))}
                      maxLength={5}
                    />
                  </div>
                  <div className="field">
                    <div className="label">About</div>
                    <textarea
                      className="input"
                      rows={6}
                      value={form.about ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, about: e.target.value }))}
                    />
                  </div>
                  <div className="right">
                    <button className="btn btn-brand" onClick={saveEdits}>Save changes</button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Tabs */}
          <div className="flex gap-2 mb-3">
            <button onClick={() => setTab("discussion")} className={`btn ${tab === "discussion" ? "btn-active" : ""}`}>Discussion</button>
            <button onClick={() => setTab("happening")} className={`btn ${tab === "happening" ? "btn-active" : ""}`}>What’s happening</button>
            <button onClick={() => setTab("about")} className={`btn ${tab === "about" ? "btn-active" : ""}`}>About</button>
            <button onClick={() => setTab("circles")} className={`btn ${tab === "circles" ? "btn-active" : ""}`}>Map</button>
          </div>

          {/* Panels */}
          <section className="card p-4">
            {tab === "discussion" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="h3">Discussions</h3>
                  <div className="flex items-center gap-2">
                    <input
                      className="input"
                      placeholder="Search topics…"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      style={{ minWidth: 220 }}
                    />
                    {/* In v2 this button can open a modal or route to /communities/[id]/topics/new */}
                    <button className="btn btn-brand" onClick={() => alert("New topic composer coming soon!")}>
                      Start topic
                    </button>
                  </div>
                </div>

                {filteredTopics.length === 0 ? (
                  <div className="muted">No discussions yet. Be the first to start one ✨</div>
                ) : (
                  <ul className="space-y-2">
                    {filteredTopics.map((t) => (
                      <li key={t.id} className="border rounded-lg p-3 hover:shadow-sm transition">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{t.title}</div>
                          <div className="muted" style={{ fontSize: 12 }}>
                            Updated {format(new Date(t.updated_at), "MMM d, yyyy")}
                          </div>
                        </div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          {t.posts_count ?? 0} {t.posts_count === 1 ? "post" : "posts"}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {tab === "happening" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="h3">What’s happening</h3>
                  <div className="muted" style={{ fontSize: 12 }}>
                    Shows events tagged to this community + public events from trusted businesses it follows.
                  </div>
                </div>
                <div style={{ height: 540 }}>
                  <Calendar
                    localizer={localizer}
                    events={calEvents}
                    startAccessor="start"
                    endAccessor="end"
                    popup
                    style={{ height: "100%", borderRadius: 12 }}
                  />
                </div>

                {calEvents.length === 0 && (
                  <div className="muted">No upcoming items yet. As trusted businesses post public events, they’ll appear here automatically.</div>
                )}
              </div>
            )}

            {tab === "about" && (
              <div className="space-y-2">
                <h3 className="h3">About</h3>
                <p style={{ whiteSpace: "pre-wrap" }}>
                  {community.about || "No description yet."}
                </p>
              </div>
            )}

            {tab === "circles" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="h3">Community Map</h3>
                  <button className="btn btn-brand" onClick={() => setShowAdd(true)}>
                    Add pin
                  </button>
                </div>

                {circles.length === 0 ? (
                  <p className="muted">No pins yet. Add your first one!</p>
                ) : (
                  <ul className="space-y-2">
                    {circles.map((c) => (
                      <li key={c.id} className="border rounded-lg p-3">
                        <div className="font-medium">
                          {c.name || "Untitled pin"}{" "}
                          <span className="muted">
                            ({c.lat.toFixed(4)}, {c.lng.toFixed(4)})
                          </span>
                        </div>
                        <div className="muted">
                          Added {format(new Date(c.created_at), "MMM d, yyyy")}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Add circle modal */}
      {showAdd && (
        <div className="modal-backdrop">
          <div className="modal-sheet">
            <AddCircleForm
              communityId={community.id}
              zip={community.zip}
              onClose={() => setShowAdd(false)}
              onSaved={async () => {
                const { data } = await supabase
                  .from("community_circles")
                  .select("*")
                  .eq("community_id", communityId)
                  .order("created_at", { ascending: false });
                setCircles((data || []) as Circle[]);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

