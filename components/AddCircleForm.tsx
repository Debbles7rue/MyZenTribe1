// components/AddCircleForm.tsx
'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { LatLngLiteral } from 'leaflet';
import { supabase } from '@/lib/supabaseClient';

// Dynamically import the client map with SSR disabled
const LeafletClient = dynamic(() => import('./LeafletClient'), { ssr: false });

type Props = {
  communityId: string;
  zip?: string | null;
  onClose: () => void;
  onSaved?: () => void;
};

export default function AddCircleForm({ communityId, zip, onClose, onSaved }: Props) {
  const [name, setName] = useState('');
  const [picked, setPicked] = useState<LatLngLiteral | null>(null);
  const [saving, setSaving] = useState(false);

  // crude ZIP → center guess (fallback to USA center)
  const defaultCenter = useMemo<LatLngLiteral>(() => {
    if (zip && zip.startsWith('75')) return { lat: 33.11, lng: -96.11 }; // North TX-ish
    return { lat: 39.5, lng: -98.35 }; // CONUS center-ish
  }, [zip]);

  async function save() {
    if (!picked) return;
    setSaving(true);
    const { error } = await supabase.from('community_circles').insert({
      community_id: communityId,
      name: name || null,
      lat: picked.lat,
      lng: picked.lng,
    });
    setSaving(false);
    if (error) {
      alert(`Could not save: ${error.message}`);
      return;
    }
    onSaved?.();
    onClose();
  }

  return (
    <div className="card p-4" style={{ inlineSize: 'min(920px, 100%)' }}>
      <h3 className="h3 mb-3">Add drum circle</h3>
      <label className="label">Circle name (optional)</label>
      <input
        className="input mb-3"
        placeholder="e.g., Saturday Sunset Circle"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <LeafletClient
        center={picked ?? defaultCenter}
        marker={picked ?? null}
        height={420}
        onPick={(pt) => setPicked(pt)}
      />

      <div className="right mt-3 flex gap-2">
        <button className="btn" onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <button
          className="btn btn-brand"
          onClick={save}
          disabled={!picked || saving}
        >
          {saving ? 'Saving…' : 'Save circle'}
        </button>
      </div>
    </div>
  );
}
