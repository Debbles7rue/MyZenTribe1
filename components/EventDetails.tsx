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

  // Optional extras if present in your row:
  invite_code?: string | null;    // for group meditation invites
  external_url?: string | null;   // for offsite event pages (drum circle, etc.)
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

// tiny inline styles so it always overlays
const S: Record<string, React.CSSProperties> = {
  overlay: { position: "fixed", inset: 0, zIndex: 9999 },
  scrim: { position: "absolute", inset: 0, background: "rgba(0,0,0,.35)" },
  panel: {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: "translate(-50%,-50%)",
    width: "min(720px, 92vw)",
    maxHeight: "80vh",
    overflowY: "auto",
    background: "#fff",
    borderRadius: 16,
    border: "1px solid #e5e5e5",
    boxShadow: "0 24px 60px rgba(0,0,0,.2)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "start",
    padding: "16px 16px 0 16px",
  },
  title: { fontSize: 22, fontWeight: 700, margin: 0 },
  body: { padding: 16 },
  card: {
    border: "1px solid #f1e8d6",
    background: "#fff7ee",
    borderRadius: 12,
    padding: 12,
  },
  row: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
  btn: {
    appearance: "none",
    border: "1px solid #dfd6c4",
    background: "linear-gradient(#fff,#f5efe6)",
    borderRadius: 12,
    padding: "8px 14px",
    fontWeight: 600,
    cursor: "pointer",
  },
  btnBrand: {
    appearance: "none",
    border: "1px solid #d8c49b",
    background: "linear-gradient(#ffe9be,#f7dca6)",
    borderRadius: 12,
    padding: "8px 14px",
    fontWeight: 700,
    color: "#221b0f",
    cursor: "pointer",
  },
  btnDanger: {
    appearance: "none",
    border: "1px solid #f1b4b4",
    background: "linear-gradient(#ffe5e5,#ffdada)",
    borderRadius: 12,
    padding: "8px 14px",
    fontWeight: 700,
    color: "#7a1b1b",
    cursor: "pointer",
  },
};

export default function EventDetails({
  event,
  onClose,
}: {
  event: DBEvent | null;
  onClose: () => void;
}) {
  if (!event) return null;

  // who am i?
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
    onClose();
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

  // destination links
  const inviteHref = event.invite_code
    ? `/meditation/schedule/group?code=${encodeURIComponent(event.invite_code)}`
    : null;
  const meditationHref = "/meditation";
  const externalHref = event.external_url || null;

  return (
    <div style={S.overlay} role="dialog" aria-modal="true">
      <div style={S.scrim} onClick={onClose} />
      <div style={S.panel}>
        {/* Banner */}
        <img
          src={event.image_path || "/event-placeholder.jpg"}
          alt={event.title || ""}
          style={{
            width: "100%",
            height: 170,
            objectFit: "cover",
            display: "block",
            borderBottom: "1px solid #eee",
            filter: isCancelled ? "grayscale(0.6)" : undefined,
            opacity: isCancelled ? 0.8 : 1,
          }}
          loading="lazy"
        />

        {/* Header */}
        <div style={S.header}>
          <h2
            style={{
              ...S.title,
              textDecoration: isCancelled ? "line-through" : undefined,
              color: isCancelled ? "#6b7280" : "#111827",
            }}
          >
            {event.title || "Untitled event"}
          </h2>
          <button style={S.btn} onClick={onClose}>
            Close
          </button>
        </div>

        <div style={S.body}>
          {/* cancelled notice */}
          {isCancelled && (
            <div
              style={{
                ...S.card,
                background: "#fff7e6",
                borderColor: "#f5d6a2",
                color: "#92400e",
                marginBottom: 8,
              }}
            >
              <div className="font-medium">This event is cancelled.</div>
              {event.cancellation_reason ? (
                <div className="mt-1">{event.cancellation_reason}</div>
              ) : null}
            </div>
          )}

          {/* When/Where */}
          <div style={{ ...S.card, marginBottom: 10 }}>
            <div
              style={{
                color: isCancelled ? "#6b7280" : "#374151",
                textDecoration: isCancelled ? "line-through" : undefined,
              }}
            >
              {when}
            </div>
            {event.location ? (
              <div style={{ marginTop: 6 }}>
                <span style={{ fontWeight: 600 }}>Location: </span>
                {mapUrl ? (
                  <a href={mapUrl} target="_blank" rel="noreferrer">
                    {event.location}
                  </a>
                ) : (
                  event.location
                )}
              </div>
            ) : null}
          </div>

          {/* Details */}
          <div style={{ ...S.card, marginBottom: 10 }}>
            <div style={{ marginBottom: 6, fontWeight: 600 }}>Details</div>
            <div
              style={{
                whiteSpace: "pre-wrap",
                color: isCancelled ? "#6b7280" : "#1f2937",
              }}
            >
              {event.description || "No description yet."}
            </div>
          </div>

          {/* Helpful Links */}
          <div style={{ ...S.card, marginBottom: 10 }}>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>Links</div>
            <div style={S.row}>
              <a href={meditationHref} style={S.btnBrand}>
                Open Meditation Room
              </a>
              {inviteHref && (
                <a href={inviteHref} style={S.btn}>
                  Open Invite Page
                </a>
              )}
              {externalHref && (
                <a href={externalHref} target="_blank" rel="noreferrer" style={S.btn}>
                  Open Event Site
                </a>
              )}
            </div>
          </div>

          {/* Owner-only actions */}
          {isOwner && (
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              {!isCancelled ? (
                <button style={S.btnDanger} onClick={cancelEvent}>
                  Cancel event
                </button>
              ) : (
                <button style={S.btnBrand} onClick={reinstateEvent}>
                  Reinstate event
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
