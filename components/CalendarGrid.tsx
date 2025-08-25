// components/CalendarGrid.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Calendar, Views, View, Event as RBCEvent } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TouchBackend } from "react-dnd-touch-backend";
import { localizer } from "@/lib/localizer";
import { useMoon as useMoonHook } from "@/lib/useMoon";
import type { DBEvent } from "@/lib/types";

const DnDCalendar = withDragAndDrop<UiEvent, object>(Calendar as any);

export type UiEvent = RBCEvent & { resource: any };

type Props = {
  dbEvents: DBEvent[];
  showMoon: boolean;

  date: Date;
  setDate: (d: Date) => void;
  view: View;
  setView: (v: View) => void;

  onSelectSlot: ({ start, end }: { start: Date; end: Date }) => void;
  onSelectEvent: (evt: UiEvent) => void;
  onDrop: ({ event, start, end }: { event: UiEvent; start: Date; end: Date }) => void;
  onResize: ({ event, start, end }: { event: UiEvent; start: Date; end: Date }) => void;
};

/** Always returns an array, even if the moon hook shape changes. */
function useSafeMoon(date: Date, view: View): UiEvent[] {
  const raw: any = useMoonHook ? useMoonHook(date, view) : null;
  if (Array.isArray(raw)) return raw as UiEvent[];
  if (raw && Array.isArray(raw.events)) return raw.events as UiEvent[];
  return [];
}

export default function CalendarGrid({
  dbEvents,
  showMoon,
  date,
  setDate,
  view,
  setView,
  onSelectSlot,
  onSelectEvent,
  onDrop,
  onResize,
}: Props) {
  // Pick a DnD backend once on mount
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    setTouch(typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0));
  }, []);

  // Convert DB rows → UiEvents
  const dbUiEvents = useMemo<UiEvent[]>(
    () =>
      (dbEvents || []).map((e) => ({
        id: (e as any).id,
        title: e.title,
        start: new Date(e.start_time as any),
        end: new Date(e.end_time as any),
        allDay: false,
        resource: e,
      })),
    [dbEvents]
  );

  // Moon markers
  const moonEvents = useSafeMoon(date, view);
  const mergedEvents = useMemo(
    () => [...dbUiEvents, ...(showMoon ? moonEvents : [])],
    [dbUiEvents, moonEvents, showMoon]
  );

  // Readability + categories
  const eventPropGetter = (event: UiEvent) => {
    const r: any = event.resource || {};

    // Moon labels
    if (r?.moonPhase) {
      return {
        style: { backgroundColor: "transparent", border: 0, fontWeight: 600, color: "#0f172a" },
        className: "text-[11px] leading-tight",
      };
    }

    // Cancelled
    if (r?.status === "cancelled") {
      return {
        style: {
          backgroundColor: "rgba(107,114,128,0.15)",
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          color: "#6b7280",
          textDecoration: "line-through",
        },
        className: "text-[11px] leading-tight",
      };
    }

    // Colors by source/confirmation
    // confirmed → purple heading; friends → blue; business → black; default → blue
    const isConfirmed = r?.attending === true || r?.confirm_status === "confirmed";
    const bg = isConfirmed
      ? "#ede9fe" // purple-ish
      : r?.source === "business"
      ? "#e5e7eb" // neutral (black text)
      : "#dbeafe"; // blue-ish

    const color = r?.source === "business" ? "#111" : "#111";
    return {
      style: { backgroundColor: bg, border: "1px solid #e5e7eb", borderRadius: 10, color },
      className: "text-[11px] leading-tight",
    };
  };

  return (
    <div className="card p-3 mzt-big-calendar">
      <DndProvider backend={touch ? TouchBackend : HTML5Backend} options={touch ? { enableMouseEvents: true } : undefined}>
        <DnDCalendar
          localizer={localizer}
          events={mergedEvents}
          startAccessor="start"
          endAccessor="end"
          selectable
          resizable
          popup
          style={{ height: 680 }}
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          onSelectSlot={onSelectSlot}
          onSelectEvent={onSelectEvent}
          onEventDrop={onDrop}
          onEventResize={onResize}
          step={30}
          timeslots={2}
          scrollToTime={new Date(1970, 1, 1, 8, 0, 0)}
          components={{
            event: ({ event }) => {
              const r = (event as UiEvent).resource || {};
              if (r?.moonPhase) {
                const icon =
                  r.moonPhase === "moon-full" ? "🌕" :
                  r.moonPhase === "moon-new" ? "🌑" :
                  r.moonPhase === "moon-first" ? "🌓" : "🌗";
                return <div className="text-[11px] leading-tight">{icon} {(event as any).title}</div>;
              }
              return (
                <div className="text-[11px] leading-tight">
                  <div className="font-medium">{(event as any).title}</div>
                </div>
              );
            },
          }}
          eventPropGetter={eventPropGetter}
        />
      </DndProvider>
    </div>
  );
}
