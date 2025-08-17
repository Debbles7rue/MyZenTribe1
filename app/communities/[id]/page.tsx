"use client";

import { useEffect, useMemo, useState } from "react";
import NextLink from "next/link";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import SiteHeader from "@/components/SiteHeader";
import { supabase } from "@/lib/supabaseClient";
import CommunityPhotoUploader from "@/components/CommunityPhotoUploader";

type Community = {
  id: string;
  title: string;
  about: string | null;
  zip: string | null;
  category: string | null;
  visibility: "public" | "private" | null;
  cover_url: string | null;
  created_by: string | null;
  created_at: string;
};

type Member = {
  user_id: string;
  role: "admin" | "member";
  status: "member" | "pending";
};

type BusinessProfile = {
  id: string;
  full_name: string | null;
  is_business: boolean | null;
  business_name: string | null;
  business_zip: string | null;
  website: string | null;
  offering_title: string | null;
  business_logo_url: string | null;
};

type Tab = "discussion" | "events" | "about" | "directory";

export default function CommunityDetailPage() {
  const params = useParams<{ id: string }>();
  const communityId = params?.id;
  const [me, setMe] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [c, setC] = useState<Community | null>(null);
  const [myMember, setMyMember] = useState<Member | null>(null);
  const [tab, setTab] = useState<Tab>("discussion");
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // Directory
  const [biz, setBiz] = useState<BusinessProfile[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        // who am I?
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth.user?.id ?? null;
        if (mounted) setMe(userId);

        // get community
        const { data: comm, error: ce } = await supabase
          .from("communities")
          .select("id,title,about,zip,category,visibility,cover_url,created_by,created_at")
          .eq("id", communityId)
          .maybeSingle();
        if (ce) throw ce;
        if (!comm) throw new Error("Community not found.");

        if (mounted) setC(comm as Community);

        // my membership (role)
        if (userId) {
          const { data: mem, error: meErr } = await supabase
            .from("community_members")
            .select("user_id, role, status")
            .eq("community_id", communityId)
            .eq("user_id", userId)
            .maybeSingle();
          if (!meErr && mem && mounted) setMyMember(mem as Member);
        }

        // directory (businesses in this community)
        // NOTE: simplest version: show members with profiles.is_business = true
        const { data: bizRows } = await supabase
          .from("community_members")
          .select("user_id, profiles!inner(id, full_name, is_business, business_name, website, offering_title, business_logo_url, business_zip)")
          .eq("community_id", communityId)
          .eq("status", "member");

        const list =
          (bizRows ?? [])
            .map((r: any) => r.profiles)
            .filter((p: any) => p?.is_business) as BusinessProfile[];

        if (mounted) setBiz(list);
      } catch (e: any) {
        console.error(e);
        if (mounted) setError(e.message || "Failed to load.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [communityId]);

  const amAdmin = useMemo(() => {
    if (!me || !myMember) return false;
    return myMember.role === "admin";
  }, [me, myMember]);

  async function joinCommunity() {
    if (!me || !c) return;
    try {
      setSaving(true);
      const { error: e } = await supabase.from("community_members").upsert({
        community_id: c.id,
        user_id: me,
        status: c.visibility === "private" ? "pending" : "member",
        role: "member",
      });
      if (e) throw e;
      alert(c.visibility === "private" ? "Requested to join. An admin will approve you." : "Joined!");
      setMyMember({ user_id: me, role: "member", status: c.visibility === "private" ? "pending" : "member" });
    } catch (e: any) {
      alert(e.message || "Join failed");
    } finally {
      setSaving(false);
    }
  }

  async function saveEdits(next: Partial<Community>) {
    if (!c) return;
    try {
      setSaving(true);
      const payload = {
        title: (next.title ?? c.title)?.trim(),
        about: (next.about ?? c.about) || null,
        zip: (next.zip ?? c.zip) || null,
        category: (next.category ?? c.category) || null,
        visibility: (next.visibility ?? c.visibility) || "public",
        cover_url: (next.cover_url ?? c.cover_url) || null,
      };
      const { error } = await supabase.from("communities").update(payload).eq("id", c.id);
      if (error) throw error;
      setC({ ...c, ...payload });
      setEditMode(false);
      alert("Saved!");
    } catch (e: any) {
      alert(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="page-wrap">
        <SiteHeader />
        <div className="page"><div className="container-app"><p className="muted">Loading…</p></div></div>
      </div>
    );
  }

  if (error || !c) {
    return (
      <div className="page-wrap">
        <SiteHeader />
        <div className="page">
          <div className="container-app">
            <div className="note">
              <div className="note-title">Couldn’t open community</div>
              <div className="note-body">{error || "Unknown error"}</div>
              <div className="controls" style={{ marginTop: 10 }}>
                <NextLink className="btn" href="/communities">Back to communities</NextLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrap">
      <SiteHeader />
      <div className="page" style={{ background: "linear-gradient(#fff8e0,#fff)" }}>
        <div className="container-app">
          <div className="header-bar">
            <h1 className="page-title" style={{ marginBottom: 0 }}>{c.title}</h1>
            <div className="controls">
              <NextLink href="/communities" className="btn">Back</NextLink>
              {amAdmin && (
                <button className="btn" onClick={() => setEditMode(!editMode)}>
                  {editMode ? "Done" : "Edit"}
                </button>
              )}
              {!myMember || myMember.status !== "member" ? (
                <button className="btn btn-brand" onClick={joinCommunity} disabled={saving}>
                  {c.visibility === "private" ? "Request to join" : "Join"}
                </button>
              ) : (
                <span className="muted" style={{ marginLeft: 8 }}>Joined</span>
              )}
            </div>
          </div>

          {/* Cover */}
          {c.cover_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={c.cover_url}
              alt="Community cover"
              style={{ width: "100%", maxHeight: 280, objectFit: "cover", borderRadius: 12, marginBottom: 12 }}
            />
          )}

          {/* Meta */}
          <div className="muted" style={{ marginBottom: 12 }}>
            {c.category || "General"} · {c.zip || "ZIP n/a"} · Created{" "}
            {c.created_at ? format(new Date(c.created_at), "MMM d, yyyy") : "—"}
          </div>

          {/* Tabs */}
          <div className="segmented" role="tablist" aria-label="Community tabs" style={{ marginBottom: 12 }}>
            <button className={`seg-btn ${tab === "discussion" ? "active" : ""}`} onClick={() => setTab("discussion")}>
              Discussion
            </button>
            <button className={`seg-btn ${tab === "events" ? "active" : ""}`} onClick={() => setTab("events")}>
              What’s happening
            </button>
            <button className={`seg-btn ${tab === "about" ? "active" : ""}`} onClick={() => setTab("about")}>
              About
            </button>
            <button className={`seg-btn ${tab === "directory" ? "active" : ""}`} onClick={() => setTab("directory")}>
              Business Directory
            </button>
          </div>

          {/* Edit card (admins) */}
          {editMode && amAdmin && (
            <EditCard c={c} me={me} onSave={saveEdits} />
          )}

          {/* Tab content */}
          {tab === "discussion" && (
            <section className="card p-3">
              <h2 className="section-title">Discussion</h2>
              <p className="muted">Threaded discussions coming soon.</p>
            </section>
          )}

          {tab === "events" && (
            <section className="card p-3">
              <h2 className="section-title">What’s happening</h2>
              <p className="muted">Community events feed coming soon.</p>
            </section>
          )}

          {tab === "about" && (
            <section className="card p-3">
              <h2 className="section-title">About this community</h2>
              {c.about ? <div style={{ whiteSpace: "pre-wrap" }}>{c.about}</div> : <p className="muted">No description yet.</p>}
            </section>
          )}

          {tab === "directory" && (
            <section className="card p-3">
              <h2 className="section-title">Business Directory</h2>
              <p className="muted" style={{ marginBottom: 12 }}>
                Members who set up a business page appear here. (Tip: edit your Profile → Business.)
              </p>
              {biz.length === 0 ? (
                <p className="muted">No businesses yet.</p>
              ) : (
                <div className="commitment-grid">
                  {biz.map((p) => (
                    <div key={p.id} className="commitment-card">
                      {p.business_logo_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.business_logo_url}
                          alt={p.business_name || p.full_name || "Logo"}
                          style={{ width: "100%", borderRadius: 12, marginBottom: 8 }}
                        />
                      )}
                      <h4>{p.business_name || p.full_name || "Business"}</h4>
                      {p.offering_title && <p className="muted">{p.offering_title}</p>}
                      <div style={{ fontSize: 12 }} className="muted">
                        {p.business_zip ? <>ZIP: {p.business_zip}</> : "ZIP not provided"}
                      </div>
                      {p.website && (
                        <a href={p.website} target="_blank" rel="noreferrer" className="btn btn-neutral" style={{ marginTop: 8 }}>
                          Visit site
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

/** ───────────────────────────── Edit card (admin only) */
function EditCard({
  c,
  me,
  onSave,
}: {
  c: Community;
  me: string | null;
  onSave: (next: Partial<Community>) => Promise<void>;
}) {
  const [title, setTitle] = useState(c.title);
  const [about, setAbout] = useState(c.about ?? "");
  const [zip, setZip] = useState(c.zip ?? "");
  const [category, setCategory] = useState(c.category ?? "");
  const [visibility, setVisibility] = useState<"public" | "private">(c.visibility || "public");
  const [cover, setCover] = useState<string | null>(c.cover_url ?? null);

  return (
    <section className="card p-3" style={{ marginBottom: 12 }}>
      <h2 className="section-title">Edit community</h2>
      <div className="stack">
        <label className="field">
          <span className="label">Title</span>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="field">
          <span className="label">Category</span>
          <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Drum circles, breathwork…" />
        </label>
        <label className="field">
          <span className="label">ZIP</span>
          <input className="input" value={zip} onChange={(e) => setZip(e.target.value)} />
        </label>
        <label className="field">
          <span className="label">Visibility</span>
          <select className="input" value={visibility} onChange={(e) => setVisibility(e.target.value as any)}>
            <option value="public">Public (anyone can join)</option>
            <option value="private">Private (request to join)</option>
          </select>
        </label>

        <CommunityPhotoUploader
          value={cover}
          onChange={setCover}
          communityId={c.id}
          userId={me}
          label="Cover photo"
        />

        <label className="field">
          <span className="label">About</span>
          <textarea className="input" rows={5} value={about} onChange={(e) => setAbout(e.target.value)} />
        </label>

        <div className="right">
          <button
            className="btn btn-brand"
            onClick={() =>
              onSave({
                title,
                about: about || null,
                zip: zip || null,
                category: category || null,
                visibility,
                cover_url: cover || null,
              })
            }
          >
            Save changes
          </button>
        </div>
      </div>
    </section>
  );
}
