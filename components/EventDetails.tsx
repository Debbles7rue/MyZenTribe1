"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Visibility = "public" | "friends" | "private" | "community";
type Status = "scheduled" | "cancelled";

type DBEvent = {
  id: string;
  title: string | null;
  description: string | null;
  start_time: string | null;
  end_time: string | null;
  visibility: Visibility;
  created_by: string;
  location: string | null;
  image_path: string | null;
  source?: "personal" | "business" | null;
  status?: Status | null;
  cancellation_reason?: string | null;
};

function safeDate(d?: string | null): Date | null {
  if (!d) return null;
  const x = new Date(d);
  return isNaN(x.getTime()) ? null : x;
}
function formatWhen(startRaw?: string | null, endRaw?: string | null) {
  const s = safeDate(startRaw);
  const e = safeDate(endRaw);
  try {
    if (s && e) return `${s.toLocaleString()} – ${e.toLocaleTimeString()}`;
    if (s) return s.toLocaleString();
    return "Time TBA";
  } catch {
    return "Time TBA";
  }
}

export default function EventDetails({
  event,
  onClose,
}: {
  event: DBEvent | null;
  onClose: () => void;
}) {
  if (!event) return null;

  const [me, setMe] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  const when = useMemo(
    () => formatWhen(event.start_time, event.end_time),
    [event.start_time, event.end_time]
  );
  const isOwner = !!me && event.created_by === me;
  const isCancelled = (event.status ?? "scheduled") === "cancelled";

  const mapUrl = event.location
    ? `https://www.google.com/maps/search/${encodeURIComponent(event.location)}`
    : null;

  async function cancelEvent() {
    if (!isOwner) return;
    const reason = window.prompt("Cancel this event? Optional reason:") || null;
    const { error } = await supabase
      .from("events")
      .update({ status: "cancelled", cancellation_reason: reason } as any)
      .eq("id", event.id);
    if (error) return alert(error.message);
    onClose(); // close, refresh will pick it up
  }

  async function reinstateEvent() {
    if (!isOwner) return;
    const { error } = await supabase
      .from("events")
      .update({ status: "scheduled", cancellation_reason: null } as any)
      .eq("id", event.id);
    if (error) return alert(error.message);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div
        className="absolute left-1/2 top-1/2 w-[min(720px,92vw)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="max-h-[80vh] overflow-auto">
          <img
            src={event.image_path || "/event-placeholder.jpg"}
            alt={event.title || ""}
            style={{
              width: "100%",
              height: "170px",
              objectFit: "cover",
              display: "block",
              borderBottom: "1px solid #eee",
              filter: isCancelled ? "grayscale(0.6)" : undefined,
              opacity: isCancelled ? 0.8 : 1,
            }}
            loading="lazy"
          />

          <div className="space-y-5 p-6">
            <div className="flex items-start justify-between gap-3">
              <h2
                className={`text-xl font-semibold ${
                  isCancelled ? "line-through text-neutral-500" : ""
                }`}
              >
                {event.title || "Untitled event"}
              </h2>
              <button className="btn" onClick={onClose}>
                Close
              </button>
            </div>

            {isCancelled && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <div className="font-medium">This event is cancelled.</div>
                {event.cancellation_reason ? (
                  <div className="mt-1">{event.cancellation_reason}</div>
                ) : null}
              </div>
            )}

            <div className="card p-3">
              <div className={`text-sm ${isCancelled ? "text-neutral-500 line-through" : "text-neutral-700"}`}>
                {when}
              </div>
              {event.location ? (
                <div className="mt-2 text-sm">
                  <span className="font-medium">Location: </span>
                  {mapUrl ? (
                    <a className="underline" href={mapUrl} target="_blank" rel="noreferrer">
                      {event.location}
                    </a>
                  ) : (
                    event.location
                  )}
                </div>
              ) : null}
            </div>

            <div className="card p-3">
              <div className="mb-1 text-sm font-medium">Details</div>
              <div className={`whitespace-pre-wrap text-sm ${isCancelled ? "text-neutral-500" : "text-neutral-800"}`}>
                {event.description || "No description yet."}
              </div>
            </div>

            {isOwner && (
              <div className="flex items-center justify-end gap-2">
                {!isCancelled ? (
                  <button className="btn btn-danger" onClick={cancelEvent}>
                    Cancel event
                  </button>
                ) : (
                  <button className="btn btn-brand" onClick={reinstateEvent}>
                    Reinstate event
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
