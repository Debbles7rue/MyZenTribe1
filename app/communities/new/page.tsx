"use client";

import { useEffect, useState } from "react";
import NextLink from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import CommunityPhotoUploader from "@/components/CommunityPhotoUploader";

type Visibility = "public" | "private";

export default function CommunityCreatePage() {
  const router = useRouter();
  const [me, setMe] = useState<string | null>(null);

  // your existing fields
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [zip, setZip] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [about, setAbout] = useState("");

  // optional cover image
  const [cover, setCover] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  async function create() {
    if (!me) {
      alert("Please sign in.");
      return;
    }
    if (!title.trim()) {
      alert("Please enter a title.");
      return;
    }
    try {
      setSaving(true);

      // Insert the new community (cover_url kept)
      const { data, error } = await supabase
        .from("communities")
        .insert({
          title: title.trim(),
          category: category.trim() || null,
          zip: zip.trim() || null,
          about: about.trim() || null,
          visibility,
          cover_url: cover || null,
          created_by: me,            // <- your schema uses created_by; keep this
        })
        .select("id")
        .single();
      if (error) throw error;

      // Make creator an admin member
      await supabase.from("community_members").insert({
        community_id: data.id,
        user_id: me,
        role: "admin",
        status: "member",
      });

      router.replace(`/communities/${data.id}`);
    } catch (e: any) {
      alert(e.message || "Create failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-wrap">
      <div className="page" style={{ background: "linear-gradient(#fff8e0,#fff)" }}>
        <div className="container-app">
          <div className="header-bar">
            <h1 className="page-title">Start a community</h1>
            <div className="controls">
              <NextLink href="/communities" className="btn">Back</NextLink>
            </div>
          </div>

          <section className="card p-3">
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
                <select className="input" value={visibility} onChange={(e) => setVisibility(e.target.value as Visibility)}>
                  <option value="public">Public (anyone can join)</option>
                  <option value="private">Private (request to join)</option>
                </select>
              </label>

              <CommunityPhotoUploader
                value={cover}
                onChange={setCover}
                userId={me}
                label="Cover photo (optional)"
              />

              <label className="field">
                <span className="label">About</span>
                <textarea className="input" rows={5} value={about} onChange={(e) => setAbout(e.target.value)} />
              </label>

              <div className="right">
                <button className="btn btn-brand" onClick={create} disabled={saving}>
                  {saving ? "Creating…" : "Create community"}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
