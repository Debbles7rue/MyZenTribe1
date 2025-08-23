// components/CalendarGrid.tsx
"use client";
import React, { useMemo } from "react";
import { Calendar, View, Views, Event as RBCEvent } from "react-big-calendar";
import { localizer } from "@/lib/localizer";
import type { DBEvent } from "@/lib/types";

export type UiEvent = RBCEvent & { resource: any };

type Props = {
  dbEvents: DBEvent[];
  moonEvents: UiEvent[];     // ignored for now
  showMoon: boolean;         // ignored for now

  date: Date;
  setDate: (d: Date) => void;
  view: View;
  setView: (v: View) => void;

  onSelectSlot: ({ start, end }: { start: Date; end: Date }) => void;
  onSelectEvent: (evt: UiEvent) => void;

  // kept to satisfy props, but not used in this safe version:
  onDrop: ({ event, start, end }: { event: UiEvent; start: Date; end: Date }) => void;
  onResize: ({ event, start, end }: { event: UiEvent; start: Date; end: Date }) => void;
};

export default function CalendarGrid({
  dbEvents,
  date,
  setDate,
  view,
  setView,
  onSelectSlot,
  onSelectEvent,
}: Props) {
  const uiEvents = useMemo<UiEvent[]>(
    () =>
      (dbEvents || [])
        .filter((e: any) => e?.start_time && e?.end_time)
        .map((e: any) => ({
          id: e.id,
          title: e.title || "Untitled",
          start: new Date(e.start_time),
          end: new Date(e.end_time),
          allDay: false,
          resource: e,
        })),
    [dbEvents]
  );

  return (
    <div className="card p-3">
      <Calendar
        localizer={localizer}
        events={uiEvents}
        startAccessor="start"
        endAccessor="end"
        selectable
        popup
        style={{ height: 680 }}
        view={view}
        onView={setView}
        date={date}
        onNavigate={setDate}
        onSelectSlot={onSelectSlot}
        onSelectEvent={(e) => onSelectEvent(e as UiEvent)}
        step={30}
        timeslots={2}
        scrollToTime={new Date(1970, 1, 1, 8, 0, 0)}
      />
    </div>
  );
}
