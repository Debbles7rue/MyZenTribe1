// components/CalendarGrid.tsx
"use client";

import React, { useMemo } from "react";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Calendar, View, Event as RBCEvent } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TouchBackend } from "react-dnd-touch-backend";
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

  onSelectSlot: (arg: { start: Date; end: Date; action?: string; slots?: Date[] }) => void;
  onSelectEvent: (evt: UiEvent) => void;
  onDrop: ({ event, start, end }: { event: UiEvent; start: Date; end: Date }) => void;
  onResize: ({ event, start, end }: { event: UiEvent; start: Date; end: Date }) => void;
};

function isTouchDevice() {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

export default function CalendarGrid({
  dbEvents, moonEvents, showMoon,
  date, setDate, view, setView,
  onSelectSlot, onSelectEvent, onDrop, onResize,
}: Props) {
  const dbUiEvents = useMemo<UiEvent[]>(
    () =>
      dbEvents.map((e: any) => ({
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
    () => [...dbUiEvents, ...(showMoon ? (moonEvents || []) : [])],
    [dbUiEvents, moonEvents, showMoon]
  );

  const eventPropGetter = (event: UiEvent) => {
    const r: any = event.resource || {};

    if (r?.moonPhase) {
      return {
        style: { backgroundColor: "transparent", border: 0, color: "#0f172a", fontWeight: 600 },
        className: "text-[11px] leading-tight",
      };
    }

    if (r?.status === "cancelled") {
      return {
        style: {
          backgroundColor: "rgba(107,114,128,0.12)",
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          color: "#6b7280",
          textDecoration: "line-through",
        },
        className: "text-[11px] leading-tight",
      };
    }

    if (r?.rsvp_me) {
      return {
        style: {
          backgroundColor: "#ede9fe",
          border: "1px solid #ddd6fe",
          borderRadius: 10,
          color: "#111",
          fontWeight: 600,
        },
        className: "text-[11px] leading-tight",
      };
    }

    if (r?.source === "business") {
      return {
        style: {
          backgroundColor: "#f8fafc",
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          color: "#111",
        },
        className: "text-[11px] leading-tight",
      };
    }

    return {
      style: {
        backgroundColor: "#dbeafe",
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        color: "#111",
      },
      className: "text-[11px] leading-tight",
    };
  };

  const Backend = isTouchDevice() ? TouchBackend : HTML5Backend;

  return (
    <div className="card p-3 mzt-big-calendar">
      <DndProvider backend={Backend as any} options={isTouchDevice() ? { enableMouseEvents: true } : undefined}>
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
          onDoubleClickEvent={onSelectEvent}
          onEventDrop={onDrop}
          onEventResize={onResize}
          step={30}
          timeslots={2}
          longPressThreshold={80}
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
                  <div className="font-medium">
                    {r?.carpool_exists ? "🚗 " : ""}
                    {(event as any).title}
                  </div>
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
