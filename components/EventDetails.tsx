"use client";

import { Dialog } from "@headlessui/react";
import { generateICS } from "../lib/ics";

export default function EventDetails({ event, onClose }: any) {
  if (!event) return null;

  const handleICS = () => {
    const blob = generateICS({
      title: event.title,
      description: event.description,
      start: new Date(event.start_time),
      end: new Date(event.end_time),
      location: event.location,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event.title}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={!!event} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-lg max-w-md w-full p-6">
          <Dialog.Title className="text-xl font-semibold">{event.title}</Dialog.Title>
          <p className="text-sm text-gray-500 mt-1">
            {new Date(event.start_time).toLocaleString()} -{" "}
            {new Date(event.end_time).toLocaleString()}
          </p>
          {event.location && (
            <p className="mt-2 text-gray-700">📍 {event.location}</p>
          )}
          <p className="mt-4">{event.description}</p>
          <div className="mt-6 flex gap-3">
            <button onClick={handleICS} className="btn btn-neutral">
              Add to Calendar
            </button>
            <button onClick={onClose} className="btn btn-brand">
              Close
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
