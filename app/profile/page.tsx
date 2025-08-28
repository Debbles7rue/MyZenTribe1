"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AvatarUploader from "@/components/AvatarUploader";
import PhotosFeed from "@/components/PhotosFeed";
import ProfileInviteQR from "@/components/ProfileInviteQR";

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location?: string | null;
  location_text?: string | null;
  location_is_public?: boolean | null;
  show_mutuals: boolean | null;
};

function useIsDesktop(minWidth = 1024) {
  const [isDesktop, setIsDesktop] = useState<boolean>(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(min-width:${minWidth}px)`);
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [minWidth]);
  return isDesktop;
}

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editPersonal, setEditPersonal] = useState(false);
  const [friendsCount, setFriendsCount] = useState<number>(0);
  const isDesktop = useIsDesktop(1024);

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

  // profile data
  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();
        if (error) throw error;
        if (data) {
          setP({
            id: data.id,
            full_name: data.full_name ?? "",
            avatar_url: data.avatar_url ?? "",
            bio: data.bio ?? "",
            location: data.location ?? "",
            location_text: (data.location_text ?? data.location) ?? "",
            location_is_public: data.location_is_public ?? false,
            show_mutuals: data.show_mutuals ?? true,
          });
        } else setP((prev) => ({ ...prev, id: userId }));
      } catch {
        setTableMissing(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  // friends count via friends_view
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase.from("friends_view").select("friend_id");
      const ids = [...new Set((data ?? []).map((r: any) => r.friend_id))];
      setFriendsCount(ids.length);
    })();
  }, [userId]);

  const displayName = useMemo(() => p.full_name || "Member", [p.full_name]);

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: p.full_name?.trim() || null,
          bio: p.bio?.trim() || null,
          location_text: p.location_text?.trim() || null,
          location_is_public: !!p.location_is_public,
          avatar_url: p.avatar_url?.trim() || null,
          show_mutuals: !!p.show_mutuals,
        })
        .eq("id", userId);
      if (error) throw error;
      alert("Saved!");
      setEditPersonal(false);
    } catch (e: any) {
      alert(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  async function onAvatarChange(url: string) {
    setP((prev) => ({ ...prev, avatar_url: url }));
    if (!userId) return;
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: url || null })
      .eq("id", userId);
    if (error) alert("Could not save photo: " + error.message);
  }

  return (
    <div className="page-wrap lavender-page">
      <div className="page">
        <div className="container-app mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="header-bar">
            <h1 className="page-title" style={{ marginBottom: 0 }}>
              Profile
            </h1>
            <div className="controls flex items-center gap-2">
              <Link href="/business" className="btn">
                Business profile
              </Link>
              <Link href="/friends" className="btn">
                Friends
              </Link>
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

          {/* Identity header card */}
          <div
            className="card p-3 mb-3 profile-card"
            style={{ borderColor: "rgba(196, 181, 253, 0.7)", background: "rgba(245, 243, 255, 0.5)" }}
          >
            <div
              className="profile-header"
              style={{
                display: "flex",
                flexDirection: isDesktop ? "row" : "column",
                gap: isDesktop ? 18 : 12,
                alignItems: isDesktop ? "flex-start" : "center",
                textAlign: isDesktop ? "left" : "center",
              }}
            >
              <div className="shrink-0">
                <AvatarUploader
                  userId={userId}
                  value={p.avatar_url}
                  onChange={onAvatarChange}
                  label="Profile photo"
                  size={160}
                />
              </div>

              <div className="profile-heading" style={{ minWidth: 0, width: "100%" }}>
                <div className="profile-name">{displayName}</div>

                <div
                  className="kpis"
                  style={{
                    display: "flex",
                    gap: 12,
                    justifyContent: isDesktop ? "flex-start" : "center",
                    flexWrap: "wrap",
                    marginTop: 4,
                  }}
                >
                  <span className="kpi">
                    <strong>0</strong> Followers
                  </span>
                  <span className="kpi">
                    <strong>0</strong> Following
                  </span>
                  <Link href="/friends" className="kpi underline">
                    <strong>{friendsCount}</strong> Friends
                  </Link>
                </div>

                {/* Compact action buttons */}
                <div
                  className="flex gap-2 flex-wrap"
                  style={{ marginTop: 10, justifyContent: isDesktop ? "space-between" : "center" }}
                >
                  <div className="flex gap-2">
                    <Link href="/gratitude" className="btn">
                      Gratitude
                    </Link>
                  </div>

                  <div className="flex gap-2">
                    <Link href="/notifications" className="btn">
                      Notifications
                    </Link>
                    <Link href="/messages" className="btn btn-brand">
                      Messages
                    </Link>
                  </div>
                </div>

                {/* Invite collapsible */}
                <details style={{ marginTop: 12 }}>
                  <summary className="cursor-pointer select-none font-medium">Invite</summary>
                  <div style={{ maxWidth: 520, marginTop: 10 }}>
                    <ProfileInviteQR userId={userId} embed qrSize={180} />
                  </div>
                </details>
              </div>
            </div>
          </div>

          {/* About collapsible */}
          <details className="card p-3" style={{ marginBottom: 12 }}>
            <summary className="cursor-pointer select-none font-medium">About</summary>
            <div className="mt-2 stack">
              {p.location_is_public && p.location_text ? (
                <div>
                  <strong>Location:</strong> {p.location_text}
                </div>
              ) : null}
              {p.bio ? (
                <div style={{ whiteSpace: "pre-wrap" }}>{p.bio}</div>
              ) : (
                <div className="muted">Add a bio and location using Edit.</div>
              )}
              {!p.location_is_public && p.location_text ? (
                <div className="muted text-sm">(Location is private)</div>
              ) : null}
            </div>
          </details>

          {/* Edit form */}
          {editPersonal && (
            <section className="card p-3 mb-3">
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

                <div
                  className="grid"
                  style={{
                    display: "grid",
                    gap: 12,
                    gridTemplateColumns: isDesktop ? "1fr auto" : "1fr",
                  }}
                >
                  <label className="field">
                    <span className="label">Location</span>
                    <input
                      className="input"
                      value={p.location_text ?? ""}
                      onChange={(e) => setP({ ...p, location_text: e.target.value })}
                      placeholder="City, State"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm" style={{ display: "flex", alignItems: "center", gap: 8 }}>
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

                <label className="checkbox" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={!!p.show_mutuals}
                    onChange={(e) => setP({ ...p, show_mutuals: e.target.checked })}
                  />
                  <span>Show mutual friends</span>
                </label>

                <div className="right" style={{ textAlign: "right" }}>
                  <button className="btn btn-brand" onClick={save} disabled={saving}>
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Photos thread — newest first if your component supports it */}
          <PhotosFeed userId={userId} />
          {loading && <p className="muted mt-3">Loading...</p>}
        </div>
      </div>
    </div>
  );
}
