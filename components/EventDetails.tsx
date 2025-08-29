// components/EventDetails.tsx
"use client";

import React from "react";
import type { DBEvent } from "@/lib/types";

// Safely read a date from any supported column name
function getDate(e: any, keys: string[]) {
  for (const k of keys) {
    if (e?.[k]) return new Date(e[k]);
  }
  return null;
}
function getField(e: any, keys: string[]) {
  for (const k of keys) {
    if (e?.[k] !== undefined && e?.[k] !== null) return e[k];
  }
  return null;
}

export default function EventDetails({
  event,
  onClose,
}: {
  event: DBEvent | null;
  onClose: () => void;
}) {
  if (!event) return null;

  const start =
    getDate(event, ["start_time", "start_at", "starts_at"]) || new Date();
  const end = getDate(event, ["end_time", "end_at", "ends_at"]) || start;
  const location = getField(event, ["location"]);
  const visibility =
    getField(event, ["visibility"]) ??
    (getField(event, ["is_public"]) ? "public" : "private");

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
            {location ? (
              <div>
                <span className="font-medium">Location: </span>
                {location}
              </div>
            ) : null}
            {visibility ? (
              <div>
                <span className="font-medium">Visibility: </span>
                {String(visibility)}
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
          <button onClick={onClose} className="btn btn-brand">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
