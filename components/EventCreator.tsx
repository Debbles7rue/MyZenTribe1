"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AvatarUpload from "@/components/AvatarUpload";
import { insertEventForUser } from "@/lib/events";

export default function EventCreator({ userId }: { userId: string | null }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [imagePath, setImagePath] = useState<string>("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [saving, setSaving] = useState(false);

  async function save() {
    try {
      if (!userId) return alert("Please sign in.");
      if (!title || !start) return alert("Title and start time required.");

      setSaving(true);

      // 1) Create the event in whichever table/columns exist
      const { id } = await insertEventForUser({
        title: title.trim(),
        startISO: new Date(start).toISOString(),
        endISO: end ? new Date(end).toISOString() : new Date(start).toISOString(),
        visibility,
        location: null,
        notes: desc.trim() || null,
      });

      // 2) Best-effort attach optional fields to whichever table exists
      //    (ignore errors silently if a column/table doesn't exist)
      const updates = { image_path: imagePath || null, description: desc.trim() || null };
      await supabase.from("events").update(updates as any).eq("id", id);
      await supabase.from("calendar_events").update(updates as any).eq("id", id);

      setTitle("");
      setDesc("");
      setStart("");
      setEnd("");
      setImagePath("");
      setVisibility("private");
      alert("Event created! It’ll appear in the correct calendar view.");
    } catch (e: any) {
      alert(e?.message || "Could not create event.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card p-3">
      <h2 className="section-title">Create event</h2>
      <div className="stack">
        <div style={{ marginBottom: 8 }}>
          <AvatarUpload
            userId={userId}
            value={imagePath}
            onChange={setImagePath}
            bucket="event-photos"
            label="Upload event photo"
          />
        </div>

        <label className="field">
          <span className="label">Title</span>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Sound Bath at the Park"
          />
        </label>

        <label className="field">
          <span className="label">Description</span>
          <textarea
            className="input"
            rows={3}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="label">Starts</span>
          <input
            type="datetime-local"
            className="input"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="label">Ends (optional)</span>
          <input
            type="datetime-local"
            className="input"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="label">Visibility</span>
          <select
            className="input"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as "private" | "public")}
          >
            <option value="private">Private (My Calendar only)</option>
            <option value="public">Public (What’s Happening)</option>
          </select>
        </label>

        <div className="right">
          <button className="btn btn-brand" onClick={save} disabled={saving}>
            {saving ? "Publishing…" : "Publish event"}
          </button>
        </div>
      </div>
    </section>
  );
}
