// components/EventDetails.tsx
"use client";

import { Dialog } from "@headlessui/react";
import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/** Types (kept broad to match your table) */
type Visibility = "public" | "friends" | "private" | "community";
type Status = "scheduled" | "cancelled";

type DBEvent = {
  id: string;
  title: string;
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
  event_type?: string | null;   // e.g. "meditation", "group_meditation", etc.
  invite_code?: string | null;  // optional, for private/group invite links
};

type Comment = {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
};

/** Helpers: robust date handling so bad/null values don't crash UI */
function toDate(x?: string | null) {
  if (!x) return null;
  const d = new Date(x);
  return isNaN(d.getTime()) ? null : d;
}
function safeFormat(d: Date | null, fmt: string) {
  if (!d) return "TBD";
  try {
    return format(d, fmt);
  } catch {
    return "TBD";
  }
}
function safeRange(start: Date | null, end: Date | null) {
  if (!start && !end) return "Time: TBD";
  if (start && !end) return `${safeFormat(start, "EEE, MMM d · p")} – TBD`;
  if (!start && end) return `TBD – ${safeFormat(end, "p")}`;
  return `${safeFormat(start, "EEE, MMM d · p")} – ${safeFormat(end, "p")}`;
}

/** Only these event types should show the Meditation link */
const MEDITATION_TYPES = new Set(["meditation", "group_meditation", "solo_meditation"]);

