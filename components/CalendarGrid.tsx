// components/CalendarGrid.tsx
"use client";

import React, { useMemo, useCallback } from "react";
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
    () => [...dbUiEvents, ...(showMoon ? moonEvents : [])],
    [dbUiEvents, moonEvents, showMoon]
  );

  // Guaranteed event opener
  const handleOpenEvent = useCallback(
    (evt: UiEvent) => Promise.resolve().then(() => onSelectEvent(evt)),
    [onSelectEvent]
  );

  // readable colors
  const eventPropGetter = (event: UiEvent) => {
    const r: any = event.resource || {};
    if (r?.status === "cancelled") {
      return {
        style: {
          backgroundColor: "rgba(107,114,128,0.15)",
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          color: "#6b7280",
          textDecoration: "line-through",
          cursor: "pointer",
        },
        className: "text-[11px] leading-tight",
      };
    }
    const baseBg = r?.source === "business" ? "#f1f5f9" : "#dbeafe";
    return {
      style: {
        backgroundColor: baseBg,
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        color: "#111",
        cursor: "pointer",
      },
      className: "text-[11px] leading-tight",
    };
  };

  // Custom event cell: call opener and stop slot selection from hijacking
  function EventCell({ event }: { event: UiEvent }) {
    const onClick = (e: React.SyntheticEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleOpenEvent(event);
    };
    const stop = (e: React.SyntheticEvent) => e.stopPropagation();
    return (
      <div
        className="text-[11px] leading-tight"
        role="button"
        tabIndex={0}
        onMouseDown={stop}
        onTouchStart={stop}
        onClick={onClick}
        onDoubleClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleOpenEvent(event); }
        }}
      >
        <div className="font-medium">{(event as any).title}</div>
      </div>
    );
  }

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
          onSelectEvent={(e: any) => handleOpenEvent(e as UiEvent)}
          onDoubleClickEvent={(e: any) => handleOpenEvent(e as UiEvent)}
          onEventDrop={onDrop}
          onEventResize={onResize}
          step={30}
          timeslots={2}
          longPressThreshold={100}
          scrollToTime={new Date(1970, 1, 1, 8, 0, 0)}
          components={{ event: ({ event }) => <EventCell event={event as UiEvent} /> }}
          eventPropGetter={eventPropGetter}
        />
      </DndProvider>
    </div>
  );
}
