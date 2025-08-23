// components/CalendarGrid.tsx
"use client";
import React, { useMemo } from "react";
import { Calendar, Views, View, Event as RBCEvent } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { localizer } from "@/lib/localizer";
import type { DBEvent } from "@/lib/types";

const DnDCalendar = withDragAndDrop<UiEvent, object>(Calendar as any);
export type UiEvent = RBCEvent & { resource: any };

// ---- Error boundary so the page won't hard-crash ----
class RBCBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any, info: any) {
    console.error("react-big-calendar crashed:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="card p-3">
          <div className="text-sm">
            We couldn’t render the calendar. Try refreshing. If it keeps
            happening, check the browser console for the event that failed.
          </div>
        </div>
      );
    }
    return this.props.children as any;
  }
}

// ---- Helpers to parse/repair dates safely ----
function toDate(x: any): Date | null {
  if (!x) return null;
  const d = x instanceof Date ? x : new Date(x);
  return isNaN(d.getTime()) ? null : d;
}
function fixRange(start: Date | null, end: Date | null) {
  if (!start && !end) return null;
  if (start && !end) return { start, end: new Date(start.getTime() + 30 * 60 * 1000) };
  if (!start && end) return { start: new Date(end.getTime() - 30 * 60 * 1000), end };
  if ((end as Date).getTime() <= (start as Date).getTime()) {
    return { start: start!, end: new Date(start!.getTime() + 30 * 60 * 1000) };
  }
  return { start: start!, end: end! };
}

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
  dbEvents,
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
}: Props) {
  const dbUiEvents = useMemo<UiEvent[]>(() => {
    const out: UiEvent[] = [];
    for (const e of dbEvents) {
      const start = toDate((e as any).start_time);
      const end = toDate((e as any).end_time);
      const fixed = fixRange(start, end);
      if (!fixed) {
        console.warn("Skipping event with no usable dates:", {
          id: (e as any).id,
          title: (e as any).title,
          start_time: (e as any).start_time,
          end_time: (e as any).end_time,
        });
        continue;
      }
      out.push({
        id: (e as any).id,
        title: (e as any).title,
        start: fixed.start,
        end: fixed.end,
        allDay: false,
        resource: e,
      });
    }
    return out;
  }, [dbEvents]);

  const mergedEvents = useMemo(
    () => [...dbUiEvents, ...(showMoon ? moonEvents : [])],
    [dbUiEvents, moonEvents, showMoon]
  );

  const eventPropGetter = (event: UiEvent) => {
    const r: any = event.resource;

    // Moon markers (all-day labels)
    if (r?.moonPhase) {
      return {
        style: { backgroundColor: "transparent", border: "0", fontWeight: 600, color: "#0f172a" },
        className: "text-[11px] leading-tight",
      };
    }

    // Cancelled events
    if (r?.status === "cancelled") {
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

    // Normal events
    const color = r?.source === "business" ? "#c4b5fd" : "#60a5fa";
    return {
      style: { backgroundColor: color, border: "1px solid #e5e7eb", borderRadius: 10 },
      className: "text-[11px] leading-tight",
    };
  };

  return (
    <div className="card p-3">
      <RBCBoundary>
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
            event: ({ event }) => {
              const r = (event as UiEvent).resource || {};
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
              return (
                <div className="text-[11px] leading-tight">
                  <div className="font-medium">{(event as any).title}</div>
                </div>
              );
            },
          }}
          eventPropGetter={eventPropGetter}
        />
      </RBCBoundary>
    </div>
  );
}
