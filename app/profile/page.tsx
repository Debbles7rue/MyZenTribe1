"use client";

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
  location?: string | null;              // legacy
  location_text?: string | null;         // preferred
  location_is_public?: boolean | null;   // preferred
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
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();
        if (error) throw error;

        if (data) {
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
      // Save text fields via your API route (kept as-is)
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

      // ALSO persist avatar_url + show_mutuals directly
      const up = await supabase
        .from("profiles")
        .update({
          avatar_url: p.avatar_url?.trim() || null,
          show_mutuals: !!p.show_mutuals,
        })
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

                {/* Invite friends (QR smaller, QR-first) */}
                <ProfileInviteQR userId={userId} embed context="personal" qrSize={140} />
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

                    <div className="grid gap-3 sm:
