// components/community/AddPinModal.tsx
"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";

type CommunityLite = { id: string; title: string; category: string | null; zip: string | null };

const AddCircleForm = dynamic(() => import("@/components/AddCircleForm"), {
  ssr: false, // form uses PlacePicker/Leaflet; avoid SSR
});

export default function AddPinModal({
  communities,
  onClose,
  onSaved,
}: {
  communities: CommunityLite[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string>(communities[0]?.id || "");

  const selected = useMemo(
    () => communities.find((c) => c.id === selectedId) || null,
    [communities, selectedId]
  );

  return (
    <div className="modal-backdrop">
      <div className="modal-sheet" style={{ maxWidth: 980 }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="h3">Add a pin to the map</h3>
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>

        {/* Choose which community this pin belongs to */}
        <div className="field">
          <div className="label">Community</div>
          <select
            className="input"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {communities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} {c.category ? `· ${c.category}` : ""}{" "}
                {c.zip ? `· ${c.zip}` : ""}
              </option>
            ))}
          </select>
          <div className="muted" style={{ fontSize: 12 }}>
            Your pin will be shown under this community and on the global map.
          </div>
        </div>

        {/* The questionnaire + map picker */}
        {selected && (
          <AddCircleForm
            communityId={selected.id}
            zip={selected.zip}
            onClose={onClose}
            onSaved={onSaved}
          />
        )}
      </div>
    </div>
  );
}
