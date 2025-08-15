"use client";
import React from "react";
import { Calendar, Views, View, Event as RBCEvent } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { localizer } from "@/lib/localizer";
import type { DBEvent } from "@/lib/types";

const DnDCalendar = withDragAndDrop<UiEvent, object>(Calendar as any);
export type UiEvent = RBCEvent & { resource: any };

type Props = {
  events: UiEvent[];
  date: Date;
  setDate: (d: Date) => void;
  view: View;
  setView: (v: View) => void;
  onSelectSlot: ({start,end}:{start:Date;end:Date;}) => void;
  onSelectEvent: (evt: UiEvent) => void;
  onDrop: ({event,start,end}:{event:UiEvent;start:Date;end:Date;}) => void;
  onResize: ({event,start,end}:{event:UiEvent;start:Date;end:Date;}) => void;
};

export default function CalendarGrid({
  events, date, setDate, view, setView, onSelectSlot, onSelectEvent, onDrop, onResize
}: Props) {
  const eventPropGetter = (event: UiEvent) => {
    const r: DBEvent | any = event.resource;
    if (r?.moonPhase) {
      return { style: { backgroundColor: "transparent", border: "0", fontWeight: 600, color: "#0f172a" }, className: "text-[11px] leading-tight" };
    }
    const color = r?.source === "business" ? "#c4b5fd" : "#60a5fa";
    return { style: { backgroundColor: color, border: "1px solid #e5e7eb", borderRadius: 10 }, className: "text-[11px] leading-tight" };
  };

  return (
    <div className="card p-3">
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
        onEventDrop={onDrop}
        onEventResize={onResize}
        step={30}
        timeslots={2}
        scrollToTime={new Date(1970, 1, 1, 8, 0, 0)} // scroll to 8am
        components={{
          event: ({ event }) => {
            const r = (event as UiEvent).resource;
            if (r?.moonPhase) {
              const icon = r.moonPhase === "moon-full" ? "🌕" : r.moonPhase === "moon-new" ? "🌑" : r.moonPhase === "moon-first" ? "🌓" : "🌗";
              return <div className="text-[11px] leading-tight">{icon} {event.title}</div>;
            }
            return <div className="text-[11px] leading-tight"><div className="font-medium">{event.title}</div></div>;
          },
        }}
      />
    </div>
  );
}
