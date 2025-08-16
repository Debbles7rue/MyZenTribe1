// app/communities/new/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const CATEGORIES = [
  "Wellness",
  "Meditation",
  "Yoga",
  "Breathwork",
  "Sound/Drum Circles",
  "Arts & Crafts",
  "Nature/Outdoors",
  "Parenting",
  "Recovery/Support",
  "Local Events",
  "Other",
];

export default function NewCommunityPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [zip, setZip] = useState("");
  const [photo_url, setPhotoUrl] = useState("");
  const [about, setAbout] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) {
      setError("Please sign in.");
      return;
    }
    if (!title.trim()) {
      setError("Please enter a title.");
      return;
    }
    if (!zip.trim()) {
      setError("Please provide a ZIP code.");
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      title: title.trim(),
      category: category || null,
      zip: zip.trim().slice(0, 5),
      photo_url: photo_url.trim() || null,
      about: about.trim() || null,
      created_by: userId,
    };

    const { data, error } = await supabase
      .from("communities")
      .insert(payload)
      .select("id")
      .single();

    if (error || !data) {
      setSaving(false);
      setError(error?.message || "Could not create community.");
      return;
    }

    // make creator an admin member
    await supabase.from("community_members").insert({
      community_id: data.id,
      user_id: userId,
      role: "admin",
      status: "member",
    });

    router.replace(`/communities/${data.id}`);
  }

  const bg: React.CSSProperties = {
    background: "linear-gradient(#FFF7DB, #ffffff)",
    minHeight: "100vh",
  };

  return (
    <div className="page-wrap" style={bg}>
      <div className="page">
        <div className="container-app">
          <div className="header-bar">
            <h1 className="page-title" style={{ marginBottom: 0 }}>
              Start a community
            </h1>
            <div className="controls">
              <Link href="/communities" className="btn">
                Back
              </Link>
            </div>
          </div>

          <section className="card p-3">
            <form onSubmit={onSubmit} className="stack">
              <label className="field">
                <span className="label">Title</span>
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </label>

              <label className="field">
                <span className="label">Category</span>
                <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">Choose a category</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label className="field">
                  <span className="label">ZIP</span>
                  <input className="input" value={zip} onChange={(e) => setZip(e.target.value)} maxLength={5} required />
                </label>
                <label className="field">
                  <span className="label">Photo URL (optional)</span>
                  <input
                    className="input"
                    value={photo_url}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    placeholder="https://…"
                  />
                </label>
              </div>

              <label className="field">
                <span className="label">About</span>
                <textarea className="input" rows={4} value={about} onChange={(e) => setAbout(e.target.value)} />
              </label>

              {error && <div className="text-red-600 text-sm">Error: {error}</div>}

              <div className="right">
                <button className="btn btn-brand" type="submit" disabled={saving}>
                  {saving ? "Creating…" : "Create community"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
