// components/CalendarGrid.tsx
"use client";

import React, { useMemo, useEffect, useState } from "react";
import type { DBEvent } from "@/lib/types";

// Import types only
import type { View, Event as RBCEvent } from "react-big-calendar";

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

// Theme color palettes
const getThemeColors = (theme: CalendarTheme = "default") => {
  const themes = {
    default: {
      reminder: { bg: "#fef3c7", border: "#f59e0b", color: "#92400e" },
      todo: { bg: "#d1fae5", border: "#059669", color: "#064e3b" },
      business: { bg: "#f8fafc", border: "#7c3aed", color: "#1e293b" },
      friend: { bg: "#e0e7ff", border: "#8b5cf6", color: "#5b21b6" },
      personal: { bg: "#dbeafe", border: "#3b82f6", color: "#1d4ed8" },
    },
    spring: {
      reminder: { bg: "#fef7cd", border: "#eab308", color: "#713f12" },
      todo: { bg: "#dcfce7", border: "#22c55e", color: "#15803d" },
      business: { bg: "#f0fdf4", border: "#16a34a", color: "#14532d" },
      friend: { bg: "#f0f9ff", border: "#0ea5e9", color: "#0c4a6e" },
      personal: { bg: "#ecfdf5", border: "#10b981", color: "#065f46" },
    },
    summer: {
      reminder: { bg: "#fed7aa", border: "#ea580c", color: "#9a3412" },
      todo: { bg: "#fef3c7", border: "#f59e0b", color: "#92400e" },
      business: { bg: "#fff7ed", border: "#c2410c", color: "#7c2d12" },
      friend: { bg: "#fef2f2", border: "#ef4444", color: "#991b1b" },
      personal: { bg: "#ffedd5", border: "#f97316", color: "#c2410c" },
    },
    autumn: {
      reminder: { bg: "#fed7d7", border: "#dc2626", color: "#7f1d1d" },
      todo: { bg: "#fed7aa", border: "#ea580c", color: "#9a3412" },
      business: { bg: "#fff1f2", border: "#b91c1c", color: "#7f1d1d" },
      friend: { bg: "#fef3c7", border: "#d97706", color: "#92400e" },
      personal: { bg: "#ffedd5", border: "#c2410c", color: "#9a3412" },
    },
    winter: {
      reminder: { bg: "#e0e7ff", border: "#6366f1", color: "#3730a3" },
      todo: { bg: "#f0f9ff", border: "#0284c7", color: "#0c4a6e" },
      business: { bg: "#f5f3ff", border: "#7c3aed", color: "#581c87" },
      friend: { bg: "#ede9fe", border: "#8b5cf6", color: "#6b21a8" },
      personal: { bg: "#dbeafe", border: "#2563eb", color: "#1e40af" },
    },
    nature: {
      reminder: { bg: "#ecfccb", border: "#65a30d", color: "#365314" },
      todo: { bg: "#f0fdf4", border: "#16a34a", color: "#14532d" },
      business: { bg: "#f7fee7", border: "#84cc16", color: "#3f6212" },
      friend: { bg: "#ecfdf5", border: "#10b981", color: "#064e3b" },
      personal: { bg: "#f0fdfa", border: "#14b8a6", color: "#134e4a" },
    },
    ocean: {
      reminder: { bg: "#f0f9ff", border: "#0284c7", color: "#0c4a6e" },
      todo: { bg: "#ecfeff", border: "#06b6d4", color: "#164e63" },
      business: { bg: "#f0fdfa", border: "#0d9488", color: "#134e4a" },
      friend: { bg: "#e6fffa", border: "#10b981", color: "#065f46" },
      personal: { bg: "#f0f9ff", border: "#0ea5e9", color: "#0c4a6e" },
    },
  };
  return themes[theme];
};

