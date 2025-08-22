"use client";

import React, { useMemo } from "react";
import { Calendar, View, Event as RBCEvent } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { localizer } from "@/lib/localizer";
import type { DBEvent } from "@/lib/types";

const DnDCalendar = withDragAndDrop<UiEvent, object>(Calendar as any);
export type UiEvent = RBCEvent & { resource: any };

type Props = {
  dbEvents: DBEvent[];
  moonEvents: UiEvent[];
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

export default function CalendarGrid({
  dbEvents, moonEvents, showMoon,
  date, setDate, view, setView,
  onSelectSlot, onSelectEvent, onDrop, onResize
}: Props) {
  // Convert DB rows to RBC events
  const dbUiEvents = useMemo<UiEvent[]>(
    () =>
      dbEvents.map((e) => ({
        id: e.id,
        title: e.title,
        start: new Date(e.start_time),
        end: new Date(e.end_time),
        allDay: false,
        resource: e,
      })),
    [dbEvents]
  );

  // Merge with moon events (which are allDay & end = next day)
  const mergedEvents = useMemo(
    () => [...dbUiEvents, ...(showMoon ? moonEvents : [])],
    [dbUiEvents, moonEvents, showMoon]
  );

  // Per-event styling
  const eventPropGetter = (event: UiEvent) => {
    const r: any = event.resource;

    // Moon markers: tiny icon, no chip background
    if (r?.moonPhase) {
      return {
        className: "mzt-moon-event",
        style: {
          background: "transparent",
          border: 0,
          padding: 0,
          boxShadow: "none",
        },
      };
    }

    // Cancelled events
    if (r?.status === "cancelled") {
      return {
        className: "mzt-event",
        style: {
          backgroundColor: "rgba(107,114,128,0.15)",
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          color: "#6b7280",
          textDecoration: "line-through",
        },
      };
    }

    // Normal events: personal vs business color
    const color = r?.source === "business" ? "#c4b5fd" : "#60a5fa";
    return {
      className: "mzt-event",
      style: { backgroundColor: color, border: "1px solid #e5e7eb", borderRadius: 10 },
    };
  };

  // Render: moons as emoji; normal events show title
  const EventCell = ({ event }: { event: RBCEvent }) => {
    const r = (event as UiEvent).resource || {};
    if (r?.moonPhase) {
      const icon =
        r.moonPhase === "moon-full" ? "🌕" :
        r.moonPhase === "moon-new" ? "🌑" :
        r.moonPhase === "moon-first" ? "🌓" : "🌗";
      return <span className="mzt-moon-emoji" title={(event as any).title}>{icon}</span>;
    }
    return <span className="mzt-event-title">{(event as any).title}</span>;
  };

  return (
    <div className="card p-3">
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
        onSelectEvent={(e) => onSelectEvent(e as UiEvent)}
        onEventDrop={onDrop}
        onEventResize={onResize}
        step={30}
        timeslots={2}
        scrollToTime={new Date(1970, 1, 1, 8, 0, 0)}
        components={{ event: EventCell }}
        eventPropGetter={eventPropGetter}
      />

      {/* Moon icons inside the day cells */}
      <style jsx global>{`
        .rbc-month-view .rbc-event { margin: 1px 2px; }
        .mzt-event-title { font-size: 11px; line-height: 1.2; }

        .mzt-moon-event {
          background: transparent !important;
          border: 0 !important;
          padding: 0 !important;
          box-shadow: none !important;
          height: auto !important;
          line-height: 1 !important;
          position: relative;
        }
        .mzt-moon-emoji {
          font-size: 14px;
          display: inline-block;
          vertical-align: middle;
          transform: translateY(-1px);
          /* If you want it tucked in the corner, uncomment:
          position: absolute; top: 2px; right: 4px;
          */
        }
      `}</style>
    </div>
  );
}
