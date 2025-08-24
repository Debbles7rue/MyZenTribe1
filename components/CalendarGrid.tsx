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
  date: Date;
  setDate: (d: Date) => void;
  view: View;
  setView: (v: View) => void;

  events: UiEvent[];

  onSelectSlot: ({ start, end }: { start: Date; end: Date }) => void;
  onSelectEvent: (evt: UiEvent) => void;
  onDrop: ({ event, start, end }: { event: UiEvent; start: Date; end: Date }) => void;
  onResize: ({ event, start, end }: { event: UiEvent; start: Date; end: Date }) => void;

  onPlannerMove?: ({ event, start, end }: { event: UiEvent; start: Date; end: Date }) => void;
  onDropFromOutside?: ({ start, end, allDay }: { start: Date; end: Date; allDay?: boolean }) => void;
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
  const eventPropGetter = (event: UiEvent) => {
    const r: any = event.resource || {};
    if (r?.moonPhase) {
      return {
        style: { backgroundColor: "transparent", border: 0, fontWeight: 600, color: "#0f172a" },
        className: "text-[11px] leading-tight",
      };
    }
    if (r?.planner) {
      const k = r.planner.kind;
      const bg = k === "reminder" ? "#fecaca" : "#bbf7d0"; // red-200 / green-200
      return {
        style: { backgroundColor: bg, border: "1px solid #e5e7eb", borderRadius: 10, color: "#111" },
        className: "text-[11px] leading-tight",
      };
    }
    const status = r?.status ?? "scheduled";
    const source = r?.source ?? "personal";
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
    const bg = source === "business" ? "#e5e7eb" : "#dbeafe";
    return {
      style: { backgroundColor: bg, border: "1px solid #e5e7eb", borderRadius: 10, color: "#111" },
      className: "text-[11px] leading-tight",
    };
  };

  return (
    <div className="mzt-big-calendar card p-3 overflow-hidden">
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
          onEventDrop={(args) => {
            const r = (args.event as any).resource;
            if (r?.planner) onPlannerMove?.(args);
            else onDrop(args);
          }}
          onEventResize={(args) => {
            const r = (args.event as any).resource;
            if (r?.planner) onPlannerMove?.(args);
            else onResize(args);
          }}
          // mobile: long press to select; click a date label drills down to Day
          longPressThreshold={250}
          onDrillDown={(d) => {
            setDate(d);
            setView("day");
          }}
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
              if (r?.planner) {
                return (
                  <div className="text-[11px] leading-tight">
                    <div className="font-medium">{(event as any).title}</div>
                  </div>
                );
              }
              const title = (event as any).title;
              const isBusiness = r?.source === "business";
              const isConfirmed = r?.confirmed || r?.attending;
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
          onDropFromOutside={onDropFromOutside}
          dragFromOutsideItem={dragFromOutsideItem}
        />
      </DndProvider>
    </div>
  );
}