// Fallback calendar component
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
  const [CalendarComponent, setCalendarComponent] = useState<any>(null);
  const [DnDCalendar, setDnDCalendar] = useState<any>(null);
  const [DndProvider, setDndProvider] = useState<any>(null);
  const [Backend, setBackend] = useState<any>(null);
  const [localizer, setLocalizer] = useState<any>(null);

  useEffect(() => {
    // Load all dependencies on client side only
    Promise.all([
      import("react-big-calendar"),
      import("react-big-calendar/lib/addons/dragAndDrop"),
      import("react-dnd"),
      import("react-dnd-html5-backend"),
      import("react-dnd-touch-backend"),
      import("@/lib/localizer")
    ]).then(([
      rbcModule,
      dndModule, 
      reactDndModule,
      html5Module,
      touchModule,
      localizerModule
    ]) => {
      const isTouchDevice = () => "ontouchstart" in window || navigator.maxTouchPoints > 0;
      
      setCalendarComponent(() => rbcModule.Calendar);
      setDnDCalendar(() => dndModule.default(rbcModule.Calendar as any));
      setDndProvider(() => reactDndModule.DndProvider);
      setBackend(() => isTouchDevice() ? touchModule.TouchBackend : html5Module.HTML5Backend);
      setLocalizer(localizerModule.localizer);
    }).catch(error => {
      console.error('Failed to load calendar components:', error);
    });
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
    
    if (r?.event_type === "reminder") {
      const { bg, border, color } = colors.reminder;
      return {
        style: {
          backgroundColor: bg,
          border: `1px solid ${border}`,
          borderRadius: "6px",
          color: color,
          cursor: "pointer",
          fontWeight: "600",
          fontSize: "11px",
          padding: "2px 4px",
        }
      };
    }
    
    if (r?.event_type === "todo") {
      const { bg, border, color } = colors.todo;
      return {
        style: {
          backgroundColor: bg,
          border: `1px solid ${border}`,
          borderRadius: "6px",
          color: color,
          cursor: "pointer",
          fontWeight: "600",
          fontSize: "11px",
          padding: "2px 4px",
        }
      };
    }
    
    if (r?.source === "business") {
      const { bg, border, color } = colors.business;
      return {
        style: {
          backgroundColor: bg,
          border: `2px solid ${border}`,
          borderRadius: "6px",
          color: color,
          cursor: "pointer",
          fontWeight: "700",
          fontSize: "11px",
          padding: "2px 4px",
        }
      };
    }
    
    if (r?.by_friend) {
      const { bg, border, color } = colors.friend;
      return {
        style: {
          backgroundColor: bg,
          border: `1px solid ${border}`,
          borderRadius: "6px",
          color: color,
          cursor: "pointer",
          fontWeight: r?.rsvp_me ? "700" : "500",
          fontSize: "11px",
          padding: "2px 4px",
        }
      };
    }
    
    // Personal events
    const { bg, border, color } = colors.personal;
    return {
      style: {
        backgroundColor: bg,
        border: `1px solid ${border}`,
        borderRadius: "6px",
        color: color,
        cursor: "pointer",
        fontWeight: r?.rsvp_me ? "700" : "500",
        fontSize: "11px",
        padding: "2px 4px",
      }
    };
  };

  // Don't render until all components are loaded
  if (!CalendarComponent || !DnDCalendar || !DndProvider || !Backend || !localizer) {
    return (
      <div className="card p-3">
        <div className="flex items-center justify-center" style={{ height: "680px" }}>
          <div className="text-gray-500">Loading calendar...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-3" style={{ position: "relative" }}>
      {/* Weather overlay */}
      {showWeather && view === "month" && (
        <div style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          background: "rgba(255,255,255,0.95)",
          borderRadius: "12px",
          padding: "6px 12px",
          fontSize: "12px",
          fontWeight: "500",
          color: "#374151",
          border: "1px solid #e5e7eb",
          zIndex: 10,
        }}>
          Weather: 22°{temperatureUnit === "celsius" ? "C" : "F"}
        </div>
      )}
      
      {/* Moon phase overlay */}
      {showMoon && view === "month" && (
        <div style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          background: "rgba(255,255,255,0.95)",
          borderRadius: "12px",
          padding: "6px 12px",
          fontSize: "14px",
          border: "1px solid #e5e7eb",
          zIndex: 10,
        }}>
          Moon phase
        </div>
      )}

      <DndProvider backend={Backend} options={{ enableMouseEvents: true }}>
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
        /* Enhanced calendar styling */
        .rbc-calendar {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .rbc-header {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border-bottom: 1px solid #e2e8f0;
          padding
