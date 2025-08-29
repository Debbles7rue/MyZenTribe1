"use client";

import { Dialog } from "@headlessui/react";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { insertEventForUser } from "@/lib/events";

export default function EventQuickCreate({
  open,
  onClose,
  defaults,
  sessionUser,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  defaults?: { start?: Date; end?: Date };
  sessionUser: string | null;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    image_path: "",
    location: "",
    location_visibility: "public" as "public" | "attendees",
    visibility: "private" as "private" | "public",
    start: "",
    end: "",
    allDay: false,
  });

  const toLocalInput = (d: Date) =>
    new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  const toLocalDate = (d: Date) => d.toISOString().slice(0, 10);

  useEffect(() => {
    if (!open) return;
    const now = new Date();
    const start = defaults?.start ?? now;
    const end = defaults?.end ?? new Date(now.getTime() + 60 * 60 * 1000);
    setForm((f) => ({
      ...f,
      title: "",
      description: "",
      image_path: "",
      location: "",
      location_visibility: "public",
      visibility: "private",
      allDay: false,
      start: toLocalInput(start),
      end: toLocalInput(end),
    }));
  }, [open, defaults?.start?.getTime(), defaults?.end?.getTime()]);

  const create = async () => {
    try {
      if (!sessionUser) return alert("Please log in.");
      if (!form.title) return alert("Title is required.");

      let start: Date, end: Date;
      if (form.allDay) {
        const sd = new Date(form.start + "T00:00");
        const ed = new Date(form.end + "T23:59");
        start = sd;
        end = ed;
      } else {
        start = new Date(form.start);
        end = new Date(form.end);
      }

      // 1) Create (owner-aware, schema-agnostic)
      const { id } = await insertEventForUser({
        title: form.title,
        startISO: start.toISOString(),
        endISO: end.toISOString(),
        visibility: form.visibility,
        location: form.location || null,
        notes: form.description || null,
      });

      // 2) Best-effort attach optional fields (ignore if table/cols differ)
      const updates: Record<string, any> = {
        image_path: form.image_path || null,
        description: form.description || null,
        location: form.location || null,
        location_visibility: form.location_visibility,
      };
      await supabase.from("events").update(updates).eq("id", id);
      await supabase.from("calendar_events").update(updates).eq("id", id);

      onCreated();
      onClose();
    } catch (e: any) {
      alert(e?.message || "Could not create event.");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-[55]">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-end justify-center p-4 md:items-center">
        <Dialog.Panel className="w-full max-w-2xl rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl">
          <Dialog.Title className="text-lg font-semibold">Create event</Dialog.Title>

          <div className="modal-body mt-3">
            <div className="field">
              <label className="label">Title</label>
              <input
                className="input"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g., Dinner at Grandma’s"
              />
            </div>

            <div className="mt-3">
              <label className="check">
                <input
                  type="checkbox"
                  checked={form.allDay}
                  onChange={(e) => setForm((f) => ({ ...f, allDay: e.target.checked }))}
                />{" "}
                All-day / multi-day
              </label>
            </div>

            {!form.allDay ? (
              <div className="form-grid mt-3">
                <div className="field">
                  <label className="label">Start</label>
                  <input
                    className="input"
                    type="datetime-local"
                    value={form.start}
                    onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label className="label">End</label>
                  <input
                    className="input"
                    type="datetime-local"
                    value={form.end}
                    onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))}
                  />
                </div>
              </div>
            ) : (
              <div className="form-grid mt-3">
                <div className="field">
                  <label className="label">Start date</label>
                  <input
                    className="input"
                    type="date"
                    value={form.start.slice(0, 10) || toLocalDate(new Date())}
                    onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label className="label">End date</label>
                  <input
                    className="input"
                    type="date"
                    value={form.end.slice(0, 10) || toLocalDate(new Date())}
                    onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))}
                  />
                </div>
              </div>
            )}

            <div className="form-grid mt-3">
              <div className="field">
                <label className="label">Visibility</label>
                <select
                  className="select"
                  value={form.visibility}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, visibility: e.target.value as any }))
                  }
                >
                  <option value="private">Private</option>
                  <option value="public">Public</option>
                </select>
              </div>

              <div className="field">
                <label className="label">Image URL (optional)</label>
                <input
                  className="input"
                  value={form.image_path}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, image_path: e.target.value }))
                  }
                  placeholder="https://…"
                />
              </div>
            </div>

            <div className="field mt-3">
              <label className="label">Location</label>
              <input
                className="input"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="Address or place"
              />
              <div className="mt-2 text-sm">
                <label className="mr-3">
                  <input
                    type="radio"
                    name="locvis"
                    checked={form.location_visibility === "public"}
                    onChange={() =>
                      setForm((f) => ({ ...f, location_visibility: "public" }))
                    }
                  />{" "}
                  Public location
                </label>
                <label>
                  <input
                    type="radio"
                    name="locvis"
                    checked={form.location_visibility === "attendees"}
                    onChange={() =>
                      setForm((f) => ({ ...f, location_visibility: "attendees" }))
                    }
                  />{" "}
                  Show to RSVP’d attendees only
                </label>
              </div>
            </div>

            <div className="field mt-3">
              <label className="label">Details</label>
              <textarea
                className="input"
                rows={4}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Anything attendees should know…"
              />
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-brand" onClick={create}>
              Create
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
