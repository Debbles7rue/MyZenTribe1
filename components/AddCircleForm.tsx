"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import PlacePicker from "@/components/PlacePicker";

type Place = { lat: number; lng: number; label?: string } | null;

export default function AddCircleForm({
  communityId,
  onSaved,
  onCancel,
  zip,
}: {
  communityId: string;
  zip?: string | null;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState("");
  const [meets, setMeets] = useState("");
  const [place, setPlace] = useState<Place>(null);
  const [saving, setSaving] = useState(false);
  const canSave = place && (title.trim().length > 0 || true);

  async function save() {
    if (!place) return;
    setSaving(true);
    try {
      const payload = {
        community_id: communityId,
        title: title?.trim() || null,
        meets: meets?.trim() || null,
        place_label: place?.label || null,
        lat: place!.lat,
        lng: place!.lng,
      };

      const { error } = await supabase
        .from("community_circles")
        .insert(payload);
      if (error) throw error;
      onSaved?.();
    } catch (e: any) {
      alert(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="stack" style={{ padding: 10 }}>
      <label className="field">
        <span className="label">Circle name (optional)</span>
        <input
          className="input"
          placeholder="e.g., Friday Sunset Drum Jam"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>

      <label className="field">
        <span className="label">When do you meet? (optional)</span>
        <input
          className="input"
          placeholder="e.g., 1st & 3rd Fridays, 7–9pm"
          value={meets}
          onChange={(e) => setMeets(e.target.value)}
        />
      </label>

      <div>
        <div className="label" style={{ marginBottom: 6 }}>
          Location (search or click the map)
        </div>
        <PlacePicker
          value={place}
          onChange={setPlace}
          initialQuery={zip || ""}
          height={320}
        />
      </div>

      <div className="right" style={{ display: "flex", gap: 8 }}>
        <button className="btn" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button
          className="btn btn-brand"
          onClick={save}
          disabled={!canSave || saving}
        >
          {saving ? "Saving…" : "Save circle"}
        </button>
      </div>
    </div>
  );
}
