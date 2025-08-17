"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ProfileLocationEditor() {
  const [text, setText] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("location_text, location_is_public, location") // legacy fallback
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setText((data.location_text ?? data.location) ?? "");
        setIsPublic(Boolean(data.location_is_public));
      }
    })();
  }, []);

  async function save() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // go through your /profile/save route for back-compat with legacy `location`
    await fetch("/profile/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location_text: text || null,
        location_is_public: isPublic,
      }),
    });
    setSaving(false);
    alert("Location saved");
  }

  return (
    <div className="stack" style={{ gap: 8 }}>
      <label className="block text-sm font-medium">Location</label>
      <input
        className="mt-1 w-full rounded-xl border px-3 py-2"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="City, State (e.g., Greenville, TX)"
      />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isPublic} onChange={(e)=>setIsPublic(e.target.checked)} />
        Show on my public profile
      </label>
      <button className="btn btn-neutral" onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save location"}
      </button>
    </div>
  );
}
