"use client";

import SiteHeader from "@/components/SiteHeader";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  location: string | null;
  is_business: boolean | null;
  offering_title: string | null;
  offering_description: string | null;
  booking_url: string | null;
  show_mutuals: boolean | null;
};

export default function ProfilePage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [p, setP] = useState<Profile>({
    id: "",
    full_name: "",
    avatar_url: "",
    bio: "",
    website: "",
    location: "",
    is_business: false,
    offering_title: "",
    offering_description: "",
    booking_url: "",
    show_mutuals: true,
  });

  // Load auth user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      setUserId(u?.id ?? null);
      setEmail(u?.email ?? null);
    });
  }, []);

  // Load profile (if table exists)
  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      setLoading(true);
      setTableMissing(false);

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select(
            "id, full_name, avatar_url, bio, website, location, is_business, offering_title, offering_description, booking_url, show_mutuals"
          )
          .eq("id", userId)
          .maybeSingle();

        if (error) setTableMissing(true);

        if (data) {
          setP({
            id: data.id,
            full_name: data.full_name,
            avatar_url: data.avatar_url,
            bio: data.bio,
            website: data.website,
            location: data.location,
            is_business: data.is_business,
            offering_title: data.offering_title,
            offering_description: data.offering_description,
            booking_url: data.booking_url,
            show_mutuals: data.show_mutuals,
          });
        } else {
          setP((prev) => ({
            ...prev,
            id: userId,
            full_name: prev.full_name || (email ? email.split("@")[0] : "New member"),
          }));
        }
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
        website: p.website?.trim() || null,
        location: p.location?.trim() || null,
        is_business: !!p.is_business,
        offering_title: p.offering_title?.trim() || null,
        offering_description: p.offering_description?.trim() || null,
        booking_url: p.booking_url?.trim() || null,
        show_mutuals: p.show_mutuals ?? true,
      };

      const { error } = await supabase
        .from("profiles")
        .upsert(payload, { onConflict: "id" });

      if (error) {
        if ((error as any).code === "42P01") {
          setTableMissing(true);
          alert("Profiles table not found yet. See the note at the top.");
        } else {
          alert(error.message);
        }
        return;
      }
      alert("Profile saved!");
    } finally {
      setSaving(false);
    }
  };

  // Quick sign-out for testing
  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  // (Future) Only show follow/report on OTHER profiles
  const showActionsForOthers = false; // your page = own profile, so keep false

  return (
    <div className="page-wrap">
      <SiteHeader />

      <div className="page">
        <div className="container-app">
          <div className="header-bar">
            <h1 className="page-title" style={{ marginBottom: 0 }}>Profile</h1>
            <div className="controls">
              <button className="btn" onClick={signOut}>Sign out</button>
            </div>
          </div>

          {tableMissing && (
            <div className="note">
              <div className="note-title">The <code>profiles</code> table isn’t found yet.</div>
              <div className="note-body">
                The page still works, but saving to the database is disabled until the table exists.
                <details className="mt-1">
                  <summary className="linkish">Show SQL to create the table</summary>
                  <pre className="codeblock">
{`create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  bio text,
  website text,
  location text,
  is_business boolean default false,
  offering_title text,
  offering_description text,
  booking_url text,
  show_mutuals boolean default true,
  updated_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "Profiles are readable by everyone" on profiles for select using (true);
create policy "Users can insert their own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users can update their own profile" on profiles for update using (auth.uid() = id) with check (auth.uid() = id);`}
                  </pre>
                </details>
              </div>
            </div>
          )}

          {/* Top card: identity */}
          <div className="card p-3 mb-3 profile-card">
            <div className="profile-header">
              <img
                src={p.avatar_url || "/avatar-placeholder.png"}
                alt="Avatar"
                className="avatar"
              />
              <div className="profile-heading">
                <div className="profile-name">{displayName}</div>
                <div className="profile-sub">{email}</div>
                <div className="kpis">
                  <span className="kpi"><strong>0</strong> Followers</span>
                  <span className="kpi"><strong>0</strong> Following</span>
                  <span className="kpi"><strong>0</strong> Friends</span>
                </div>
              </div>

              {/* Hide actions on your own profile */}
              {showActionsForOthers && (
                <div className="profile-actions">
                  <button className="btn btn-brand" onClick={() => alert("Follow coming soon")}>Follow</button>
                  <button className="btn btn-neutral" onClick={() => alert("Friends coming soon")}>Add Friend</button>
                  <button className="btn" onClick={() => alert("Report sent")}>Report</button>
                </div>
              )}
            </div>
          </div>

          {/* Two columns below on desktop */}
          <div className="columns">
            {/* About */}
            <section className="card p-3">
              <h2 className="section-title">About</h2>
              <div className="stack">
                <label className="field">
                  <span className="label">Name</span>
                  <input
                    className="input"
                    value={p.full_name ?? ""}
                    onChange={(e) => setP({ ...p, full_name: e.target.value })}
                  />
                </label>

                <label className="field">
                  <span className="label">Location</span>
                  <input
                    className="input"
                    value={p.location ?? ""}
                    onChange={(e) => setP({ ...p, location: e.target.value })}
                    placeholder="City, State"
                  />
                </label>

                <label className="field">
                  <span className="label">Bio</span>
                  <textarea
                    className="input"
                    rows={4}
                    value={p.bio ?? ""}
                    onChange={(e) => setP({ ...p, bio: e.target.value })}
                    placeholder="Tell people who you are, what you love, and how you show up for your community."
                  />
                </label>

                <label className="field">
                  <span className="label">Website</span>
                  <input
                    className="input"
                    value={p.website ?? ""}
                    onChange={(e) => setP({ ...p, website: e.target.value })}
                    placeholder="https://example.com"
                  />
                  {p.website && (
                    <div className="hint">
                      <img
                        alt="favicon"
                        src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(
                          p.website
                        )}&sz=64`}
                        width={16}
                        height={16}
                        style={{ borderRadius: 4, marginRight: 6, verticalAlign: "text-bottom" }}
                      />
                      <a href={p.website} target="_blank" rel="noreferrer">{p.website}</a>
                    </div>
                  )}
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
                  <button
                    className="btn btn-brand"
                    onClick={save}
                    disabled={saving || tableMissing}
                    title={tableMissing ? "Create profiles table first" : "Save profile"}
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            </section>

            {/* Business offering */}
            <section className="card p-3">
              <div className="section-row">
                <h2 className="section-title">Business offering</h2>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={!!p.is_business}
                    onChange={(e) => setP({ ...p, is_business: e.target.checked })}
                  />
                  <span>I offer services</span>
                </label>
              </div>

              <div className="stack">
                <label className="field">
                  <span className="label">Offering title</span>
                  <input
                    className="input"
                    value={p.offering_title ?? ""}
                    onChange={(e) => setP({ ...p, offering_title: e.target.value })}
                    placeholder="Reiki, Sound Bath, Qi Gong, etc."
                    disabled={!p.is_business}
                  />
                </label>

                <label className="field">
                  <span className="label">Offering description</span>
                  <textarea
                    className="input"
                    rows={4}
                    value={p.offering_description ?? ""}
                    onChange={(e) => setP({ ...p, offering_description: e.target.value })}
                    placeholder="Describe what you offer and who it's for."
                    disabled={!p.is_business}
                  />
                </label>

                <label className="field">
                  <span className="label">Booking link (optional)</span>
                  <input
                    className="input"
                    value={p.booking_url ?? ""}
                    onChange={(e) => setP({ ...p, booking_url: e.target.value })}
                    placeholder="https://mybookinglink.com"
                    disabled={!p.is_business}
                  />
                </label>
              </div>
            </section>
          </div>

          {/* Roadmap footer */}
          <div className="card p-3 mt-3">
            <div className="muted text-sm">
              Coming soon: Posts & Reflections • Photos • Friends & Mutuals • Business reviews
            </div>
          </div>

          {loading && <p className="muted mt-3">Loading…</p>}
        </div>
      </div>
    </div>
  );
}
