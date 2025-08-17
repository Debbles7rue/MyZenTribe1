"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { format } from "date-fns";
import { supabase } from "@/lib/supabaseClient";
import SiteHeader from "@/components/SiteHeader";
import AddCircleForm from "@/components/AddCircleForm";

// lazy map viewer for saved pins
const RL = {
  MapContainer: dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false }),
  TileLayer:    dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false }),
  Marker:       dynamic(() => import("react-leaflet").then(m => m.Marker), { ssr: false }),
  Popup:        dynamic(() => import("react-leaflet").then(m => m.Popup), { ssr: false }),
};

// calendar
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Calendar, dateFnsLocalizer, Views, View } from "react-big-calendar";
import { parse, startOfWeek, getDay } from "date-fns";
const locales = { "en-US": () => import("date-fns/locale/en-US") };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales: { "en-US": (await import("date-fns/locale/en-US")).default } });

type Community = {
  id: string;
  title: string;
  category: string | null;
  zip: string | null;
  created_at: string;
  cover_url: string | null;
  about: string | null;
};

type Post = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
};

type Circle = {
  id: string;
  community_id: string;
  name: string | null;
  lat: number;
  lng: number;
  label: string | null;
  created_at: string;
};

type EventRow = {
  id: string;
  title: string;
  start_at: string; // timestamptz
  end_at: string | null;
};

