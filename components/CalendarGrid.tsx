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
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import type { DBEvent } from "@/lib/types";

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
    kind: 'reminder' | 'todo'
  ) => void;
}

// Theme configurations
const getThemeStyles = (theme: CalendarTheme) => {
  const themes = {
    default: {
      bg: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
      headerBg: "#f1f5f9",
      todayBg: "rgba(124,58,237,0.1)",
      accent: "#7c3aed",
      text: "#374151",
    },
    spring: {
      bg: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #bbf7d0 100%)",
      headerBg: "#dcfce7",
      todayBg: "rgba(34,197,94,0.15)",
      accent: "#22c55e",
      text: "#064e3b",
    },
    summer: {
      bg: "linear-gradient(135deg, #fff7ed 0%, #fed7aa 50%, #fbbf24 100%)",
      headerBg: "#fed7aa",
      todayBg: "rgba(245,158,11,0.15)",
      accent: "#f59e0b",
      text: "#451a03",
    },
    autumn: {
      bg: "linear-gradient(135deg, #fff1f2 0%, #fecaca 50%, #fed7aa 100%)",
      headerBg: "#fecaca",
      todayBg: "rgba(239,68,68,0.15)",
      accent: "#ef4444",
      text: "#450a0a",
    },
    winter: {
      bg: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 50%, #ddd6fe 100%)",
      headerBg: "#ede9fe",
      todayBg: "rgba(99,102,241,0.15)",
      accent: "#6366f1",
      text: "#1e1b4b",
    },
    nature: {
      bg: "linear-gradient(135deg, #f7fee7 0%, #ecfdf5 50%, #d1fae5 100%)",
      headerBg: "#ecfdf5",
      todayBg: "rgba(132,204,22,0.15)",
      accent: "#84cc16",
      text: "#14532d",
    },
    ocean: {
      bg: "linear-gradient(135deg, #f0f9ff 0%, #ecfeff 50%, #bae6fd 100%)",
      headerBg: "#e0f2fe",
      todayBg: "rgba(14,165,233,0.15)",
      accent: "#0ea5e9",
      text: "#082f49",
    },
  };
  return themes[theme];
};

// Moon phase emoji mapper
const getMoonEmoji = (phase: string) => {
  switch (phase) {
    case 'moon-new': return '🌑';
    case 'moon-first': return '🌓';
    case 'moon-full': return '🌕';
    case 'moon-last': return '🌗';
    default: return '🌙';
  }
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

    // Moon phase events
    if (resource?.moonPhase) {
      return {
        style: {
          backgroundColor: 'transparent',
          border: 'none',
          color: themeStyles.text,
          fontSize: '20px',
          textAlign: 'center',
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
      };
    }

    // Reminder events
    if (resource?.event_type === 'reminder') {
      return {
        style: {
          backgroundColor: '#fbbf24',
          borderLeft: '4px solid #f59e0b',
          borderRadius: '6px',
          color: '#92400e',
          fontWeight: '600',
        },
      };
    }

    // Todo events
    if (resource?.event_type === 'todo') {
      return {
        style: {
          backgroundColor: '#34d399',
          borderLeft: '4px solid #10b981',
          borderRadius: '6px',
          color: '#064e3b',
          fontWeight: '600',
        },
      };
    }

    // Business events
    if (resource?.source === 'business') {
      return {
        style: {
          backgroundColor: '#1f2937',
          border: '2px solid #7c3aed',
          borderRadius: '6px',
          color: '#ffffff',
          fontWeight: '700',
        },
      };
    }

    // Friend events
    if (resource?.created_by && resource.created_by !== resource.current_user_id) {
      return {
        style: {
          backgroundColor: '#dbeafe',
          borderLeft: '4px solid #3b82f6',
          borderRadius: '6px',
          color: '#1e40af',
        },
      };
    }

    // Default (user's own events)
    return {
      style: {
        backgroundColor: themeStyles.accent,
        borderRadius: '6px',
        color: '#ffffff',
        fontWeight: '500',
      },
    };
  };

  // Custom event component for moon phases
  const EventComponent = ({ event }: EventProps<UiEvent>) => {
    const resource = event.resource as any;
    if (resource?.moonPhase) {
      return <div>{getMoonEmoji(resource.moonPhase)}</div>;
    }
    return <div>{event.title}</div>;
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
            ? () => ({ title: externalDragTitle || `New ${externalDragType}` })
            : undefined
        }
        style={{ 
          height: 650,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '12px',
        }}
        views={['month', 'week', 'day']}
        step={30}
        timeslots={2}
        scrollToTime={new Date(1970, 1, 1, 8, 0, 0)}
      />

      <style jsx global>{`
        .calendar-wrapper .rbc-header {
          background: ${themeStyles.headerBg} !important;
          padding: 12px 8px !important;
          font-weight: 600 !important;
          color: ${themeStyles.text} !important;
        }

        .calendar-wrapper .rbc-today {
          background: ${themeStyles.todayBg} !important;
        }

        .calendar-wrapper .rbc-toolbar {
          margin-bottom: 16px !important;
          padding: 12px !important;
          background: rgba(255, 255, 255, 0.9) !important;
          border-radius: 8px !important;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05) !important;
        }

        .calendar-wrapper .rbc-toolbar button {
          background: white !important;
          border: 1px solid #e5e7eb !important;
          border-radius: 6px !important;
          padding: 6px 12px !important;
          color: ${themeStyles.text} !important;
          font-weight: 500 !important;
          transition: all 0.2s ease !important;
        }

        .calendar-wrapper .rbc-toolbar button:hover {
          background: ${themeStyles.accent} !important;
          color: white !important;
          border-color: ${themeStyles.accent} !important;
          transform: translateY(-1px) !important;
        }

        .calendar-wrapper .rbc-toolbar button.rbc-active {
          background: ${themeStyles.accent} !important;
          color: white !important;
          border-color: ${themeStyles.accent} !important;
        }

        .calendar-wrapper .rbc-event {
          padding: 3px 5px !important;
          font-size: 12px !important;
        }

        .calendar-wrapper .rbc-day-bg:hover {
          background: rgba(0, 0, 0, 0.03) !important;
        }

        .calendar-wrapper .rbc-slot-selection {
          background: ${themeStyles.accent}33 !important;
          border: 2px dashed ${themeStyles.accent} !important;
        }

        .calendar-wrapper .rbc-off-range-bg {
          background: #f9fafb !important;
        }

        /* Mobile responsive */
        @media (max-width: 640px) {
          .calendar-wrapper .rbc-toolbar {
            flex-direction: column !important;
            gap: 8px !important;
          }

          .calendar-wrapper .rbc-toolbar-label {
            margin: 8px 0 !important;
          }

          .calendar-wrapper .rbc-event {
            font-size: 10px !important;
            padding: 2px 3px !important;
          }
        }
      `}</style>
    </div>
  );
}
