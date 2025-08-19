// app/communities/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { format } from "date-fns";
import { supabase } from "@/lib/supabaseClient";
import CommunityPhotoUploader from "@/components/CommunityPhotoUploader";

const AddPinModal = dynamic(() => import("@/components/community/AddPinModal"), { ssr: false });
const MapExplorerClient = dynamic(() => import("@/components/community/MapExplorerClient"), { ssr: false });

type Community = {
  id: string;
  title: string;
  category: string | null;
  zip: string | null;
  about: string | null;
  created_at: string;
  photo_url: string | null;
  created_by?: string | null;
};

// NOTE: Add the two fields required by the map component.
type MapPin = {
  id: string;
  community_id: string | null;
  name: string | null;
  lat: number | null;
  lng: number | null;
  address: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  website_url: string | null;
  categories?: string[] | null;

  // ✅ Required by MapExplorerClient
  day_of_week: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  time_local: string; // e.g., "6:30 PM" (empty string is acceptable if unknown)
};

type MapCommunity = { id: string; title: string; category: string | null };

const CATEGORIES = [
  "Wellness",
  "Meditation",
  "Yoga",
  "Breathwork",
  "Sound Baths",
  "Drum Circles",
  "Arts & Crafts",
  "Nature/Outdoors",
  "Parenting",
  "Recovery/Support",
  "Local Events",
  "Other",
];

// Helpers
function numOrNull(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function defaultDayOfWeek(): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  return (new Date().getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6) ?? 0;
}

function toPin(communityId: string, circle: any): MapPin {
  return {
    id: String(circle.id),
    community_id: communityId,
    name: circle.name ?? null,
    lat: numOrNull(circle.lat),
    lng: numOrNull(circle.lng),
    address: circle.address ?? null,
    contact_phone: circle.contact_phone ?? null,
    contact_email: circle.contact_email ?? null,
    website_url: circle.website_url ?? null,
    categories: circle.categories ?? null,
    // ✅ Provide required fields; use sensible defaults if not present
    day_of_week:
      (typeof circle.day_of_week === "number" &&
        [0, 1, 2, 3, 4, 5, 6].includes(circle.day_of_week)) ?
        (circle.day_of_week as 0 | 1 | 2 | 3 | 4 | 5 | 6) :
        defaultDayOfWeek(),
    time_local: typeof circle.time_local === "string" ? circle.time_local : "",
  };
}

