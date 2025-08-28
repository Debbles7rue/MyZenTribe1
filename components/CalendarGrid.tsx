// components/CalendarGrid.tsx
"use client";

import React, { useMemo, useState } from "react";
import type { DBEvent } from "@/lib/types";

export type UiEvent = {
  id?: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource: any;
};

type CalendarTheme = "default" | "spring" | "summer" | "autumn" | "winter" | "nature" | "ocean";
type View = "month" | "week" | "day" | "agenda";

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

  onSelectSlot: (arg: { start: Date; end: Date }) => void;
  onSelectEvent: (evt: UiEvent) => void;
  onDrop: ({ event, start, end }: { event: UiEvent; start: Date; end: Date }) => void;
  onResize: ({ event, start, end }: { event: UiEvent; start: Date; end: Date }) => void;

  externalDragType?: "none" | "reminder" | "todo";
  onExternalDrop?: (
    info: { start: Date; end: Date; allDay?: boolean },
    kind: Exclude<NonNullable<Props["externalDragType"]>, "none">
  ) => void;
};

// Theme configurations
const getTheme = (theme: CalendarTheme = "default") => {
  const themes = {
    default: {
      bg: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
      headerBg: "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)",
      todayBg: "#ede9fe",
      accent: "#7c3aed",
      textColor: "#374151",
      borderColor: "#e5e7eb"
    },
    spring: {
      bg: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #bbf7d0 100%)",
      headerBg: "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)",
      todayBg: "#d1fae5",
      accent: "#22c55e",
      textColor: "#14532d",
      borderColor: "#86efac"
    },
    summer: {
      bg: "linear-gradient(135deg, #fff7ed 0%, #fed7aa 50%, #fbbf24 100%)",
      headerBg: "linear-gradient(135deg, #fed7aa 0%, #fbbf24 100%)",
      todayBg: "#fef3c7",
      accent: "#f59e0b",
      textColor: "#92400e",
      borderColor: "#fcd34d"
    },
    autumn: {
      bg: "linear-gradient(135deg, #fff1f2 0%, #fecaca 50%, #fed7aa 100%)",
      headerBg: "linear-gradient(135deg, #fecaca 0%, #fed7aa 100%)",
      todayBg: "#fee2e2",
      accent: "#ef4444",
      textColor: "#7f1d1d",
      borderColor: "#f87171"
    },
    winter: {
      bg: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 50%, #ddd6fe 100%)",
      headerBg: "linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)",
      todayBg: "#e0e7ff",
      accent: "#6366f1",
      textColor: "#3730a3",
      borderColor: "#a5b4fc"
    },
    nature: {
      bg: "linear-gradient(135deg, #f7fee7 0%, #ecfdf5 50%, #d1fae5 100%)",
      headerBg: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
      todayBg: "#dcfce7",
      accent: "#16a34a",
      textColor: "#14532d",
      borderColor: "#86efac"
    },
    ocean: {
      bg: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #bae6fd 100%)",
      headerBg: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)",
      todayBg: "#dbeafe",
      accent: "#0284c7",
      textColor: "#0c4a6e",
      borderColor: "#7dd3fc"
    }
  };
  return themes[theme];
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarGrid(props: Props) {
  const {
    dbEvents, moonEvents, showMoon,
    showWeather = false,
    temperatureUnit = "celsius",
    theme = "default",
    date, setDate, view, setView,
    onSelectSlot, onSelectEvent
  } = props;

  const [draggedEvent, setDraggedEvent] = useState<UiEvent | null>(null);
  const themeConfig = getTheme(theme);

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

  // Get calendar days for current month
  const calendarDays = useMemo(() => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    for (let i = 0; i < 42; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }
    return days;
  }, [date]);

  const getEventsForDay = (day: Date) => {
    return mergedEvents.filter(event => 
      event.start.toDateString() === day.toDateString()
    );
  };

  const getEventStyle = (event: UiEvent) => {
    const r = event.resource || {};
    
    if (r?.event_type === "reminder") {
      return "bg-yellow-200 border-yellow-400 text-yellow-800";
    }
    if (r?.event_type === "todo") {
      return "bg-green-200 border-green-400 text-green-800";
    }
    if (r?.source === "business") {
      return "bg-gray-200 border-purple-500 text-gray-800 border-2";
    }
    if (r?.by_friend) {
      return "bg-purple-200 border-purple-400 text-purple-800";
    }
    return "bg-blue-200 border-blue-400 text-blue-800";
  };

  const handleDayClick = (day: Date, events: UiEvent[]) => {
    if (view === "month") {
      if (events.length === 1) {
        onSelectEvent(events[0]);
      } else if (events.length > 1) {
        setView("day");
        setDate(day);
      } else {
        const start = new Date(day);
        start.setHours(9, 0, 0, 0);
        const end = new Date(start);
        end.setHours(10, 0, 0, 0);
        onSelectSlot({ start, end });
      }
    }
  };

  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = new Date(date);
    newDate.setMonth(date.getMonth() + (direction === "next" ? 1 : -1));
    setDate(newDate);
  };

  const isToday = (day: Date) => {
    const today = new Date();
    return day.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (day: Date) => {
    return day.getMonth() === date.getMonth();
  };

  return (
    <div 
      className="custom-calendar"
      style={{
        background: themeConfig.bg,
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        border: `1px solid ${themeConfig.borderColor}`,
        position: "relative"
      }}
    >
      {/* Weather overlay */}
      {showWeather && (
        <div style={{
          position: "absolute",
          top: "16px",
          right: "16px",
          background: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(8px)",
          borderRadius: "12px",
          padding: "6px 12px",
          fontSize: "12px",
          fontWeight: "600",
          color: themeConfig.textColor,
          border: `1px solid ${themeConfig.borderColor}`,
          zIndex: 20,
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
        }}>
          ☀️ 22°{temperatureUnit === "celsius" ? "C" : "F"}
        </div>
      )}

      {/* Calendar Header */}
      <div 
        style={{
          background: themeConfig.headerBg,
          padding: "16px 20px",
          borderBottom: `1px solid ${themeConfig.borderColor}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <button
          onClick={() => navigateMonth("prev")}
          style={{
            background: "rgba(255,255,255,0.8)",
            border: `1px solid ${themeConfig.borderColor}`,
            borderRadius: "8px",
            padding: "8px 12px",
            cursor: "pointer",
            fontWeight: "500",
            color: themeConfig.textColor
          }}
        >
          ← Prev
        </button>
        
        <h2 style={{ 
          margin: 0,
          fontSize: "18px",
          fontWeight: "700",
          color: themeConfig.textColor
        }}>
          {date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h2>
        
        <button
          onClick={() => navigateMonth("next")}
          style={{
            background: "rgba(255,255,255,0.8)",
            border: `1px solid ${themeConfig.borderColor}`,
            borderRadius: "8px",
            padding: "8px 12px",
            cursor: "pointer",
            fontWeight: "500",
            color: themeConfig.textColor
          }}
        >
          Next →
        </button>
      </div>

      {/* Days of week header */}
      <div 
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          background: `linear-gradient(135deg, ${themeConfig.headerBg}, rgba(255,255,255,0.3))`,
          borderBottom: `1px solid ${themeConfig.borderColor}`
        }}
      >
        {SHORT_DAYS.map(day => (
          <div 
            key={day}
            style={{
              padding: "12px 8px",
              textAlign: "center",
              fontSize: "12px",
              fontWeight: "600",
              color: themeConfig.textColor,
              borderRight: `1px solid ${themeConfig.borderColor}`,
            }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div 
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          minHeight: "600px"
        }}
      >
        {calendarDays.map((day, index) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonthDay = isCurrentMonth(day);
          const isTodayDay = isToday(day);
          
          return (
            <div
              key={index}
              onClick={() => handleDayClick(day, dayEvents)}
              style={{
                minHeight: "85px",
                padding: "8px",
                borderRight: `1px solid ${themeConfig.borderColor}`,
                borderBottom: `1px solid ${themeConfig.borderColor}`,
                background: isTodayDay 
                  ? themeConfig.todayBg
                  : isCurrentMonthDay 
                  ? "rgba(255,255,255,0.7)" 
                  : "rgba(0,0,0,0.02)",
                cursor: "pointer",
                transition: "all 0.2s ease",
                position: "relative"
              }}
              onMouseEnter={(e) => {
                if (!isTodayDay) {
                  e.currentTarget.style.background = "rgba(255,255,255,0.9)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isTodayDay 
                  ? themeConfig.todayBg
                  : isCurrentMonthDay 
                  ? "rgba(255,255,255,0.7)" 
                  : "rgba(0,0,0,0.02)";
              }}
            >
              <div 
                style={{
                  fontSize: "14px",
                  fontWeight: isTodayDay ? "700" : "500",
                  color: isCurrentMonthDay ? themeConfig.textColor : "#9ca3af",
                  marginBottom: "4px"
                }}
              >
                {day.getDate()}
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                {dayEvents.slice(0, 3).map((event, eventIndex) => (
                  <div
                    key={eventIndex}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEvent(event);
                    }}
                    style={{
                      fontSize: "10px",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontWeight: "500",
                      transition: "transform 0.1s ease",
                      border: "1px solid",
                      ...getEventColors(event, theme)
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div 
                    style={{
                      fontSize: "9px",
                      color: themeConfig.accent,
                      fontWeight: "600",
                      textAlign: "center",
                      cursor: "pointer"
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setView("day");
                      setDate(day);
                    }}
                  >
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* View Controls */}
      <div 
        style={{
          background: themeConfig.headerBg,
          padding: "12px 20px",
          borderTop: `1px solid ${themeConfig.borderColor}`,
          display: "flex",
          justifyContent: "center",
          gap: "8px"
        }}
      >
        {["month", "week", "day"].map(viewType => (
          <button
            key={viewType}
            onClick={() => setView(viewType as View)}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: `1px solid ${themeConfig.borderColor}`,
              background: view === viewType ? themeConfig.accent : "rgba(255,255,255,0.8)",
              color: view === viewType ? "white" : themeConfig.textColor,
              fontWeight: "500",
              fontSize: "12px",
              cursor: "pointer",
              textTransform: "capitalize"
            }}
          >
            {viewType}
          </button>
        ))}
      </div>
    </div>
  );
}

function getEventColors(event: UiEvent, theme: CalendarTheme = "default") {
  const r = event.resource || {};
  
  // Base color schemes that work with all themes
  if (r?.event_type === "reminder") {
    return {
      backgroundColor: "#fbbf24",
      borderColor: "#f59e0b",
      color: "#92400e"
    };
  }
  
  if (r?.event_type === "todo") {
    return {
      backgroundColor: "#34d399",
      borderColor: "#10b981",
      color: "#064e3b"
    };
  }
  
  if (r?.source === "business") {
    return {
      backgroundColor: "#e5e7eb",
      borderColor: "#7c3aed",
      color: "#374151"
    };
  }
  
  if (r?.by_friend) {
    return {
      backgroundColor: "#c7d2fe",
      borderColor: "#8b5cf6",
      color: "#5b21b6"
    };
  }
  
  // Personal events
  return {
    backgroundColor: "#93c5fd",
    borderColor: "#3b82f6",
    color: "#1e40af"
  };
}
