"use client";

import { Dialog } from "@headlessui/react";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Visibility = "public" | "friends" | "private" | "community";
type DBEvent = {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  visibility: Visibility;
  created_by: string;
  location: string | null;
  image_path: string | null;
  source?: "personal" | "business" | null;
};

type Comment = {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
};

export default function EventDetails({
  event,
  onClose,
}: {
  event: DBEvent | null;
  onClose: () => void;
}) {
  const open = !!event;
  const [me, setMe] = useState<string | null>(null);

  // comments
  const [comments, setComments] = useState<Comment[]>([]);
  const [newBody, setNewBody] = useState("");

  // edit
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!event) return;
    setForm({
      title: event.title ?? "",
      description: event.description ?? "",
      location: event.location ?? "",
    });
    // load comments
    (async () => {
      const { data } = await supabase
        .from("event_comments")
        .select("id, body, created_at, user_id")
        .eq("event_id", event.id)
        .order("created_at", { ascending: true });
      setComments(data || []);
    })();
  }, [event?.id]);

  if (!event) return null;

  const start = new Date(event.start_time);
  const end = new Date(event.end_time);
  const when =
    `${format(start, "EEE, MMM d · p")} – ${format(end, "p")}`.replace(
      "AM",
      "AM"
    );

  const mapUrl = event.location
    ? `https://www.google.com/maps/search/${encodeURIComponent(
        event.location
      )}`
    : null;

  async function postComment() {
    if (!me || !newBody.trim()) return;
    const { error } = await supabase.from("event_comments").insert({
      event_id: event.id,
      user_id: me,
      body: newBody.trim(),
    });
    if (error) return alert(error.message);
    setNewBody("");
    const { data } = await supabase
      .from("event_comments")
      .select("id, body, created_at, user_id")
      .eq("event_id", event.id)
      .order("created_at", { ascending: true });
    setComments(data || []);
  }

  async function saveEdits() {
    const { error } = await supabase
      .from("events")
      .update({
        title: form.title.trim(),
        description: form.description.trim() || null,
        location: form.location.trim() || null,
      })
      .eq("id", event.id);
    if (error) return alert(error.message);
    setEditing(false);
  }

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-2xl rounded-2xl border border-neutral-200 bg-white shadow-xl overflow-hidden">
          {/* scrollable content (inline styles to avoid relying on utilities) */}
          <div style={{ maxHeight: "80vh", overflowY: "auto" }}>
            {/* Small, tidy banner image */}
            <img
              src={event.image_path || "/event-placeholder.jpg"}
              alt={event.title || ""}
              style={{
                width: "100%",
                height: "170px",      // <= adjust if you want smaller/larger
                objectFit: "cover",
                display: "block",
                borderBottom: "1px solid #eee",
              }}
              loading="lazy"
            />

            <div className="p-6 space-y-5">
              <div className="flex items-start justify-between gap-3">
                <Dialog.Title className="text-xl font-semibold">
                  {editing ? (
                    <input
                      className="input"
                      value={form.title}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, title: e.target.value }))
                      }
                    />
                  ) : (
                    event.title || "Untitled event"
                  )}
                </Dialog.Title>

                <div className="flex gap-2">
                  <button
                    className="btn btn-neutral"
                    onClick={() =>
                      setEditing((v) => {
                        if (!v) {
                          setForm({
                            title: event.title ?? "",
                            description: event.description ?? "",
                            location: event.location ?? "",
                          });
                        }
                        return !v;
                      })
                    }
                  >
                    {editing ? "Done" : "Edit"}
                  </button>
                  <button className="btn" onClick={onClose}>
                    Close
                  </button>
                </div>
              </div>

              {/* When & where */}
              <div className="card p-3">
                <div className="text-sm text-neutral-700">{when}</div>
                {editing ? (
                  <div className="mt-2">
                    <label className="block text-sm mb-1">Location</label>
                    <input
                      className="input"
                      value={form.location}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, location: e.target.value }))
                      }
                      placeholder="Address or place"
                    />
                  </div>
                ) : event.location ? (
                  <div className="mt-2 text-sm">
                    <span className="font-medium">Location: </span>
                    {mapUrl ? (
                      <a
                        className="underline"
                        href={mapUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {event.location}
                      </a>
                    ) : (
                      event.location
                    )}
                  </div>
                ) : null}
              </div>

              {/* Description */}
              <div className="card p-3">
                <div className="text-sm mb-1 font-medium">Details</div>
                {editing ? (
                  <textarea
                    className="input"
                    rows={4}
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                    placeholder="Share details attendees should know…"
                  />
                ) : (
                  <div className="text-sm text-neutral-800 whitespace-pre-wrap">
                    {event.description || "No description yet."}
                  </div>
                )}
                {editing && (
                  <div className="flex justify-end mt-3">
                    <button className="btn btn-brand" onClick={saveEdits}>
                      Save changes
                    </button>
                  </div>
                )}
              </div>

              {/* Comments */}
              <div className="card p-3">
                <div className="text-sm mb-2 font-medium">Comments</div>
                {comments.length === 0 ? (
                  <div className="text-sm text-neutral-500">
                    No comments yet.
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {comments.map((c) => (
                      <li key={c.id} className="text-sm">
                        <div className="text-neutral-800 whitespace-pre-wrap">
                          {c.body}
                        </div>
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