export default function CommunityPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const communityId = params.id;

  const [me, setMe] = useState<string | null>(null);
  const [community, setCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"discussion" | "happening" | "about" | "pins">("discussion");

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editCat, setEditCat] = useState<string>("");
  const [editZip, setEditZip] = useState<string>("");
  const [editAbout, setEditAbout] = useState<string>("");
  const [editPhoto, setEditPhoto] = useState<string>("");

  const [isAdmin, setIsAdmin] = useState(false);

  const [pins, setPins] = useState<MapPin[]>([]);
  const [showAddPin, setShowAddPin] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id ?? null;
      if (alive) setMe(uid);

      const { data: c, error: cErr } = await supabase
        .from("communities")
        .select("*")
        .eq("id", communityId)
        .single();

      if (cErr || !c) {
        console.error(cErr);
        router.push("/communities");
        return;
      }
      if (!alive) return;
      setCommunity(c as Community);

      let admin = false;
      if (uid) {
        const { data: admins } = await supabase
          .from("community_admins")
          .select("user_id")
          .eq("community_id", communityId)
          .eq("user_id", uid)
          .limit(1);
        admin = (admins ?? []).length > 0 || (c as any).created_by === uid;
      }
      if (alive) setIsAdmin(admin);

      const { data: mapped, error: mErr } = await supabase
        .from("community_circle_communities")
        .select(
          "circle:community_circles!inner(id,name,lat,lng,address,contact_phone,contact_email,website_url,categories,day_of_week,time_local)"
        )
        .eq("community_id", communityId)
        .limit(2000);

      if (mErr) console.error(mErr);

      const mapPins: MapPin[] =
        (mapped ?? []).map((r: any) => toPin(communityId, r.circle)) ?? [];
      if (alive) setPins(mapPins);

      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [communityId, router]);

  useEffect(() => {
    if (editing && community) {
      setEditTitle(community.title || "");
      setEditCat(community.category || "");
      setEditZip(community.zip || "");
      setEditAbout(community.about || "");
      setEditPhoto(community.photo_url || "");
    }
  }, [editing, community]);

  const created = useMemo(
    () => (community ? format(new Date(community.created_at), "MMM d, yyyy") : ""),
    [community]
  );

  const mapCommunities = useMemo<Record<string, MapCommunity>>(() => {
    if (!community) return {};
    return {
      [community.id]: {
        id: community.id,
        title: community.title,
        category: community.category,
      },
    };
  }, [community]);

  async function saveEdits() {
    if (!community) return;
    const { error } = await supabase
      .from("communities")
      .update({
        title: editTitle || null,
        category: editCat || null,
        zip: editZip || null,
        about: editAbout || null,
        photo_url: editPhoto || null,
      })
      .eq("id", community.id);
    if (error) {
      alert(error.message);
      return;
    }
    setCommunity({
      ...community,
      title: editTitle || null,
      category: editCat || null,
      zip: editZip || null,
      about: editAbout || null,
      photo_url: editPhoto || null,
    });
    setEditing(false);
  }

  if (loading || !community) {
    return (
      <div className="page-wrap">
        <div className="page">
          <div className="container-app">Loading…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrap community-page">
      <div className="page">
        <div className="container-app">
          <div className="header-bar community-header">
            <div className="flex items-center gap-2">
              <button className="btn" onClick={() => router.push("/communities")}>
                Back
              </button>
              <span className="muted">Created {created}</span>
            </div>
            <div className="controls">
              {isAdmin && (
                <button className="btn btn-brand" onClick={() => setEditing(true)}>
                  Edit community
                </button>
              )}
              <Link href="/communities/browse" className="btn">
                Browse communities
              </Link>
            </div>
          </div>

          {community.photo_url && (
            <img
              src={community.photo_url}
              alt=""
              className="w-full h-auto rounded-xl community-cover"
              style={{ maxBlockSize: 360, objectFit: "cover" }}
            />
          )}

          <h1 className="page-title community-title">{community.title}</h1>
          <div className="muted community-subtitle">
            {community.category || "General"} · {community.zip || "—"}
          </div>

          <div className="tabbar">
            <button
              onClick={() => setTab("discussion")}
              className={`btn ${tab === "discussion" ? "btn-active" : ""}`}
            >
              Discussion
            </button>
            <button
              onClick={() => setTab("happening")}
              className={`btn ${tab === "happening" ? "btn-active" : ""}`}
            >
              What’s happening
            </button>
            <button
              onClick={() => setTab("about")}
              className={`btn ${tab === "about" ? "btn-active" : ""}`}
            >
              About
            </button>
            <button
              onClick={() => setTab("pins")}
              className={`btn ${tab === "pins" ? "btn-active" : ""}`}
            >
              Pins
            </button>
          </div>

          <section className="card card-lg">
            {tab === "discussion" && (
              <>
                <h3 className="h3 mb-2">Discussion</h3>
                <p className="muted">Threaded discussions coming soon.</p>
              </>
            )}

            {tab === "happening" && (
              <>
                <h3 className="h3 mb-2">What’s happening</h3>
                <p className="muted">Calendar view will live here.</p>
              </>
            )}

            {tab === "about" && (
              <>
                <h3 className="h3 mb-2">About</h3>
                <p style={{ whiteSpace: "pre-wrap" }}>
                  {community.about || "No description yet."}
                </p>
              </>
            )}

            {tab === "pins" && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="h3">Pins for this community</h3>
                  <button className="btn btn-brand" onClick={() => setShowAddPin(true)}>
                    Add pin
                  </button>
                </div>

                <div className="mb-3">
                  <MapExplorerClient
                    center={[
                      pins.length
                        ? (pins.reduce((s, p) => s + (p.lat ?? 0), 0) / pins.length) || 39.5
                        : 39.5,
                      pins.length
                        ? (pins.reduce((s, p) => s + (p.lng ?? 0), 0) / pins.length) || -98.35
                        : -98.35,
                    ]}
                    pins={pins} // ✅ Now each pin includes day_of_week & time_local
                    communitiesById={mapCommunities}
                    height={340}
                  />
                </div>

                {pins.length === 0 ? (
                  <p className="muted">No pins yet. Be the first to add one!</p>
                ) : (
                  <ul className="space-y-2">
                    {pins.map((p) => (
                      <li key={p.id} className="border rounded-lg p-3">
                        <div className="font-medium">{p.name || "Untitled"}</div>
                        {p.address && <div className="muted">{p.address}</div>}
                        {(p.categories?.length ?? 0) > 0 && (
                          <div className="muted" style={{ fontSize: 12 }}>
                            {p.categories?.join(", ")}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </section>
        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="modal-overlay">
          <div className="modal-center">
            <div className="modal-panel">
              <h3 className="h3 mb-2">Edit community</h3>

              {/* SCROLLABLE BODY (new) */}
              <div className="modal-body">
                <div className="form-grid">
                  <div className="span-2 field">
                    <div className="label">Title</div>
                    <input
                      className="input"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <div className="label">Category</div>
                    <select
                      className="input"
                      value={editCat}
                      onChange={(e) => setEditCat(e.target.value)}
                    >
                      <option value="">General</option>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <div className="label">ZIP</div>
                    <input
                      className="input"
                      value={editZip}
                      maxLength={5}
                      onChange={(e) => setEditZip(e.target.value)}
                    />
                  </div>

                  <div className="span-2 field">
                    <div className="label">About</div>
                    <textarea
                      className="input"
                      rows={4}
                      value={editAbout}
                      onChange={(e) => setEditAbout(e.target.value)}
                    />
                  </div>

                  <div className="span-2">
                    <CommunityPhotoUploader
                      value={editPhoto}
                      onChange={setEditPhoto}
                      communityId={community.id}
                      label="Cover photo"
                    />
                  </div>
                </div>
              </div>

              {/* STICKY FOOTER */}
              <div className="modal-footer">
                <button className="btn" onClick={() => setEditing(false)}>
                  Cancel
                </button>
                <button className="btn btn-brand" onClick={saveEdits}>
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddPin && (
        <AddPinModal
          communities={[
            {
              id: community.id,
              title: community.title,
              category: community.category,
              zip: community.zip,
            },
          ]}
          onClose={() => setShowAddPin(false)}
          onSaved={async () => {
            setShowAddPin(false);
            const { data: mapped } = await supabase
              .from("community_circle_communities")
              .select(
                "circle:community_circles!inner(id,name,lat,lng,address,contact_phone,contact_email,website_url,categories,day_of_week,time_local)"
              )
              .eq("community_id", communityId);
            setPins((mapped ?? []).map((r: any) => toPin(communityId, r.circle)));
          }}
        />
      )}
    </div>
  );
}
