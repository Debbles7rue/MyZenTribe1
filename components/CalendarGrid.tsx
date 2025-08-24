// components/CalendarGrid.tsx
"use client";

import React from "react";
import { Calendar, View, Event as RBCEvent } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { localizer } from "@/lib/localizer";

import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";

const DnDCalendar = withDragAndDrop<UiEvent, object>(Calendar as any);

export type UiEvent = RBCEvent & { resource: any };

type Props = {
  /** calendar state */
  date: Date;
  setDate: (d: Date) => void;
  view: View;
  setView: (v: View) => void;

  /** merged events (db + planner + moon) */
  events: UiEvent[];

  /** interactions */
  onSelectSlot: ({ start, end }: { start: Date; end: Date }) => void;
  onSelectEvent: (evt: UiEvent) => void;
  onDrop: ({ event, start, end }: { event: UiEvent; start: Date; end: Date }) => void;
  onResize: ({ event, start, end }: { event: UiEvent; start: Date; end: Date }) => void;

  /** planner support (external DnD + moving scheduled planner items) */
  onPlannerMove?: ({ event, start, end }: { event: UiEvent; start: Date; end: Date }) => void;
  onDropFromOutside?: ({ start, end }: { start: Date; end: Date }) => void;
  dragFromOutsideItem?: () => any | null;
};

export default function CalendarGrid({
  date,
  setDate,
  view,
  setView,
  events,
  onSelectSlot,
  onSelectEvent,
  onDrop,
  onResize,
  onPlannerMove,
  onDropFromOutside,
  dragFromOutsideItem,
}: Props) {
  /** Readable, consistent styles */
  const eventPropGetter = (event: UiEvent) => {
    const r = event.resource || {};

    // Moon markers (all-day row)
    if (r?.moonPhase) {
      return {
        style: {
          background: "transparent",
          border: 0,
          color: "#0f172a",
          fontWeight: 600,
        },
        className: "text-[11px] leading-tight",
      };
    }

    // Planner items
    if (r?.planner) {
      const t = r.planner.type; // 'reminder' | 'todo'
      if (t === "reminder") {
        return {
          style: {
            backgroundColor: "#fee2e2",
            border: "1px solid #fecaca",
            borderRadius: 10,
            color: "#991b1b",
          },
          className: "text-[11px] leading-tight",
        };
      }
      // to-do (default)
      return {
        style: {
          backgroundColor: "#dcfce7",
          border: "1px solid #bbf7d0",
          borderRadius: 10,
          color: "#14532d",
        },
        className: "text-[11px] leading-tight",
      };
    }

    // Normal events
    return {
      style: {
        backgroundColor: "#eef2ff", // soft indigo/neutral
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        color: "#111",
      },
      className: "text-[11px] leading-tight",
    };
  };

  /** Custom event renderer for small icons/titles */
  const EventCell = ({ event }: { event: UiEvent }) => {
    const r = event.resource || {};
    if (r?.moonPhase) {
      const icon =
        r.moonPhase === "moon-full"
          ? "🌕"
          : r.moonPhase === "moon-new"
          ? "🌑"
          : r.moonPhase === "moon-first"
          ? "🌓"
          : "🌗";
      return (
        <div className="text-[11px] leading-tight">
          {icon} {(event as any).title}
        </div>
      );
    }
    if (r?.planner) {
      const prefix = r.planner.type === "reminder" ? "⏰" : "✅";
      return (
        <div className="text-[11px] leading-tight">
          <span className="font-medium">{prefix} {(event as any).title}</span>
        </div>
      );
    }
    return (
      <div className="text-[11px] leading-tight">
        <div className="font-medium">{(event as any).title}</div>
      </div>
    );
  };

  return (
    <div className="card p-3 mzt-big-calendar">
      <DndProvider backend={HTML5Backend}>
        <DnDCalendar
          localizer={localizer}
          events={events}
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
          onEventDrop={(args: any) => {
            // if a planner item is scheduled already and moved within the grid
            if (args?.event?.resource?.planner && onPlannerMove) return onPlannerMove(args);
            return onDrop(args);
          }}
          onEventResize={onResize}
          step={30}
          timeslots={2}
          scrollToTime={new Date(1970, 1, 1, 8, 0, 0)}
          components={{ event: EventCell }}
          eventPropGetter={eventPropGetter}
          /** external DnD from planner tray */
          dragFromOutsideItem={dragFromOutsideItem}
          onDropFromOutside={onDropFromOutside}
        />
      </DndProvider>
    </div>
  );
}
