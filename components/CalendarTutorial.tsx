// components/CalendarTutorial.tsx
"use client";

import { Dialog } from "@headlessui/react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "mzt_calendar_tutorial_seen_v1";

export default function CalendarTutorial() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Show on first visit to /calendar only (client-side)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!pathname?.startsWith("/calendar")) return;
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) setOpen(true);
  }, [pathname]);

  const close = (remember: boolean) => {
    if (typeof window !== "undefined" && remember) {
      localStorage.setItem(STORAGE_KEY, "1");
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onClose={() => close(true)} className="relative z-[1000]">
      <div className="fixed inset-0 bg-black/35" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-2xl overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-xl">
          {/* Hero */}
          <div className="tutorial-hero p-5">
            <div className="text-amber-900/90 text-xs font-semibold tracking-wide">Welcome</div>
            <h2 className="mt-1 text-2xl font-bold leading-tight text-amber-950">
              Your MyZenTribe Calendar
            </h2>
            <p className="mt-1 text-sm text-amber-900/80">
              A calm place to plan: drag, drop, RSVP, and meditate together.
            </p>
          </div>

          {/* Body */}
          <div className="p-6">
            <ul className="tutorial-list">
              <li>
                <span className="bullet">🗓️</span>
                <div>
                  <div className="item-title">Tap or drag to plan</div>
                  <div className="item-desc">
                    Click a day/time to create an event, or drag events to new days/times.
                    Only creators can move their events.
                  </div>
                </div>
              </li>

              <li>
                <span className="bullet">✅</span>
                <div>
                  <div className="item-title">To-dos & Reminders tray</div>
                  <div className="item-desc">
                    Drag <b className="text-green-700">To-dos</b> (green) or{" "}
                    <b className="text-red-700">Reminders</b> (red) onto the calendar.
                    They’re private to you and can be opened and edited after dropping.
                  </div>
                </div>
              </li>

              <li>
                <span className="bullet">✨</span>
                <div>
                  <div className="item-title">“My calendar” vs “What’s happening”</div>
                  <div className="item-desc">
                    Toggle to see public events from friends & communities. Swipe left to
                    dismiss, swipe right to add to your calendar. Click a title for full details.
                  </div>
                </div>
              </li>

              <li>
                <span className="bullet">💬</span>
                <div>
                  <div className="item-title">RSVP, Interested & Share</div>
                  <div className="item-desc">
                    Public events include <b>RSVP</b>, <b>Interested</b>, and{" "}
                    <b>Share</b> (share with everyone or select friends). Creators see
                    <b> Edit</b> / <b>Delete</b>; attendees can <b>Remove</b> it from their view.
                  </div>
                </div>
              </li>

              <li>
                <span className="bullet">🧘</span>
                <div>
                  <div className="item-title">Meditation extras</div>
                  <div className="item-desc">
                    Meditation events show links to the <b>Meditation Room</b> and your{" "}
                    <b>Group Circle</b> chat. Use the invite page for group sessions.
                  </div>
                </div>
              </li>

              <li>
                <span className="bullet">🌙</span>
                <div>
                  <div className="item-title">Moon phases</div>
                  <div className="item-desc">
                    Full, new, first & last quarter markers appear inside the correct date cells.
                  </div>
                </div>
              </li>
            </ul>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button className="btn" onClick={() => close(false)}>
                Remind me later
              </button>
              <button className="btn btn-brand" onClick={() => close(true)}>
                Got it — let’s plan
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
