// components/WhatsHappeningDeck.tsx
"use client";

import React, { useRef, useState } from "react";
import type { DBEvent } from "@/lib/types";

export default function WhatsHappeningDeck({
  items,
  onDismiss,
  onAdd,
  onOpen,
}: {
  items: DBEvent[];
  onDismiss: (e: DBEvent) => void;
  onAdd: (e: DBEvent) => void;
  onOpen: (e: DBEvent) => void;
}) {
  return (
    <div className="deck-card card p-3">
      <div className="mb-2 text-sm font-medium">What’s happening (swipe: ← dismiss · → save)</div>
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((e) => (
          <DeckCard key={e.id} evt={e} onDismiss={onDismiss} onAdd={onAdd} onOpen={onOpen} />
        ))}
        {items.length === 0 && <div className="muted text-sm">No public events from your network.</div>}
      </div>
    </div>
  );
}

function DeckCard({
  evt,
  onDismiss,
  onAdd,
  onOpen,
}: {
  evt: DBEvent;
  onDismiss: (e: DBEvent) => void;
  onAdd: (e: DBEvent) => void;
  onOpen: (e: DBEvent) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [x, setX] = useState(0);
  const [drag, setDrag] = useState(false);
  const startX = useRef(0);

  const pointerDown = (e: React.PointerEvent) => {
    setDrag(true);
    startX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const pointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    setX(e.clientX - startX.current);
  };
  const pointerUp = () => {
    setDrag(false);
    if (x > 90) onAdd(evt);
    else if (x < -90) onDismiss(evt);
    setX(0);
  };

  return (
    <div
      ref={ref}
      className="relative select-none"
      style={{ touchAction: "pan-y" }}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={pointerUp}
    >
      <div
        className="rounded-xl border p-3 shadow-sm transition-transform"
        style={{ transform: `translateX(${x}px)` }}
      >
        <div className="text-sm font-semibold truncate mb-1">{evt.title || "Untitled"}</div>
        <div className="text-xs text-neutral-500 mb-2">
          {evt.start_time ? new Date(evt.start_time).toLocaleString() : "TBD"}
        </div>
        <div className="flex gap-2">
          <button className="btn" onClick={() => onDismiss(evt)}>Dismiss</button>
          <button className="btn btn-brand" onClick={() => onAdd(evt)}>Interested</button>
          <button className="btn" onClick={() => onOpen(evt)}>Open</button>
        </div>
      </div>
    </div>
  );
}
