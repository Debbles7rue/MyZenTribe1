// components/EventDetails.tsx
"use client";

import { Dialog } from "@headlessui/react";
import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/** Types kept local (safe even if your app types evolve) */
type Visibility = "public" | "friends" | "private" | "community";
type Status = "scheduled" | "cancelled";

export type DBEvent = {
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
  event_type?: string | null;   // "meditation" etc.
  invite_code?: string | null;  // used by your group invite page
};

type Comment = { id: string; body: string; created_at: string; user_id: string };
type Friend = { friend_id: string; name: string };

/* ---------------- helpers ---------------- */
function d(iso?: string | null) {
  if (!iso) return null;
  const x = new Date(iso);
  return isNaN(x.getTime()) ? null : x;
}
function fmt(date: Date | null, f: string) {
  if (!date) return "TBD";
  try {
    return format(date, f);
  } catch {
    return "TBD";
  }
}
function range(start: Date | null, end: Date | null) {
  if (!start && !end) return "Time: TBD";
  if (start && !end) return `${fmt(start, "EEE, MMM d · p")} – TBD`;
  if (!start && end) return `TBD – ${fmt(end, "p")}`;
  return `${fmt(start, "EEE, MMM d · p")} – ${fmt(end, "p")}`;
}
const isMeditationType = (t?: string | null) =>
  Boolean((t || "").toLowerCase().includes("meditation"));

