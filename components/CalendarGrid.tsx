// components/CalendarGrid.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar as BigCalendar,
  View,
  momentLocalizer,
  Event,
  SlotInfo,
  EventProps,
} from "react-big-calendar";
import moment from "moment";
import withDragAndDrop, {
  EventInteractionArgs,
} from "react-big-calendar/lib/addons/dragAndDrop";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TouchBackend } from "react-dnd-touch-backend";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import type { DBEvent } from "@/lib/types";
import { MoonPhaseIcon, getMoonPhaseFromResource } from "@/components/MoonPhaseDisplay";

// Initialize localizer
const localizer = momentLocalizer(moment);

// Create DnD calendar
const DnDCalendar = withDragAndDrop(BigCalendar);

type CalendarTheme = "default" | "spring" | "summer" | "autumn" | "winter" | "nature" | "ocean";

export type UiEvent = Event & {
  resource?: any;
};

interface MoonEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource: {
    moonPhase: 'moon-new' | 'moon-first' | 'moon-full' | 'moon-last';
  };
}

interface Props {
  dbEvents: DBEvent[];
  moonEvents: MoonEvent[];
  showMoon: boolean;
  showWeather?: boolean;
  theme?: CalendarTheme;
  date: Date;
  setDate: (d: Date) => void;
  view: View;
  setView: (v: View) => void;
  onSelectSlot: (slotInfo: SlotInfo) => void;
  onSelectEvent: (event: UiEvent) => void;
  onDrop: (args: EventInteractionArgs<UiEvent>) => void;
  onResize: (args: EventInteractionArgs<UiEvent>) => void;
  externalDragType?: 'none' | 'reminder' | 'todo';
  externalDragTitle?: string;
  onExternalDrop?: (
    info: { start: Date; end: Date; allDay?: boolean },
    type: 'reminder' | 'todo'
  ) => void;
}

// Theme configurations
const getThemeStyles = (theme: CalendarTheme) => {
  const themes = {
    default: {
      bg: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      primary: "#667eea",
      secondary: "#764ba2",
      text: "#ffffff",
    },
    spring: {
      bg: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
      primary: "#f093fb",
      secondary: "#f5576c",
      text: "#ffffff",
    },
    summer: {
      bg: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
      primary: "#fa709a",
      secondary: "#fee140",
      text: "#333333",
    },
    autumn: {
      bg: "linear-gradient(135deg, #ff9a56 0%, #ff6a88 100%)",
      primary: "#ff9a56",
      secondary: "#ff6a88",
      text: "#ffffff",
    },
    winter: {
      bg: "linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)",
      primary: "#89f7fe",
      secondary: "#66a6ff",
      text: "#ffffff",
    },
    nature: {
      bg: "linear-gradient(135deg, #8bc34a 0%, #4caf50 100%)",
      primary: "#8bc34a",
      secondary: "#4caf50",
      text: "#ffffff",
    },
    ocean: {
      bg: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
      primary: "#4facfe",
      secondary: "#00f2fe",
      text: "#082f49",
    },
  };
  return themes[theme];
};

