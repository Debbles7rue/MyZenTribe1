"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AddCircleForm from "@/components/AddCircleForm";

// Map (client-only)
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// fallback leaflet marker
const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

type Community = {
  id: string;
  title: string | null;
  category: string | null;
  zip: string | null;
  about: string | null;
  cover_url: string | null; // optional hero image
  created_at: string;
  created_by?: string | null;
};

type Circle = {
  id: string;
  community_id: string;
  title: string | null;
  place_label: string | null;
  lat: number;
  lng: number;
  meets: string | null;
  created_by?: string | null;
  created_at: string;
};

export default function CommunityPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const communityId = params?.id;

  const [me, setMe] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [community, setCommunity] = useState<Community | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [tab, setTab] = useState<"discussion" | "happening" | "about" | "circles">("discussion");
  const [showAdd, setShowAdd] = useState(false);

  // center map on first circle or on USA fallback
  const mapCenter = useMemo<[number, number]>(() => {
    if (circles.length) return [circles[0].lat, circles[0].lng];
    return [39.5, -98.35];
  }, [circles]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);

        // who am I?
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData.user?.id ?? null;
        if (mounted) setMe(uid);

        // community
        const { data: comm, error: ce } = await supabase
          .from("communities")
          .select("*")
          .eq("id", communityId)
          .single();
        if (ce) throw ce;
        if (mounted) setCommunity(comm as Community);

        // membership?
        if (uid) {
          const { data: mem } = await supabase
            .from("community_members")
            .select("status")
            .eq("community_id", communityId)
            .eq("user_id", uid)
            .maybeSingle();
          if (mounted) setIsMember(!!mem && (mem as any).status === "member");
        } else {
          if (mounted) setIsMember(false);
        }

        // circles
        await loadCircles(mounted);
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityId]);

  async function loadCircles(mounted = true) {
    const { data, error } = await supabase
      .from("community_circles")
      .select("*")
      .eq("community_id", communityId)
      .order("created_at", { ascending: false });
    if (!mounted) return;
    if (error) {
      console.error(error);
      setCircles([]);
      return;
    }
    setCircles((data || []) as Circle[]);
  }

  async function deleteCircle(id: string) {
    if (!confirm("Delete this circle?")) return;
    const { error } = await supabase.from("community_circles").delete().eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
    await loadCircles();
  }

  if (loading) {
    return (
      <div className="page-wrap">
        <div className="page container-app">
          <div className="muted">Loading…</div>
        </div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="page-wrap">
        <div className="page container-app">
          <div className="muted">Community not found.</div>
          <div className="mt-3">
            <button className="btn" onClick={() => router.back()}>
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const title = community.title || "Community";
  const headerSub =
    [community.category, community.zip, `Created ${new Date(community.created_at).toLocaleDateString()}`]
      .filter(Boolean)
      .join(" · ");

  return (
    <div className="page-wrap" style={{ background: "linear-gradient(#fff8dd,#fff)" }}>
      <div className="page container-app">
        <div className="section-row" style={{ alignItems: "center" }}>
          <h1 className="page-title" style={{ marginBottom: 6 }}>{title}</h1>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button className="btn" onClick={() => router.back()}>Back</button>
            {/* Example edit button for admins/owner; adjust your logic as needed */}
            {me && (me === community.created_by || isMember) && (
              <Link className="btn" href={`/communities/${communityId}/edit`}>Edit</Link>
            )}
          </div>
        </div>

        {/* cover image */}
        {community.cover_url && (
          <div className="card p-0 mb-3" style={{ overflow: "hidden" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={community.cover_url}
              alt=""
              style={{ width: "100%", height: 280, objectFit: "cover" }}
            />
          </div>
        )}

        <div className="muted" style={{ marginTop: -6, marginBottom: 18 }}>{headerSub}</div>

        {/* tabs */}
        <div className="tabs mb-3" style={{ display: "flex", gap: 10 }}>
          <button className={`tab ${tab === "discussion" ? "active" : ""}`} onClick={() => setTab("discussion")}>
            Discussion
          </button>
          <button className={`tab ${tab === "happening" ? "active" : ""}`} onClick={() => setTab("happening")}>
            What’s happening
          </button>
          <button className={`tab ${tab === "about" ? "active" : ""}`} onClick={() => setTab("about")}>
            About
          </button>
          <button className={`tab ${tab === "circles" ? "active" : ""}`} onClick={() => setTab("circles")}>
            Drum Circles
          </button>
        </div>

        {/* DISCUSSION placeholder */}
        {tab === "discussion" && (
          <section className="card p-3">
            <h2 className="section-title">Discussion</h2>
            <p className="muted">Threaded discussions coming soon.</p>
          </section>
        )}

        {/* WHAT'S HAPPENING placeholder */}
        {tab === "happening" && (
          <section className="card p-3">
            <h2 className="section-title">What’s happening</h2>
            <p className="muted">Calendar view will live here. We’ll wire it to community events next.</p>
          </section>
        )}

        {/* ABOUT */}
        {tab === "about" && (
          <section className="card p-3">
            <h2 className="section-title">About</h2>
            <p style={{ whiteSpace: "pre-wrap" }}>
              {community.about || "No description yet."}
            </p>
          </section>
        )}

        {/* DRUM CIRCLES: map + list + add button */}
        {tab === "circles" && (
          <section className="card p-3">
            <div className="section-row">
              <h2 className="section-title">Drum Circles</h2>
              {isMember ? (
                <button className="btn btn-brand" onClick={() => setShowAdd(true)}>
                  Add drum circle
                </button>
              ) : (
                <span className="muted" style={{ fontSize: 13 }}>
                  Join this community to add a circle.
                </span>
              )}
            </div>

            {/* Map */}
            <div
              style={{
                height: 360,
                borderRadius: 12,
                overflow: "hidden",
                border: "1px solid #eee",
                marginTop: 10,
                marginBottom: 14,
              }}
            >
              <MapContainer center={mapCenter} zoom={circles.length ? 10 : 4} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {circles.map((c) => (
                  <Marker key={c.id} position={[c.lat, c.lng]} icon={markerIcon}>
                    <Popup>
                      <div style={{ maxWidth: 240 }}>
                        <strong>{c.title || "Drum circle"}</strong>
                        <div className="muted" style={{ marginTop: 4 }}>{c.place_label}</div>
                        {c.meets && <div style={{ marginTop: 6 }}>{c.meets}</div>}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>

            {/* List */}
            {circles.length === 0 ? (
              <p className="muted">No circles yet.</p>
            ) : (
              <ul className="stack" style={{ gap: 10 }}>
                {circles.map((c) => (
                  <li key={c.id} className="card p-2" style={{ display: "grid", gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                      <strong>{c.title || "Drum circle"}</strong>
                      <span className="muted" style={{ fontSize: 13 }}>
                        {new Date(c.created_at).toLocaleDateString()}
                      </span>
                      <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                        {me && me === c.created_by && (
                          <button className="btn" onClick={() => deleteCircle(c.id)}>Delete</button>
                        )}
                      </div>
                    </div>
                    <div className="muted">{c.place_label}</div>
                    {c.meets && <div>{c.meets}</div>}
                  </li>
                ))}
              </ul>
            )}

            {/* Modal */}
            {showAdd && (
              <div
                className="modal"
                role="dialog"
                aria-modal="true"
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(0,0,0,.4)",
                  display: "grid",
                  placeItems: "center",
                  zIndex: 50,
                }}
              >
                <div className="card" style={{ width: "min(100%, 720px)", maxHeight: "90vh", overflow: "auto", padding: 16 }}>
                  <h3 className="section-title">Add drum circle</h3>
                  <AddCircleForm
                    communityId={community.id}
                    zip={community.zip}
                    onSaved={async () => {
                      setShowAdd(false);
                      await loadCircles();
                    }}
                    onCancel={() => setShowAdd(false)}
                  />
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
