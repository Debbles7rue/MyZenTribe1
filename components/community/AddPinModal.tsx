// components/community/AddPinModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AddCircleForm from "@/components/AddCircleForm";

type CommunityLite = {
  id: string;
  title: string;
  category: string | null;
  zip: string | null;
};

export default function AddPinModal({
  communities,
  onClose,
  onSaved,
}: {
  communities: CommunityLite[];
  onClose: () => void;
  onSaved: () => void;
}) {
  // empty string = "No specific community"
  const [selectedId, setSelectedId] = useState<string>("");

  // if you want to auto-select first community, comment this out now that it's optional
  useEffect(() => {
    // keep optional; don't auto-pick anything
  }, []);

  const selected = useMemo(
    () => communities.find((c) => c.id === selectedId) || null,
    [communities, selectedId]
  );

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-sheet" style={{ maxWidth: 720 }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="h3">Add a pin to the map</h3>
          <button className="btn" onClick={onClose} aria-label="Close">
            Close
          </button>
        </div>

        {/* Community (optional) */}
        <div className="field">
          <div className="label">Community (optional)</div>
          <select
            className="input"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            <option value="">No specific community</option>
            {communities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} {c.category ? `· ${c.category}` : ""}{" "}
                {c.zip ? `· ${c.zip}` : ""}
              </option>
            ))}
          </select>
          <div className="muted" style={{ fontSize: 12 }}>
            Pins without a community still appear on the global map and can be filtered by category.
          </div>
        </div>

        <AddCircleForm
          key={selectedId || "no-community"}
          communityId={selected ? selected.id : null}
          zip={selected?.zip || null}
          onClose={onClose}
          onSaved={onSaved}
        />
      </div>
    </div>
  );
}
