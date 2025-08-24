// components/EventDetails.tsx
"use client";

import { Dialog } from "@headlessui/react";
import { format } from "date-fns";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

/** Types */
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
  event_type?: string | null;   // e.g. "meditation"
  invite_code?: string | null;
};

type Comment = {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
};

type Props = {
  event: DBEvent | null;
  onClose: () => void;
};

/* ---------- helpers (robust to bad/null dates) ---------- */
function toDate(x?: string | null) {
  if (!x) return null;
  const d = new Date(x);
  return isNaN(d.getTime()) ? null : d;
}
function safeFormat(d: Date | null, fmt: string) {
  if (!d) return "TBD";
  try { return format(d, fmt); } catch { return "TBD"; }
}
function safeRange(start: Date | null, end: Date | null) {
  if (!start && !end) return "Time: TBD";
  if (start && !end) return `${safeFormat(start, "EEE, MMM d · p")} – TBD`;
  if (!start && end) return `TBD – ${safeFormat(end, "p")}`;
  return `${safeFormat(start, "EEE, MMM d · p")} – ${safeFormat(end, "p")}`;
}

/** Only these event types show the Meditation link */
const MEDITATION_TYPES = new Set(["meditation", "group_meditation", "solo_meditation"]);

/* ------------------ Minimal Group Circle Chat ------------------ */
function CircleChat({
  eventId,
  open,
  onClose,
}: {
  eventId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<
    { id: string; user_id: string; content: string; created_at: string }[]
  >([]);
  const [text, setText] = useState("");
  const [me, setMe] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("circle_messages")
      .select("id,user_id,content,created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true })
      .limit(300);
    if (!error) setMessages(data ?? []);
  }, [eventId]);

  useEffect(() => {
    if (!open) return;
    load();
    const ch = supabase
      .channel(`circle_${eventId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "circle_messages", filter: `event_id=eq.${eventId}` },
        (payload) => {
          // @ts-ignore
          const row = payload.new as { id: string; user_id: string; content: string; created_at: string };
          setMessages((m) => [...m, row]);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [eventId, load, open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = async () => {
    if (!text.trim() || !me) return;
    const { error } = await supabase.from("circle_messages").insert({
      event_id: eventId,
      content: text.trim(),
      user_id: me, // align with your schema
    });
    if (!error) setText("");
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-[60]">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-end justify-center p-4 md:items-center">
        <Dialog.Panel className="h-[70vh] w-full max-w-2xl rounded-2xl bg-white p-4 shadow-lg dark:bg-zinc-900">
          <Dialog.Title className="mb-2 text-lg font-semibold">Group Circle</Dialog.Title>
          <div className="mb-3 h-[50vh] overflow-y-auto rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
            {messages.map((m) => (
              <div key={m.id} className="mb-2">
                <div className="text-[11px] opacity-60">
                  {new Date(m.created_at).toLocaleString()}
                </div>
                <div>{m.content}</div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              placeholder="Write a message…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
            />
            <button
              onClick={send}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Send
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

/* ------------------ Invite Drawer ------------------ */
type Selectable = { id: string; name: string };

function InviteDrawer({
  eventId,
  open,
  onClose,
}: {
  eventId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [communities, setCommunities] = useState<Selectable[]>([]);
  const [friends, setFriends] = useState<Selectable[]>([]);
  const [selectedCommunities, setSelectedCommunities] = useState<string[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [inviteAllFriends, setInviteAllFriends] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!open) return;

    // Communities the user belongs to (adjust to your schema)
    supabase
      .from("community_members")
      .select("community_id, communities(name)")
      .then(({ data, error }) => {
        if (error) return;
        setCommunities(
          (data ?? []).map((row: any) => ({
            id: row.community_id,
            name: row.communities?.name ?? "Community",
          }))
        );
      });

    // Friends (via a view you maintain)
    supabase
      .from("friends_view")
      .select("friend_id, friend_name")
      .then(({ data, error }) => {
        if (error) return;
        setFriends(
          (data ?? []).map((r: any) => ({ id: r.friend_id, name: r.friend_name ?? "Friend" }))
        );
      });
  }, [open]);

  const toggle = (setter: (ids: string[]) => void, ids: string[], id: string) => {
    setter(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  };

  const submitInvites = async () => {
    setWorking(true);
    try {
      const friendIds = inviteAllFriends ? friends.map((f) => f.id) : selectedFriends;
      const rows: any[] = [
        ...selectedCommunities.map((cid) => ({ event_id: eventId, invitee_community_id: cid })), // <- invitee_*
        ...friendIds.map((uid) => ({ event_id: eventId, invitee_user_id: uid })),               // <- invitee_*
      ];
      if (rows.length === 0) return;

      const { error } = await supabase.from("event_invites").insert(rows);
      if (error) throw error;
    } catch (e) {
      console.error(e);
    } finally {
      setWorking(false);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-[60]">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-end justify-center p-4 md:items-center">
        <Dialog.Panel className="w-full max-w-2xl rounded-2xl bg-white p-4 shadow-lg dark:bg-zinc-900">
          <Dialog.Title className="mb-2 text-lg font-semibold">Invite to Event</Dialog.Title>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-1 text-sm font-medium">Communities</div>
              <div className="max-h-56 overflow-y-auto rounded-lg border border-zinc-200 p-2 dark:border-zinc-800">
                {communities.length === 0 && (
                  <div className="text-sm opacity-60">No communities found.</div>
                )}
                {communities.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 py-1 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedCommunities.includes(c.id)}
                      onChange={() => toggle(setSelectedCommunities, selectedCommunities, c.id)}
                    />
                    <span>{c.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-sm font-medium">
                <span>Friends</span>
                <label className="flex items-center gap-2 text-xs font-normal">
                  <input
                    type="checkbox"
                    checked={inviteAllFriends}
                    onChange={(e) => setInviteAllFriends(e.target.checked)}
                  />
                  Invite all
                </label>
              </div>
              <div className="max-h-56 overflow-y-auto rounded-lg border border-zinc-200 p-2 dark:border-zinc-800">
                {friends.length === 0 && (
                  <div className="text-sm opacity-60">No friends found.</div>
                )}
                {!inviteAllFriends &&
                  friends.map((f) => (
                    <label key={f.id} className="flex items-center gap-2 py-1 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedFriends.includes(f.id)}
                        onChange={() => toggle(setSelectedFriends, selectedFriends, f.id)}
                      />
                      <span>{f.name}</span>
                    </label>
                  ))}
                {inviteAllFriends && (
                  <div className="text-sm opacity-70">
                    {friends.length} friend(s) will be invited.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
            >
              Cancel
            </button>
            <button
              onClick={submitInvites}
              disabled={working}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {working ? "Inviting…" : "Send Invites"}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

/* ------------------ Main EventDetails ------------------ */
export default function EventDetails({ event, onClose }: Props) {
  const [version] = useState("EventDetails v6");
  const open = !!event;

  // current user id
  const [me, setMe] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  // local event copy (so edits reflect immediately)
  const [evt, setEvt] = useState<DBEvent | null>(null);
  useEffect(() => {
    setEvt(event || null);
  }, [event?.id]);

  // attendee count (for "group" detection)
  const [attendeeCount, setAttendeeCount] = useState<number>(0);
  useEffect(() => {
    if (!event?.id) return;
    supabase
      .from("event_attendees")
      .select("*", { count: "exact", head: true })
      .eq("event_id", event.id)
      .then(({ count }) => setAttendeeCount(count ?? 0));
  }, [event?.id]);

  // comments
  const [comments, setComments] = useState<Comment[]>([]);
  const [newBody, setNewBody] = useState("");

  // editing state
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

  // If location isn’t already a URL, wrap it with a Google Maps search
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

  const typeKey = (evt.event_type || "").trim().toLowerCase();
  const showMeditationLink = MEDITATION_TYPES.has(typeKey);
  const isGroupSession = showMeditationLink && (attendeeCount > 1 || !!evt.invite_code);

  // Invite & chat toggles
  const [chatOpen, setChatOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <>
      <Dialog open={open} onClose={onClose} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-2xl overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl">
            {/* scrollable content */}
            <div style={{ maxHeight: "80vh", overflowY: "auto" }}>
              {/* Banner image */}
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
                {/* visible tag so we KNOW this file is live */}
                <div className="text-xs text-neutral-500">{version}</div>

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
                      Close ✨
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

                {/* Meditation & Group actions */}
                {showMeditationLink && (
                  <div className="card p-3">
                    <div className="mb-2 text-sm font-medium">Links</div>
                    <div className="flex flex-wrap gap-2">
                      <a className="btn btn-brand" href="/meditation" target="_blank" rel="noreferrer">
                        Open Meditation Room
                      </a>

                      {isGroupSession && (
                        <button
                          className="btn btn-neutral"
                          onClick={() => setChatOpen(true)}
                        >
                          Open Group Circle
                        </button>
                      )}

                      <button className="btn" onClick={() => setInviteOpen(true)}>
                        Invite…
                      </button>

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

                {/* Owner-only cancellations */}
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

      {evt?.id && (
        <>
          <CircleChat eventId={evt.id} open={chatOpen} onClose={() => setChatOpen(false)} />
          <InviteDrawer eventId={evt.id} open={inviteOpen} onClose={() => setInviteOpen(false)} />
        </>
      )}
    </>
  );
}
