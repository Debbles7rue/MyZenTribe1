// components/WhatsHappeningDeck.tsx
"use client";

import React, { useMemo, useRef, useState } from "react";
import type { DBEvent } from "@/lib/types";

export default function WhatsHappeningDeck({
  items,
  onDismiss,
  onAdd,
  onOpen,
}: {
  items: DBEvent[];
  onDismiss: (id: string) => void;
  onAdd: (e: DBEvent) => void;
  onOpen: (e: DBEvent) => void;
}) {
  const [index, setIndex] = useState(0);
  const current = items[index];

  const next = () => setIndex((i) => Math.min(i + 1, items.length - 1));

  const onSkip = () => {
    if (!current) return;
    onDismiss(current.id);
    next();
  };

  const onAddClick = () => {
    if (!current) return;
    onAdd(current);
    next();
  };

  // simple touch swipe
  const startX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const sx = startX.current;
    startX.current = null;
    if (sx == null) return;
    const dx = e.changedTouches[0].clientX - sx;
    if (dx > 60) onAddClick();
    else if (dx < -60) onSkip();
  };

  if (!current) {
    return (
      <div className="card p-3">
        <div className="text-sm text-neutral-600">No more suggestions right now.</div>
      </div>
    );
  }

  const start = current.start_time ? new Date(current.start_time) : null;
  const when = start ? start.toLocaleString() : "TBD";

  return (
    <div
      className="deck-card card p-3"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      role="region"
      aria-label="Suggested events"
    >
      <div className="text-xs text-neutral-500 mb-1">
        What’s happening • {index + 1} / {items.length}
      </div>
      <div className="font-semibold text-lg mb-1 truncate">{current.title || "Event"}</div>
      <div className="text-sm text-neutral-600 mb-2">{when}</div>

      <div className="flex gap-2">
        <button className="btn" onClick={onSkip} aria-label="Not interested">
          Skip
        </button>
        <button className="btn btn-brand" onClick={onAddClick} aria-label="Add to my calendar">
          Add
        </button>
        <button className="btn" onClick={() => onOpen(current)}>
          Details
        </button>
      </div>
    </div>
  );
}
