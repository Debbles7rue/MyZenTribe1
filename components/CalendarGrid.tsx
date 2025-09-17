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

// Try to import MoonPhaseDisplay, but provide fallback if it doesn't exist
let MoonPhaseIcon: any = null;
let getMoonPhaseFromResource: any = null;

try {
  const MoonModule = require("@/components/MoonPhaseDisplay");
  MoonPhaseIcon = MoonModule.MoonPhaseIcon;
  getMoonPhaseFromResource = MoonModule.getMoonPhaseFromResource;
} catch (e) {
  console.log("MoonPhaseDisplay not found, using emoji fallback");
}

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
  temperatureUnit?: "celsius" | "fahrenheit";
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

// Check if device is touch-enabled
function isTouchDevice() {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

// Fallback moon phase emoji mapper
const getMoonEmoji = (phase: string) => {
  switch (phase) {
    case 'moon-new': return '🌑';
    case 'moon-first': return '🌓';
    case 'moon-full': return '🌕';
    case 'moon-last': return '🌗';
    default: return '🌙';
  }
};

// Theme configurations - only affects accents and highlights, not main background
const getThemeStyles = (theme: CalendarTheme) => {
  const themes = {
    default: {
      accent: "#8b5cf6", // Purple
      todayBg: "rgba(139, 92, 246, 0.08)",
      hover: "rgba(139, 92, 246, 0.03)",
      selection: "rgba(139, 92, 246, 0.15)",
    },
    spring: {
      accent: "#ec4899", // Pink
      todayBg: "rgba(236, 72, 153, 0.08)",
      hover: "rgba(236, 72, 153, 0.03)",
      selection: "rgba(236, 72, 153, 0.15)",
    },
    summer: {
      accent: "#f59e0b", // Amber
      todayBg: "rgba(245, 158, 11, 0.08)",
      hover: "rgba(245, 158, 11, 0.03)",
      selection: "rgba(245, 158, 11, 0.15)",
    },
    autumn: {
      accent: "#ea580c", // Orange
      todayBg: "rgba(234, 88, 12, 0.08)",
      hover: "rgba(234, 88, 12, 0.03)",
      selection: "rgba(234, 88, 12, 0.15)",
    },
    winter: {
      accent: "#3b82f6", // Blue
      todayBg: "rgba(59, 130, 246, 0.08)",
      hover: "rgba(59, 130, 246, 0.03)",
      selection: "rgba(59, 130, 246, 0.15)",
    },
    nature: {
      accent: "#22c55e", // Green
      todayBg: "rgba(34, 197, 94, 0.08)",
      hover: "rgba(34, 197, 94, 0.03)",
      selection: "rgba(34, 197, 94, 0.15)",
    },
    ocean: {
      accent: "#0ea5e9", // Sky blue
      todayBg: "rgba(14, 165, 233, 0.08)",
      hover: "rgba(14, 165, 233, 0.03)",
      selection: "rgba(14, 165, 233, 0.15)",
    },
  };
  return themes[theme];
};

export default function CalendarGrid({
  dbEvents,
  moonEvents,
  showMoon,
  showWeather = false,
  temperatureUnit = "celsius",
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
  const [isMobile, setIsMobile] = useState(false);
  const themeStyles = getThemeStyles(theme);

  // Detect mobile device
  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || isTouchDevice());
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Convert DB events to UI events
  const dbUiEvents = useMemo<UiEvent[]>(() => 
    (dbEvents || []).map((e: DBEvent) => ({
      id: e.id,
      title: e.title,
      start: new Date(e.start_time),
      end: new Date(e.end_time),
      allDay: e.all_day || false,
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

    // Moon phase events
    if (resource?.moonPhase) {
      return {
        style: {
          backgroundColor: 'transparent',
          border: 'none',
          color: '#1f2937',
          padding: '2px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'default',
          minHeight: '20px',
          fontSize: '16px',
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
          fontSize: isMobile ? "10px" : "11px",
          padding: isMobile ? "3px 5px" : "4px 6px",
          minHeight: isMobile ? "22px" : "24px",
        },
      };
    }

    // Todo events
    if (resource?.event_type === "todo") {
      return {
        style: {
          backgroundColor: resource?.completed ? "#86efac" : "#34d399",
          border: `1px solid ${resource?.completed ? "#22c55e" : "#10b981"}`,
          borderRadius: "6px",
          color: "#064e3b",
          cursor: "pointer",
          fontWeight: 600,
          fontSize: isMobile ? "10px" : "11px",
          padding: isMobile ? "3px 5px" : "4px 6px",
          minHeight: isMobile ? "22px" : "24px",
          textDecoration: resource?.completed ? "line-through" : "none",
        },
      };
    }

    // Business events
    if (resource?.source === "business" || resource?.kind === "business") {
      return {
        style: {
          backgroundColor: "#1f2937",
          border: "2px solid #374151",
          borderRadius: "6px",
          color: "#f3f4f6",
          cursor: "pointer",
          fontWeight: 700,
          fontSize: isMobile ? "10px" : "11px",
          padding: isMobile ? "3px 5px" : "4px 6px",
          minHeight: isMobile ? "22px" : "24px",
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
          fontSize: isMobile ? "10px" : "11px",
          padding: isMobile ? "3px 5px" : "4px 6px",
          minHeight: isMobile ? "22px" : "24px",
        },
      };
    }

    // Community events
    if (resource?.kind === "community") {
      return {
        style: {
          backgroundColor: "#fce7f3",
          border: "1px solid #ec4899",
          borderRadius: "6px",
          color: "#be185d",
          cursor: "pointer",
          fontWeight: 600,
          fontSize: isMobile ? "10px" : "11px",
          padding: isMobile ? "3px 5px" : "4px 6px",
          minHeight: isMobile ? "22px" : "24px",
        },
      };
    }

    // Default personal events
    return {
      style: {
        backgroundColor: "#93c5fd",
        border: "1px solid #3b82f6",
        borderRadius: "6px",
        color: "#1e40af",
        cursor: "pointer",
        fontWeight: resource?.rsvp_me ? 700 : 500,
        fontSize: isMobile ? "10px" : "11px",
        padding: isMobile ? "3px 5px" : "4px 6px",
        minHeight: isMobile ? "22px" : "24px",
      },
    };
  };

  // Custom event component for moon phases and other events
  const EventComponent = ({ event }: EventProps<UiEvent>) => {
    const resource = event.resource as any;
    
    // Handle moon phases - use MoonPhaseIcon if available, otherwise use emoji
    if (resource?.moonPhase) {
      if (MoonPhaseIcon && getMoonPhaseFromResource) {
        const moonPhase = getMoonPhaseFromResource(resource);
        if (moonPhase) {
          return (
            <div className="flex items-center justify-center w-full h-full p-0">
              <MoonPhaseIcon phase={moonPhase} />
            </div>
          );
        }
      }
      // Fallback to emoji if MoonPhaseDisplay isn't available
      return (
        <div className="flex items-center justify-center w-full h-full text-base">
          {getMoonEmoji(resource.moonPhase)}
        </div>
      );
    }

    // Render todo with checkbox
    if (resource?.event_type === "todo") {
      return (
        <div className="flex items-center gap-1 px-1">
          <span className="text-[10px]">
            {resource?.completed ? "✓" : "○"}
          </span>
          <span className="truncate flex-1 text-[10px] md:text-xs">
            {event.title}
          </span>
        </div>
      );
    }

    // Render reminder with icon
    if (resource?.event_type === "reminder") {
      return (
        <div className="flex items-center gap-1 px-1">
          <span className="text-[10px]">⏰</span>
          <span className="truncate flex-1 text-[10px] md:text-xs">
            {event.title}
          </span>
        </div>
      );
    }
    
    // Render normal event title
    return (
      <div className="px-1 truncate text-[10px] md:text-xs">
        {event.title}
      </div>
    );
  };

  // Handle external drop (from sidebar)
  const handleDropFromOutside = ({ start, end, allDay }: any) => {
    if (onExternalDrop && externalDragType !== 'none' && !isMobile) {
      onExternalDrop(
        { start, end, allDay },
        externalDragType as 'reminder' | 'todo'
      );
    }
  };

  // Select appropriate DnD backend
  const Backend = isMobile ? TouchBackend : HTML5Backend;
  const backendOptions = isMobile ? {
    enableMouseEvents: true,
    enableTouchEvents: true,
    enableKeyboardEvents: true,
    delayTouchStart: 200,
    touchSlop: 10,
  } : {};

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-[650px]">
        <div className="animate-pulse">
          <div className="h-8 w-32 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-7 gap-2">
            {[...Array(35)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="calendar-wrapper rounded-xl overflow-hidden shadow-lg bg-white"
      style={{
        padding: isMobile ? '0.5rem' : '1rem',
        position: 'relative',
      }}
    >
      {/* Optional weather overlay */}
      {showWeather && view === "month" && !isMobile && (
        <div
          style={{
            position: "absolute",
            top: "24px",
            right: "24px",
            background: "rgba(255,255,255,0.95)",
            backdropFilter: "blur(8px)",
            borderRadius: "12px",
            padding: "8px 12px",
            fontSize: "12px",
            fontWeight: 600,
            color: "#374151",
            border: "1px solid rgba(255,255,255,0.5)",
            zIndex: 10,
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          ☀️ 22°{temperatureUnit === "celsius" ? "C" : "F"}
        </div>
      )}

      <DndProvider backend={Backend as any} options={backendOptions}>
        <DnDCalendar
          localizer={localizer}
          events={allEvents}
          view={view}
          date={date}
          onView={setView}
          onNavigate={setDate}
          onSelectSlot={onSelectSlot}
          onSelectEvent={onSelectEvent}
          onEventDrop={isMobile ? undefined : onDrop}
          onEventResize={isMobile ? undefined : onResize}
          onDropFromOutside={isMobile ? undefined : handleDropFromOutside}
          eventPropGetter={eventStyleGetter}
          components={{
            event: EventComponent,
          }}
          selectable
          resizable={!isMobile}
          popup
          step={30}
          timeslots={2}
          scrollToTime={new Date(1970, 1, 1, 8, 0, 0)}
          longPressThreshold={isMobile ? 250 : 100}
          dragFromOutsideItem={
            !isMobile && externalDragType !== 'none'
              ? () => ({
                  title: externalDragTitle || 
                    (externalDragType === 'reminder' ? 'New Reminder' : 'New Todo')
                })
              : undefined
          }
          onDragOver={(e: any) => {
            if (!isMobile) e.preventDefault();
          }}
          style={{
            minHeight: isMobile ? 500 : 650,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            borderRadius: '8px',
          }}
          className="custom-calendar"
        />
      </DndProvider>
      
      {/* Comprehensive styles */}
      <style jsx global>{`
        /* Base calendar container */
        .calendar-wrapper {
          background: white !important;
        }
        
        .custom-calendar {
          font-size: 14px;
          background: rgba(255, 255, 255, 0.98) !important;
        }
        
        /* Header styling */
        .custom-calendar .rbc-header {
          background: #f8fafc;
          border-bottom: 1px solid rgba(0,0,0,0.1);
          padding: 8px 4px;
          font-weight: 600;
          color: #374151;
        }
        
        /* Today highlighting */
        .custom-calendar .rbc-today {
          background: ${themeStyles.todayBg};
        }
        
        /* Toolbar styling */
        .custom-calendar .rbc-toolbar {
          margin-bottom: 12px;
          padding: 0 8px;
          background: transparent;
        }
        
        .custom-calendar .rbc-toolbar-label {
          color: #1f2937;
          font-weight: 600;
        }
        
        .custom-calendar .rbc-toolbar button {
          border: 1px solid rgba(0,0,0,0.1);
          background: rgba(255,255,255,0.9);
          color: #374151;
          border-radius: 6px;
          padding: 6px 10px;
          font-weight: 500;
          transition: all 0.2s ease;
          margin: 0 2px;
        }
        
        .custom-calendar .rbc-toolbar button:hover:not(:disabled) {
          background: ${themeStyles.hover};
          border-color: ${themeStyles.accent};
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .custom-calendar .rbc-toolbar button.rbc-active {
          background: ${themeStyles.accent};
          color: white;
          border-color: ${themeStyles.accent};
        }
        
        .custom-calendar .rbc-toolbar button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        /* Month view cells */
        .custom-calendar .rbc-month-view {
          background: white;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .custom-calendar .rbc-day-bg {
          background: white;
        }
        
        /* Day cell hover effect */
        .custom-calendar .rbc-day-bg:hover {
          background: ${themeStyles.hover};
          transition: background 0.2s ease;
        }
        
        /* Selection styling */
        .custom-calendar .rbc-slot-selection {
          background: ${themeStyles.selection};
          border: 2px dashed ${themeStyles.accent};
          border-radius: 4px;
        }
        
        /* Off-range days */
        .custom-calendar .rbc-off-range-bg {
          background: rgba(156, 163, 175, 0.05);
        }
        
        /* Event hover effects (desktop only) */
        @media (hover: hover) {
          .custom-calendar .rbc-event:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0,0,0,0.15);
            transition: all 0.2s;
            z-index: 2;
          }
          
          /* Don't apply hover to moon phases */
          .custom-calendar .rbc-event[title*="Moon"]:hover {
            transform: none;
            box-shadow: none;
          }
        }
        
        /* Mobile-specific styles */
        @media (max-width: 768px) {
          .custom-calendar {
            font-size: 12px;
          }
          
          /* Responsive toolbar */
          .custom-calendar .rbc-toolbar {
            flex-direction: column;
            gap: 8px;
            padding: 0 4px;
          }
          
          .custom-calendar .rbc-toolbar-label {
            font-size: 16px;
            font-weight: 600;
            margin: 0;
          }
          
          .custom-calendar .rbc-btn-group {
            display: flex;
            justify-content: center;
            gap: 2px;
            flex-wrap: wrap;
          }
          
          .custom-calendar .rbc-btn-group button {
            padding: 8px 12px;
            font-size: 12px;
            min-width: auto;
            flex: 1;
            max-width: 80px;
          }
          
          /* Mobile calendar view */
          .custom-calendar .rbc-month-view {
            overflow-x: auto;
          }
          
          .custom-calendar .rbc-month-row {
            min-height: 60px;
          }
          
          .custom-calendar .rbc-date-cell {
            padding: 2px;
            font-size: 11px;
            font-weight: 500;
          }
          
          .custom-calendar .rbc-day-bg {
            min-height: 50px;
          }
          
          /* Mobile events */
          .custom-calendar .rbc-event {
            padding: 1px 2px !important;
            font-size: 9px !important;
            min-height: 18px !important;
            line-height: 1.2;
          }
          
          .custom-calendar .rbc-event-content {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-size: 9px;
          }
          
          /* Mobile header */
          .custom-calendar .rbc-header {
            padding: 6px 2px;
            font-size: 11px;
          }
          
          /* Show more link */
          .custom-calendar .rbc-show-more {
            font-size: 10px;
            padding: 2px 4px;
            background: rgba(255,255,255,0.9);
            border-radius: 3px;
            margin-top: 2px;
          }
          
          /* Disable text selection on mobile */
          .custom-calendar {
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
            -webkit-touch-callout: none;
            -webkit-tap-highlight-color: transparent;
          }
          
          /* Make touch targets larger */
          .custom-calendar .rbc-event,
          .custom-calendar .rbc-day-bg {
            cursor: pointer;
            -webkit-tap-highlight-color: ${themeStyles.selection};
          }
        }
        
        /* Moon phase specific styles */
        .custom-calendar .rbc-event[title*="Moon"] {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        
        /* Accessibility improvements */
        .custom-calendar .rbc-event:focus {
          outline: 2px solid ${themeStyles.accent};
          outline-offset: 1px;
        }
        
        .custom-calendar .rbc-show-more {
          color: ${themeStyles.accent};
          font-weight: 500;
          cursor: pointer;
        }
        
        .custom-calendar .rbc-show-more:hover {
          text-decoration: underline;
        }
        
        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .custom-calendar {
            color: #1f2937;
          }
          
          .custom-calendar .rbc-toolbar button {
            color: #374151;
            background: rgba(255,255,255,0.9);
          }
          
          .custom-calendar .rbc-off-range-bg {
            background: rgba(156, 163, 175, 0.05);
          }
        }
      `}</style>
    </div>
  );
}
