"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@headlessui/react";
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
  event_type: string | null;
};

type Props = {
  event: DBEvent | null;
  onClose: () => void;
};

type RsvpStatus = "yes" | "maybe" | "interested" | "no";

export default function EventDetails({ event, onClose }: Props) {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<RsvpStatus | null>(null);
  const [shareable, setShareable] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // load session
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  // fetch existing RSVP for this event
  useEffect(() => {
    const load = async () => {
      if (!event || !userId) return;
      const { data, error } = await supabase
        .from("event_rsvps")
        .select("status, shareable")
        .eq("event_id", event.id)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) return; // ignore; likely none yet
      if (data) {
        setStatus((data.status as RsvpStatus) ?? null);
        setShareable(!!data.shareable);
      } else {
        setStatus(null);
        setShareable(false);
      }
    };
    load();
  }, [event, userId]);

  if (!event) return null;

  const saveRsvp = async (newStatus: RsvpStatus) => {
    if (!userId) {
      setError("Please log in to RSVP.");
      return;
    }
    setLoading(true);
    setError(null);

    // upsert my RSVP for this event
    const { error } = await supabase
      .from("event_rsvps")
      .upsert(
        {
          event_id: event.id,
          user_id: userId,
          status: newStatus,
          shareable,
        },
        { onConflict: "event_id,user_id" }
      );

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setStatus(newStatus);
      // Let the parent calendar refetch if it wants — or we keep it optimistic
    }
  };

  const toggleShareable = async (checked: boolean) => {
    setShareable(checked);
    if (!userId) return;

    // ensure a row exists; if not create as 'interested' by default
    const { data } = await supabase
      .from("event_rsvps")
      .select("status")
      .eq("event_id", event.id)
      .eq("user_id", userId)
      .maybeSingle();

    const currentStatus: RsvpStatus = (data?.status as RsvpStatus) || "interested";

    await supabase
      .from("event_rsvps")
      .upsert(
        {
          event_id: event.id,
          user_id: userId,
          status: currentStatus,
          shareable: checked,
        },
        { onConflict: "event_id,user_id" }
      );
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <Dialog open={!!event} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-lg">
          <Dialog.Title className="text-lg font-semibold">{event.title}</Dialog.Title>
          <p className="text-sm text-neutral-600 mt-1">
            {fmt(event.start_time)} – {fmt(event.end_time)}
          </p>
          {event.location && <p className="text-sm mt-1">📍 {event.location}</p>}
          {event.event_type && <p className="text-xs mt-1 text-neutral-500">Type: {event.event_type}</p>}
          {event.description && <p className="text-sm mt-3">{event.description}</p>}

          <div className="mt-5">
            <p className="text-sm font-medium mb-2">RSVP</p>
            <div className="flex flex-wrap gap-2">
              <button
                className={`btn ${status === "yes" ? "btn-brand" : "btn-neutral"}`}
                onClick={() => saveRsvp("yes")}
                disabled={loading}
              >
                Going
              </button>
              <button
                className={`btn ${status === "maybe" ? "btn-brand" : "btn-neutral"}`}
                onClick={() => saveRsvp("maybe")}
                disabled={loading}
              >
                Maybe
              </button>
              <button
                className={`btn ${status === "interested" ? "btn-brand" : "btn-neutral"}`}
                onClick={() => saveRsvp("interested")}
                disabled={loading}
              >
                Interested
              </button>
              <button
                className={`btn ${status === "no" ? "btn-brand" : "btn-neutral"}`}
                onClick={() => saveRsvp("no")}
                disabled={loading}
              >
                Not going
              </button>
            </div>

            <label className="mt-4 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={shareable}
                onChange={(e) => toggleShareable(e.target.checked)}
              />
              Share with friends (let this show in their “What’s happening”)
            </label>

            {error && <p className="text-sm text-rose-600 mt-3">{error}</p>}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button className="btn btn-neutral" onClick={onClose}>
              Close
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
