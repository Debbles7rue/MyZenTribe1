// components/CalendarGrid.tsx
"use client";

import React, { useMemo, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, DateSelectArg, EventDropArg, EventResizeDoneArg } from "@fullcalendar/core";
import type { DBEvent } from "@/lib/types";
import { useMoon as useMoonHook } from "@/lib/useMoon";

/** Shapes FullCalendar expects */
type FCEvent = {
  id: string;
  title: string;
  start: string | Date;
  end: string | Date;
  allDay?: boolean;
  display?: "auto" | "background" | "block" | "list-item";
  extendedProps?: any; // we store original DB row here
};

type Props = {
  dbEvents: DBEvent[];
  showMoon: boolean;

  view: "dayGridMonth" | "timeGridWeek" | "timeGridDay";
  setView: (v: "dayGridMonth" | "timeGridWeek" | "timeGridDay") => void;

  date: Date;
  setDate: (d: Date) => void;

  onSelectSlot: (arg: { start: Date; end: Date; allDay: boolean }) => void;
  onSelectEvent: (evt: { resource?: DBEvent }) => void;
  onDropOrResize: (arg: { resource: DBEvent; start: Date; end: Date }) => void;
  onNeedsRefresh: () => void; // call after revert needed
};

/** Always-coerced moon events (so decorations can't crash the grid) */
function useSafeMoon(date: Date, view: "dayGridMonth" | "timeGridWeek" | "timeGridDay"): FCEvent[] {
  // We pass a classic label ('month'|'week'|'day') to your hook to keep its API stable.
  const mode = view === "dayGridMonth" ? "month" : view === "timeGridWeek" ? "week" : "day";
  const raw: any = useMoonHook ? useMoonHook(date, mode) : null;

  const rows = Array.isArray(raw) ? raw : Array.isArray(raw?.events) ? raw.events : [];
  return rows.map((r: any, idx: number) => ({
    id: r.id ?? `moon-${idx}`,
    title: r.title ?? "",
    start: r.start,
    end: r.end,
    allDay: true,
    extendedProps: { moonPhase: r?.resource?.moonPhase ?? r?.moonPhase ?? null },
  }));
}

export default function CalendarGrid({
  dbEvents,
  showMoon,
  view,
  setView,
  date,
  setDate,
  onSelectSlot,
  onSelectEvent,
  onDropOrResize,
  onNeedsRefresh,
}: Props) {
  const calRef = useRef<FullCalendar | null>(null);

  const fcEvents: FCEvent[] = useMemo(
    () =>
      (dbEvents || []).map((e) => ({
        id: (e as any).id,
        title: e.title || "Untitled event",
        start: e.start_time as any,
        end: e.end_time as any,
        allDay: false,
        extendedProps: { resource: e },
      })),
    [dbEvents]
  );

  const moonEvents = useSafeMoon(date, view);
  const merged = useMemo(
    () => (showMoon ? [...fcEvents, ...moonEvents] : fcEvents),
    [fcEvents, moonEvents, showMoon]
  );

  // readable event rendering (title only, icon for moon)
  function renderEventContent(arg: any) {
    const moon = arg?.event?.extendedProps?.moonPhase;
    if (moon) {
      const icon =
        moon === "moon-full" ? "🌕" :
        moon === "moon-new" ? "🌑" :
        moon === "moon-first" ? "🌓" : "🌗";
      return <div className="text-[11px] leading-tight">{icon} {arg.event.title}</div>;
    }
    return <div className="text-[11px] leading-tight"><span className="font-medium">{arg.event.title}</span></div>;
  }

  // color classes
  function eventClassNames(arg: any) {
    const r = arg?.event?.extendedProps?.resource || {};
    if (r?.status === "cancelled") return ["mzt-ev", "mzt-ev-cancel"];
    if (r?.source === "business") return ["mzt-ev", "mzt-ev-business"];
    if (r?.attending || r?.confirm_status === "confirmed") return ["mzt-ev", "mzt-ev-confirmed"];
    return ["mzt-ev", "mzt-ev-default"];
  }

  // handlers
  const handleDateClick = (info: any) => {
    // Month: clicking a day drills into day view (your requested behavior)
    if (view === "dayGridMonth") {
      setView("timeGridDay");
      setDate(info.date);
    } else {
      // In day/week, selecting handled by select()
    }
  };

  const handleSelect = (sel: DateSelectArg) => {
    onSelectSlot({ start: sel.start, end: sel.end, allDay: sel.allDay });
  };

  const handleEventClick = (arg: EventClickArg) => {
    const resource = arg?.event?.extendedProps?.resource;
    onSelectEvent({ resource });
  };

  const handleEventDrop = async (arg: EventDropArg) => {
    const resource = arg?.event?.extendedProps?.resource as DBEvent;
    if (!resource) return;
    await onDropOrResize({ resource, start: arg.event.start!, end: arg.event.end! });
    onNeedsRefresh(); // keep the calendar in sync if server rejected
  };

  const handleEventResize = async (arg: EventResizeDoneArg) => {
    const resource = arg?.event?.extendedProps?.resource as DBEvent;
    if (!resource) return;
    await onDropOrResize({ resource, start: arg.event.start!, end: arg.event.end! });
    onNeedsRefresh();
  };

  return (
    <div className="card p-3">
      <FullCalendar
        ref={calRef as any}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={view}
        datesSet={(info) => {
          const v = info.view.type as "dayGridMonth" | "timeGridWeek" | "timeGridDay";
          if (v !== view) setView(v);
          setDate(info.view.currentStart);
        }}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        height={680}
        selectable
        selectMirror
        dayMaxEvents
        eventOverlap
        editable // enables drag/resize; we still enforce “creator-only” in handler
        events={merged}
        eventContent={renderEventContent}
        eventClassNames={eventClassNames}
        dateClick={handleDateClick}
        select={handleSelect}
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        eventResize={handleEventResize}
      />
    </div>
  );
}
