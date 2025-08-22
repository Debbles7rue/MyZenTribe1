"use client";

import { Dialog } from "@headlessui/react";
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Visibility = "public" | "friends" | "private" | "community";
type Status = "scheduled" | "cancelled";

type DBEvent = {
  id: string;
  title: string | null;
  description: string | null;
  start_time: string | null;           // timestamptz in DB; allow null for safety
  end_time: string | null;
  visibility: Visibility;
  created_by: string;
  location: string | null;
  image_path: string | null;
  source?: "personal" | "business" | null;
  status?: Status | null;
  cancellation_reason?: string | null;
};

type Comment = {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
};

function safeDate(d?: string | null): Date | null {
  if (!d) return null;
  const x = new Date(d);
  return isNaN(x.getTime()) ? null : x;
}
function safeWhen(startRaw?: string | null, endRaw?: string | null): string {
  const s = safeDate(startRaw);
  const e = safeDate(endRaw);
  try {
    if (s && e) {
      return `${s.toLocaleString()} – ${e.toLocaleTimeString()}`;
    }
    if (s) return s.toLocaleString();
    return "Time TBA";
  } catch {
    return "Time TBA";
  }
}

/** ---------------- ErrorBoundary that also reveals what failed ---------------- */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; onClose: () => void; event?: DBEvent | null },
  { hasError: boolean; err?: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, err: undefined };
  }
  static getDerivedStateFromError(err: any) {
    return { hasError: true, err };
  }
  componentDidCatch(err: any) {
    console.error("EventDetails crash:", err);
  }
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <Dialog open={true} onClose={this.props.onClose} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-2xl overflow-hidden rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold">We hit a snag</h2>
            <p className="mt-2 text-sm text-neutral-700">
              The event couldn’t be displayed due to a data issue. Below is a debug view with the error and
              the event object so we can pinpoint it quickly.
            </p>

            <div className="mt-4 rounded-lg border bg-rose-50 p-3 text-rose-800">
              <div className="font-medium">Error</div>
              <pre className="mt-2 overflow-auto text-xs">
                {(this.state.err && (this.state.err.message || String(this.state.err))) || "Unknown error"}
              </pre>
            </div>

            <div className="mt-4 rounded-lg border bg-neutral-50 p-3">
              <div className="font-medium text-sm">Event data</div>
              <pre className="mt-2 max-h-64 overflow-auto text-xs">
                {JSON.stringify(this.props.event ?? {}, null, 2)}
              </pre>
            </div>

            <div className="mt-6 flex justify-end">
              <button className="btn" onClick={this.props.onClose}>Close</button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    );
  }
}

/** ------------------------------ Main component ------------------------------ */
function EventDetailsInner({
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

  // local copy so UI updates optimistically
  const [evt, setEvt] = useState<DBEvent | null>(null);
  useEffect(() => {
    setEvt(event ?? null);
  }, [event?.id, event]);

  // comments
  const [comments, setComments] = useState<Comment[]>([]);
  const [newBody, setNewBody] = useState("");

  // edit
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", location: "" });

  // bootstrap form + comments when event changes
  useEffect(() => {
    if (!event) return;
    setForm({
      title: event.title ?? "",
      description: event.description ?? "",
      location: event.location ?? "",
    });

    (async () => {
      const { data, error } = await supabase
        .from("event_comments")
        .select("id, body, created_at, user_id")
        .eq("event_id", event.id)
        .order("created_at", { ascending: true });

      if (!error) setComments(data || []);
    })();
  }, [event?.id]);

  if (!open || !evt) return null;

  const isOwner = !!me && evt.created_by === me;
  const isCancelled = (evt.status ?? "scheduled") === "cancelled";
  const when = useMemo(() => safeWhen(evt.start_time, evt.end_time), [evt.start_time, evt.end_time]);

  const mapUrl = evt.location
    ? `https://www.google.com/maps/search/${encodeURIComponent(evt.location)}`
    : null;

  async function postComment() {
    if (!me || !newBody.trim()) return;
    const { error } = await supabase.from("event_comments").insert({
      event_id: evt.id,
      user_id: me,
      body: newBody.trim(),
    } as any);
    if (error) {
      alert(error.message);
      return;
    }
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
      title: (form.title || "").trim() || "Untitled event",
      description: (form.description || "").trim() || null,
      location: (form.location || "").trim() || null,
    };
    const { error } = await supabase.from("events").update(payload).eq("id", evt.id);
    if (error) {
      alert(error.message);
      return;
    }
    setEvt((prev) => (prev ? ({ ...prev, ...payload } as DBEvent) : prev));
    setEditing(false);
  }

  async function cancelEvent() {
    if (!isOwner) return;
    const reason = window.prompt("Cancel this event? Optional: add a reason") || null;
    const { error } = await supabase
      .from("events")
      .update({ status: "cancelled", cancellation_reason: reason } as any)
      .eq("id", evt.id);
    if (error) {
      alert(error.message);
      return;
    }
    setEvt((prev) =>
      prev ? ({ ...prev, status: "cancelled", cancellation_reason: reason } as DBEvent) : prev
    );
  }

  async function reinstateEvent() {
    if (!isOwner) return;
    const { error } = await supabase
      .from("events")
      .update({ status: "scheduled", cancellation_reason: null } as any)
      .eq("id", evt.id);
    if (error) {
      alert(error.message);
      return;
    }
    setEvt((prev) =>
      prev ? ({ ...prev, status: "scheduled", cancellation_reason: null } as DBEvent) : prev
    );
  }

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-2xl overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl">
          <div style={{ maxHeight: "80vh", overflowY: "auto" }}>
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
                  className={`text-xl font-semibold ${isCancelled ? "line-through text-neutral-500" : ""}`}
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
                  <button className="btn" onClick={onClose}>Close</button>
                </div>
              </div>

              {isCancelled && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <div className="font-medium">This event is cancelled.</div>
                  {evt.cancellation_reason ? <div className="mt-1">{evt.cancellation_reason}</div> : null}
                </div>
              )}

              <div className="card p-3">
                <div className={`text-sm ${isCancelled ? "text-neutral-500 line-through" : "text-neutral-700"}`}>
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
                  <div className={`whitespace-pre-wrap text-sm ${isCancelled ? "text-neutral-500" : "text-neutral-800"}`}>
                    {evt.description || "No description yet."}
                  </div>
                )}
                {editing && (
                  <div className="mt-3 flex justify-end">
                    <button className="btn btn-brand" onClick={saveEdits}>Save changes</button>
                  </div>
                )}
              </div>

              {isOwner && (
                <div className="flex items-center justify-end gap-2">
                  {!isCancelled ? (
                    <button className="btn btn-danger" onClick={cancelEvent}>Cancel event</button>
                  ) : (
                    <button className="btn btn-brand" onClick={reinstateEvent}>Reinstate event</button>
                  )}
                </div>
              )}

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
                          {(safeDate(c.created_at)?.toLocaleString()) || "—"}
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
                  <button className="btn btn-brand" onClick={postComment}>Post</button>
                </div>
              </div>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

export default function EventDetails(props: { event: DBEvent | null; onClose: () => void }) {
  return (
    <ErrorBoundary onClose={props.onClose} event={props.event}>
      <EventDetailsInner {...props} />
    </ErrorBoundary>
  );
}
