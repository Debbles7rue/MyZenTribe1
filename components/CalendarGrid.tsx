// components/CalendarGrid.tsx
"use client";

import React, { useRef } from "react";
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
  onDropFromOutside?: ({ start, end }: { start: Date; end: Date }) => void;
  dragFromOutsideItem?: () => any | null;

  /** return true if this event may be dragged (e.g., creator-only) */
  draggableAccessor?: (evt: UiEvent) => boolean;
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
  draggableAccessor,
}: Props) {
  const eventPropGetter = (event: UiEvent) => {
    const r = event.resource || {};

    if (r?.moonPhase) {
      return {
        style: { background: "transparent", border: 0, color: "#0f172a", fontWeight: 600 },
        className: "text-[11px] leading-tight",
      };
    }

    if (r?.planner) {
      const t = r.planner.type;
      if (t === "reminder") {
        return {
          style: { backgroundColor: "#fee2e2", border: "1px solid #fecaca", borderRadius: 10, color: "#991b1b" },
          className: "text-[11px] leading-tight",
        };
      }
      return {
        style: { backgroundColor: "#dcfce7", border: "1px solid #bbf7d0", borderRadius: 10, color: "#14532d" },
        className: "text-[11px] leading-tight",
      };
    }

    return {
      style: { backgroundColor: "#eef2ff", border: "1px solid #e5e7eb", borderRadius: 10, color: "#111" },
      className: "text-[11px] leading-tight",
    };
  };

  /** Tap-smart event cell: quick tap/click opens; real drag still drags */
  const EventCell = ({ event }: { event: UiEvent }) => {
    const r = event.resource || {};
    const down = useRef<{ t: number; x: number; y: number } | null>(null);

    const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
      down.current = { t: Date.now(), x: e.clientX, y: e.clientY };
    };
    const onPointerUp: React.PointerEventHandler<HTMLDivElement> = (e) => {
      const d = down.current;
      down.current = null;
      if (!d) return;
      const dt = Date.now() - d.t;
      const dx = Math.abs(e.clientX - d.x);
      const dy = Math.abs(e.clientY - d.y);
      const moved = Math.sqrt(dx * dx + dy * dy) > 6; // drag threshold
      const quick = dt < 250;
      if (quick && !moved) {
        e.stopPropagation();
        onSelectEvent(event);
      }
    };

    if (r?.moonPhase) {
      const icon = r.moonPhase === "moon-full" ? "🌕" : r.moonPhase === "moon-new" ? "🌑" : r.moonPhase === "moon-first" ? "🌓" : "🌗";
      return (
        <div className="text-[11px] leading-tight select-none" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
          {icon} {(event as any).title}
        </div>
      );
    }
    if (r?.planner) {
      const prefix = r.planner.type === "reminder" ? "⏰" : "✅";
      return (
        <div className="text-[11px] leading-tight select-none" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
          <span className="font-medium">{prefix} {(event as any).title}</span>
        </div>
      );
    }
    return (
      <div className="text-[11px] leading-tight select-none" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
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
          onSelectEvent={onSelectEvent}          // desktop click (fallback)
          onDoubleClickEvent={onSelectEvent}     // double-click fallback
          onEventDrop={(args: any) => {
            if (args?.event?.resource?.planner && onPlannerMove) return onPlannerMove(args);
            return onDrop(args);
          }}
          onEventResize={onResize}
          step={30}
          timeslots={2}
          scrollToTime={new Date(1970, 1, 1, 8, 0, 0)}
          components={{ event: EventCell }}
          eventPropGetter={eventPropGetter}
          dragFromOutsideItem={dragFromOutsideItem}
          onDropFromOutside={onDropFromOutside}
          draggableAccessor={draggableAccessor}
        />
      </DndProvider>
    </div>
  );
}