export default function EventDetails({
  event,
  onClose,
}: {
  event: DBEvent | null;
  onClose: () => void;
}) {
  const open = !!event;

  // current user id
  const [me, setMe] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  // local copy of the event so UI can update immediately after edits
  const [evt, setEvt] = useState<DBEvent | null>(null);
  useEffect(() => {
    setEvt(event || null);
  }, [event?.id]);

  // comments
  const [comments, setComments] = useState<Comment[]>([]);
  const [newBody, setNewBody] = useState("");

  // editing state
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", location: "" });

  // bootstrap form + comments whenever a new event is opened
  useEffect(() => {
    if (!event) return;
    setForm({
      title: event.title ?? "",
      description: event.description ?? "",
      location: event.location ?? "",
    });
    (async () => {
      const { data } = await supabase
        .from("event_comments")
        .select("id, body, created_at, user_id")
        .eq("event_id", event.id)
        .order("created_at", { ascending: true });
      setComments(data || []);
    })();
  }, [event?.id]);

  if (!open || !evt) return null;

  const isOwner = !!me && evt.created_by === me;
  const isCancelled = (evt.status ?? "scheduled") === "cancelled";

  const start = toDate(evt.start_time);
  const end = toDate(evt.end_time);
  const when = useMemo(() => safeRange(start, end), [evt.start_time, evt.end_time]);

  // Turn a plain-text location into a Google Maps search link (if it's not already a URL)
  const mapUrl =
    evt.location && /^https?:\/\//i.test(evt.location)
      ? evt.location
      : evt.location
      ? `https://www.google.com/maps/search/${encodeURIComponent(evt.location)}`
      : null;

  async function postComment() {
    if (!me || !newBody.trim()) return;
    const { error } = await supabase.from("event_comments").insert({
      event_id: evt.id,
      user_id: me,
      body: newBody.trim(),
    });
    if (error) return alert(error.message);
    setNewBody("");
    const { data } = await supabase
      .from("event_comments")
      .select("id, body, created_at, user_id")
      .eq("event_id", evt.id)
      .order("created_at", { ascending: true });
    setComments(data || []);
  }

  async function saveEdits() {
    const payload = {
      title: form.title.trim() || "Untitled event",
      description: form.description.trim() || null,
      location: form.location.trim() || null,
    };
    const { error } = await supabase.from("events").update(payload).eq("id", evt.id);
    if (error) return alert(error.message);
    setEvt((prev) => (prev ? { ...prev, ...payload } : prev));
    setEditing(false);
  }

  async function cancelEvent() {
    if (!isOwner) return;
    const reason = window.prompt("Cancel this event? Optional: add a reason") || null;
    const { error } = await supabase
      .from("events")
      .update({ status: "cancelled", cancellation_reason: reason })
      .eq("id", evt.id);
    if (error) return alert(error.message);
    setEvt((prev) => (prev ? { ...prev, status: "cancelled", cancellation_reason: reason } : prev));
  }

  async function reinstateEvent() {
    if (!isOwner) return;
    const { error } = await supabase
      .from("events")
      .update({ status: "scheduled", cancellation_reason: null })
      .eq("id", evt.id);
    if (error) return alert(error.message);
    setEvt((prev) => (prev ? { ...prev, status: "scheduled", cancellation_reason: null } : prev));
  }

  // Only show meditation link if event_type is one of the allowed values
  const typeKey = (evt.event_type || "").trim().toLowerCase();
  const showMeditationLink = MEDITATION_TYPES.has(typeKey);

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-2xl overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl">
          {/* scrollable content */}
          <div style={{ maxHeight: "80vh", overflowY: "auto" }}>
            {/* Banner image (capped height) */}
            <img
              src={evt.image_path || "/event-placeholder.jpg"}
              alt={evt.title || ""}
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
                <Dialog.Title
                  className={`text-xl font-semibold ${
                    isCancelled ? "line-through text-neutral-500" : ""
                  }`}
                >
                  {editing ? (
                    <input
                      className="input"
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    />
                  ) : (
                    evt.title || "Untitled event"
                  )}
                </Dialog.Title>

                <div className="flex gap-2">
                  {isOwner && (
                    <button
                      className="btn btn-neutral"
                      onClick={() =>
                        setEditing((v) => {
                          if (!v) {
                            setForm({
                              title: evt.title ?? "",
                              description: evt.description ?? "",
                              location: evt.location ?? "",
                            });
                          }
                          return !v;
                        })
                      }
                    >
                      {editing ? "Done" : "Edit"}
                    </button>
                  )}
                  <button className="btn" onClick={onClose}>
                    Close
                  </button>
                </div>
              </div>

              {/* Cancelled notice */}
              {isCancelled && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <div className="font-medium">This event is cancelled.</div>
                  {evt.cancellation_reason ? (
                    <div className="mt-1">{evt.cancellation_reason}</div>
                  ) : null}
                </div>
              )}

              {/* When & where */}
              <div className="card p-3">
                <div
                  className={`text-sm ${
                    isCancelled ? "text-neutral-500 line-through" : "text-neutral-700"
                  }`}
                >
                  {when}
                </div>
                {editing ? (
                  <div className="mt-2">
                    <label className="mb-1 block text-sm">Location</label>
                    <input
                      className="input"
                      value={form.location}
                      onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                      placeholder="Address or place"
                    />
                  </div>
                ) : evt.location ? (
                  <div className="mt-2 text-sm">
                    <span className="font-medium">Location: </span>
                    {mapUrl ? (
                      <a className="underline" href={mapUrl} target="_blank" rel="noreferrer">
                        {evt.location}
                      </a>
                    ) : (
                      evt.location
                    )}
                  </div>
                ) : null}
              </div>

              {/* Description */}
              <div className="card p-3">
                <div className="mb-1 text-sm font-medium">Details</div>
                {editing ? (
                  <textarea
                    className="input"
                    rows={4}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Share details attendees should know…"
                  />
                ) : (
                  <div
                    className={`whitespace-pre-wrap text-sm ${
                      isCancelled ? "text-neutral-500" : "text-neutral-800"
                    }`}
                  >
                    {evt.description || "No description yet."}
                  </div>
                )}
                {editing && (
                  <div className="mt-3 flex justify-end">
                    <button className="btn btn-brand" onClick={saveEdits}>
                      Save changes
                    </button>
                  </div>
                )}
              </div>

              {/* Links (only for meditation types) */}
              {showMeditationLink && (
                <div className="card p-3">
                  <div className="mb-2 text-sm font-medium">Links</div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      className="btn btn-brand"
                      href="/meditation"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open Meditation Room
                    </a>
                    {evt.invite_code ? (
                      <a
                        className="btn"
                        href={`/meditation/schedule/group?code=${evt.invite_code}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open invite page
                      </a>
                    ) : null}
                  </div>
                </div>
              )}

              {/* Owner-only actions: Cancel / Reinstate */}
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

              {/* Comments */}
              <div className="card p-3">
                <div className="mb-2 text-sm font-medium">Comments</div>
                {comments.length === 0 ? (
                  <div className="text-sm text-neutral-500">No comments yet.</div>
                ) : (
                  <ul className="space-y-2">
                    {comments.map((c) => (
                      <li key={c.id} className="text-sm">
                        <div className="whitespace-pre-wrap text-neutral-800">{c.body}</div>
                        <div className="text-xs text-neutral-500">
                          {new Date(c.created_at).toLocaleString()}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-3 flex gap-2">
                  <input
                    className="input flex-1"
                    value={newBody}
                    onChange={(e) => setNewBody(e.target.value)}
                    placeholder="Write a comment…"
                  />
                  <button className="btn btn-brand" onClick={postComment}>
                    Post
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
