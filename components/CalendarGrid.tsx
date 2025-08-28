// components/CalendarGrid.tsx
"use client";

import React, { useMemo, useState, useRef } from "react";
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

// Enhanced event component with modern styling and interactions
function ModernEventCell({ event }: { event: UiEvent }) {
  const [isHovered, setIsHovered] = useState(false);
  const r = (event.resource || {}) as any;
  
  const getEventStyle = () => {
    const baseStyle = {
      borderRadius: "8px",
      padding: "4px 8px",
      fontSize: "11px",
      fontWeight: "500",
      lineHeight: "1.2",
      cursor: "pointer",
      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
      boxShadow: isHovered ? "0 4px 12px rgba(0,0,0,0.15)" : "0 1px 3px rgba(0,0,0,0.1)",
      transform: isHovered ? "translateY(-1px)" : "translateY(0)",
      border: "1px solid",
      position: "relative" as const,
      overflow: "hidden" as const,
    };

    // Event type specific styling
    if (r?.event_type === "reminder") {
      return {
        ...baseStyle,
        background: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)",
        borderColor: "#fca5a5",
        color: "#991b1b",
      };
    }
    
    if (r?.event_type === "todo") {
      return {
        ...baseStyle,
        background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
        borderColor: "#86efac",
        color: "#166534",
      };
    }
    
    if (r?.source === "business") {
      return {
        ...baseStyle,
        background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
        borderColor: "#cbd5e1",
        color: "#1e293b",
        fontWeight: "600",
      };
    }
    
    // Friends' events vs personal events
    const isFriendEvent = r?.by_friend;
    return {
      ...baseStyle,
      background: isFriendEvent 
        ? "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)"
        : "linear-gradient(135deg, #e0f2fe 0%, #b3e5fc 100%)",
      borderColor: isFriendEvent ? "#60a5fa" : "#38bdf8",
      color: "#1e40af",
      fontWeight: r?.rsvp_me ? "600" : "500",
    };
  };

  const titleStyle = r?.rsvp_me ? { 
    color: "#7c3aed",
    fontWeight: "700",
  } : {};

  return (
    <div
      style={getEventStyle()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="modern-event-cell"
    >
      <div style={titleStyle}>
        {(event as any).title}
      </div>
      {r?.location && (
        <div style={{ 
          fontSize: "9px", 
          opacity: 0.8, 
          marginTop: "1px",
          whiteSpace: "nowrap" as const,
          overflow: "hidden" as const,
          textOverflow: "ellipsis" as const,
        }}>
          📍 {r.location}
        </div>
      )}
    </div>
  );
}

// Weather component (placeholder for now)
function WeatherDisplay({ date, unit }: { date: Date; unit: "celsius" | "fahrenheit" }) {
  // This would integrate with your weather API
  return (
    <div style={{
      position: "absolute" as const,
      top: "8px",
      right: "8px",
      background: "rgba(255,255,255,0.9)",
      backdropFilter: "blur(10px)",
      borderRadius: "12px",
      padding: "4px 8px",
      fontSize: "10px",
      fontWeight: "500",
      color: "#374151",
      border: "1px solid rgba(229,231,235,0.5)",
    }}>
      🌤️ 22°{unit === "celsius" ? "C" : "F"}
    </div>
  );
}

// Moon phase component
function MoonPhaseDisplay({ date }: { date: Date }) {
  // This would integrate with your moon phase logic
  const getMoonPhase = () => {
    // Placeholder logic - replace with your actual moon phase calculation
    const phases = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"];
    return phases[Math.floor(Math.random() * phases.length)];
  };

  return (
    <div style={{
      position: "absolute" as const,
      top: "8px",
      left: "8px",
      background: "rgba(255,255,255,0.9)",
      backdropFilter: "blur(10px)",
      borderRadius: "12px",
      padding: "4px 8px",
      fontSize: "12px",
      border: "1px solid rgba(229,231,235,0.5)",
    }}>
      {getMoonPhase()}
    </div>
  );
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
  const calendarRef = useRef<any>(null);

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

  // Enhanced styling function with modern design
  const eventPropGetter = (event: UiEvent) => {
    const r: any = event.resource || {};
    
    const baseProps = {
      style: {
        border: "none",
        borderRadius: "8px",
        padding: "2px 4px",
        fontSize: "11px",
        fontWeight: "500",
        cursor: "pointer",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        transition: "all 0.2s ease",
      },
      className: "modern-event-item",
    };

    // Let the ModernEventCell handle styling
    return baseProps;
  };

  // Custom day prop getter for better day styling
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
    <div className="modern-calendar-container">
      <div className="calendar-wrapper" style={{ position: "relative" }}>
        {/* Weather overlay */}
        {showWeather && view === "month" && (
          <WeatherDisplay date={date} unit={temperatureUnit} />
        )}
        
        {/* Moon phase overlay */}
        {showMoon && view === "month" && (
          <MoonPhaseDisplay date={date} />
        )}

        <DndProvider backend={Backend as any} options={isTouchDevice() ? { enableMouseEvents: true } : undefined}>
          <DnDCalendar
            ref={calendarRef}
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
            components={{ 
              event: ({ event }) => <ModernEventCell event={event as UiEvent} />
            }}
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
      </div>

      <style jsx>{`
        .modern-calendar-container {
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          overflow: hidden;
          border: 1px solid #e5e7eb;
        }
        
        .calendar-wrapper {
          padding: 16px;
        }

        .modern-event-cell:hover {
          z-index: 10;
        }

        /* Enhanced react-big-calendar styling */
        :global(.rbc-calendar) {
          font-family: system-ui, -apple-system, sans-serif;
        }

        :global(.rbc-header) {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border-bottom: 1px solid #e2e8f0;
          padding: 12px 8px;
          font-weight: 600;
          color: #374151;
          font-size: 13px;
        }

        :global(.rbc-today) {
          background: linear-gradient(135deg, rgba(124,58,237,0.05) 0%, rgba(124,58,237,0.02) 100%) !important;
        }

        :global(.rbc-off-range-bg) {
          background: #f9fafb;
        }

        :global(.rbc-day-bg:hover) {
          background: rgba(124,58,237,0.02);
          transition: background 0.2s ease;
        }

        :global(.rbc-slot-selection) {
          background: rgba(124,58,237,0.1);
          border: 1px dashed #7c3aed;
        }

        :global(.rbc-time-view .rbc-time-gutter) {
          background: #f8fafc;
          border-right: 1px solid #e2e8f0;
        }

        :global(.rbc-time-header) {
          border-bottom: 2px solid #e2e8f0;
        }

        :global(.rbc-toolbar) {
          margin-bottom: 16px;
          padding: 0 8px;
        }

        :global(.rbc-toolbar button) {
          border: 1px solid #e5e7eb;
          background: #ffffff;
          color: #374151;
          border-radius: 8px;
          padding: 8px 12px;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        :global(.rbc-toolbar button:hover) {
          background: #f3f4f6;
          transform: translateY(-1px);
        }

        :global(.rbc-toolbar button.rbc-active) {
          background: #7c3aed;
          color: white;
          border-color: #7c3aed;
        }

        @media (max-width: 768px) {
          .calendar-wrapper {
            padding: 8px;
          }
          
          :global(.rbc-toolbar) {
            flex-direction: column;
            gap: 8px;
          }
          
          :global(.rbc-toolbar .rbc-btn-group) {
            display: flex;
            justify-content: center;
            gap: 4px;
          }
        }
      `}</style>
    </div>
  );
}
