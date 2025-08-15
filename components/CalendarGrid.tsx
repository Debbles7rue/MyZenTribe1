"use client";
import React, { useMemo } from "react";
import { Calendar, Views, View, Event as RBCEvent } from "react-big-calendar";
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

  const mergedEvents = useMemo(
    () => [...dbUiEvents, ...(showMoon ? moonEvents : [])],
    [dbUiEvents, moonEvents, showMoon]
  );

  const eventPropGetter = (event: UiEvent) => {
    const r: any = event.resource;

    // Moon markers (unchanged look)
    if (r?.moonPhase) {
      return {
        style: {
          backgroundColor: "transparent",
          border: "0",
          fontWeight: 600,
          color: "#0f172a",
        },
        className: "text-[11px] leading-tight",
      };
    }

    // Cancelled events: greyed out + line-through
    if (r?.status === "cancelled") {
      return {
        style: {
          backgroundColor: "rgba(107,114,128,0.15)", // zinc-500 @ ~15%
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          color: "#6b7280",
          textDecoration: "line-through",
        },
        className: "text-[11px] leading-tight",
      };
    }

    // Normal events: personal vs business color
    const color = r?.source === "business" ? "#c4b5fd" /* violet-300 */ : "#60a5fa" /* sky-400 */;
    return {
      style: {
        backgroundColor: color,
        border: "1px solid #e5e7eb",
        borderRadius: 10,
      },
      className: "text-[11px] leading-tight",
    };
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
        onSelectEvent={onSelectEvent}
        onEventDrop={onDrop}
        onEventResize={onResize}
        step={30}
        timeslots={2}
        scrollToTime={new Date(1970, 1, 1, 8, 0, 0)}
        components={{
          // Hide default RBC toolbar (prevents the duplicated "Today/Month/Week/Day" row)
          toolbar: () => null,
          event: ({ event }) => {
            const r = (event as UiEvent).resource || {};
            if (r?.moonPhase) {
              const icon =
                r.moonPhase === "moon-full" ? "🌕" :
                r.moonPhase === "moon-new" ? "🌑" :
                r.moonPhase === "moon-first" ? "🌓" : "🌗";
              return (
                <div className="text-[11px] leading-tight">
                  {icon} {(event as any).title}
                </div>
              );
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
    </div>
  );
}
