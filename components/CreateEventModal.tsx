// components/CreateEventModal.tsx
"use client";

import React from "react";
import { Dialog } from "@headlessui/react";

// Keep it local so we don't depend on other type files
type Visibility = "public" | "friends" | "private" | "community";

type FormValue = {
  title: string;
  description: string;
  location: string;
  start: string; // ISO string (yyyy-MM-ddTHH:mm)
  end: string;   // ISO string (yyyy-MM-ddTHH:mm)
  visibility: Visibility;
  event_type: string;
  community_id: string;
  source: "personal" | "business";
  image_path: string; // public URL
};

type Props = {
  open: boolean;
  onClose: () => void;
  sessionUser: string | null; // kept for API parity, not used here
  value: FormValue;
  onChange: (patch: Partial<FormValue>) => void;
  onSave: () => void;
};

export default function CreateEventModal({
  open,
  onClose,
  sessionUser,
  value,
  onChange,
  onSave,
}: Props) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      {/* dim background */}
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      {/* centered panel */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-2xl rounded-2xl border border-neutral-200 bg-white p-6 shadow-lg">
          <div className="section-row mb-3">
            <Dialog.Title className="text-lg font-semibold">
              Create event
            </Dialog.Title>
            <button className="btn" onClick={onClose}>
              Close
            </button>
          </div>

          <div className="form-grid">
            {/* Title (full width) */}
            <label className="field span-2">
              <span className="label">Title</span>
              <input
                className="input"
                value={value.title}
                onChange={(e) => onChange({ title: e.target.value })}
                placeholder="Sound Bath at the Park"
              />
            </label>

            {/* Image URL (simple + safe) */}
            <label className="field span-2">
              <span className="label">Image URL (optional)</span>
              <input
                className="input"
                value={value.image_path}
                onChange={(e) => onChange({ image_path: e.target.value })}
                placeholder="https://example.com/photo.jpg"
              />
            </label>

            {/* Source / Type */}
            <label className="field">
              <span className="label">Type</span>
              <select
                className="select"
                value={value.source}
                onChange={(e) =>
                  onChange({ source: e.target.value as "personal" | "business" })
                }
              >
                <option value="personal">Personal</option>
                <option value="business">Business</option>
              </select>
            </label>

            {/* Location */}
            <label className="field">
              <span className="label">Location</span>
              <input
                className="input"
                value={value.location}
                onChange={(e) => onChange({ location: e.target.value })}
                placeholder="Greenville, TX"
              />
            </label>

            {/* Tag */}
            <label className="field">
              <span className="label">Type (tag)</span>
              <input
                className="input"
                value={value.event_type}
                onChange={(e) => onChange({ event_type: e.target.value })}
                placeholder="Coffee, Yoga, Drum circle…"
              />
            </label>

            {/* Start / End */}
            <label className="field">
              <span className="label">Start</span>
              <input
                type="datetime-local"
                className="input"
                value={value.start}
                onChange={(e) => onChange({ start: e.target.value })}
              />
            </label>

            <label className="field">
              <span className="label">End</span>
              <input
                type="datetime-local"
                className="input"
                value={value.end}
                onChange={(e) => onChange({ end: e.target.value })}
              />
            </label>

            {/* Description (full width) */}
            <label className="field span-2">
              <span className="label">Description</span>
              <textarea
                className="input"
                rows={4}
                value={value.description}
                onChange={(e) => onChange({ description: e.target.value })}
                placeholder="Share details attendees should know…"
              />
            </label>

            {/* Visibility */}
            <label className="field">
              <span className="label">Visibility</span>
              <select
                className="select"
                value={value.visibility}
                onChange={(e) =>
                  onChange({ visibility: e.target.value as Visibility })
                }
              >
                <option value="public">Public</option>
                <option value="friends">Friends & acquaintances</option>
                <option value="private">Private (invite only)</option>
                <option value="community">Community</option>
              </select>
            </label>

            {/* Community */}
            <label className="field">
              <span className="label">Community (optional)</span>
              <input
                className="input"
                value={value.community_id}
                onChange={(e) => onChange({ community_id: e.target.value })}
                placeholder="Community UUID (picker later)"
              />
            </label>
          </div>

          <div className="modal-footer mt-4 flex justify-end gap-3">
            <button className="btn btn-neutral" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-brand" onClick={onSave}>
              Save
            </button>
          </div>

          <p className="muted mt-2" style={{ fontSize: 12 }}>
            Tip: In Month view, click a day to zoom into it. Drag events to
            reschedule. Resize edges to change duration.
          </p>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
