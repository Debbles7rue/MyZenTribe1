// components/CalendarGrid.tsx
"use client";

import React, { useMemo } from "react";
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
  showWeather?: boolean;
  temperatureUnit?: "celsius" | "fahrenheit";

  date: Date;
  setDate: (d: Date) => void;
  view: View;
  setView: (v: View) => void;

  onSelectSlot: (arg: { start: Date; end: Date; action?: string; slots?: Date[] }) => void;
  onSelectEvent: (evt: UiEvent) => void;
  onDrop: ({ event, start, end }: { event: UiEvent; start: Date; end: Date }) => void;
  onResize: ({ event, start, end }: { event: UiEvent; start: Date; end: Date }) => void;

  // External drag from the task tray (desktop)
  externalDragType?: "none" | "reminder" | "todo";
  onExternalDrop?: (
    info: { start: Date; end: Date; allDay?: boolean },
    kind: Exclude<NonNullable<Props["externalDragType"]>, "none">
  ) => void;
};

function isTouchDevice() {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

export default function CalendarGrid({
  dbEvents, moonEvents, showMoon,
  showWeather = false,
  temperatureUnit = "celsius",
  date, setDate, view, setView,
  onSelectSlot, onSelectEvent, onDrop, onResize,
  externalDragType = "none",
  onExternalDrop,
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

  // Enhanced styling - keeping it simple to avoid conflicts
  const eventPropGetter = (event: UiEvent) => {
    const r: any = event.resource || {};
    
    // Reminders / To-dos (private) - Better contrast colors
    if (r?.event_type === "reminder") {
      return {
        style: {
          background: "linear-gradient(135deg, #fef3c7 0%, #fcd34d 100%)",
          border: "1px solid #f59e0b",
          borderRadius: "8px",
          color: "#92400e",
          cursor: "pointer",
          fontWeight: "600",
          fontSize: "11px",
          boxShadow: "0 2px 4px rgba(245,158,11,0.2)",
        },
        className: "enhanced-event reminder-event",
      };
    }
    
    if (r?.event_type === "todo") {
      return {
        style: {
          background: "linear-gradient(135deg, #d1fae5 0%, #6ee7b7 100%)",
          border: "1px solid #059669",
          borderRadius: "8px",
          color: "#064e3b",
          cursor: "pointer",
          fontWeight: "600",
          fontSize: "11px",
          boxShadow: "0 2px 4px rgba(5,150,105,0.2)",
        },
        className: "enhanced-event todo-event",
      };
    }
    
    // Business: enhanced with purple accent
    if (r?.source === "business") {
      return {
        style: {
          background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
          border: "2px solid #7c3aed",
          borderRadius: "8px",
          color: "#1e293b",
          cursor: "pointer",
          fontWeight: "700",
          fontSize: "11px",
          boxShadow: "0 2px 6px rgba(124,58,237,0.2)",
        },
        className: "enhanced-event business-event",
      };
    }
    
    // Friends' events vs personal events - better distinction
    if (r?.by_friend) {
      return {
        style: {
          background: "linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)",
          border: "1px solid #8b5cf6",
          borderRadius: "8px",
          color: "#5b21b6",
          cursor: "pointer",
          fontWeight: r?.rsvp_me ? "700" : "500",
          fontSize: "11px",
          boxShadow: "0 2px 4px rgba(139,92,246,0.2)",
        },
        className: `enhanced-event friend-event ${r?.rsvp_me ? "rsvp-event" : ""}`,
      };
    }
    
    // Personal events - distinct blue
    return {
      style: {
        background: "linear-gradient(135deg, #dbeafe 0%, #93c5fd 100%)",
        border: "1px solid #3b82f6",
        borderRadius: "8px",
        color: "#1d4ed8",
        cursor: "pointer",
        fontWeight: r?.rsvp_me ? "700" : "500",
        fontSize: "11px",
        boxShadow: "0 2px 4px rgba(59,130,246,0.2)",
      },
      className: `enhanced-event personal-event ${r?.rsvp_me ? "rsvp-event" : ""}`,
    };
  };

  // Enhanced day styling
  const dayPropGetter = (date: Date) => {
    const isToday = new Date().toDateString() === date.toDateString();
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    
    return {
      style: {
        background: isToday 
          ? "linear-gradient(135deg, rgba(124,58,237,0.1) 0%, rgba(124,58,237,0.05) 100%)"
          : isWeekend 
          ? "rgba(249,250,251,0.5)" 
          : "transparent",
        border: isToday ? "1px solid rgba(124,58,237,0.2)" : undefined,
      },
    };
  };

  const Backend = isTouchDevice() ? TouchBackend : HTML5Backend;

  return (
    <div className="card p-3 modern-calendar-wrapper">
      {/* Enhanced background pattern */}
      <div className="calendar-background-pattern"></div>
      
      {/* Weather overlay */}
      {showWeather && view === "month" && (
        <div style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(8px)",
          borderRadius: "12px",
          padding: "6px 12px",
          fontSize: "12px",
          fontWeight: "500",
          color: "#374151",
          border: "1px solid rgba(229,231,235,0.8)",
          zIndex: 10,
        }}>
          ☀️ 22°{temperatureUnit === "celsius" ? "C" : "F"}
        </div>
      )}
      
      {/* Moon phase overlay */}
      {showMoon && view === "month" && (
        <div style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(8px)",
          borderRadius: "12px",
          padding: "6px 12px",
          fontSize: "14px",
          border: "1px solid rgba(229,231,235,0.8)",
          zIndex: 10,
        }}>
          🌕
        </div>
      )}

      <DndProvider backend={Backend as any} options={isTouchDevice() ? { enableMouseEvents: true } : undefined}>
        <DnDCalendar
          localizer={localizer}
          events={mergedEvents}
          startAccessor="start"
          endAccessor="end"
          selectable
          resizable
          popup
          style={{ 
            height: 680,
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
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
          longPressThreshold={100}
          scrollToTime={new Date(1970, 1, 1, 8, 0, 0)}
          eventPropGetter={eventPropGetter}
          dayPropGetter={dayPropGetter}
          // External drag from Quick tray (desktop)
          dragFromOutsideItem={
            externalDragType !== "none"
              ? () => ({ title: externalDragType === "reminder" ? "Reminder" : "To-do" })
              : undefined
          }
          onDropFromOutside={
            externalDragType !== "none" && onExternalDrop
              ? ({ start, end, allDay }) =>
                  onExternalDrop(
                    { start, end, allDay },
                    externalDragType as Exclude<NonNullable<Props["externalDragType"]>, "none">
                  )
              : undefined
          }
          onDragOver={(e: any) => { e.preventDefault(); }}
        />
      </DndProvider>

      <style jsx>{`
        .modern-calendar-wrapper {
          position: relative;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          border-radius: 16px;
          overflow: hidden;
          background: 
            radial-gradient(circle at 20% 80%, rgba(124,58,237,0.03) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(59,130,246,0.03) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(139,92,246,0.02) 0%, transparent 50%),
            #ffffff;
        }

        .calendar-background-pattern {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: 
            radial-gradient(circle at 1px 1px, rgba(124,58,237,0.08) 1px, transparent 0);
          background-size: 20px 20px;
          opacity: 0.3;
          pointer-events: none;
        }

        /* Enhanced event styling with hover effects */
        :global(.enhanced-event) {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
          line-height: 1.2 !important;
          padding: 3px 6px !important;
        }

        :global(.enhanced-event:hover) {
          transform: translateY(-1px) !important;
          box-shadow: 0 4px 16px rgba(0,0,0,0.2) !important;
          z-index: 100 !important;
        }

        /* Specific event type enhancements */
        :global(.reminder-event:hover) {
          box-shadow: 0 4px 16px rgba(245,158,11,0.4) !important;
        }

        :global(.todo-event:hover) {
          box-shadow: 0 4px 16px rgba(5,150,105,0.4) !important;
        }

        :global(.business-event:hover) {
          box-shadow: 0 4px 16px rgba(124,58,237,0.4) !important;
        }

        :global(.friend-event:hover) {
          box-shadow: 0 4px 16px rgba(139,92,246,0.4) !important;
        }

        :global(.personal-event:hover) {
          box-shadow: 0 4px 16px rgba(59,130,246,0.4) !important;
        }

        /* Calendar header styling */
        :global(.rbc-header) {
          background: linear-gradient(135deg, #fafafb 0%, #f4f5f7 100%) !important;
          border-bottom: 1px solid #e2e8f0 !important;
          padding: 12px 8px !important;
          font-weight: 600 !important;
          color: #374151 !important;
          font-size: 13px !important;
        }

        /* Today highlighting with better contrast */
        :global(.rbc-today) {
          background: linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(124,58,237,0.06) 100%) !important;
          border: 1px solid rgba(124,58,237,0.2) !important;
        }

        /* Toolbar button styling */
        :global(.rbc-toolbar button) {
          border: 1px solid #e5e7eb !important;
          background: #ffffff !important;
          color: #374151 !important;
          border-radius: 8px !important;
          padding: 8px 12px !important;
          font-weight: 500 !important;
          transition: all 0.2s ease !important;
          margin: 0 2px !important;
        }

        :global(.rbc-toolbar button:hover) {
          background: #f3f4f6 !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
        }

        :global(.rbc-toolbar button.rbc-active) {
          background: #7c3aed !important;
          color: white !important;
          border-color: #7c3aed !important;
        }

        /* Day hover effects */
        :global(.rbc-day-bg:hover) {
          background: rgba(124,58,237,0.02) !important;
          transition: background 0.2s ease !important;
        }

        /* Better selection styling */
        :global(.rbc-slot-selection) {
          background: rgba(124,58,237,0.15) !important;
          border: 2px dashed #7c3aed !important;
          border-radius: 4px !important;
        }

        /* Weekend styling */
        :global(.rbc-off-range-bg) {
          background: rgba(248,250,252,0.8) !important;
        }

        /* Mobile responsiveness */
        @media (max-width: 768px) {
          :global(.rbc-toolbar) {
            flex-direction: column !important;
            gap: 8px !important;
          }
          
          :global(.rbc-toolbar .rbc-btn-group) {
            display: flex !important;
            justify-content: center !important;
            gap: 4px !important;
          }

          :global(.enhanced-event) {
            font-size: 10px !important;
            padding: 2px 4px !important;
          }
        }
      `}</style>
    </div>
  );
}
