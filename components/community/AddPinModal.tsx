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
  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    if (!selectedId && communities.length > 0) setSelectedId(communities[0].id);
  }, [communities, selectedId]);

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

        {communities.length === 0 ? (
          <div className="card p-4">
            <p className="mb-2">You don’t have any communities yet.</p>
            <div className="flex gap-2">
              <Link href="/communities/new" className="btn btn-brand">
                Start a community
              </Link>
              <button className="btn" onClick={onClose}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
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

            {selected && (
              <AddCircleForm
                key={selected.id}
                communityId={selected.id}
                zip={selected.zip}
                onClose={onClose}
                onSaved={onSaved}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