export default function CalendarGrid({
  dbEvents,
  moonEvents,
  showMoon,
  showWeather = false,
  theme = "default",
  date,
  setDate,
  view,
  setView,
  onSelectSlot,
  onSelectEvent,
  onDrop,
  onResize,
  externalDragType = 'none',
  externalDragTitle,
  onExternalDrop,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const themeStyles = getThemeStyles(theme);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Convert DB events to UI events
  const dbUiEvents = useMemo<UiEvent[]>(() => 
    (dbEvents || []).map((e: DBEvent) => ({
      id: e.id,
      title: e.title,
      start: new Date(e.start_time),
      end: new Date(e.end_time),
      allDay: false,
      resource: e,
    })),
    [dbEvents]
  );

  // Merge regular events with moon events
  const allEvents = useMemo(() => {
    const events = [...dbUiEvents];
    if (showMoon) {
      events.push(...moonEvents);
    }
    return events;
  }, [dbUiEvents, moonEvents, showMoon]);

  // Event styling based on type
  const eventStyleGetter = (event: UiEvent): any => {
    const resource = event.resource as any;

    // Moon phase events - minimal styling as the icon handles the visual
    if (resource?.moonPhase) {
      return {
        style: {
          backgroundColor: 'transparent',
          border: 'none',
          color: 'transparent',
          padding: '2px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          minHeight: '24px',
        },
      };
    }

    // Reminder events
    if (resource?.event_type === "reminder") {
      return {
        style: {
          backgroundColor: "#fbbf24",
          border: "1px solid #f59e0b",
          borderRadius: "6px",
          color: "#92400e",
          cursor: "pointer",
          fontWeight: 600,
          fontSize: "11px",
          padding: "2px 4px",
        },
      };
    }

    // Todo events
    if (resource?.event_type === "todo") {
      return {
        style: {
          backgroundColor: "#34d399",
          border: "1px solid #10b981",
          borderRadius: "6px",
          color: "#064e3b",
          cursor: "pointer",
          fontWeight: 600,
          fontSize: "11px",
          padding: "2px 4px",
        },
      };
    }

    // Business events
    if (resource?.source === "business") {
      return {
        style: {
          backgroundColor: "#e5e7eb",
          border: "2px solid #7c3aed",
          borderRadius: "6px",
          color: "#374151",
          cursor: "pointer",
          fontWeight: 700,
          fontSize: "11px",
          padding: "2px 4px",
        },
      };
    }

    // Friend events
    if (resource?.by_friend) {
      return {
        style: {
          backgroundColor: "#c7d2fe",
          border: "1px solid #8b5cf6",
          borderRadius: "6px",
          color: "#5b21b6",
          cursor: "pointer",
          fontWeight: resource?.rsvp_me ? 700 : 500,
          fontSize: "11px",
          padding: "2px 4px",
        },
      };
    }

    // Default events
    return {
      style: {
        backgroundColor: "#93c5fd",
        border: "1px solid #3b82f6",
        borderRadius: "6px",
        color: "#1e40af",
        cursor: "pointer",
        fontWeight: resource?.rsvp_me ? 700 : 500,
        fontSize: "11px",
        padding: "2px 4px",
      },
    };
  };

  // Custom event component for moon phases and other events
  const EventComponent = ({ event }: EventProps<UiEvent>) => {
    const resource = event.resource as any;
    const moonPhase = getMoonPhaseFromResource(resource);
    
    // Render moon phase icon if it's a moon event
    if (moonPhase) {
      return (
        <div className="flex items-center justify-center w-full h-full">
          <MoonPhaseIcon phase={moonPhase} />
        </div>
      );
    }
    
    // Render normal event title
    return (
      <div className="px-1 truncate text-xs">
        {event.title}
      </div>
    );
  };

  // Handle external drop (from sidebar)
  const handleDropFromOutside = ({ start, end, allDay }: any) => {
    if (onExternalDrop && externalDragType !== 'none') {
      onExternalDrop(
        { start, end, allDay },
        externalDragType as 'reminder' | 'todo'
      );
    }
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-[650px]">
        <div className="animate-pulse text-gray-500">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div 
      className="calendar-wrapper rounded-xl overflow-hidden shadow-lg"
      style={{
        background: themeStyles.bg,
        padding: '1rem',
      }}
    >
      <DnDCalendar
        localizer={localizer}
        events={allEvents}
        view={view}
        date={date}
        onView={setView}
        onNavigate={setDate}
        onSelectSlot={onSelectSlot}
        onSelectEvent={onSelectEvent}
        onEventDrop={onDrop}
        onEventResize={onResize}
        onDropFromOutside={handleDropFromOutside}
        eventPropGetter={eventStyleGetter}
        components={{
          event: EventComponent,
        }}
        selectable
        resizable
        popup
        dragFromOutsideItem={
          externalDragType !== 'none'
            ? () => (
                <div className="dnd-drag-preview">
                  {externalDragTitle || 'Dragging...'}
                </div>
              )
            : undefined
        }
        style={{
          minHeight: 650,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
        className="custom-calendar"
      />
      
      {/* Mobile-optimized styles */}
      <style jsx global>{`
        .custom-calendar {
          font-size: 14px;
        }
        
        @media (max-width: 768px) {
          .custom-calendar {
            font-size: 12px;
          }
          
          .rbc-toolbar {
            flex-direction: column;
            gap: 8px;
          }
          
          .rbc-toolbar-label {
            font-size: 16px;
            font-weight: 600;
          }
          
          .rbc-btn-group {
            display: flex;
            gap: 4px;
          }
          
          .rbc-btn-group button {
            padding: 6px 12px;
            font-size: 12px;
          }
          
          .rbc-month-view {
            overflow-x: auto;
          }
          
          .rbc-date-cell {
            padding: 2px;
            font-size: 11px;
          }
          
          .rbc-event {
            padding: 0 !important;
            font-size: 10px !important;
          }
          
          .rbc-event-content {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }
        
        /* Moon phase specific styles */
        .rbc-event[title*="Moon"] {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
        
        /* Hover effects for desktop */
        @media (hover: hover) {
          .rbc-event:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: all 0.2s;
          }
          
          .rbc-event[title*="Moon"]:hover {
            transform: none;
            box-shadow: none;
          }
        }
        
        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .rbc-calendar {
            background: #1f2937;
            color: #f3f4f6;
          }
          
          .rbc-toolbar button {
            color: #f3f4f6;
          }
          
          .rbc-month-view,
          .rbc-time-view {
            border-color: #374151;
          }
          
          .rbc-day-bg,
          .rbc-time-content {
            border-color: #374151;
          }
          
          .rbc-today {
            background-color: rgba(99, 102, 241, 0.1);
          }
          
          .rbc-off-range-bg {
            background: #111827;
          }
        }
        
        /* Accessibility improvements */
        .rbc-event:focus {
          outline: 2px solid #4f46e5;
          outline-offset: 2px;
        }
        
        .rbc-show-more {
          color: #4f46e5;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
