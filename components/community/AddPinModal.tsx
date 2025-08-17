// components/community/AddPinModal.tsx
"use client";

import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
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
  const backdropRef = useRef<HTMLDivElement | null>(null);

  // lock background scroll & close on ESC
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const modal = (
    <div
      ref={backdropRef}
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div className="modal-sheet" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 780 }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="h3">Add a pin to the map</h3>
          <button className="btn" onClick={onClose}>Close</button>
        </div>

        <AddCircleForm
          communities={communities}
          preselectCommunityIds={[]}  // “No community” by default; selectable per service
          zip={null}
          onClose={onClose}
          onSaved={onSaved}
        />
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
