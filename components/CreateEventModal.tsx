"use client";
import React from "react";
import { Dialog } from "@headlessui/react";
import AvatarUpload from "@/components/AvatarUpload";
import type { Visibility } from "@/lib/types";

type Form = {
  title: string; description: string; location: string;
  start: string; end: string;
  visibility: Visibility;
  event_type: string; community_id: string;
  source: "personal" | "business";
  image_path: string;
};
type Props = {
  open: boolean;
  onClose: () => void;
  sessionUser: string | null;
  value: Form;
  onChange: (v: Partial<Form>) => void;
  onSave: () => void;
};

export default function CreateEventModal({ open, onClose, sessionUser, value, onChange, onSave }: Props) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-2xl rounded-2xl border border-neutral-200 bg-white p-6 shadow-lg">
          <div className="section-row">
            <Dialog.Title className="section-title">Create event</Dialog.Title>
            <button className="btn" onClick={onClose}>Close</button>
          </div>

          <div className="form-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <label className="field" style={{ gridColumn:"1 / span 2" }}>
              <span className="label">Title</span>
              <input className="input" value={value.title} onChange={e=>onChange({title:e.target.value})} placeholder="Sound Bath at the Park" />
            </label>

            <div style={{ gridColumn:"1 / span 2" }}>
              <span className="label">Event photo</span>
              <div style={{ marginTop:6 }}>
                <AvatarUpload
                  userId={sessionUser}
                  value={value.image_path}
                  onChange={(url)=>onChange({image_path:url})}
                  bucket="event-photos"
                  label="Upload event photo"
                />
              </div>
            </div>

            <label className="field">
              <span className="label">Type</span>
              <select className="select" value={value.source} onChange={e=>onChange({source:e.target.value as "personal"|"business"})}>
                <option value="personal">Personal</option>
                <option value="business">Business</option>
              </select>
            </label>

            <label className="field">
              <span className="label">Location</span>
              <input className="input" value={value.location} onChange={e=>onChange({location:e.target.value})} placeholder="Greenville, TX" />
            </label>

            <label className="field">
              <span className="label">Type (tag)</span>
              <input className="input" value={value.event_type} onChange={e=>onChange({event_type:e.target.value})} placeholder="Coffee, Yoga, Drum circle…" />
            </label>

            <label className="field">
              <span className="label">Start</span>
              <input type="datetime-local" className="input" value={value.start} onChange={e=>onChange({start:e.target.value})} />
            </label>

            <label className="field" >
              <span className="label">End</span>
              <input type="datetime-local" className="input" value={value.end} onChange={e=>onChange({end:e.target.value})} />
            </label>

            <label className="field" style={{ gridColumn:"1 / span 2" }}>
              <span className="label">Description</span>
              <textarea className="input" rows={4} value={value.description} onChange={e=>onChange({description:e.target.value})} placeholder="Share details attendees should know…" />
            </label>

            <label className="field">
              <span className="label">Visibility</span>
              <select className="select" value={value.visibility} onChange={e=>onChange({visibility:e.target.value as any})}>
                <option value="public">Public</option>
                <option value="friends">Friends & acquaintances</option>
                <option value="private">Private (invite only)</option>
                <option value="community">Community</option>
              </select>
            </label>

            <label className="field">
              <span className="label">Community (optional)</span>
              <input className="input" value={value.community_id} onChange={e=>onChange({community_id:e.target.value})} placeholder="Community UUID (picker later)" />
            </label>
          </div>

          <div className="modal-footer" style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:12 }}>
            <button className="btn btn-neutral" onClick={onClose}>Cancel</button>
            <button className="btn btn-brand" onClick={onSave}>Save</button>
          </div>

          <p className="muted mt-2" style={{ fontSize: 12 }}>
            Tip: In Month view, click a day to zoom into it. Drag events to reschedule. Resize edges to change duration.
          </p>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