/* ---------------- component ---------------- */
export default function EventDetails({
  event,
  onClose,
}: {
  event: DBEvent | null;
  onClose: () => void;
}) {
  const open = !!event;

  const [me, setMe] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  const [evt, setEvt] = useState<DBEvent | null>(null);
  useEffect(() => {
    setEvt(event || null);
  }, [event?.id]);

  const [isGoing, setIsGoing] = useState(false);
  const [isInterested, setIsInterested] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [newBody, setNewBody] = useState("");

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", location: "" });

  // Share UI
  const [shareOpen, setShareOpen] = useState(false);
  const [shareMode, setShareMode] = useState<"everyone" | "friends">("everyone");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendQuery, setFriendQuery] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);

  /* bootstrap on open */
  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!event || !me) return;

      const [att, int] = await Promise.all([
        supabase
          .from("event_attendees")
          .select("event_id")
          .eq("event_id", event.id)
          .eq("user_id", me)
          .maybeSingle(),
        supabase
          .from("event_interests")
          .select("event_id")
          .eq("event_id", event.id)
          .eq("user_id", me)
          .maybeSingle(),
      ]);
      if (!ignore) {
        setIsGoing(Boolean(att.data));
        setIsInterested(Boolean(int.data));
      }

      const cs = await supabase
        .from("event_comments")
        .select("id, body, created_at, user_id")
        .eq("event_id", event.id)
        .order("created_at", { ascending: true });
      if (!ignore) setComments(cs.data || []);

      // Share → friends list (via your friends_view)
      const fr = await supabase.from("friends_view").select("friend_id, friend_name");
      if (!ignore) {
        const items: Friend[] =
          (fr.data || []).map((r: any) => ({
            friend_id: r.friend_id,
            name: r.friend_name ?? "Friend",
          })) ?? [];
        setFriends(items);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [event?.id, me]);

  if (!open || !evt) return null;

  const start = d(evt.start_time);
  const end = d(evt.end_time);
  const when = useMemo(() => range(start, end), [evt.start_time, evt.end_time]);

  const isOwner = !!me && evt.created_by === me;
  const isCancelled = (evt.status ?? "scheduled") === "cancelled";
  const isPublic = (evt.visibility ?? "private") === "public";
  const meditation = isMeditationType(evt.event_type);

  const mapUrl =
    evt.location && /^https?:\/\//i.test(evt.location)
      ? evt.location
      : evt.location
      ? `https://www.google.com/maps/search/${encodeURIComponent(evt.location)}`
      : null;

  /* -------- actions -------- */
  async function postComment() {
    if (!me || !evt || !newBody.trim()) return;
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
    if (!evt) return;
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

  async function deleteEvent() {
    if (!evt || !isOwner) return;
    if (!confirm("Delete this event for everyone? This cannot be undone.")) return;
    const { error } = await supabase.from("events").delete().eq("id", evt.id);
    if (error) return alert(error.message);
    onClose();
  }

  async function cancelEvent() {
    if (!evt || !isOwner) return;
    const reason = window.prompt("Cancel this event? Optional: add a reason") || null;
    const { error } = await supabase
      .from("events")
      .update({ status: "cancelled", cancellation_reason: reason })
      .eq("id", evt.id);
    if (error) return alert(error.message);
    setEvt((prev) => (prev ? { ...prev, status: "cancelled", cancellation_reason: reason } : prev));
  }
  async function reinstateEvent() {
    if (!evt || !isOwner) return;
    const { error } = await supabase
      .from("events")
      .update({ status: "scheduled", cancellation_reason: null })
      .eq("id", evt.id);
    if (error) return alert(error.message);
    setEvt((prev) => (prev ? { ...prev, status: "scheduled", cancellation_reason: null } : prev));
  }

  async function rsvp() {
    if (!evt || !me) return;
    const { error } = await supabase.from("event_attendees").upsert({ event_id: evt.id, user_id: me });
    if (error) return alert(error.message);
    setIsGoing(true);
  }
  async function unRsvp() {
    if (!evt || !me) return;
    await supabase.from("event_attendees").delete().eq("event_id", evt.id).eq("user_id", me);
    setIsGoing(false);
  }

  async function markInterested() {
    if (!evt || !me) return;
    const { error } = await supabase.from("event_interests").upsert({ event_id: evt.id, user_id: me });
    if (error) return alert(error.message);
    setIsInterested(true);
  }
  async function clearInterested() {
    if (!evt || !me) return;
    await supabase.from("event_interests").delete().eq("event_id", evt.id).eq("user_id", me);
    setIsInterested(false);
  }

  async function removeFromMyCalendar() {
    if (!evt || !me) return;
    await supabase.from("event_attendees").delete().eq("event_id", evt.id).eq("user_id", me);
    await supabase.from("event_interests").delete().eq("event_id", evt.id).eq("user_id", me);
    onClose();
  }

  async function shareSubmit() {
    if (!evt) return;
    try {
      if (shareMode === "everyone") {
        if (evt.visibility !== "public") {
          const { error } = await supabase.from("events").update({ visibility: "public" }).eq("id", evt.id);
          if (error) throw error;
          setEvt((prev) => (prev ? { ...prev, visibility: "public" } : prev));
        }
        alert("Shared with everyone. It will appear in your friends’ What’s happening feed.");
      } else {
        if (!selectedFriends.length) return alert("Pick at least one friend.");
        const rows = selectedFriends.map((friend_id) => ({
          event_id: evt.id,
          invitee_user_id: friend_id,
          invited_by: me,
          status: "pending",
        }));
        const { error } = await supabase.from("event_invites").insert(rows as any);
        if (error) {
          // Fallback path if invites table isn't present
          await Promise.all(
            selectedFriends.map((uid) =>
              supabase.from("event_interests").upsert({ event_id: evt.id, user_id: uid })
            )
          );
        }
        alert("Invites sent.");
      }
      setShareOpen(false);
    } catch (e: any) {
      alert(e.message ?? "Share failed");
    }
  }

  /* -------- view -------- */
  return (
    <Dialog open={open} onClose={onClose} className="relative z-[999]">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-2xl overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl">
          {/* hero */}
          <img
            src={evt.image_path || "/event-placeholder.jpg"}
            alt={evt.title || ""}
            style={{
              width: "100%",
              height: 180,
              objectFit: "cover",
              display: "block",
              borderBottom: "1px solid #eee",
              filter: isCancelled ? "grayscale(0.6)" : undefined,
              opacity: isCancelled ? 0.85 : 1,
            }}
            loading="lazy"
          />

          <div style={{ maxHeight: "80vh", overflowY: "auto" }}>
            <div className="p-6 space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className={`text-2xl font-semibold leading-tight ${isCancelled ? "line-through text-neutral-500" : ""}`}>
                    {editing ? (
                      <input
                        className="input"
                        value={form.title}
                        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      />
                    ) : (
                      evt.title || "Untitled event"
                    )}
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="badge-wx">{evt.visibility === "public" ? "Public" : "Private"}</span>
                    {evt.source ? <span className="badge-wx capitalize">{evt.source}</span> : null}
                    {evt.event_type ? <span className="badge-wx capitalize">{evt.event_type}</span> : null}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {isOwner ? (
                    <>
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

                      <div className="relative">
                        <button className="btn" onClick={() => setShareOpen((s) => !s)}>
                          Share
                        </button>
                        {shareOpen && (
                          <div className="absolute right-0 z-[1000] mt-2 w-80 rounded-xl border border-neutral-200 bg-white p-3 shadow-lg">
                            <div className="mb-2 text-sm font-medium">Share this event</div>
                            <div className="mb-2 flex gap-2">
                              <button
                                className={`btn ${shareMode === "everyone" ? "btn-brand" : ""}`}
                                onClick={() => setShareMode("everyone")}
                              >
                                Everyone
                              </button>
                              <button
                                className={`btn ${shareMode === "friends" ? "btn-brand" : ""}`}
                                onClick={() => setShareMode("friends")}
                              >
                                Selected friends
                              </button>
                            </div>
                            {shareMode === "friends" && (
                              <>
                                <input
                                  className="input mb-2"
                                  placeholder="Search friends…"
                                  value={friendQuery}
                                  onChange={(e) => setFriendQuery(e.target.value)}
                                />
                                <div className="max-h-48 overflow-auto space-y-1">
                                  {friends
                                    .filter((f) =>
                                      f.name.toLowerCase().includes(friendQuery.toLowerCase())
                                    )
                                    .map((f) => (
                                      <label key={f.friend_id} className="flex items-center gap-2 text-sm">
                                        <input
                                          type="checkbox"
                                          checked={selectedFriends.includes(f.friend_id)}
                                          onChange={(e) =>
                                            setSelectedFriends((prev) =>
                                              e.target.checked
                                                ? [...prev, f.friend_id]
                                                : prev.filter((id) => id !== f.friend_id)
                                            )
                                          }
                                        />
                                        <span className="truncate">{f.name}</span>
                                      </label>
                                    ))}
                                  {friends.length === 0 && (
                                    <div className="text-xs text-neutral-500">No friends found.</div>
                                  )}
                                </div>
                              </>
                            )}
                            <div className="mt-3 flex justify-end gap-2">
                              <button className="btn" onClick={() => setShareOpen(false)}>
                                Cancel
                              </button>
                              <button className="btn btn-brand" onClick={shareSubmit}>
                                Send
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <button className="btn btn-danger" onClick={deleteEvent}>
                        Delete
                      </button>
                    </>
                  ) : (
                    <button className="btn" onClick={removeFromMyCalendar}>
                      Remove
                    </button>
                  )}
                  <button className="btn" onClick={onClose}>
                    Close ✨
                  </button>
                </div>
              </div>

              {/* When & Where */}
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

              {/* Details */}
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
                    <button className="btn btn-brand" onClick={saveEdits}>
                      Save changes
                    </button>
                  </div>
                )}
              </div>

              {/* Interactions (always shown for public; owners can still RSVP/Interested) */}
              {isPublic && (
                <div className="card p-3">
                  <div className="mb-2 text-sm font-medium">Interact</div>
                  <div className="flex flex-wrap gap-2">
                    {!isGoing ? (
                      <button className="btn btn-brand" onClick={rsvp}>
                        RSVP
                      </button>
                    ) : (
                      <button className="btn" onClick={unRsvp}>
                        I can’t go
                      </button>
                    )}
                    {!isInterested && !isGoing ? (
                      <button className="btn" onClick={markInterested}>
                        Interested
                      </button>
                    ) : isInterested && !isGoing ? (
                      <button className="btn" onClick={clearInterested}>
                        Not interested
                      </button>
                    ) : null}

                    {meditation && (
                      <>
                        <a className="btn" href="/meditation" target="_blank" rel="noreferrer">
                          Open Meditation Room
                        </a>
                        <a className="btn" href={`/circle/${evt.id}`} target="_blank" rel="noreferrer">
                          Open Group Circle
                        </a>
                        {evt.invite_code ? (
                          <a
                            className="btn"
                            href={`/meditation/schedule/group?code=${evt.invite_code}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Invite page
                          </a>
                        ) : null}
                      </>
                    )}

                    {isOwner ? (
                      !isCancelled ? (
                        <button className="btn btn-danger" onClick={cancelEvent}>
                          Cancel event
                        </button>
                      ) : (
                        <button className="btn btn-brand" onClick={reinstateEvent}>
                          Reinstate event
                        </button>
                      )
                    ) : null}
                  </div>
                </div>
              )}

              {/* Comments (public only) */}
              {isPublic && (
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
              )}
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
