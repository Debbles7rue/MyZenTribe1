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
  onDrop?: ({
    event,
    start,
    end,
  }: {
    event: UiEvent;
    start: Date;
    end: Date;
  }) => void;
  onResize?: ({
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

// Weather background patterns for day cells - enhanced with mobile optimization
const getWeatherBackground = (condition: WeatherData['condition'], isMobile: boolean) => {
  // Lighter backgrounds for mobile to improve readability
  const opacity = isMobile ? 0.15 : 0.3;
  
  const backgrounds = {
    sunny: `
      linear-gradient(135deg, 
        rgba(255, 237, 213, ${opacity}) 0%, 
        rgba(254, 215, 170, ${opacity * 0.7}) 30%,
        rgba(147, 197, 253, ${opacity * 0.7}) 70%,
        rgba(125, 211, 252, ${opacity}) 100%
      )
    `,
    'partly-cloudy': `
      linear-gradient(135deg,
        rgba(254, 243, 199, ${opacity * 0.7}) 0%,
        rgba(255, 255, 255, ${opacity * 1.3}) 40%,
        rgba(229, 231, 235, ${opacity}) 70%,
        rgba(209, 213, 219, ${opacity * 0.7}) 100%
      )
    `,
    cloudy: `
      linear-gradient(135deg,
        rgba(241, 245, 249, ${opacity * 1.3}) 0%,
        rgba(226, 232, 240, ${opacity}) 50%,
        rgba(203, 213, 225, ${opacity}) 100%
      )
    `,
    rainy: `
      linear-gradient(135deg,
        rgba(203, 213, 225, ${opacity * 1.3}) 0%,
        rgba(148, 163, 184, ${opacity}) 50%,
        rgba(100, 116, 139, ${opacity * 0.7}) 100%
      )
    `,
    stormy: `
      linear-gradient(135deg,
        rgba(71, 85, 105, ${opacity}) 0%,
        rgba(51, 65, 85, ${opacity}) 50%,
        rgba(30, 41, 59, ${opacity * 0.7}) 100%
      )
    `,
    snowy: `
      linear-gradient(135deg,
        rgba(248, 250, 252, ${opacity * 1.7}) 0%,
        rgba(241, 245, 249, ${opacity * 1.3}) 50%,
        rgba(226, 232, 240, ${opacity}) 100%
      )
    `,
    foggy: `
      linear-gradient(135deg,
        rgba(243, 244, 246, ${opacity * 2}) 0%,
        rgba(229, 231, 235, ${opacity * 1.7}) 50%,
        rgba(209, 213, 219, ${opacity * 1.3}) 100%
      )
    `
  };
  
  return backgrounds[condition] || backgrounds.sunny;
};

// Weather icon component optimized for mobile
const WeatherIcon = ({ condition, temp, isMobile }: { 
  condition: WeatherData['condition'], 
  temp: number,
  isMobile: boolean 
}) => {
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
      <span className={`weather-emoji ${isMobile ? 'weather-emoji-mobile' : ''}`}>
        {icons[condition] || '☀️'}
      </span>
      <span className={`weather-temp ${isMobile ? 'weather-temp-mobile' : ''}`}>
        {temp}°
      </span>
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
  const [isMobile, setIsMobile] = useState(false);
  
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

  const dbUiEvents = useMemo<UiEvent[]>(
    () =>
      (dbEvents || []).map((e: any) => ({
        id: e.id,
        title: e.title,
        start: new Date(e.start_time),
        end: new Date(e.end_time),
        allDay: e.all_day || false,
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

  // Enhanced event styling with mobile optimization
  const eventPropGetter = (event: UiEvent) => {
    const r: any = event.resource || {};
    
    // Moon phase events
    if (r?.moonPhase) {
      return {
        style: {
          backgroundColor: 'transparent',
          border: 'none',
          color: '#1f2937',
          padding: isMobile ? '1px' : '2px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'default',
          minHeight: isMobile ? '18px' : '20px',
          fontSize: isMobile ? '14px' : '16px',
        },
      };
    }
    
    // Reminder events
    if (r?.event_type === "reminder") {
      return {
        style: {
          background: isMobile 
            ? "rgba(251,191,36,0.9)" 
            : "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(251,191,36,0.2) 100%)",
          border: isMobile ? "1px solid #f59e0b" : "2px solid #f59e0b",
          borderRadius: isMobile ? "4px" : "8px",
          color: "#92400e",
          cursor: "pointer",
          fontWeight: 600,
          fontSize: isMobile ? "9px" : "11px",
          padding: isMobile ? "2px 3px" : "2px 4px",
          boxShadow: isMobile ? "none" : "0 2px 4px rgba(245,158,11,0.3)",
          backdropFilter: isMobile ? "none" : "blur(4px)",
          minHeight: isMobile ? "20px" : "24px",
        },
      };
    }
    
    // Todo events
    if (r?.event_type === "todo") {
      return {
        style: {
          background: isMobile 
            ? (r?.completed ? "#86efac" : "#34d399")
            : `linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(52,211,153,0.2) 100%)`,
          border: isMobile 
            ? `1px solid ${r?.completed ? "#22c55e" : "#10b981"}`
            : `2px solid #10b981`,
          borderRadius: isMobile ? "4px" : "8px",
          color: "#064e3b",
          cursor: "pointer",
          fontWeight: 600,
          fontSize: isMobile ? "9px" : "11px",
          padding: isMobile ? "2px 3px" : "2px 4px",
          boxShadow: isMobile ? "none" : "0 2px 4px rgba(16,185,129,0.3)",
          backdropFilter: isMobile ? "none" : "blur(4px)",
          textDecoration: r?.completed ? "line-through" : "none",
          minHeight: isMobile ? "20px" : "24px",
        },
      };
    }
    
    // Business events
    if (r?.source === "business" || r?.kind === "business") {
      return {
        style: {
          backgroundColor: "#1f2937",
          border: isMobile ? "1px solid #374151" : "2px solid #374151",
          borderRadius: isMobile ? "4px" : "6px",
          color: "#f3f4f6",
          cursor: "pointer",
          fontWeight: 700,
          fontSize: isMobile ? "9px" : "11px",
          padding: isMobile ? "2px 3px" : "3px 5px",
          minHeight: isMobile ? "20px" : "24px",
        },
      };
    }
    
    // Default events
    return {
      style: {
        background: isMobile 
          ? "#93c5fd"
          : "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(147,197,253,0.3) 100%)",
        border: isMobile ? "1px solid #3b82f6" : "2px solid #3b82f6",
        borderRadius: isMobile ? "4px" : "8px",
        color: "#1e40af",
        cursor: "pointer",
        fontWeight: 500,
        fontSize: isMobile ? "9px" : "11px",
        padding: isMobile ? "2px 3px" : "2px 4px",
        boxShadow: isMobile ? "none" : "0 2px 4px rgba(59,130,246,0.3)",
        backdropFilter: isMobile ? "none" : "blur(4px)",
        minHeight: isMobile ? "20px" : "24px",
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
        background: getWeatherBackground(weather.condition, isMobile),
        position: 'relative',
      },
    };
  };

  // Custom event component with mobile optimization
  const EventComponent = ({ event }: any) => {
    const resource = event.resource as any;
    
    // Moon phase rendering
    if (resource?.moonPhase) {
      const moonEmojis: Record<string, string> = {
        'moon-new': '🌑',
        'moon-first': '🌓', 
        'moon-full': '🌕',
        'moon-last': '🌗'
      };
      return (
        <div style={{ 
          fontSize: isMobile ? '12px' : '16px',
          textAlign: 'center',
          lineHeight: '1',
        }}>
          {moonEmojis[resource.moonPhase] || '🌙'}
        </div>
      );
    }
    
    // Todo with checkbox
    if (resource?.event_type === "todo") {
      return (
        <div className="flex items-center gap-1" style={{ fontSize: isMobile ? '9px' : '11px' }}>
          <span>{resource?.completed ? "✓" : "○"}</span>
          <span className="truncate flex-1">{event.title}</span>
        </div>
      );
    }
    
    // Reminder with icon
    if (resource?.event_type === "reminder") {
      return (
        <div className="flex items-center gap-1" style={{ fontSize: isMobile ? '9px' : '11px' }}>
          <span>⏰</span>
          <span className="truncate flex-1">{event.title}</span>
        </div>
      );
    }
    
    // Default event
    return (
      <div className="truncate px-1" style={{ fontSize: isMobile ? '9px' : '11px' }}>
        {event.title}
      </div>
    );
  };

  // Custom components for weather display - mobile optimized
  const components = useMemo(() => {
    if (!showWeather || view === 'month') {
      return {
        event: EventComponent
      };
    }
    
    return {
      event: EventComponent,
      // Week view header with weather
      week: {
        header: ({ date: cellDate, label }: any) => {
          const weather = getWeatherForDate(cellDate);
          return (
            <div className={`weather-header ${isMobile ? 'weather-header-mobile' : ''}`}>
              <div className="day-label">{label}</div>
              {weather && (
                <div className="weather-info">
                  <WeatherIcon condition={weather.condition} temp={weather.temp} isMobile={isMobile} />
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
            <div className={`weather-header-detailed ${isMobile ? 'weather-header-detailed-mobile' : ''}`}>
              <div className="day-label-large">{label}</div>
              {weather && (
                <div className="weather-info-detailed">
                  <WeatherIcon condition={weather.condition} temp={weather.temp} isMobile={isMobile} />
                  {!isMobile && (
                    <div className="weather-details">
                      <span className="weather-desc">{weather.description}</span>
                      <span className="weather-range">
                        L: {weather.tempMin}° H: {weather.tempMax}°
                      </span>
                      <span className="weather-extra">
                        💧 {weather.humidity}% | 💨 {weather.windSpeed} mph
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        },
      },
    };
  }, [showWeather, view, weatherData, isMobile, EventComponent]);

  // Select appropriate backend for touch/mouse
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
    <div className="weather-calendar-wrapper">
      <DndProvider backend={Backend} options={backendOptions}>
        <DnDCalendar
          localizer={localizer}
          events={mergedEvents}
          startAccessor="start"
          endAccessor="end"
          selectable
          resizable={!isMobile}
          popup
          style={{
            height: isMobile ? 500 : 650,
            background: "rgba(255,255,255,0.7)",
            borderRadius: "12px",
            fontFamily: "system-ui, -apple-system, sans-serif",
            backdropFilter: isMobile ? "none" : "blur(8px)",
          }}
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          onSelectSlot={onSelectSlot}
          onSelectEvent={onSelectEvent}
          onDoubleClickEvent={onSelectEvent}
          onEventDrop={isMobile ? undefined : onDrop}
          onEventResize={isMobile ? undefined : onResize}
          step={30}
          timeslots={2}
          longPressThreshold={isMobile ? 300 : 100}
          scrollToTime={new Date(1970, 1, 1, 8, 0, 0)}
          eventPropGetter={eventPropGetter}
          dayPropGetter={dayPropGetter}
          components={components as any}
          dragFromOutsideItem={undefined}
        />
      </DndProvider>

      <style jsx global>{`
        /* Weather Calendar Specific Styles */
        .weather-calendar-wrapper {
          padding: ${isMobile ? '8px' : '16px'};
          background: linear-gradient(135deg, 
            rgba(255,255,255,0.9) 0%, 
            rgba(219,234,254,0.3) 100%
          );
          border-radius: ${isMobile ? '12px' : '16px'};
        }
        
        /* Weather header styles */
        .weather-header {
          padding: 8px;
          text-align: center;
        }
        
        .weather-header-mobile {
          padding: 4px;
        }
        
        .weather-header .day-label {
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 4px;
          font-size: ${isMobile ? '11px' : '13px'};
        }
        
        .weather-info {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: ${isMobile ? '2px' : '4px'};
        }
        
        .weather-icon-container {
          display: flex;
          align-items: center;
          gap: ${isMobile ? '2px' : '4px'};
        }
        
        .weather-emoji {
          font-size: 20px;
        }
        
        .weather-emoji-mobile {
          font-size: 14px;
        }
        
        .weather-temp {
          font-size: 14px;
          font-weight: 600;
          color: #475569;
        }
        
        .weather-temp-mobile {
          font-size: 11px;
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
        
        .weather-header-detailed-mobile {
          padding: 6px;
          margin: 4px;
        }
        
        .day-label-large {
          font-size: ${isMobile ? '14px' : '18px'};
          font-weight: 700;
          color: #0f172a;
          margin-bottom: ${isMobile ? '4px' : '8px'};
        }
        
        .weather-info-detailed {
          display: flex;
          align-items: center;
          gap: ${isMobile ? '6px' : '12px'};
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
        @keyframes shimmer {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.5; }
        }
        
        /* Make events stand out on weather backgrounds */
        .weather-calendar-wrapper .rbc-event {
          backdrop-filter: ${isMobile ? 'none' : 'blur(8px)'};
          transition: all 0.2s ease;
        }
        
        .weather-calendar-wrapper .rbc-event:hover {
          transform: ${isMobile ? 'none' : 'scale(1.05)'};
          box-shadow: ${isMobile ? 'none' : '0 4px 12px rgba(0, 0, 0, 0.15)'};
          z-index: 10;
        }
        
        /* Today highlight with weather */
        .weather-calendar-wrapper .rbc-today {
          background: linear-gradient(135deg,
            rgba(99, 102, 241, 0.1) 0%,
            rgba(168, 85, 247, 0.1) 100%
          ) !important;
          border: ${isMobile ? '1px' : '2px'} solid rgba(124, 58, 237, 0.3) !important;
        }
        
        /* Toolbar styling */
        .weather-calendar-wrapper .rbc-toolbar {
          margin-bottom: ${isMobile ? '8px' : '16px'};
          padding: 0 ${isMobile ? '4px' : '8px'};
        }
        
        .weather-calendar-wrapper .rbc-toolbar button {
          border: 1px solid rgba(148, 163, 184, 0.3);
          background: rgba(255, 255, 255, 0.9);
          color: #334155;
          border-radius: ${isMobile ? '6px' : '8px'};
          padding: ${isMobile ? '6px 10px' : '8px 16px'};
          font-weight: 500;
          font-size: ${isMobile ? '11px' : '13px'};
          transition: all 0.2s ease;
          backdrop-filter: ${isMobile ? 'none' : 'blur(4px)'};
        }
        
        .weather-calendar-wrapper .rbc-toolbar button:hover:not(:disabled) {
          background: rgba(255, 255, 255, 1);
          transform: ${isMobile ? 'none' : 'translateY(-1px)'};
          box-shadow: ${isMobile ? 'none' : '0 4px 8px rgba(0, 0, 0, 0.1)'};
        }
        
        .weather-calendar-wrapper .rbc-toolbar button.rbc-active {
          background: linear-gradient(135deg, #3b82f6 0%, #0ea5e9 100%);
          color: white;
          border-color: #3b82f6;
        }
        
        /* Mobile-specific calendar adjustments */
        @media (max-width: 768px) {
          .weather-calendar-wrapper .rbc-toolbar {
            flex-direction: column;
            gap: 6px;
          }
          
          .weather-calendar-wrapper .rbc-toolbar-label {
            font-size: 14px;
            font-weight: 600;
          }
          
          .weather-calendar-wrapper .rbc-btn-group {
            display: flex;
            justify-content: center;
            gap: 2px;
            flex-wrap: wrap;
          }
          
          .weather-calendar-wrapper .rbc-month-view {
            overflow-x: auto;
          }
          
          .weather-calendar-wrapper .rbc-month-row {
            min-height: 50px;
          }
          
          .weather-calendar-wrapper .rbc-date-cell {
            padding: 2px;
            font-size: 10px;
          }
          
          .weather-calendar-wrapper .rbc-event {
            padding: 1px 2px !important;
            font-size: 8px !important;
            min-height: 16px !important;
          }
          
          .weather-calendar-wrapper .rbc-event-content {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          
          .weather-calendar-wrapper .rbc-show-more {
            font-size: 9px;
            padding: 1px 3px;
          }
          
          /* Disable text selection on mobile */
          .weather-calendar-wrapper {
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
            -webkit-touch-callout: none;
            -webkit-tap-highlight-color: transparent;
          }
          
          /* Larger touch targets */
          .weather-calendar-wrapper .rbc-event,
          .weather-calendar-wrapper .rbc-day-bg {
            cursor: pointer;
            -webkit-tap-highlight-color: rgba(59, 130, 246, 0.1);
          }
        }
      `}</style>
    </div>
  );
}
