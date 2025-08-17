"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// Lazy map picker so SSR never touches leaflet
import dynamic from "next/dynamic";
const PlacePicker = dynamic(() => import("@/components/PlacePicker"), { ssr: false });

type Props = {
  communityId: string;
  zip?: string | null;
  onClose: () => void;
  onSaved: () => void;
};

type Place = { lat: number; lng: number; label?: string } | null;

export default function AddCircleForm({ communityId, zip, onClose, onSaved }: Props) {
  const [name, setName] = useState("");
  const [place, setPlace] = useState<Place>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // prevent background scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  async function save() {
    if (!place) { setErr("Pick a spot on the map."); return; }
    setSaving(true);
    setErr(null);

    const { error } = await supabase.from("community_circles").insert({
      community_id: communityId,
      name: name || null,
      lat: place.lat,
      lng: place.lng,
      label: place.label || null,
    });

    setSaving(false);
    if (error) { setErr(error.message); return; }
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60]">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      {/* modal */}
      <div className="absolute left-1/2 top-1/2 w-[min(950px,95vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white shadow-2xl">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Add drum circle</h3>
        </div>

        <div className="p-4 space-y-3">
          <label className="block text-sm font-medium">Circle name (optional)</label>
          <input
            className="input w-full"
            placeholder="e.g., Wednesday sunset circle"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          {/* The picker map */}
          <div className="rounded-md overflow-hidden border">
            <PlacePicker
              initialQuery={zip || ""}
              value={place}
              onChange={setPlace}
              height={420}
            />
          </div>

          {err && <p className="text-sm text-red-600">{err}</p>}
        </div>

        <div className="p-4 flex gap-2 justify-end border-t">
          <button className="btn" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-brand" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save circle"}
          </button>
        </div>
      </div>
    </div>
  );
}

