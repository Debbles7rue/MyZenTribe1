// components/WeatherCalendarGrid.tsx
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

interface WeatherData {
  date: string;
  temp: number;
  tempMin: number;
  tempMax: number;
  condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'stormy' | 'foggy' | 'partly-cloudy';
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
}

type Props = {
  dbEvents: DBEvent[];
  moonEvents: UiEvent[];
  showMoon: boolean;
  showWeather?: boolean;
  weatherData?: WeatherData[];
  temperatureUnit?: "celsius" | "fahrenheit";
  theme?: string;

  date: Date;
  setDate: (d: Date) => void;
  view: View;
  setView: (v: View) => void;

  onSelectSlot: (arg: {
    start: Date;
    end: Date;
    action?: string;
    slots?: Date[];
  }) => void;
  onSelectEvent: (evt: UiEvent) => void;
  onDrop: ({
    event,
    start,
    end,
  }: {
    event: UiEvent;
    start: Date;
    end: Date;
  }) => void;
  onResize: ({
    event,
    start,
    end,
  }: {
    event: UiEvent;
    start: Date;
    end: Date;
  }) => void;
};

function isTouchDevice() {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

// Weather background patterns for day cells
const getWeatherBackground = (condition: WeatherData['condition']) => {
  const backgrounds = {
    sunny: `
      linear-gradient(135deg, 
        rgba(255, 237, 213, 0.3) 0%, 
        rgba(254, 215, 170, 0.2) 30%,
        rgba(147, 197, 253, 0.2) 70%,
        rgba(125, 211, 252, 0.3) 100%
      )
    `,
    'partly-cloudy': `
      linear-gradient(135deg,
        rgba(254, 243, 199, 0.2) 0%,
        rgba(255, 255, 255, 0.4) 40%,
        rgba(229, 231, 235, 0.3) 70%,
        rgba(209, 213, 219, 0.2) 100%
      )
    `,
    cloudy: `
      linear-gradient(135deg,
        rgba(241, 245, 249, 0.4) 0%,
        rgba(226, 232, 240, 0.3) 50%,
        rgba(203, 213, 225, 0.3) 100%
      )
    `,
    rainy: `
      linear-gradient(135deg,
        rgba(203, 213, 225, 0.4) 0%,
        rgba(148, 163, 184, 0.3) 50%,
        rgba(100, 116, 139, 0.2) 100%
      )
    `,
    stormy: `
      linear-gradient(135deg,
        rgba(71, 85, 105, 0.3) 0%,
        rgba(51, 65, 85, 0.3) 50%,
        rgba(30, 41, 59, 0.2) 100%
      )
    `,
    snowy: `
      linear-gradient(135deg,
        rgba(248, 250, 252, 0.5) 0%,
        rgba(241, 245, 249, 0.4) 50%,
        rgba(226, 232, 240, 0.3) 100%
      )
    `,
    foggy: `
      linear-gradient(135deg,
        rgba(243, 244, 246, 0.6) 0%,
        rgba(229, 231, 235, 0.5) 50%,
        rgba(209, 213, 219, 0.4) 100%
      )
    `
  };
  
  return backgrounds[condition] || backgrounds.sunny;
};

// Weather icon component for day cells
const WeatherIcon = ({ condition, temp }: { condition: WeatherData['condition'], temp: number }) => {
  const icons = {
    sunny: '☀️',
    'partly-cloudy': '⛅',
    cloudy: '☁️',
    rainy: '🌧️',
    stormy: '⛈️',
    snowy: '❄️',
    foggy: '🌫️'
  };
  
  return (
    <div className="weather-icon-container">
      <span className="weather-emoji">{icons[condition] || '☀️'}</span>
      <span className="weather-temp">{temp}°</span>
    </div>
  );
};

export default function WeatherCalendarGrid({
  dbEvents,
  moonEvents,
  showMoon,
  showWeather = false,
  weatherData = [],
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
}: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const dbUiEvents = useMemo<UiEvent[]>(
    () =>
      (dbEvents || []).map((e: any) => ({
        id: e.id,
        title: e.title,
        start: new Date(e.start_time),
        end: new Date(e.end_time),
        allDay: false,
        resource: e,
      })),
    [dbEvents]
  );

  const mergedEvents = useMemo(
    () => [...dbUiEvents, ...(showMoon ? moonEvents : [])],
    [dbUiEvents, moonEvents, showMoon]
  );

  // Get weather for a specific date
  const getWeatherForDate = (targetDate: Date) => {
    const dateKey = targetDate.toISOString().split('T')[0];
    return weatherData.find(w => w.date === dateKey);
  };

  // Enhanced event styling
  const eventPropGetter = (event: UiEvent) => {
    const r: any = event.resource || {};
    
    if (r?.event_type === "reminder") {
      return {
        style: {
          background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(251,191,36,0.2) 100%)",
          border: "2px solid #f59e0b",
          borderRadius: "8px",
          color: "#92400e",
          cursor: "pointer",
          fontWeight: 600,
          fontSize: "11px",
          padding: "2px 4px",
          boxShadow: "0 2px 4px rgba(245,158,11,0.3)",
          backdropFilter: "blur(4px)",
        },
      };
    }
    
    if (r?.event_type === "todo") {
      return {
        style: {
          background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(52,211,153,0.2) 100%)",
          border: "2px solid #10b981",
          borderRadius: "8px",
          color: "#064e3b",
          cursor: "pointer",
          fontWeight: 600,
          fontSize: "11px",
          padding: "2px 4px",
          boxShadow: "0 2px 4px rgba(16,185,129,0.3)",
          backdropFilter: "blur(4px)",
        },
      };
    }
    
    return {
      style: {
        background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(147,197,253,0.3) 100%)",
        border: "2px solid #3b82f6",
        borderRadius: "8px",
        color: "#1e40af",
        cursor: "pointer",
        fontWeight: 500,
        fontSize: "11px",
        padding: "2px 4px",
        boxShadow: "0 2px 4px rgba(59,130,246,0.3)",
        backdropFilter: "blur(4px)",
      },
    };
  };

  // Custom day cell wrapper for weather backgrounds
  const dayPropGetter = (date: Date) => {
    if (!showWeather || view === 'month') return {};
    
    const weather = getWeatherForDate(date);
    if (!weather) return {};
    
    return {
      style: {
        background: getWeatherBackground(weather.condition),
        position: 'relative',
      },
    };
  };

  // Custom components for weather display
  const components = useMemo(() => {
    if (!showWeather || view === 'month') return {};
    
    return {
      // Week view header with weather
      week: {
        header: ({ date: cellDate, label }: any) => {
          const weather = getWeatherForDate(cellDate);
          return (
            <div className="weather-header">
              <div className="day-label">{label}</div>
              {weather && (
                <div className="weather-info">
                  <WeatherIcon condition={weather.condition} temp={weather.temp} />
                </div>
              )}
            </div>
          );
        },
      },
      // Day view header with detailed weather
      day: {
        header: ({ date: cellDate, label }: any) => {
          const weather = getWeatherForDate(cellDate);
          return (
            <div className="weather-header-detailed">
              <div className="day-label-large">{label}</div>
              {weather && (
                <div className="weather-info-detailed">
                  <WeatherIcon condition={weather.condition} temp={weather.temp} />
                  <div className="weather-details">
                    <span className="weather-desc">{weather.description}</span>
                    <span className="weather-range">
                      L: {weather.tempMin}° H: {weather.tempMax}°
                    </span>
                    <span className="weather-extra">
                      💧 {weather.humidity}% | 💨 {weather.windSpeed} mph
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        },
      },
    };
  }, [showWeather, view, weatherData]);

  const Backend = isTouchDevice() ? TouchBackend : HTML5Backend;

  if (!mounted) return null;

  return (
    <div className="weather-calendar-wrapper">
      <DndProvider
        backend={Backend}
        options={isTouchDevice() ? { enableMouseEvents: true } : undefined}
      >
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
            background: "rgba(255,255,255,0.7)",
            borderRadius: "12px",
            fontFamily: "system-ui, -apple-system, sans-serif",
            backdropFilter: "blur(8px)",
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
          longPressThreshold={250}
          scrollToTime={new Date(1970, 1, 1, 8, 0, 0)}
          eventPropGetter={eventPropGetter}
          dayPropGetter={dayPropGetter}
          components={components as any}
        />
      </DndProvider>

      <style jsx global>{`
        /* Weather Calendar Specific Styles */
        .weather-calendar-wrapper {
          padding: 16px;
          background: linear-gradient(135deg, 
            rgba(255,255,255,0.9) 0%, 
            rgba(219,234,254,0.3) 100%
          );
          border-radius: 16px;
        }
        
        /* Weather header styles */
        .weather-header {
          padding: 8px;
          text-align: center;
        }
        
        .weather-header .day-label {
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 4px;
        }
        
        .weather-info {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }
        
        .weather-icon-container {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .weather-emoji {
          font-size: 20px;
        }
        
        .weather-temp {
          font-size: 14px;
          font-weight: 600;
          color: #475569;
        }
        
        /* Detailed weather for day view */
        .weather-header-detailed {
          padding: 12px;
          background: linear-gradient(135deg, 
            rgba(255,255,255,0.95) 0%, 
            rgba(219,234,254,0.5) 100%
          );
          border-radius: 8px;
          margin: 8px;
        }
        
        .day-label-large {
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 8px;
        }
        
        .weather-info-detailed {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .weather-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        
        .weather-desc {
          font-size: 13px;
          color: #475569;
          text-transform: capitalize;
        }
        
        .weather-range {
          font-size: 12px;
          color: #64748b;
        }
        
        .weather-extra {
          font-size: 11px;
          color: #94a3b8;
        }
        
        /* Enhanced time slot backgrounds for weather */
        .weather-calendar-wrapper .rbc-time-slot {
          border-top: 1px solid rgba(203, 213, 225, 0.3) !important;
        }
        
        .weather-calendar-wrapper .rbc-day-slot {
          position: relative;
          overflow: visible;
        }
        
        /* Weather-specific day backgrounds with animations */
        .weather-calendar-wrapper .rbc-day-slot[data-weather="sunny"]::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(180deg, 
            rgba(254, 240, 138, 0.1) 0%, 
            rgba(163, 230, 253, 0.1) 100%
          );
          pointer-events: none;
          animation: shimmer 10s ease-in-out infinite;
        }
        
        @keyframes shimmer {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.5; }
        }
        
        /* Make events stand out on weather backgrounds */
        .weather-calendar-wrapper .rbc-event {
          backdrop-filter: blur(8px);
          transition: all 0.2s ease;
        }
        
        .weather-calendar-wrapper .rbc-event:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 10;
        }
        
        /* Today highlight with weather */
        .weather-calendar-wrapper .rbc-today {
          background: linear-gradient(135deg,
            rgba(99, 102, 241, 0.1) 0%,
            rgba(168, 85, 247, 0.1) 100%
          ) !important;
          border: 2px solid rgba(124, 58, 237, 0.3) !important;
        }
        
        /* Toolbar styling */
        .weather-calendar-wrapper .rbc-toolbar {
          margin-bottom: 16px;
          padding: 0 8px;
        }
        
        .weather-calendar-wrapper .rbc-toolbar button {
          border: 1px solid rgba(148, 163, 184, 0.3);
          background: rgba(255, 255, 255, 0.9);
          color: #334155;
          border-radius: 8px;
          padding: 8px 16px;
          font-weight: 500;
          transition: all 0.2s ease;
          backdrop-filter: blur(4px);
        }
        
        .weather-calendar-wrapper .rbc-toolbar button:hover {
          background: rgba(255, 255, 255, 1);
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        
        .weather-calendar-wrapper .rbc-toolbar button.rbc-active {
          background: linear-gradient(135deg, #3b82f6 0%, #0ea5e9 100%);
          color: white;
          border-color: #3b82f6;
        }
        
        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .weather-emoji {
            font-size: 16px;
          }
          
          .weather-temp {
            font-size: 12px;
          }
          
          .weather-header-detailed {
            padding: 8px;
            margin: 4px;
          }
          
          .day-label-large {
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
}
