"use client";

import SiteHeader from "@/components/SiteHeader";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AvatarUpload from "@/components/AvatarUpload";
import BusinessServicesEditor, { type Service } from "@/components/BusinessServicesEditor";
import PhotosFeed from "@/components/PhotosFeed";
import GratitudePanel from "@/components/GratitudePanel";

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  show_mutuals: boolean | null;
  is_business: boolean | null;
  offering_title: string | null;
  offering_description: string | null;
  booking_url: string | null;
  website: string | null; // business website stored here
};

type Tab = "personal" | "business";

export default function ProfilePage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>("personal");

  const [p, setP] = useState<Profile>({
    id: "",
    full_name: "",
    avatar_url: "",
    bio: "",
    location: "",
    show_mutuals: true,
    is_business: false,
    offering_title: "",
    offering_description: "",
    booking_url: "",
    website: "",
  });

  const [services, setServices] = useState<Service[]>([]);

  // Load auth user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      setUserId(u?.id ?? null);
      setEmail(u?.email ?? null);
    });
  }, []);

  // Load profile + services
  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      setLoading(true);
      setTableMissing(false);

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, bio, location, show_mutuals, is_business, offering_title, offering_description, booking_url, website")
          .eq("id", userId)
          .maybeSingle();

        if (error) setTableMissing(true);

        if (data) {
          setP({
            id: data.id,
            full_name: data.full_name,
            avatar_url: data.avatar_url,
            bio: data.bio,
            location: data.location,
            show_mutuals: data.show_mutuals,
            is_business: data.is_business,
            offering_title: data.offering_title,
            offering_description: data.offering_description,
            booking_url: data.booking_url,
            website: data.website,
          });
        } else {
          setP((prev) => ({
            ...prev,
            id: userId,
            full_name: prev.full_name || (email ? email.split("@")[0] : "New member"),
          }));
        }

        const svc = await supabase.from("business_services").select("id, title, description").eq("user_id", userId);
        setServices((svc.data ?? []).map(r => ({ id: r.id, title: r.title, description: r.description ?? "" })));
      } catch {
        setTableMissing(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId, email]);

  const displayName = useMemo(
    () => p.full_name || (email ? email.split("@")[0] : "Member"),
    [p.full_name, email]
  );

  const save = async () => {
    if (!userId) return alert("Please sign in.");
    setSaving(true);
    try {
      const payload = {
        id: userId,
        full_name: p.full_name?.trim() || null,
        avatar_url: p.avatar_url?.trim() || null,
        bio: p.bio?.trim() || null,
        location: p.location?.trim() || null,
        show_mutuals: p.show_mutuals ?? true,
        is_business: !!p.is_business,
        offering_title: p.offering_title?.trim() || null,
        offering_description: p.offering_description?.trim() || null,
        booking_url: p.booking_url?.trim() || null,
        website: p.website?.trim() || null, // business website
      };

      const up = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
      if (up.error) throw up.error;

      // Replace services set for simplicity
      await supabase.from("business_services").delete().eq("user_id", userId);
      const clean = services.filter(s => s.title.trim().length);
      if (clean.length) {
        const rows = clean.map(s => ({ user_id: userId, title: s.title.trim(), description: (s.description || "").trim() || null }));
        const ins = await supabase.from("business_services").insert(rows);
        if (ins.error) throw ins.error;
      }

      alert("Profile saved!");
    } catch (err: any) {
      if (err?.code === "42P01") {
        setTableMissing(true);
        alert("Tables missing. Run the SQL in Supabase → SQL Editor.");
      } else {
        alert(err.message || "Save failed");
      }
    } finally {
      setSaving(false);
    }
  };

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  const showActionsForOthers = false; // your own profile

  return (
    <div className="page-wrap">
      <SiteHeader />

      <div className="page">
        <div className="container-app">
          <div className="header-bar">
            <h1 className="page-title" style={{ marginBottom: 0 }}>Profile</h1>
            <div className="controls">
              <div className="segmented" role="tablist" aria-label="Profile mode">
                <button className={`seg-btn ${tab === "personal" ? "active" : ""}`} onClick={() => setTab("personal")} role="tab" aria-selected={tab === "personal"}>Personal</button>
                <button className={`seg-btn ${tab === "business" ? "active" : ""}`} onClick={() => setTab("business")} role="tab" aria-selected={tab === "business"}>Business</button>
              </div>
              <button className="btn" onClick={signOut}>Sign out</button>
            </div>
          </div>

          {tableMissing && (
            <div className="note">
              <div className="note-title">Tables missing.</div>
              <div className="note-body">Please run the SQL for profiles, business_services, photo_posts, photo_tags, gratitude_entries, events.</div>
            </div>
          )}

          {/* Header card */}
          <div className="card p-3 mb-3 profile-card">
            <div className="profile-header">
              <AvatarUpload userId={userId} value={p.avatar_url} onChange={(url) => setP(prev => ({ ...prev, avatar_url: url }))} />
              <div className="profile-heading">
                <div className="profile-name">{displayName}</div>
                <div className="profile-sub">{email}</div>
                <div className="kpis">
                  <span className="kpi"><strong>0</strong> Followers</span>
                  <span className="kpi"><strong>0</strong> Following</span>
                  <span className="kpi"><strong>0</strong> Friends</span>
                </div>
              </div>
              {showActionsForOthers && (
                <div className="profile-actions">
                  <button className="btn btn-brand" onClick={() => alert("Follow coming soon")}>Follow</button>
                  <button className="btn btn-neutral" onClick={() => alert("Friends coming soon")}>Add Friend</button>
                  <button className="btn" onClick={() => alert("Report sent")}>Report</button>
                </div>
              )}
            </div>
          </div>

          {/* Main + Sidebar layout */}
          <div className="columns">
            {/* MAIN COLUMN */}
            <div className="stack">
              {tab === "personal" ? (
                <section className="card p-3">
                  <h2 className="section-title">About you</h2>
                  <div className="stack">
                    <label className="field">
                      <span className="label">Name</span>
                      <input className="input" value={p.full_name ?? ""} onChange={(e) => setP({ ...p, full_name: e.target.value })} />
                    </label>

                    <label className="field">
                      <span className="label">Location</span>
                      <input className="input" value={p.location ?? ""} onChange={(e) => setP({ ...p, location: e.target.value })} placeholder="City, State" />
                    </label>

                    <label className="field">
                      <span className="label">Bio</span>
                      <textarea className="input" rows={4} value={p.bio ?? ""} onChange={(e) => setP({ ...p, bio: e.target.value })} placeholder="Tell people who you are, what you love, and how you show up for your community." />
                    </label>

                    <label className="checkbox">
                      <input type="checkbox" checked={!!p.show_mutuals} onChange={(e) => setP({ ...p, show_mutuals: e.target.checked })} />
                      <span>Show mutual friends</span>
                    </label>

                    <div className="right">
                      <button className="btn btn-brand" onClick={save} disabled={saving || tableMissing}>{saving ? "Saving…" : "Save"}</button>
                    </div>
                  </div>
                </section>
              ) : (
                <div className="stack">
                  <section className="card p-3">
                    <div className="section-row">
                      <h2 className="section-title">Business profile</h2>
                      <label className="checkbox">
                        <input type="checkbox" checked={!!p.is_business} onChange={(e) => setP({ ...p, is_business: e.target.checked })} />
                        <span>I offer services</span>
                      </label>
                    </div>

                    <div className="stack">
                      <label className="field">
                        <span className="label">Business website</span>
                        <input className="input" value={p.website ?? ""} onChange={(e) => setP({ ...p, website: e.target.value })} placeholder="https://example.com" disabled={!p.is_business} />
                      </label>

                      <label className="field">
                        <span className="label">Headline</span>
                        <input className="input" value={p.offering_title ?? ""} onChange={(e) => setP({ ...p, offering_title: e.target.value })} placeholder="Qi Gong, Sound Baths, Drum Circles…" disabled={!p.is_business} />
                      </label>

                      <label className="field">
                        <span className="label">Description</span>
                        <textarea className="input" rows={4} value={p.offering_description ?? ""} onChange={(e) => setP({ ...p, offering_description: e.target.value })} placeholder="Describe what you offer and who it's for." disabled={!p.is_business} />
                      </label>

                      <label className="field">
                        <span className="label">Booking link (optional)</span>
                        <input className="input" value={p.booking_url ?? ""} onChange={(e) => setP({ ...p, booking_url: e.target.value })} placeholder="https://mybookinglink.com" disabled={!p.is_business} />
                      </label>
                    </div>
                  </section>

                  <section className="card p-3">
                    <h2 className="section-title">Services</h2>
                    <BusinessServicesEditor value={services} onChange={setServices} disabled={!p.is_business} />
                    <div className="right" style={{ marginTop: 10 }}>
                      <button className="btn btn-brand" onClick={save} disabled={saving || tableMissing}>{saving ? "Saving…" : "Save business"}</button>
                    </div>
                  </section>
                </div>
              )}

              {/* Photos feed always visible on profile */}
              <PhotosFeed userId={userId} />
            </div>

            {/* SIDEBAR */}
            <div className="stack">
              <GratitudePanel userId={userId} />
              <section className="card p-3">
                <h2 className="section-title">Privacy (preview)</h2>
                <p className="muted">Right now, your profile content is private in the app UI. We’ll add public business pages and enforce friends/acquaintance visibility in the next step.</p>
              </section>
            </div>
          </div>

          {loading && <p className="muted mt-3">Loading…</p>}
        </div>
      </div>
    </div>
  );
}
