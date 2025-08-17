"use client";

import SiteHeader from "@/components/SiteHeader";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AvatarUploader from "@/components/AvatarUploader";
import PhotosFeed from "@/components/PhotosFeed";
import ProfileInviteQR from "@/components/ProfileInviteQR";

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  // legacy column (may or may not exist in DB)
  location?: string | null;
  // new preferred columns
  location_text?: string | null;
  location_is_public?: boolean | null;
  show_mutuals: boolean | null;
};

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editPersonal, setEditPersonal] = useState(false);

  const [p, setP] = useState<Profile>({
    id: "",
    full_name: "",
    avatar_url: "",
    bio: "",
    location: "",
    location_text: "",
    location_is_public: false,
    show_mutuals: true,
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      setLoading(true);
      try {
        // Use * so we don't error if some columns don't exist yet
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();
        if (error) throw error;

        if (data) {
          // Normalize legacy/new fields
          const normalized: Profile = {
            id: data.id,
            full_name: data.full_name ?? "",
            avatar_url: data.avatar_url ?? "",
            bio: data.bio ?? "",
            location: data.location ?? "",
            location_text: (data.location_text ?? data.location) ?? "",
            location_is_public: data.location_is_public ?? false,
            show_mutuals: data.show_mutuals ?? true,
          };
          setP(normalized);
        } else {
          setP(prev => ({ ...prev, id: userId }));
        }
      } catch {
        setTableMissing(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  const displayName = useMemo(() => p.full_name || "Member", [p.full_name]);

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      // 1) Save core profile fields (incl. location privacy) via your route
      const res = await fetch("/profile/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: p.full_name?.trim() || null,
          bio: p.bio?.trim() || null,
          location_text: p.location_text?.trim() || null,
          location_is_public: !!p.location_is_public,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Could not save profile");

      // 2) Save show_mutuals separately (route doesn’t handle it)
      const up = await supabase
        .from("profiles")
        .update({ show_mutuals: !!p.show_mutuals })
        .eq("id", userId);
      if (up.error) throw up.error;

      alert("Saved!");
      setEditPersonal(false);
    } catch (e: any) {
      alert(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-wrap">
      {/* Remove this if your layout already renders SiteHeader to avoid a duplicate header */}
      <SiteHeader />

      <div className="page">
        <div className="container-app mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="header-bar">
            <h1 className="page-title" style={{ marginBottom: 0 }}>Profile</h1>
            <div className="controls">
              <button className="btn" onClick={() => setEditPersonal(!editPersonal)}>
                {editPersonal ? "Done" : "Edit"}
              </button>
            </div>
          </div>

          <div className="h-px bg-violet-200/60" style={{ margin: "12px 0 16px" }} />

          {tableMissing && (
            <div className="note">
              <div className="note-title">Tables not found</div>
              <div className="note-body">Run the SQL migration, then reload.</div>
            </div>
          )}

          {/* Identity header */}
          <div
            className="card p-3 mb-3 profile-card"
            style={{ borderColor: "rgba(196, 181, 253, 0.7)", background: "rgba(245, 243, 255, 0.4)" }}
          >
            <div className="profile-header" style={{ gap: 18 }}>
              <AvatarUploader
                userId={userId}
                value={p.avatar_url}
                onChange={(url) => setP((prev) => ({ ...prev, avatar_url: url }))}
                label="Profile photo"
                size={180}
              />
              <div className="profile-heading" style={{ minWidth: 0 }}>
                <div className="profile-name">{displayName}</div>
                <div className="kpis">
                  <span className="kpi"><strong>0</strong> Followers</span>
                  <span className="kpi"><strong>0</strong> Following</span>
                  <span className="kpi"><strong>0</strong> Friends</span>
                </div>

                {/* Invite friends embedded under the name/stats */}
                <ProfileInviteQR userId={userId} embed />
                {/* If you add a personal/business toggle, render it here */}
                {/* <ProfileModeToggle /> */}
              </div>
            </div>
          </div>

          {/* Two-column layout */}
          <div
            className="columns"
            style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 280px", gap: 16, alignItems: "start" }}
          >
            {/* LEFT: about + feed */}
            <div className="stack">
              {editPersonal ? (
                <section className="card p-3">
                  <h2 className="section-title">Edit your info</h2>
                  <div className="stack">
                    <label className="field">
                      <span className="label">Name</span>
                      <input
                        className="input"
                        value={p.full_name ?? ""}
                        onChange={(e) => setP({ ...p, full_name: e.target.value })}
                      />
                    </label>

                    <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                      <label className="field">
                        <span className="label">Location</span>
                        <input
                          className="input"
                          value={p.location_text ?? ""}
                          onChange={(e) => setP({ ...p, location_text: e.target.value })}
                          placeholder="City, State (e.g., Greenville, TX)"
                        />
                      </label>
                      <label className="mt-[1.85rem] flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={!!p.location_is_public}
                          onChange={(e) => setP({ ...p, location_is_public: e.target.checked })}
                        />
                        Show on public profile
                      </label>
                    </div>

                    <label className="field">
                      <span className="label">Bio</span>
                      <textarea
                        className="input"
                        rows={4}
                        value={p.bio ?? ""}
                        onChange={(e) => setP({ ...p, bio: e.target.value })}
                      />
                    </label>

                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={!!p.show_mutuals}
                        onChange={(e) => setP({ ...p, show_mutuals: e.target.checked })}
                      />
                      <span>Show mutual friends</span>
                    </label>

                    <div className="right">
                      <button className="btn btn-brand" onClick={save} disabled={saving}>
                        {saving ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </div>
                </section>
              ) : (
                <section className="card p-3">
                  <h2 className="section-title">About</h2>
                  <div className="stack">
                    {p.location_is_public && p.location_text ? (
                      <div><strong>Location:</strong> {p.location_text}</div>
                    ) : null}
                    {p.bio && (<div style={{ whiteSpace: "pre-wrap" }}>{p.bio}</div>)}
                    {!p.location_is_public && p.location_text ? (
                      <div className="muted text-sm">(Location is private)</div>
                    ) : null}
                    {!p.location_text && !p.bio && (
                      <div className="muted">Add a bio and location using Edit.</div>
                    )}
                  </div>
                </section>
              )}

              {/* Main feed */}
              <PhotosFeed userId={userId} />
            </div>

            {/* RIGHT: gratitude (invite moved into header) */}
            <div className="stack">
              <section className="card p-3" style={{ padding: 12 }}>
                <div className="section-row">
                  <h3 className="section-title" style={{ marginBottom: 4 }}>Gratitude</h3>
                  <a className="btn btn-brand" href="/gratitude">Open</a>
                </div>
                <p className="muted" style={{ fontSize: 12 }}>
                  Capture daily gratitude. Prompts & a 30-day healing journal live on the full page.
                </p>
              </section>
              {/* Inbox preview could go here when you're ready */}
              {/* <InboxPreview /> */}
            </div>
          </div>

          {loading && <p className="muted mt-3">Loading…</p>}
        </div>
      </div>
    </div>
  );
}
