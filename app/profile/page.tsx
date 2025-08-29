"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AvatarUploader from "@/components/AvatarUploader";
import PhotosFeed from "@/components/PhotosFeed";
import ProfileInviteQR from "@/components/ProfileInviteQR";
import { getEmergencySettings, saveEmergencySettings } from "@/lib/sos";

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

  // Safety/SOS UI state
  const [editSafety, setEditSafety] = useState(false);
  const [sosEnabled, setSosEnabled] = useState(false);
  const [ecName, setEcName] = useState("");
  const [ecMethod, setEcMethod] = useState<"sms" | "email" | "">("");
  const [ecValue, setEcValue] = useState("");
  const [savingSafety, setSavingSafety] = useState(false);
  const [saveSafetyMsg, setSaveSafetyMsg] = useState<string | null>(null);

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null)); }, []);

  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
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
        } else setP(prev => ({ ...prev, id: userId }));
      } catch { setTableMissing(true); }
      finally { setLoading(false); }
    };
    load();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { count } = await supabase.from("friendships").select("a", { count: "exact", head: true }).or(`a.eq.${userId},b.eq.${userId}`);
      if (typeof count === "number") setFriendsCount(count);
    })();
  }, [userId]);

  // Load emergency settings (safe if columns not present)
  useEffect(() => {
    (async () => {
      const s = await getEmergencySettings();
      setSosEnabled(!!s.sos_enabled);
      setEcName(s.emergency_contact_name ?? "");
      setEcMethod((s.emergency_contact_method as "sms" | "email" | null) ?? "");
      setEcValue(s.emergency_contact_value ?? "");
    })();
  }, []);

  const displayName = useMemo(() => p.full_name || "Member", [p.full_name]);

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        full_name: p.full_name?.trim() || null,
        bio: p.bio?.trim() || null,
        location_text: p.location_text?.trim() || null,
        location_is_public: !!p.location_is_public,
        avatar_url: p.avatar_url?.trim() || null,
        show_mutuals: !!p.show_mutuals,
      }).eq("id", userId);
      if (error) throw error;
      alert("Saved!");
      setEditPersonal(false);
    } catch (e: any) { alert(e.message || "Save failed"); }
    finally { setSaving(false); }
  };

  async function onAvatarChange(url: string) {
    setP(prev => ({ ...prev, avatar_url: url }));
    if (!userId) return;
    const { error } = await supabase.from("profiles").update({ avatar_url: url || null }).eq("id", userId);
    if (error) alert("Could not save photo: " + error.message);
  }

  async function saveSafety() {
    setSavingSafety(true);
    setSaveSafetyMsg(null);
    try {
      const { ok, error } = await saveEmergencySettings({
        sos_enabled: sosEnabled,
        emergency_contact_name: ecName?.trim() || null,
        emergency_contact_method: (ecMethod || null) as any,
        emergency_contact_value: ecValue?.trim() || null,
      });
      if (!ok) throw new Error(error || "Failed to save");
      setSaveSafetyMsg("Saved!");
      setEditSafety(false);
    } catch (e: any) {
      setSaveSafetyMsg(e?.message || "Could not save settings. If columns are missing, run the migration.");
    } finally {
      setSavingSafety(false);
      setTimeout(() => setSaveSafetyMsg(null), 2500);
    }
  }

  const QuickActions = (
    <div className="quick-actions" style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr" }}>
      <section className="card p-3" style={{ padding: 12 }}>
        <div className="section-row"><h3 className="section-title" style={{ marginBottom: 4 }}>Friends</h3></div>
        <p className="muted" style={{ fontSize: 13 }}>Browse, search, add private notes.</p>
        <a className="btn mt-2" href="/friends">Open</a>
      </section>

      {/* NEW: Safety & SOS (compact card) */}
      <section className="card p-3" style={{ padding: 12 }}>
        <div className="section-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 className="section-title" style={{ marginBottom: 4 }}>Safety & SOS</h3>
          <div className="text-xs text-neutral-600">{sosEnabled ? "Enabled" : "Disabled"}</div>
        </div>
        <p className="muted" style={{ fontSize: 13 }}>
          Configure your emergency contact. Use the SOS button on the <a href="/safety" className="underline">Safety</a> page if you feel unsafe.
        </p>

        {!editSafety ? (
          <div className="mt-2 flex items-center gap-2">
            <button className="btn" onClick={() => setEditSafety(true)}>Configure</button>
            <a className="btn btn-neutral" href="/safety">Open Safety</a>
          </div>
        ) : (
          <div className="stack mt-2" style={{ gap: 8 }}>
            <label className="field">
              <span className="label">Contact name</span>
              <input className="input" value={ecName} onChange={(e) => setEcName(e.target.value)} placeholder="e.g., Mom / Alex / Partner" />
            </label>

            <div className="grid" style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
              <label className="field">
                <span className="label">Method</span>
                <select className="input" value={ecMethod} onChange={(e) => setEcMethod(e.target.value as any)}>
                  <option value="">Select…</option>
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                </select>
              </label>
              <label className="field">
                <span className="label">{ecMethod === "sms" ? "Phone (E.164, +15551234…)" : "Email"}</span>
                <input className="input" value={ecValue} onChange={(e) => setEcValue(e.target.value)} placeholder={ecMethod === "sms" ? "+15551234567" : "name@example.com"} />
              </label>
            </div>

            <label className="checkbox" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={sosEnabled} onChange={(e) => setSosEnabled(e.target.checked)} />
              <span>Enable SOS quick button</span>
            </label>

            <div className="flex items-center justify-end gap-2">
              <button className="btn" onClick={() => setEditSafety(false)}>Cancel</button>
              <button className="btn btn-brand" onClick={saveSafety} disabled={savingSafety}>
                {savingSafety ? "Saving…" : "Save"}
              </button>
            </div>
            {saveSafetyMsg && <div className="text-sm">{saveSafetyMsg}</div>}
          </div>
        )}
      </section>

      <section className="card p-3" style={{ padding: 12 }}>
        <div className="section-row"><h3 className="section-title" style={{ marginBottom: 4 }}>Gratitude</h3></div>
        <p className="muted" style={{ fontSize: 13 }}>Capture daily gratitude.</p>
        <a className="btn btn-brand mt-2" href="/gratitude">Open</a>
      </section>

      <section className="card p-3" style={{ padding: 12 }}>
        <div className="section-row"><h3 className="section-title" style={{ marginBottom: 4 }}>Messages</h3></div>
        <p className="muted" style={{ fontSize: 13 }}>Private chat with friends.</p>
        <a className="btn mt-2" href="/messages">Open</a>
      </section>
    </div>
  );

  return (
    <div className="page-wrap">
      <div className="page">
        <div className="container-app mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="header-bar">
            <h1 className="page-title" style={{ marginBottom: 0 }}>Profile</h1>
            <div className="controls flex items-center gap-2">
              <Link href="/business" className="btn">Business profile</Link>
              <Link href="/friends" className="btn">Friends</Link>
              <Link href="/messages" className="btn">Messages</Link>
              <button className="btn" onClick={() => setEditPersonal(!editPersonal)}>{editPersonal ? "Done" : "Edit"}</button>
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
          <div className="card p-3 mb-3 profile-card" style={{ borderColor: "rgba(196, 181, 253, 0.7)", background: "rgba(245, 243, 255, 0.4)" }}>
            <div className="profile-header" style={{ display: "flex", flexDirection: isDesktop ? "row" : "column", gap: isDesktop ? 18 : 12, alignItems: isDesktop ? "flex-start" : "center", textAlign: isDesktop ? "left" : "center" }}>
              <div className="shrink-0">
                <AvatarUploader userId={userId} value={p.avatar_url} onChange={onAvatarChange} label="Profile photo" size={160} />
              </div>
              <div className="profile-heading" style={{ minWidth: 0, width: "100%" }}>
                <div className="profile-name">{displayName}</div>
                <div className="kpis" style={{ display: "flex", gap: 12, justifyContent: isDesktop ? "flex-start" : "center", flexWrap: "wrap" }}>
                  <span className="kpi"><strong>0</strong> Followers</span>
                  <span className="kpi"><strong>0</strong> Following</span>
                  <span className="kpi"><strong>{friendsCount}</strong> Friends</span>
                </div>

                {/* Invite dropdown / QR embed */}
                <div style={{ maxWidth: 520, margin: isDesktop ? "10px 0 0 0" : "10px auto 0" }}>
                  <ProfileInviteQR userId={userId} embed qrSize={180} />
                </div>
              </div>
            </div>
          </div>

          {/* Columns */}
          <div className="columns" style={{ display: "grid", gridTemplateColumns: isDesktop ? "minmax(0,1fr) 320px" : "1fr", gap: 16, alignItems: "start" }}>
            <div className="stack">
              {!isDesktop && QuickActions}

              {editPersonal ? (
                <section className="card p-3">
                  <h2 className="section-title">Edit your info</h2>
                  <div className="stack">
                    <label className="field"><span className="label">Name</span>
                      <input className="input" value={p.full_name ?? ""} onChange={(e) => setP({ ...p, full_name: e.target.value })} />
                    </label>

                    <div className="grid" style={{ display: "grid", gap: 12, gridTemplateColumns: isDesktop ? "1fr auto" : "1fr" }}>
                      <label className="field"><span className="label">Location</span>
                        <input className="input" value={p.location_text ?? ""} onChange={(e) => setP({ ...p, location_text: e.target.value })} placeholder="City, State" />
                      </label>
                      <label className="flex items-center gap-2 text-sm" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input type="checkbox" checked={!!p.location_is_public} onChange={(e) => setP({ ...p, location_is_public: e.target.checked })} />
                        Show on public profile
                      </label>
                    </div>

                    <label className="field"><span className="label">Bio</span>
                      <textarea className="input" rows={4} value={p.bio ?? ""} onChange={(e) => setP({ ...p, bio: e.target.value })} />
                    </label>

                    <label className="checkbox" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input type="checkbox" checked={!!p.show_mutuals} onChange={(e) => setP({ ...p, show_mutuals: e.target.checked })} />
                      <span>Show mutual friends</span>
                    </label>

                    <div className="right" style={{ textAlign: "right" }}>
                      <button className="btn btn-brand" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
                    </div>
                  </div>
                </section>
              ) : (
                <section className="card p-3">
                  <h2 className="section-title">About</h2>
                  <div className="stack">
                    {p.location_is_public && p.location_text ? (<div><strong>Location:</strong> {p.location_text}</div>) : null}
                    {p.bio ? (<div style={{ whiteSpace: "pre-wrap" }}>{p.bio}</div>) : (<div className="muted">Add a bio and location using Edit.</div>)}
                    {!p.location_is_public && p.location_text ? (<div className="muted text-sm">(Location is private)</div>) : null}
                  </div>
                </section>
              )}

              <PhotosFeed userId={userId} />
            </div>

            {isDesktop && <div className="stack">{QuickActions}</div>}
          </div>

          {loading && <p className="muted mt-3">Loading...</p>}
        </div>
      </div>
    </div>
  );
}
