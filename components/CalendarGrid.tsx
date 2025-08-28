// components/CalendarGrid.tsx
"use client";

import React, { useMemo, useEffect, useState } from "react";
import { Calendar, View, Event as RBCEvent } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TouchBackend } from "react-dnd-touch-backend";
import { localizer } from "@/lib/localizer";
import type { DBEvent } from "@/lib/types";

const DnDCalendar = withDragAndDrop<UiEvent, object>(Calendar as any);
export type UiEvent = RBCEvent & { resource: any };

type CalendarTheme = "default" | "spring" | "summer" | "autumn" | "winter" | "nature" | "ocean";

type Props = {
  dbEvents: DBEvent[];
  moonEvents: UiEvent[];
  showMoon: boolean;
  showWeather?: boolean;
  temperatureUnit?: "celsius" | "fahrenheit";
  theme?: CalendarTheme;

  date: Date;
  setDate: (d: Date) => void;
  view: View;
  setView: (v: View) => void;

  onSelectSlot: (arg: { start: Date; end: Date; action?: string; slots?: Date[] }) => void;
  onSelectEvent: (evt: UiEvent) => void;
  onDrop: ({ event, start, end }: { event: UiEvent; start: Date; end: Date }) => void;
  onResize: ({ event, start, end }: { event: UiEvent; start: Date; end: Date }) => void;

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

// Theme configurations for backgrounds
const getTheme = (theme: CalendarTheme = "default") => {
  const themes = {
    default: {
      bg: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
      headerBg: "#f1f5f9",
      todayBg: "rgba(124,58,237,0.1)",
      accent: "#7c3aed"
    },
    spring: {
      bg: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #bbf7d0 100%)",
      headerBg: "#dcfce7",
      todayBg: "rgba(34,197,94,0.15)",
      accent: "#22c55e"
    },
    summer: {
      bg: "linear-gradient(135deg, #fff7ed 0%, #fed7aa 50%, #fbbf24 100%)",
      headerBg: "#fed7aa",
      todayBg: "rgba(245,158,11,0.15)",
      accent: "#f59e0b"
    },
    autumn: {
      bg: "linear-gradient(135deg, #fff1f2 0%, #fecaca 50%, #fed7aa 100%)",
      headerBg: "#fecaca",
      todayBg: "rgba(239,68,68,0.15)",
      accent: "#ef4444"
    },
    winter: {
      bg: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 50%, #ddd6fe 100%)",
      headerBg: "#ede9fe",
      todayBg: "rgba(99,102,241,0.15)",
      accent: "#6366f1"
    },
    nature: {
      bg: "linear-gradient(135deg, #f7fee7 0%, #ecfdf5 50%, #d1fae5 100%)",
      headerBg: "#ecfdf5",
      todayBg: "rgba(132,204,22,0.15)",
      accent: "#84cc16"
    },
    ocean: {
      bg: "linear-gradient(135deg, #f0f9ff 0%, #ecfeff 50%, #bae6fd 100%)",
      headerBg: "#e0f2fe",
      todayBg: "rgba(14,165,233,0.15)",
      accent: "#0ea5e9"
    }
  };
  return themes[theme];
};

export default function CalendarGrid({
  dbEvents, moonEvents, showMoon,
  showWeather = false,
  temperatureUnit = "celsius",
  theme = "default",
  date, setDate, view, setView,
  onSelectSlot, onSelectEvent, onDrop, onResize,
  externalDragType = "none",
  onExternalDrop,
}: Props) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

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

  const themeConfig = getTheme(theme);

  // Event styling
  const eventPropGetter = (event: UiEvent) => {
    const r: any = event.resource || {};
    
    if (r?.event_type === "reminder") {
      return {
        style: {
          background: "#fbbf24",
          border: "1px solid #f59e0b",
          borderRadius: "6px",
          color: "#92400e",
          cursor: "pointer",
          fontWeight: "600",
          fontSize: "11px",
        },
      };
    }
    
    if (r?.event_type === "todo") {
      return {
        style: {
          background: "#34d399",
          border: "1px solid #10b981",
          borderRadius: "6px",
          color: "#064e3b",
          cursor: "pointer",
          fontWeight: "600",
          fontSize: "11px",
        },
      };
    }
    
    if (r?.source === "business") {
      return {
        style: {
          background: "#e5e7eb",
          border: "2px solid #7c3aed",
          borderRadius: "6px",
          color: "#374151",
          cursor: "pointer",
          fontWeight: "700",
          fontSize: "11px",
        },
      };
    }
    
    if (r?.by_friend) {
      return {
        style: {
          background: "#c7d2fe",
          border: "1px solid #8b5cf6",
          borderRadius: "6px",
          color: "#5b21b6",
          cursor: "pointer",
          fontWeight: r?.rsvp_me ? "700" : "500",
          fontSize: "11px",
        },
      };
    }
    
    return {
      style: {
        background: "#93c5fd",
        border: "1px solid #3b82f6",
        borderRadius: "6px",
        color: "#1e40af",
        cursor: "pointer",
        fontWeight: r?.rsvp_me ? "700" : "500",
        fontSize: "11px",
      },
    };
  };

  const Backend = isTouchDevice() ? TouchBackend : HTML5Backend;

  if (!mounted) {
    return (
      <div className="card p-3">
        <div style={{ height: "680px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div>Loading calendar...</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="themed-calendar-wrapper"
      style={{
        background: themeConfig.bg,
        borderRadius: "16px",
        padding: "16px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
        position: "relative",
      }}
    >
      {/* Weather overlay */}
      {showWeather && view === "month" && (
        <div style={{
          position: "absolute",
          top: "24px",
          right: "24px",
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(8px)",
          borderRadius: "12px",
          padding: "8px 12px",
          fontSize: "12px",
          fontWeight: "600",
          color: "#374151",
          border: "1px solid rgba(255,255,255,0.5)",
          zIndex: 10,
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
        }}>
          ☀️ 22°{temperatureUnit === "celsius" ? "C" : "F"}
        </div>
      )}
      
      {/* Moon phase overlay */}
      {showMoon && view === "month" && (
        <div style={{
          position: "absolute",
          top: "24px",
          left: "24px",
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(8px)",
          borderRadius: "12px",
          padding: "8px 12px",
          fontSize: "14px",
          border: "1px solid rgba(255,255,255,0.5)",
          zIndex: 10,
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
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
            height: 650,
            background: "rgba(255,255,255,0.8)",
            borderRadius: "12px",
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

      <style jsx global>{`
        .themed-calendar-wrapper .rbc-header {
          background: ${themeConfig.headerBg} !important;
          border-bottom: 1px solid rgba(0,0,0,0.1) !important;
          padding: 12px 8px !important;
          font-weight: 600 !important;
          color: #374151 !important;
          font-size: 13px !important;
        }

        .themed-calendar-wrapper .rbc-today {
          background: ${themeConfig.todayBg} !important;
        }

        .themed-calendar-wrapper .rbc-toolbar {
          margin-bottom: 16px !important;
          padding: 0 8px !important;
        }

        .themed-calendar-wrapper .rbc-toolbar button {
          border: 1px solid rgba(0,0,0,0.1) !important;
          background: rgba(255,255,255,0.9) !important;
          color: #374151 !important;
          border-radius: 8px !important;
          padding: 8px 12px !important;
          font-weight: 500 !important;
          transition: all 0.2s ease !important;
          margin: 0 2px !important;
        }

        .themed-calendar-wrapper .rbc-toolbar button:hover {
          background: rgba(255,255,255,1) !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 4px 8px rgba(0,0,0,0.1) !important;
        }

        .themed-calendar-wrapper .rbc-toolbar button.rbc-active {
          background: ${themeConfig.accent} !important;
          color: white !important;
          border-color: ${themeConfig.accent} !important;
        }

        .themed-calendar-wrapper .rbc-day-bg:hover {
          background: rgba(255,255,255,0.5) !important;
          transition: background 0.2s ease !important;
        }

        .themed-calendar-wrapper .rbc-slot-selection {
          background: rgba(124,58,237,0.15) !important;
          border: 2px dashed #7c3aed !important;
          border-radius: 4px !important;
        }

        @media (max-width: 768px) {
          .themed-calendar-wrapper .rbc-toolbar {
            flex-direction: column !important;
            gap: 8px !important;
          }
          
          .themed-calendar-wrapper .rbc-toolbar .rbc-btn-group {
            display: flex !important;
            justify-content: center !important;
            gap: 4px !important;
          }
        }
      `}</style>
    </div>
  );
}
