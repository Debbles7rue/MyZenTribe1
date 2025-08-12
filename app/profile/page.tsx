"use client";

import { useEffect, useMemo, useState } from "react";
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

        if (error) {
          // If table doesn't exist: error.code might be "42P01"
          setTableMissing(true);
        }

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
          // Seed defaults based on auth
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
          alert("Profiles table not found yet. See the note on this page.");
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

  const follow = () => {
    alert("Follow coming soon (business profiles).");
  };
  const addFriend = () => {
    alert("Friends system coming soon (requests, mutuals, visibility).");
  };
  const report = () => {
    alert("Report sent. Moderation will review. (Wire to your reports flow later.)");
  };

  return (
    <div className="page">
      <div className="container-app">
        <h1 className="page-title">Profile</h1>

        {tableMissing && (
          <div className="card p-3 mb-3" style={{ background: "#FFFBEB", borderColor: "#FDE68A" }}>
            <div className="text-sm">
              <strong>Note:</strong> The <code>profiles</code> table isn’t found yet. The page still works,
              but saving to the database will be disabled until the table exists.
              <details className="mt-2">
                <summary className="cursor-pointer">Show SQL to create the table</summary>
                <pre className="text-xs mt-2 whitespace-pre-wrap">
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
  updated_at timestamp with time zone default now()
);

-- RLS
alter table profiles enable row level security;

create policy "Profiles are readable by everyone"
on profiles for select
using (true);

create policy "Users can insert their own profile"
on profiles for insert
with check (auth.uid() = id);

create policy "Users can update their own profile"
on profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);`}
                </pre>
              </details>
            </div>
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-3">
          {/* Left column: avatar + actions */}
          <div className="card p-3">
            <div className="flex items-center gap-3">
              <img
                src={p.avatar_url || "/avatar-placeholder.png"}
                alt="Avatar"
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 16,
                  objectFit: "cover",
                  border: "1px solid #e5e7eb",
                }}
              />
              <div>
                <div className="font-semibold">{displayName}</div>
                <div className="text-sm muted">{email}</div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-8 text-sm">
              <div><span className="font-semibold">0</span> Followers</div>
              <div><span className="font-semibold">0</span> Following</div>
              <div><span className="font-semibold">0</span> Friends</div>
            </div>

            <div className="mt-4 flex flex-wrap gap-8">
              <button className="btn btn-brand" onClick={follow} title="Follow this profile">
                Follow
              </button>
              <button className="btn btn-neutral" onClick={addFriend} title="Send friend request">
                Add Friend
              </button>
            </div>

            <div className="mt-4">
              <button className="btn" onClick={report} title="Report this profile">
                Report
              </button>
            </div>
          </div>

          {/* Middle column: about + links */}
          <div className="card p-3">
            <h2 className="text-lg font-semibold mb-2">About</h2>

            <label className="block mb-2">
              <span className="text-sm">Name</span>
              <input
                className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2"
                value={p.full_name ?? ""}
                onChange={(e) => setP({ ...p, full_name: e.target.value })}
              />
            </label>

            <label className="block mb-2">
              <span className="text-sm">Location</span>
              <input
                className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2"
                value={p.location ?? ""}
                onChange={(e) => setP({ ...p, location: e.target.value })}
                placeholder="City, State"
              />
            </label>

            <label className="block mb-2">
              <span className="text-sm">Bio</span>
              <textarea
                className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2"
                rows={4}
                value={p.bio ?? ""}
                onChange={(e) => setP({ ...p, bio: e.target.value })}
                placeholder="Tell people who you are, what you love, and how you show up for your community."
              />
            </label>

            <label className="block mb-2">
              <span className="text-sm">Website</span>
              <input
                className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2"
                value={p.website ?? ""}
                onChange={(e) => setP({ ...p, website: e.target.value })}
                placeholder="https://example.com"
              />
            </label>

            <label className="inline-flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                checked={!!p.show_mutuals}
                onChange={(e) => setP({ ...p, show_mutuals: e.target.checked })}
              />
              <span className="text-sm">Show mutual friends</span>
            </label>

            <div className="mt-4 flex justify-end">
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

          {/* Right column: business offering (optional) */}
          <div className="card p-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Business offering</h2>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!p.is_business}
                  onChange={(e) => setP({ ...p, is_business: e.target.checked })}
                />
                <span className="text-sm">I offer services</span>
              </label>
            </div>

            <label className="block mt-2">
              <span className="text-sm">Offering title</span>
              <input
                className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2"
                value={p.offering_title ?? ""}
                onChange={(e) => setP({ ...p, offering_title: e.target.value })}
                placeholder="Reiki, Sound Bath, Qi Gong, etc."
                disabled={!p.is_business}
              />
            </label>

            <label className="block mt-2">
              <span className="text-sm">Offering description</span>
              <textarea
                className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2"
                rows={4}
                value={p.offering_description ?? ""}
                onChange={(e) => setP({ ...p, offering_description: e.target.value })}
                placeholder="Describe what you offer and who it's for."
                disabled={!p.is_business}
              />
            </label>

            <label className="block mt-2">
              <span className="text-sm">Booking link (optional)</span>
              <input
                className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2"
                value={p.booking_url ?? ""}
                onChange={(e) => setP({ ...p, booking_url: e.target.value })}
                placeholder="https://mybookinglink.com"
                disabled={!p.is_business}
              />
            </label>

            {/* Simple website preview thumbnail (works for most domains) */}
            {p.website && (
              <div className="mt-4 rounded-xl border border-neutral-200 p-3">
                <div className="text-sm font-medium mb-2">Website preview</div>
                <div className="flex items-center gap-3">
                  <img
                    alt="favicon"
                    src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(
                      p.website
                    )}&sz=64`}
                    width={24}
                    height={24}
                    style={{ borderRadius: 6 }}
                  />
                  <a
                    href={p.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm"
                    style={{ wordBreak: "break-all" }}
                  >
                    {p.website}
                  </a>
                </div>
                {/* Many sites block iframes; link above is the reliable part */}
              </div>
            )}
          </div>
        </div>

        {/* Future tabs (coming soon) */}
        <div className="card p-3 mt-3">
          <div className="muted text-sm">
            Coming soon: Posts & Reflections • Photos • Friends & Mutuals • Business reviews
          </div>
        </div>

        {loading && <p className="muted mt-3">Loading…</p>}
      </div>
    </div>
  );
}
