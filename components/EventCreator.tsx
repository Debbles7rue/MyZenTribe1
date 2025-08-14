"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AvatarUpload from "@/components/AvatarUpload";

export default function EventCreator({ userId }: { userId: string | null }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [imagePath, setImagePath] = useState<string>("");

  async function save() {
    if (!userId || !title || !start) return alert("Title and start time required.");
    const { error } = await supabase.from("events").insert({
      user_id: userId,
      title: title.trim(),
      description: desc.trim() || null,
      starts_at: new Date(start).toISOString(),
      ends_at: end ? new Date(end).toISOString() : null,
      is_public: true,
      image_path: imagePath || null
    });
    if (error) return alert(error.message);
    setTitle(""); setDesc(""); setStart(""); setEnd(""); setImagePath("");
    alert("Event created! It’ll appear on your calendar.");
  }

  return (
    <section className="card p-3">
      <h2 className="section-title">Create event</h2>
      <div className="stack">
        <div style={{ marginBottom: 8 }}>
          <AvatarUpload userId={userId} value={imagePath} onChange={setImagePath}
                        bucket="event-photos" label="Upload event photo"/>
        </div>

        <label className="field">
          <span className="label">Title</span>
          <input className="input" value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Sound Bath at the Park"/>
        </label>

        <label className="field">
          <span className="label">Description</span>
          <textarea className="input" rows={3} value={desc} onChange={(e)=>setDesc(e.target.value)} />
        </label>

        <label className="field">
          <span className="label">Starts</span>
          <input type="datetime-local" className="input" value={start} onChange={(e)=>setStart(e.target.value)}/>
        </label>
        <label className="field">
          <span className="label">Ends (optional)</span>
          <input type="datetime-local" className="input" value={end} onChange={(e)=>setEnd(e.target.value)}/>
        </label>

        <div className="right">
          <button className="btn btn-brand" onClick={save}>Publish event</button>
        </div>
      </div>
    </section>
  );
}
