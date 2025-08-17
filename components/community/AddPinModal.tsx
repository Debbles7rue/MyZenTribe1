"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const backdropRef = useRef<HTMLDivElement | null>(null);

  // Default to first community if any
  useEffect(() => {
    if (!selectedId && communities.length > 0) setSelectedId(communities[0].id);
  }, [communities, selectedId]);

  // Lock background scroll & close on ESC
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const selected = useMemo(
    () => communities.find((c) => c.id === selectedId) || null,
    [communities, selectedId]
  );

  const modal = (
    <div
      ref={backdropRef}
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        // click outside sheet closes
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div className="modal-sheet" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="h3">Add a pin to the map</h3>
          <button className="btn" onClick={onClose} aria-label="Close">Close</button>
        </div>

        {communities.length === 0 ? (
          <div className="card p-4">
            <p className="mb-2">You don’t have any communities yet.</p>
            <div className="flex gap-2">
              <Link href="/communities/new" className="btn btn-brand">Start a community</Link>
              <button className="btn" onClick={onClose}>Cancel</button>
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
                    {c.title} {c.category ? `· ${c.category}` : ""} {c.zip ? `· ${c.zip}` : ""}
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

  // Render above everything else
  return createPortal(modal, document.body);
}
