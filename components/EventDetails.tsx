"use client";

import { Dialog } from "@headlessui/react";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabaseClient";
import AvatarUpload from "@/components/AvatarUpload";

type Visibility = "public" | "friends" | "private" | "community";

export type DBEvent = {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  visibility: Visibility;
  created_by: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  rrule: string | null;
  event_type: string | null;
  rsvp_public: boolean | null;
  community_id: string | null;
  created_at: string;
  image_path: string | null;
  source?: "personal" | "business";
  location_requires_rsvp?: boolean | null;
};

type RSVPStatus = "yes" | "no" | "maybe" | "interested" | null;

type Props = {
  event: DBEvent | null;
  onClose: () => void;
};

export default function EventDetails({ event, onClose }: Props) {
  const [me, setMe] = useState<string | null>(null);
  const [data, setData] = useState<DBEvent | null>(event);
  const [rsvp, setRsvp] = useState<RSVPStatus>(null);
  const [comments, setComments] = useState<
    { id: string; body: string; user_id: string; created_at: string }[]
  >([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);

  // Editable form
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    start: "",
    end: "",
    event_type: "",
    visibility: "public" as Visibility,
    image_path: "",
    location_requires_rsvp: false,
  });

  // Open/close sync
  useEffect(() => {
    setData(event);
  }, [event]);

  // Who am I?
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  const canEdit = useMemo(
    () => !!me && !!data && data.created_by === me,
    [me, data]
  );

  // Load RSVP + comments
  useEffect(() => {
    if (!data) return;

    const load = async () => {
      // RSVP
      if (me) {
        const { data: r } = await supabase
          .from("event_rsvps")
          .select("status")
          .eq("event_id", data.id)
          .eq("user_id", me)
          .maybeSingle();
        setRsvp((r?.status as RSVPStatus) ?? null);
      }

      // Comments
      const { data: c } = await supabase
        .from("event_comments")
        .select("id,body,user_id,created_at")
        .eq("event_id", data.id)
        .order("created_at", { ascending: true });
      setComments(c || []);
    };
    load();

    // live updates
    const ch = supabase
      .channel("event-comments")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "event_comments", filter: `event_id=eq.${data.id}` },
        (payload) => {
          setComments((prev) => [...prev, payload.new as any]);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [data, me]);

  // Enter edit mode prefilled
  const startEdit = () => {
    if (!data) return;
    setForm({
      title: data.title,
      description: data.description ?? "",
      location: data.location ?? "",
      start: toLocal(data.start_time),
      end: toLocal(data.end_time),
      event_type: data.event_type ?? "",
      visibility: data.visibility,
      image_path: data.image_path ?? "",
      location_requires_rsvp: !!data.location_requires_rsvp,
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!data) return;
    setLoading(true);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      location: form.location.trim() || null,
      start_time: new Date(form.start),
      end_time: new Date(form.end),
      event_type: form.event_type.trim() || null,
      visibility: form.visibility,
      image_path: form.image_path || null,
      location_requires_rsvp: form.location_requires_rsvp,
    };
    const { error } = await supabase.from("events").update(payload).eq("id", data.id);
    setLoading(false);
    if (error) return alert(error.message);

    setData({ ...data, ...payload, start_time: (payload as any).start_time.toISOString(), end_time: (payload as any).end_time.toISOString() });
    setEditing(false);
  };

  const doRSVP = async (status: Exclude<RSVPStatus, null>) => {
    if (!me || !data) return alert("Please sign in.");
    setLoading(true);
    const { error } = await supabase
      .from("event_rsvps")
      .upsert({ event_id: data.id, user_id: me, status }, { onConflict: "event_id,user_id" });
    setLoading(false);
    if (error) return alert(error.message);
    setRsvp(status);
  };

  const addComment = async () => {
    if (!me || !data) return alert("Please sign in.");
    const body = newComment.trim();
    if (!body) return;
    setLoading(true);
    const { error } = await supabase.from("event_comments").insert({
      event_id: data.id,
      user_id: me,
      body,
    });
    setLoading(false);
    if (error) return alert(error.message);
    setNewComment("");
  };

  if (!data) return null;

  const start = new Date(data.start_time);
  const end = new Date(data.end_time);
  const when =
    format(start, "EEE, MMM d, p") + " – " +
    format(end, start.toDateString() === end.toDateString() ? "p" : "EEE, MMM d, p");

  const showAddress =
    !!data.location &&
    (!data.location_requires_rsvp ||
      data.visibility !== "public" ||
      (rsvp && rsvp !== "no"));

  const mapsHref = data.latitude && data.longitude
    ? `https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`
    : data.location
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.location)}`
      : "#";

  return (
    <Dialog open={!!data} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-3xl rounded-2xl border border-neutral-200 bg-white p-0 shadow-xl overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold">
              {editing ? "Edit event" : data.title}
            </Dialog.Title>
            <div className="flex gap-2">
              {!editing && canEdit && (
                <button className="btn" onClick={startEdit}>Edit</button>
              )}
              <button className="btn btn-neutral" onClick={onClose}>Close</button>
            </div>
          </div>

          {/* Body */}
          {!editing ? (
            <div className="p-5 grid gap-5 md:grid-cols-3">
              {/* Left: image */}
              <div className="md:col-span-1">
                {data.image_path ? (
                  <img
                    src={data.image_path}
                    alt="Event"
                    className="w-full aspect-[4/3] object-cover rounded-xl border"
                  />
                ) : (
                  <div className="w-full aspect-[4/3] rounded-xl border bg-neutral-50 grid place-items-center text-sm text-neutral-500">
                    No photo yet
                  </div>
                )}

                {/* Share */}
                <div className="mt-3 flex gap-2">
                  <button
                    className="btn"
                    onClick={() => {
                      const url = typeof window !== "undefined" ? window.location.href : "";
                      navigator.clipboard.writeText(url);
                      alert("Link copied!");
                    }}
                  >
                    Copy link
                  </button>
                  <a
                    className="btn"
                    target="_blank"
                    rel="noreferrer"
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(location.href)}`}
                  >
                    Share FB
                  </a>
                  <a
                    className="btn"
                    target="_blank"
                    rel="noreferrer"
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(data.title)}&url=${encodeURIComponent(location.href)}`}
                  >
                    Share X
                  </a>
                </div>
              </div>

              {/* Right: details */}
              <div className="md:col-span-2">
                <div className="mb-2 text-sm text-neutral-600">{when}</div>

                {data.event_type && (
                  <div className="mb-3">
                    <span className="px-2 py-1 rounded-full border text-xs bg-white">
                      {data.event_type}
                    </span>
                  </div>
                )}

                {/* Location block */}
                <div className="mb-3">
                  <div className="font-medium">Location</div>
                  {showAddress ? (
                    <div className="mt-1 text-sm">
                      <div>{data.location}</div>
                      <a className="linkish" href={mapsHref} target="_blank" rel="noreferrer">
                        Open in Maps
                      </a>
                    </div>
                  ) : (
                    <div className="mt-1 text-sm text-neutral-600">
                      Address is shown after RSVP for public events.
                    </div>
                  )}
                </div>

                {/* Description */}
                {data.description && (
                  <div className="mb-3">
                    <div className="font-medium">About</div>
                    <p className="mt-1 whitespace-pre-line text-sm">{data.description}</p>
                  </div>
                )}

                {/* RSVP */}
                <div className="mb-4">
                  <div className="font-medium">RSVP</div>
                  <div className="mt-2 flex flex-wrap gap-8 items-center">
                    <div className="segmented">
                      {(["yes","maybe","interested","no"] as RSVPStatus[]).map((s) => (
                        <button
                          key={s}
                          className={`seg-btn ${rsvp === s ? "active" : ""}`}
                          onClick={() => doRSVP(s as Exclude<RSVPStatus,null>)}
                          disabled={loading}
                        >
                          {labelFor(s!)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Comments */}
                <div className="border rounded-xl p-3">
                  <div className="font-medium mb-2">Comments</div>
                  <div className="space-y-3 max-h-56 overflow-auto">
                    {comments.length === 0 && (
                      <div className="text-sm text-neutral-500">No comments yet.</div>
                    )}
                    {comments.map((c) => (
                      <div key={c.id} className="text-sm">
                        <div className="text-neutral-500">
                          {format(new Date(c.created_at), "MMM d, p")}
                        </div>
                        <div>{c.body}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <input
                      className="input"
                      placeholder="Write a comment…"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                    />
                    <button className="btn btn-brand" onClick={addComment} disabled={loading}>
                      Post
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // EDIT MODE
            <div className="p-5 grid gap-3 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className="text-sm">Title</span>
                <input
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </label>

              <div className="md:col-span-2">
                <span className="text-sm">Event photo</span>
                <div className="mt-2">
                  <AvatarUpload
                    userId={me}
                    value={form.image_path}
                    onChange={(url) => setForm({ ...form, image_path: url })}
                    bucket="event-photos"
                    label="Upload event photo"
                  />
                </div>
              </div>

              <label className="block">
                <span className="text-sm">Start</span>
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2"
                  value={form.start}
                  onChange={(e) => setForm({ ...form, start: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-sm">End</span>
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2"
                  value={form.end}
                  onChange={(e) => setForm({ ...form, end: e.target.value })}
                />
              </label>

              <label className="block">
                <span className="text-sm">Location</span>
                <input
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </label>

              <label className="block">
                <span className="text-sm">Type (tag)</span>
                <input
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2"
                  value={form.event_type}
                  onChange={(e) => setForm({ ...form, event_type: e.target.value })}
                  placeholder="Coffee, Yoga, etc."
                />
              </label>

              <label className="block">
                <span className="text-sm">Visibility</span>
                <select
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2"
                  value={form.visibility}
                  onChange={(e) =>
                    setForm({ ...form, visibility: e.target.value as Visibility })
                  }
                >
                  <option value="public">Public</option>
                  <option value="friends">Friends & acquaintances</option>
                  <option value="private">Private (invite only)</option>
                  <option value="community">Community</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm">Address privacy</span>
                <div className="check mt-1">
                  <input
                    type="checkbox"
                    checked={form.location_requires_rsvp}
                    onChange={(e) => setForm({ ...form, location_requires_rsvp: e.target.checked })}
                  />
                  <span>Only show the address after someone RSVPs (public events)</span>
                </div>
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm">Description</span>
                <textarea
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2"
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </label>

              <div className="md:col-span-2 flex justify-end gap-2 mt-1">
                <button className="btn btn-neutral" onClick={() => setEditing(false)}>
                  Cancel
                </button>
                <button className="btn btn-brand" onClick={saveEdit} disabled={loading}>
                  Save changes
                </button>
              </div>
            </div>
          )}
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

/* ---------------- helpers ---------------- */
function toLocal(iso: string) {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}
function labelFor(s: Exclude<RSVPStatus, null>) {
  if (s === "yes") return "Going";
  if (s === "maybe") return "Maybe";
  if (s === "interested") return "Interested";
  return "Not going";
}
