// components/EventDetails.tsx
"use client";

import React from "react";
import type { DBEvent } from "@/lib/types";

/**
 * Minimal, SAFE modal for viewing event details.
 * No hooks at all (prevents hook-order issues when toggling).
 * Add richer actions later without introducing conditional hooks.
 */
export default function EventDetails({
  event,
  onClose,
}: {
  event: DBEvent | null;
  onClose: () => void;
}) {
  if (!event) return null; // no hooks above, so this is safe

  const start = new Date((event as any).start_time);
  const end = new Date((event as any).end_time);

  return (
    <div className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="text-lg font-semibold truncate">
            {(event as any).title || "Event"}
          </h3>
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm bg-neutral-100 hover:bg-neutral-200"
          >
            Close
          </button>
        </div>

        {(event as any).image_path ? (
          <div className="w-full h-48 bg-neutral-100 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={(event as any).image_path as any}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        ) : null}

        <div className="px-5 py-4 space-y-3">
          <div className="text-sm text-neutral-700">
            <div>
              <span className="font-medium">When: </span>
              {start.toLocaleString()} — {end.toLocaleString()}
            </div>
            {(event as any).location ? (
              <div>
                <span className="font-medium">Location: </span>
                {(event as any).location}
              </div>
            ) : null}
            {(event as any).visibility ? (
              <div>
                <span className="font-medium">Visibility: </span>
                {(event as any).visibility}
              </div>
            ) : null}
          </div>

          {(event as any).description ? (
            <div className="text-sm whitespace-pre-wrap">
              {(event as any).description}
            </div>
          ) : null}
        </div>

        <div className="px-5 py-4 border-t flex flex-wrap gap-2 justify-end">
          {/* Placeholder actions – wire up later if needed */}
          {/* <button className="btn">Interested</button>
          <button className="btn">RSVP</button>
          <button className="btn">Share</button> */}
          <button
            onClick={onClose}
            className="btn btn-brand"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