export default function CommunityPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const communityId = params.id;

  const [tab, setTab] = useState<"discussion" | "events" | "about" | "circles">("discussion");
  const [me, setMe] = useState<string | null>(null);
  const [comm, setComm] = useState<Community | null>(null);
  const [joined, setJoined] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  // posts
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);

  // circles
  const [showAddCircle, setShowAddCircle] = useState(false);
  const [circles, setCircles] = useState<Circle[]>([]);

  // events for calendar
  const [events, setEvents] = useState<EventRow[]>([]);
  const calEvents = useMemo(() => events.map(e => ({
    id: e.id,
    title: e.title,
    start: new Date(e.start_at),
    end: e.end_at ? new Date(e.end_at) : new Date(e.start_at),
  })), [events]);

  useEffect(() => {
    (async () => {
      setLoading(true);

      // who am I
      const u = await supabase.auth.getUser();
      setMe(u.data.user?.id ?? null);

      // community
      const { data: c } = await supabase.from("communities")
        .select("id,title,category,zip,created_at,cover_url,about")
        .eq("id", communityId)
        .single();
      if (!c) { router.push("/communities"); return; }
      setComm(c as Community);

      // am I a member?
      const { data: mem } = await supabase.from("community_members")
        .select("id").eq("community_id", communityId).eq("user_id", u.data.user?.id ?? "")
        .limit(1);
      setJoined(!!mem && mem.length > 0);

      // initial data
      await Promise.all([loadPosts(), loadCircles(), loadEvents()]);

      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityId]);

  async function loadPosts() {
    const { data } = await supabase
      .from("community_posts")
      .select("id,user_id,content,created_at")
      .eq("community_id", communityId)
      .order("created_at", { ascending: false });
    setPosts((data ?? []) as Post[]);
  }

  async function loadCircles() {
    const { data } = await supabase
      .from("community_circles")
      .select("*")
      .eq("community_id", communityId)
      .order("created_at", { ascending: false });
    setCircles((data ?? []) as Circle[]);
  }

  async function loadEvents() {
    const { data } = await supabase
      .from("community_events")
      .select("id,title,start_at,end_at")
      .eq("community_id", communityId)
      .order("start_at", { ascending: true });
    setEvents((data ?? []) as EventRow[]);
  }

  async function join() {
    const u = await supabase.auth.getUser();
    if (!u.data.user) { router.push("/"); return; }
    await supabase.from("community_members").insert({ community_id: communityId, user_id: u.data.user.id, status: "member" });
    setJoined(true);
  }

  async function post() {
    if (!newPost.trim() || !me) return;
    setPosting(true);
    const { error } = await supabase.from("community_posts").insert({
      community_id: communityId,
      user_id: me,
      content: newPost.trim(),
    });
    setPosting(false);
    if (!error) {
      setNewPost("");
      loadPosts();
    }
  }

  const created = comm ? format(new Date(comm.created_at), "PP") : "";

  return (
    <div className="page-wrap">
      <SiteHeader />
      <div className="page">
        <div className="container-app">
          <div className="flex items-center justify-between mb-3">
            <h1 className="page-title">{comm?.title ?? "Community"}</h1>
            <div className="flex gap-2">
              <button className="btn" onClick={() => router.push("/communities")}>Back</button>
              {!joined ? (
                <button className="btn btn-brand" onClick={join}>Join</button>
              ) : (
                <span className="badge">Joined</span>
              )}
            </div>
          </div>

          {/* Cover */}
          {comm?.cover_url && (
            <div className="rounded-xl overflow-hidden ring-1 ring-black/10 mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={comm.cover_url} alt="" className="w-full h-[230px] object-cover" />
            </div>
          )}

          <div className="text-muted mb-4">
            {comm?.category && <span>{comm.category}</span>} {comm?.zip && <>· {comm.zip}</>}
            {" · "}Created {created}
          </div>

          {/* tabs */}
          <div className="flex gap-2 mb-3">
            <button className={`tab ${tab === "discussion" ? "tab-active" : ""}`} onClick={() => setTab("discussion")}>Discussion</button>
            <button className={`tab ${tab === "events" ? "tab-active" : ""}`} onClick={() => setTab("events")}>What’s happening</button>
            <button className={`tab ${tab === "about" ? "tab-active" : ""}`} onClick={() => setTab("about")}>About</button>
            <button className={`tab ${tab === "circles" ? "tab-active" : ""}`} onClick={() => setTab("circles")}>Drum Circles</button>
          </div>

          {/* panels */}
          {tab === "discussion" && (
            <section className="card p-4">
              <h3 className="text-lg font-semibold mb-3">Start a discussion</h3>
              <textarea
                className="input w-full mb-2"
                placeholder="Share something with the community…"
                rows={3}
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
              />
              <div className="flex justify-end">
                <button className="btn btn-brand" onClick={post} disabled={posting || !joined}>Post</button>
              </div>

              <hr className="my-4" />
              <h4 className="font-semibold mb-2">Recent</h4>
              {posts.length === 0 ? (
                <p className="muted">No posts yet.</p>
              ) : (
                <ul className="space-y-3">
                  {posts.map(p => (
                    <li key={p.id} className="p-3 rounded-lg border">
                      <div className="text-sm text-muted mb-1">{format(new Date(p.created_at), "PP p")}</div>
                      <div className="whitespace-pre-wrap">{p.content}</div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {tab === "events" && (
            <section className="card p-3">
              <h3 className="text-lg font-semibold mb-3">What’s happening</h3>
              <Calendar
                localizer={localizer}
                events={calEvents}
                startAccessor="start"
                endAccessor="end"
                style={{ height: 560 }}
                views={[Views.MONTH, Views.WEEK, Views.DAY]}
                defaultView={Views.MONTH as View}
              />
            </section>
          )}

          {tab === "about" && (
            <section className="card p-4">
              <h3 className="text-lg font-semibold mb-3">About</h3>
              {comm?.about ? (
                <p className="whitespace-pre-wrap">{comm.about}</p>
              ) : (
                <p className="muted">The organizer hasn’t added details yet.</p>
              )}
            </section>
          )}

          {tab === "circles" && (
            <section className="relative">
              {/* When the modal is open, mute interactions behind it */}
              <div className={showAddCircle ? "pointer-events-none blur-[2px]" : ""}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">Drum Circles</h3>
                  <button className="btn btn-brand" onClick={() => setShowAddCircle(true)} disabled={!joined}>
                    Add circle
                  </button>
                </div>

                {/* viewer map */}
                {circles.length > 0 ? (
                  <div className="rounded-lg overflow-hidden ring-1 ring-black/10">
                    <RL.MapContainer center={[circles[0].lat, circles[0].lng]} zoom={10} style={{ height: 360 }}>
                      <RL.TileLayer
                        attribution='&copy; OpenStreetMap contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      {circles.map(c => (
                        <RL.Marker key={c.id} position={[c.lat, c.lng]}>
                          <RL.Popup>
                            <div className="font-semibold">{c.name || "Drum circle"}</div>
                            {c.label && <div className="text-sm">{c.label}</div>}
                          </RL.Popup>
                        </RL.Marker>
                      ))}
                    </RL.MapContainer>
                  </div>
                ) : (
                  <div className="card p-4">
                    <p className="muted">No circles yet. Be the first to add one!</p>
                  </div>
                )}

                {/* list */}
                {circles.length > 0 && (
                  <ul className="mt-3 grid gap-2">
                    {circles.map(c => (
                      <li key={c.id} className="p-3 rounded-lg border">
                        <div className="font-medium">{c.name || "Drum circle"}</div>
                        <div className="text-sm text-muted">
                          {c.label || `${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}`} · {format(new Date(c.created_at), "PP")}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {showAddCircle && (
                <AddCircleForm
                  communityId={communityId}
                  zip={comm?.zip ?? null}
                  onClose={() => setShowAddCircle(false)}
                  onSaved={() => loadCircles()}
                />
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
