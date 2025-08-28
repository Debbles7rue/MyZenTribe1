// components/CalendarGrid.tsx
"use client";

import React, { useMemo, useEffect, useState } from "react";
import { Calendar, View, Event as RBCEvent } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TouchBackend } from "react-dnd-touch-backend";
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

  // External drag from the task tray (desktop)
  externalDragType?: "none" | "reminder" | "todo";
  onExternalDrop?: (
    info: { start: Date; end: Date; allDay?: boolean },
    kind: Exclude<NonNullable<Props["externalDragType"]>, "none">
  ) => void;
};

// Client-side only localizer to avoid hydration issues
const createLocalizer = () => {
  if (typeof window === "undefined") return null;
  
  const { dateFnsLocalizer } = require("react-big-calendar");
  const { format, parse, startOfWeek, getDay } = require("date-fns");
  const { enUS } = require("date-fns/locale");
  
  return dateFnsLocalizer({
    format,
    parse,
    startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 0 }),
    getDay,
    locales: { "en-US": enUS },
  });
};

function isTouchDevice() {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

// Theme color palettes
const getThemeColors = (theme: CalendarTheme = "default") => {
  const themes = {
    default: {
      reminder: { bg: "linear-gradient(135deg, #fef3c7 0%, #fcd34d 100%)", border: "#f59e0b", color: "#92400e" },
      todo: { bg: "linear-gradient(135deg, #d1fae5 0%, #6ee7b7 100%)", border: "#059669", color: "#064e3b" },
      business: { bg: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)", border: "#7c3aed", color: "#1e293b" },
      friend: { bg: "linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)", border: "#8b5cf6", color: "#5b21b6" },
      personal: { bg: "linear-gradient(135deg, #dbeafe 0%, #93c5fd 100%)", border: "#3b82f6", color: "#1d4ed8" },
    },
    spring: {
      reminder: { bg: "linear-gradient(135deg, #fef7cd 0%, #fde047 100%)", border: "#eab308", color: "#713f12" },
      todo: { bg: "linear-gradient(135deg, #dcfce7 0%, #86efac 100%)", border: "#22c55e", color: "#15803d" },
      business: { bg: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)", border: "#16a34a", color: "#14532d" },
      friend: { bg: "linear-gradient(135deg, #f0f9ff 0%, #bae6fd 100%)", border: "#0ea5e9", color: "#0c4a6e" },
      personal: { bg: "linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 100%)", border: "#10b981", color: "#065f46" },
    },
    summer: {
      reminder: { bg: "linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)", border: "#ea580c", color: "#9a3412" },
      todo: { bg: "linear-gradient(135deg, #fef3c7 0%, #fcd34d 100%)", border: "#f59e0b", color: "#92400e" },
      business: { bg: "linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)", border: "#c2410c", color: "#7c2d12" },
      friend: { bg: "linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)", border: "#ef4444", color: "#991b1b" },
      personal: { bg: "linear-gradient(135deg, #ffedd5 0%, #fdba74 100%)", border: "#f97316", color: "#c2410c" },
    },
    autumn: {
      reminder: { bg: "linear-gradient(135deg, #fed7d7 0%, #fca5a5 100%)", border: "#dc2626", color: "#7f1d1d" },
      todo: { bg: "linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)", border: "#ea580c", color: "#9a3412" },
      business: { bg: "linear-gradient(135deg, #fff1f2 0%, #fecaca 100%)", border: "#b91c1c", color: "#7f1d1d" },
      friend: { bg: "linear-gradient(135deg, #fef3c7 0%, #fcd34d 100%)", border: "#d97706", color: "#92400e" },
      personal: { bg: "linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)", border: "#c2410c", color: "#9a3412" },
    },
    winter: {
      reminder: { bg: "linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)", border: "#6366f1", color: "#3730a3" },
      todo: { bg: "linear-gradient(135deg, #f0f9ff 0%, #bae6fd 100%)", border: "#0284c7", color: "#0c4a6e" },
      business: { bg: "linear-gradient(135deg, #f5f3ff 0%, #ddd6fe 100%)", border: "#7c3aed", color: "#581c87" },
      friend: { bg: "linear-gradient(135deg, #ede9fe 0%, #c4b5fd 100%)", border: "#8b5cf6", color: "#6b21a8" },
      personal: { bg: "linear-gradient(135deg, #dbeafe 0%, #93c5fd 100%)", border: "#2563eb", color: "#1e40af" },
    },
    nature: {
      reminder: { bg: "linear-gradient(135deg, #ecfccb 0%, #bef264 100%)", border: "#65a30d", color: "#365314" },
      todo: { bg: "linear-gradient(135deg, #f0fdf4 0%, #86efac 100%)", border: "#16a34a", color: "#14532d" },
      business: { bg: "linear-gradient(135deg, #f7fee7 0%, #d9f99d 100%)", border: "#84cc16", color: "#3f6212" },
      friend: { bg: "linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 100%)", border: "#10b981", color: "#064e3b" },
      personal: { bg: "linear-gradient(135deg, #f0fdfa 0%, #5eead4 100%)", border: "#14b8a6", color: "#134e4a" },
    },
    ocean: {
      reminder: { bg: "linear-gradient(135deg, #f0f9ff 0%, #7dd3fc 100%)", border: "#0284c7", color: "#0c4a6e" },
      todo: { bg: "linear-gradient(135deg, #ecfeff 0%, #67e8f9 100%)", border: "#06b6d4", color: "#164e63" },
      business: { bg: "linear-gradient(135deg, #f0fdfa 0%, #99f6e4 100%)", border: "#0d9488", color: "#134e4a" },
      friend: { bg: "linear-gradient(135deg, #e6fffa 0%, #a7f3d0 100%)", border: "#10b981", color: "#065f46" },
      personal: { bg: "linear-gradient(135deg, #f0f9ff 0%, #bae6fd 100%)", border: "#0ea5e9", color: "#0c4a6e" },
    },
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
  const [localizer, setLocalizer] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);

  // Initialize localizer only on client side to prevent hydration issues
  useEffect(() => {
    setLocalizer(createLocalizer());
    setIsClient(true);
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

  // Enhanced styling with theme support
  const eventPropGetter = (event: UiEvent) => {
    const r: any = event.resource || {};
    const colors = getThemeColors(theme);
    
    // Reminders / To-dos (private) - Theme-aware colors
    if (r?.event_type === "reminder") {
      const { bg, border, color } = colors.reminder;
      return {
        style: {
          background: bg,
          border: `1px solid ${border}`,
          borderRadius: "8px",
          color: color,
          cursor: "pointer",
          fontWeight: "600",
          fontSize: "11px",
          padding: "3px 6px",
          lineHeight: "1.2",
        },
        className: "enhanced-event reminder-event",
      };
    }
    
    if (r?.event_type === "todo") {
      const { bg, border, color } = colors.todo;
      return {
        style: {
          background: bg,
          border: `1px solid ${border}`,
          borderRadius: "8px",
          color: color,
          cursor: "pointer",
          fontWeight: "600",
          fontSize: "11px",
          padding: "3px 6px",
          lineHeight: "1.2",
        },
        className: "enhanced-event todo-event",
      };
    }
    
    // Business: enhanced with theme colors
    if (r?.source === "business") {
      const { bg, border, color } = colors.business;
      return {
        style: {
          background: bg,
          border: `2px solid ${border}`,
          borderRadius: "8px",
          color: color,
          cursor: "pointer",
          fontWeight: "700",
          fontSize: "11px",
          padding: "3px 6px",
          lineHeight: "1.2",
        },
        className: "enhanced-event business-event",
      };
    }
    
    // Friends' events vs personal events - theme-aware
    if (r?.by_friend) {
      const { bg, border, color } = colors.friend;
      return {
        style: {
          background: bg,
          border: `1px solid ${border}`,
          borderRadius: "8px",
          color: color,
          cursor: "pointer",
          fontWeight: r?.rsvp_me ? "700" : "500",
          fontSize: "11px",
          padding: "3px 6px",
          lineHeight: "1.2",
        },
        className: `enhanced-event friend-event ${r?.rsvp_me ? "rsvp-event" : ""}`,
      };
    }
    
    // Personal events - theme colors
    const { bg, border, color } = colors.personal;
    return {
      style: {
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: "8px",
        color: color,
        cursor: "pointer",
        fontWeight: r?.rsvp_me ? "700" : "500",
        fontSize: "11px",
        padding: "3px 6px",
        lineHeight: "1.2",
      },
      className: `enhanced-event personal-event ${r?.rsvp_me ? "rsvp-event" : ""}`,
    };
  };

  // Enhanced day styling
  const dayPropGetter = (date: Date) => {
    if (!isClient) return {};
    
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

  // Don't render calendar until client-side hydration is complete
  if (!isClient || !localizer) {
    return (
      <div className="card p-3">
        <div className="flex items-center justify-center" style={{ height: "680px" }}>
          <div className="text-gray-500">Loading calendar...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-3 modern-calendar-wrapper">
      <style jsx>{`
        .modern-calendar-wrapper {
          position: relative;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          border-radius: 16px;
          overflow: hidden;
          background: 
            radial-gradient(circle at 20% 80%, rgba(124,58,237,0.03) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(59,130,246,0.03) 0%, transparent 50%),
            #ffffff;
        }

        /* Enhanced event styling with hover effects */
        :global(.enhanced-event) {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }

        :global(.enhanced-event:hover) {
          transform: translateY(-1px) !important;
          box-shadow: 0 4px 16px rgba(0,0,0,0.2) !important;
          z-index: 100 !important;
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
    </div>
  );
}
