// components/CalendarGrid.tsx
"use client";

import React, { useRef } from "react";
import { Calendar, View, Event as RBCEvent } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TouchBackend } from "react-dnd-touch-backend";
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

const isTouch = () =>
  typeof window !== "undefined" &&
  (("ontouchstart" in window) || (navigator.maxTouchPoints ?? 0) > 0);

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

    // Moon markers (all-day labels)
    if (r?.moonPhase) {
      return {
        style: { background: "transparent", border: 0, color: "#0f172a", fontWeight: 600 },
        className: "text-[11px] leading-tight",
      };
    }

    // To-do / Reminder chips (private)
    if (r?.planner) {
      const t = r.planner.type;
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

    // Default event chip
    return {
      style: {
        backgroundColor: "#eef2ff",
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        color: "#111",
      },
      className: "text-[11px] leading-tight",
    };
  };

  /** Tap-smart chip: quick tap opens; real move drags (works on touch & mouse) */
  const TAP_MS = 300;
  const TAP_PX = 8;

  const EventCell = ({ event }: { event: UiEvent }) => {
    const r = event.resource || {};
    const down = useRef<{ t: number; x: number; y: number } | null>(null);

    // Mouse
    const onMouseDown: React.MouseEventHandler<HTMLDivElement> = (e) => {
      down.current = { t: Date.now(), x: e.clientX, y: e.clientY };
    };
    const onMouseUp: React.MouseEventHandler<HTMLDivElement> = (e) => {
      const s = down.current;
      down.current = null;
      if (!s) return;
      const dt = Date.now() - s.t;
      const dx = Math.abs(e.clientX - s.x);
      const dy = Math.abs(e.clientY - s.y);
      if (dt <= TAP_MS && Math.hypot(dx, dy) <= TAP_PX) {
        e.preventDefault();
        e.stopPropagation();
        onSelectEvent(event);
      }
    };

    // Touch
    const onTouchStart: React.TouchEventHandler<HTMLDivElement> = (e) => {
      const t = e.touches[0];
      down.current = { t: Date.now(), x: t.clientX, y: t.clientY };
    };
    const onTouchEnd: React.TouchEventHandler<HTMLDivElement> = (e) => {
      const s = down.current;
      down.current = null;
      if (!s) return;
      const t = e.changedTouches[0];
      const dt = Date.now() - s.t;
      const dx = Math.abs(t.clientX - s.x);
      const dy = Math.abs(t.clientY - s.y);
      if (dt <= TAP_MS && Math.hypot(dx, dy) <= TAP_PX) {
        e.preventDefault();
        e.stopPropagation();
        onSelectEvent(event);
      }
    };

    const commonProps = {
      onMouseDown,
      onMouseUp,
      onTouchStart,
      onTouchEnd,
      style: { touchAction: "manipulation" as const },
      className: "text-[11px] leading-tight select-none",
    };

    if (r?.moonPhase) {
      const icon =
        r.moonPhase === "moon-full" ? "🌕" :
        r.moonPhase === "moon-new" ? "🌑" :
        r.moonPhase === "moon-first" ? "🌓" : "🌗";
      return <div {...commonProps}>{icon} {(event as any).title}</div>;
    }

    const prefix = r?.planner ? (r.planner.type === "reminder" ? "⏰ " : "✅ ") : "";
    return (
      <div {...commonProps}>
        <div className="font-medium">{prefix}{(event as any).title}</div>
      </div>
    );
  };

  const Backend = isTouch() ? TouchBackend : HTML5Backend;
  const backendOptions = isTouch()
    ? { enableMouseEvents: true, delayTouchStart: 120 }
    : undefined;

  return (
    <div className="card p-3 mzt-big-calendar">
      <DndProvider backend={Backend as any} options={backendOptions as any}>
        <DnDCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          selectable={"ignoreEvents" as any}   // easier to select empty slots on mobile
          resizable
          popup
          style={{ height: 680, touchAction: "manipulation" }}
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          longPressThreshold={250}             // nice for touch slot selection
          /* IMPORTANT: Month view tap on a day should drill into Day view */
          onSelectSlot={(info: any) => {
            if (view === "month") {
              // open that day instead of creating an event
              setDate(info.start);
              setView("day");
              return;
            }
            // in day/week time-grid: create-event flow
            onSelectSlot({ start: info.start, end: info.end });
          }}
          /* Also drill from month header/date clicks */
          onDrillDown={(d) => {
            setDate(d);
            setView("day");
          }}
          /* Opening existing events still works via quick tap */
          onSelectEvent={onSelectEvent}
          onDoubleClickEvent={onSelectEvent}
          /* Drag/Resize */
          onEventDrop={(args: any) => {
            if (args?.event?.resource?.planner && onPlannerMove) return onPlannerMove(args);
            return onDrop(args);
          }}
          onEventResize={onResize}
          /* Time grid behavior */
          step={30}
          timeslots={2}
          scrollToTime={new Date(1970, 1, 1, 8, 0, 0)}
          components={{ event: EventCell }}
          eventPropGetter={eventPropGetter}
          dragFromOutsideItem={dragFromOutsideItem}
          onDropFromOutside={onDropFromOutside}
          draggableAccessor={draggableAccessor}
          /* Force drilldown to day (not agenda) for clarity on mobile */
          drilldownView="day"
        />
      </DndProvider>
    </div>
  );
}
