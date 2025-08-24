// components/CalendarGrid.tsx
"use client";

import React, { useMemo } from "react";
import { Calendar, Views, View, Event as RBCEvent } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { localizer } from "@/lib/localizer";
import type { DBEvent } from "@/lib/types";

const DnDCalendar = withDragAndDrop<UiEvent, object>(Calendar as any);

export type UiEvent = RBCEvent & { resource: any };

type Props = {
  dbEvents: DBEvent[];            // events to show (my or feed)
  plannerEvents: UiEvent[];       // scheduled planner items (reminders/todos)
  moonEvents: UiEvent[];          // all-day moon labels
  showMoon: boolean;

  date: Date;
  setDate: (d: Date) => void;
  view: View;
  setView: (v: View) => void;

  onSelectSlot: ({ start, end }: { start: Date; end: Date }) => void;
  onSelectEvent: (evt: UiEvent) => void;
  onDrop: ({ event, start, end }: { event: UiEvent; start: Date; end: Date }) => void;
  onResize: ({ event, start, end }: { event: UiEvent; start: Date; end: Date }) => void;

  // external drag (from TaskTray)
  onDropFromOutside?: ({ start, end, allDay }: { start: Date; end: Date; allDay?: boolean }) => void;
  dragFromOutsideItem?: () => any | null;

  // planner move inside grid
  onPlannerMove?: ({ event, start, end }: { event: UiEvent; start: Date; end: Date }) => void;
};

export default function CalendarGrid({
  dbEvents,
  plannerEvents,
  moonEvents,
  showMoon,
  date,
  setDate,
  view,
  setView,
  onSelectSlot,
  onSelectEvent,
  onDrop,
  onResize,
  onDropFromOutside,
  dragFromOutsideItem,
  onPlannerMove,
}: Props) {
  const dbUiEvents = useMemo<UiEvent[]>(
    () =>
      dbEvents.map((e) => ({
        id: (e as any).id,
        title: e.title,
        start: new Date(e.start_time as any),
        end: new Date(e.end_time as any),
        allDay: false,
        resource: e,
      })),
    [dbEvents]
  );

  const mergedEvents = useMemo(
    () => [...dbUiEvents, ...plannerEvents, ...(showMoon ? moonEvents : [])],
    [dbUiEvents, plannerEvents, moonEvents, showMoon]
  );

  const eventPropGetter = (event: UiEvent) => {
    const r: any = event.resource || {};

    // Moon
    if (r?.moonPhase) {
      return {
        style: {
          backgroundColor: "transparent",
          border: 0,
          fontWeight: 600,
          color: "#0f172a",
        },
        className: "text-[11px] leading-tight",
      };
    }

    // Planner items
    if (r?.planner) {
      const k = r.planner.kind;
      const bg = k === "reminder" ? "#fecaca" : "#bbf7d0"; // red-200 / green-200
      return {
        style: {
          backgroundColor: bg,
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          color: "#111",
        },
        className: "text-[11px] leading-tight",
      };
    }

    // DB events
    const status = r?.status ?? "scheduled";
    const source = r?.source ?? "personal";
    const confirmed = r?.__confirmed; // optional flag not used now

    // coloring rule:
    // - friends = blue
    // - business = black
    // - confirmed/RSVP'd heading purple (we render title purple)
    // we keep a light bg for legibility
    let bg = "#dbeafe"; // blue-100 default
    let color = "#111";
    if (source === "business") {
      bg = "#e5e7eb"; // gray-200 (black heading in renderer)
    }

    if (status === "cancelled") {
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

    return {
      style: {
        backgroundColor: bg,
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        color,
      },
      className: "text-[11px] leading-tight",
    };
  };

  return (
    <div className="card p-3 overflow-hidden">
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
        onEventDrop={(args) => {
          const r = (args.event as any).resource;
          if (r?.planner) {
            onPlannerMove?.(args);
          } else {
            onDrop(args);
          }
        }}
        onEventResize={(args) => {
          const r = (args.event as any).resource;
          if (r?.planner) {
            onPlannerMove?.(args);
          } else {
            onResize(args);
          }
        }}
        step={30}
        timeslots={2}
        scrollToTime={new Date(1970, 1, 1, 8, 0, 0)}
        components={{
          event: ({ event }) => {
            const r = (event as UiEvent).resource || {};
            // Moon
            if (r?.moonPhase) {
              const icon =
                r.moonPhase === "moon-full"
                  ? "🌕"
                  : r.moonPhase === "moon-new"
                  ? "🌑"
                  : r.moonPhase === "moon-first"
                  ? "🌓"
                  : "🌗";
              return <div className="text-[11px] leading-tight">{icon} {(event as any).title}</div>;
            }
            // Planner
            if (r?.planner) {
              return (
                <div className="text-[11px] leading-tight">
                  <div className="font-medium">{(event as any).title}</div>
                </div>
              );
            }
            // DB event heading only, colored per spec
            const title = (event as any).title;
            const isBusiness = r?.source === "business";
            const isConfirmed = r?.confirmed || r?.attending; // optional flags if added later
            const titleStyle = isConfirmed
              ? { color: "#7c3aed", fontWeight: 600 }
              : isBusiness
              ? { color: "#111", fontWeight: 600 }
              : { color: "#1d4ed8", fontWeight: 600 };
            return (
              <div className="text-[11px] leading-tight">
                <div style={titleStyle}>{title}</div>
              </div>
            );
          },
        }}
        eventPropGetter={eventPropGetter}
        // external drag from TaskTray
        onDropFromOutside={onDropFromOutside}
        dragFromOutsideItem={dragFromOutsideItem}
      />
    </div>
  );
}
