// components/CalendarGrid.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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

// Import MoonPhaseDisplay components
import { 
  MoonPhaseIcon, 
  getMoonPhaseFromResource 
} from "@/components/MoonPhaseDisplay";

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
  onDrop?: (args: EventInteractionArgs<UiEvent>) => void;
  onResize?: (args: EventInteractionArgs<UiEvent>) => void;
  externalDragType?: 'none' | 'reminder' | 'todo';
  externalDragTitle?: string;
  onExternalDrop?: (
    info: { start: Date; end: Date; allDay?: boolean },
    type: 'reminder' | 'todo'
  ) => void;
  context?: 'calendar' | 'business' | 'community';
  businessId?: string;
  darkMode?: boolean;
  selectedBatchEvents?: Set<string>;
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
  context = 'calendar',
  businessId,
  darkMode = false,
  selectedBatchEvents,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
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

  // Filter events based on context for business calendar
  const filteredDbEvents = useMemo(() => {
    if (context === 'business' && businessId) {
      // Show events created by this business OR with this business as source
      return dbEvents.filter((event: DBEvent) => {
        const e = event as any;
        return (
          e.created_by === businessId ||
          e.business_id === businessId ||
          e.host_business_id === businessId ||
          (e.source === 'business' && e.business_creator_id === businessId)
        );
      });
    }
    return dbEvents;
  }, [dbEvents, context, businessId]);

  // Convert DB events to UI events with pre/post event indicators
  const dbUiEvents = useMemo<UiEvent[]>(() => 
    (filteredDbEvents || []).map((e: DBEvent) => {
      const event = e as any;
      return {
        id: e.id,
        title: e.title,
        start: new Date(e.start_time),
        end: new Date(e.end_time),
        allDay: e.all_day || false,
        resource: {
          ...e,
          hasPreEvent: !!(event.pre_event && event.pre_event.title),
          hasPostEvent: !!(event.post_event && event.post_event.title),
          preEvent: event.pre_event,
          postEvent: event.post_event,
        },
      };
    }),
    [filteredDbEvents]
  );

  // FIXED: Separate holidays ONLY for month view date headers
  const { holidayEvents, nonHolidayEvents } = useMemo(() => {
    const holidays: UiEvent[] = [];
    const nonHolidays: UiEvent[] = [];
    
    dbUiEvents.forEach(event => {
      if (event.resource?.event_type === "holiday") {
        holidays.push(event);
      } else {
        nonHolidays.push(event);
      }
    });
    
    return { holidayEvents: holidays, nonHolidayEvents: nonHolidays };
  }, [dbUiEvents]);

// FIXED: Show holidays ONLY in month view as banners. In day/week/agenda, exclude holidays entirely
const allEvents = useMemo(() => {
  let events: UiEvent[];
  
  if (view === 'month') {
    // Month view: holidays shown in header, regular events shown normally
    events = [...nonHolidayEvents];
  } else {
    // Day/Week/Agenda view: show ONLY non-holiday events (exclude holidays entirely)
    events = [...nonHolidayEvents];
  }
  
  if (showMoon) {
    events.push(...moonEvents);
  }
  
  console.log('📊 Calendar Events:', {
    view,
    totalEvents: events.length,
    nonHolidayCount: nonHolidayEvents.length,
    holidayCount: holidayEvents.length,
    moonCount: showMoon ? moonEvents.length : 0,
    eventsList: events.map(e => ({ title: e.title, start: e.start, type: e.resource?.event_type }))
  });
  
  return events;
}, [view, nonHolidayEvents, holidayEvents, moonEvents, showMoon]);

  // Event styling based on type with pre/post event indicators
  const eventStyleGetter = (event: UiEvent): any => {
    const resource = event.resource as any;
    
    // Check if this event is selected in batch mode
    const isSelected = selectedBatchEvents?.has(resource?.id || event.id);

    // Moon phase events - FIXED: Better containment
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
          cursor: 'pointer',
          minHeight: '20px',
          maxHeight: '32px',
          fontSize: '16px',
          overflow: 'visible',
        },
      };
    }

    // Base styles for all events
    let baseStyle = {
      borderRadius: "6px",
      cursor: "pointer",
      fontWeight: 600,
      fontSize: isMobile ? "10px" : "11px",
      padding: isMobile ? "3px 5px" : "4px 6px",
      minHeight: isMobile ? "22px" : "24px",
      position: "relative" as const,
      overflow: "visible" as const,
    };

    // Add thicker border for events with pre/post gatherings
    const borderWidth = (resource?.hasPreEvent || resource?.hasPostEvent) ? "2px" : "1px";
    const borderStyle = (resource?.hasPreEvent || resource?.hasPostEvent) ? "solid" : "solid";

    // Holiday events (for day/week/agenda views)
    if (resource?.event_type === "holiday") {
      return {
        style: {
          ...baseStyle,
          backgroundColor: isSelected ? "#c084fc" : "#f3e8ff",
          border: `${borderWidth} ${borderStyle} ${isSelected ? "#9333ea" : "#c084fc"}`,
          color: "#581c87",
          fontWeight: 700,
          boxShadow: isSelected ? "0 0 0 2px rgba(192, 132, 252, 0.3)" : "0 1px 3px rgba(168, 85, 247, 0.2)",
        },
      };
    }

    // Reminder events
    if (resource?.event_type === "reminder") {
      return {
        style: {
          ...baseStyle,
          backgroundColor: isSelected ? "#f59e0b" : "#fbbf24",
          border: `${borderWidth} ${borderStyle} ${isSelected ? "#d97706" : "#f59e0b"}`,
          color: "#92400e",
          boxShadow: isSelected ? "0 0 0 2px rgba(245, 158, 11, 0.3)" :
                     (resource?.hasPreEvent || resource?.hasPostEvent) ? "0 0 0 1px #f59e0b" : "none",
        },
      };
    }

    // Todo events
    if (resource?.event_type === "todo") {
      return {
        style: {
          ...baseStyle,
          backgroundColor: resource?.completed ? "#86efac" : (isSelected ? "#10b981" : "#34d399"),
          border: `${borderWidth} ${borderStyle} ${resource?.completed ? "#22c55e" : "#10b981"}`,
          color: "#064e3b",
          textDecoration: resource?.completed ? "line-through" : "none",
          boxShadow: isSelected ? "0 0 0 2px rgba(16, 185, 129, 0.3)" :
                     (resource?.hasPreEvent || resource?.hasPostEvent) ? "0 0 0 1px #10b981" : "none",
        },
      };
    }

    // Business events - special gradient styling
    if (resource?.source === "business" || resource?.kind === "business") {
      return {
        style: {
          ...baseStyle,
          background: isSelected ? "linear-gradient(135deg, #6b21a8 0%, #7c3aed 100%)" : 
                                   "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
          border: `2px solid ${isSelected ? "#581c87" : "#6b21a8"}`,
          color: "#ffffff",
          fontWeight: 700,
          boxShadow: isSelected ? "0 0 0 2px rgba(124, 58, 237, 0.3)" : "0 2px 4px rgba(124, 58, 237, 0.3)",
        },
      };
    }

    // Friend events
    if (resource?.by_friend) {
      return {
        style: {
          ...baseStyle,
          backgroundColor: isSelected ? "#8b5cf6" : "#c7d2fe",
          border: `${borderWidth} ${borderStyle} ${isSelected ? "#6b21a8" : "#8b5cf6"}`,
          color: "#5b21b6",
          fontWeight: resource?.rsvp_me ? 700 : 500,
          boxShadow: isSelected ? "0 0 0 2px rgba(139, 92, 246, 0.3)" :
                     (resource?.hasPreEvent || resource?.hasPostEvent) ? "0 0 0 1px #8b5cf6" : "none",
        },
      };
    }

    // Community events
    if (resource?.kind === "community") {
      return {
        style: {
          ...baseStyle,
          backgroundColor: isSelected ? "#ec4899" : "#fce7f3",
          border: `${borderWidth} ${borderStyle} ${isSelected ? "#be185d" : "#ec4899"}`,
          color: "#be185d",
          boxShadow: isSelected ? "0 0 0 2px rgba(236, 72, 153, 0.3)" :
                     (resource?.hasPreEvent || resource?.hasPostEvent) ? "0 0 0 1px #ec4899" : "none",
        },
      };
    }

    // Default personal events
    return {
      style: {
        ...baseStyle,
        backgroundColor: isSelected ? "#3b82f6" : "#93c5fd",
        border: `${borderWidth} ${borderStyle} ${isSelected ? "#1e40af" : "#3b82f6"}`,
        color: "#1e40af",
        fontWeight: resource?.rsvp_me ? 700 : 500,
        boxShadow: isSelected ? "0 0 0 2px rgba(59, 130, 246, 0.3)" :
                   (resource?.hasPreEvent || resource?.hasPostEvent) ? "0 0 0 1px #3b82f6" : "none",
      },
    };
  };

  // Custom event component with pre/post indicators
  const EventComponent = ({ event }: EventProps<UiEvent>) => {
    const resource = event.resource as any;
    
    // Handle moon phases - FIXED: Better rendering
    if (resource?.moonPhase) {
      if (MoonPhaseIcon && getMoonPhaseFromResource) {
        const moonPhase = getMoonPhaseFromResource(resource);
        if (moonPhase) {
          return (
            <div className="flex items-center justify-center w-full h-full p-0" style={{ overflow: 'visible' }}>
              <MoonPhaseIcon phase={moonPhase} />
            </div>
          );
        }
      }
      return (
        <div className="flex items-center justify-center w-full h-full text-base">
          {getMoonEmoji(resource.moonPhase)}
        </div>
      );
    }

    // Build event display with indicators
    const hasPreEvent = resource?.hasPreEvent;
    const hasPostEvent = resource?.hasPostEvent;

    // Render todo with checkbox
    if (resource?.event_type === "todo") {
      return (
        <div className="flex items-center gap-1 px-1 w-full">
          {hasPreEvent && <span className="text-[8px]" title="Pre-event">🍽️</span>}
          <span className="text-[10px]">
            {resource?.completed ? "✓" : "○"}
          </span>
          <span className="truncate flex-1 text-[10px] md:text-xs">
            {event.title}
          </span>
          {hasPostEvent && <span className="text-[8px]" title="Post-event">☕</span>}
        </div>
      );
    }

    // Render reminder with icon
    if (resource?.event_type === "reminder") {
      return (
        <div className="flex items-center gap-1 px-1 w-full">
          {hasPreEvent && <span className="text-[8px]" title="Pre-event">🍽️</span>}
          <span className="text-[10px]">⏰</span>
          <span className="truncate flex-1 text-[10px] md:text-xs">
            {event.title}
          </span>
          {hasPostEvent && <span className="text-[8px]" title="Post-event">☕</span>}
        </div>
      );
    }

    // Render holiday with emoji (in day/week/agenda views)
    if (resource?.event_type === "holiday") {
      const emoji = event.title.match(/^[\p{Emoji}]/u)?.[0] || '🎉';
      const titleWithoutEmoji = event.title.replace(/^[\p{Emoji}\s]+/u, '');
      return (
        <div className="flex items-center gap-1 px-1 w-full">
          <span className="text-[12px]">{emoji}</span>
          <span className="truncate flex-1 text-[10px] md:text-xs font-bold">
            {titleWithoutEmoji}
          </span>
        </div>
      );
    }

    // Business events with special badge
    if (resource?.source === "business") {
      return (
        <div className="flex items-center gap-1 px-1 w-full">
          {hasPreEvent && <span className="text-[8px]" title="Pre-event">🍽️</span>}
          <span className="truncate flex-1 text-[10px] md:text-xs font-bold">
            {event.title}
          </span>
          {context !== 'business' && (
            <span className="text-[8px] bg-white/30 px-1 rounded">BIZ</span>
          )}
          {hasPostEvent && <span className="text-[8px]" title="Post-event">☕</span>}
        </div>
      );
    }
    
    // Render normal event with pre/post indicators
    return (
      <div className="flex items-center gap-1 px-1 w-full">
        {hasPreEvent && <span className="text-[8px]" title="Pre-event">🍽️</span>}
        <span className="truncate flex-1 text-[10px] md:text-xs">
          {event.title}
        </span>
        {hasPostEvent && <span className="text-[8px]" title="Post-event">☕</span>}
      </div>
    );
  };

// Custom Month Date Header component with clickable holiday banners (MONTH VIEW ONLY)
  const MonthDateHeader = useCallback(({ date: cellDate, label }: any) => {
    // Find holidays for this date
    const cellDateStr = moment(cellDate).format('YYYY-MM-DD');
    const holidaysForDate = holidayEvents.filter(holiday => {
      const holidayDateStr = moment(holiday.start).format('YYYY-MM-DD');
      return holidayDateStr === cellDateStr;
    });

    // FIXED: Calculate proper spacing for holiday banners
    const bannerHeight = isMobile ? 18 : 23;
    const gapHeight = 2;
    const topPadding = 2;
    const totalHolidayHeight = holidaysForDate.length > 0 
      ? (holidaysForDate.length * bannerHeight) + ((holidaysForDate.length - 1) * gapHeight) + topPadding
      : 0;

    return (
      <div className="rbc-date-cell">
        {/* Holiday Banners - at top (MONTH VIEW ONLY) */}
        {holidaysForDate.length > 0 && (
          <div 
            className="holiday-banners"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '1px',
              padding: '2px',
            }}
          >
            {holidaysForDate.map((holiday, idx) => (
              <button
                key={`${holiday.id}-${idx}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectEvent(holiday);
                }}
                className="holiday-banner-link"
                title="Click to view details"
                style={{
                  background: 'linear-gradient(135deg, #e9d5ff 0%, #f3e8ff 100%)',
                  border: '1px solid #c084fc',
                  borderRadius: '4px',
                  padding: isMobile ? '2px 4px' : '3px 6px',
                  fontSize: isMobile ? '9px' : '10px',
                  fontWeight: 600,
                  color: '#581c87',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  textDecoration: 'none',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ fontSize: isMobile ? '10px' : '12px', flexShrink: 0 }}>
                  {holiday.title.match(/^[\p{Emoji}]/u)?.[0] || '🎉'}
                </span>
                <span style={{ 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                }}>
                  {holiday.title.replace(/^[\p{Emoji}\s]+/u, '')}
                </span>
              </button>
            ))}
          </div>
        )}
        
        {/* Date number - below holidays */}
        <div 
          style={{ 
            position: 'relative',
            zIndex: 2,
            marginTop: `${totalHolidayHeight}px`,
          }}
        >
          <a className="rbc-button-link" role="cell">
            {label}
          </a>
        </div>
      </div>
    );
  }, [holidayEvents, onSelectEvent, isMobile]);

  // FIXED: Enhanced date cell wrapper with better click detection
  const DateCellWrapper = useCallback(({ children, value }: any) => {
    const handleCellClick = (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      
      console.log('🖱️ Cell click detected:', {
        target: target.className,
        view,
        value
      });
      
      // Don't intercept clicks on events or holiday banners
      if (
        target.closest('.rbc-event') || 
        target.closest('.rbc-event-content') ||
        target.closest('.holiday-banner-link') ||
        target.closest('.holiday-banners')
      ) {
        console.log('❌ Click was on event/holiday - ignoring');
        return;
      }
      
      // FIXED: If clicking on month view cell, open day view for this date
      if (value && view === 'month') {
        console.log('✅ Opening day view for:', value);
        setDate(value);
        setView('day');
      }
    };

    return (
      <div 
        className="rbc-day-bg-wrapper" 
        onClick={handleCellClick}
        style={{ 
          cursor: view === 'month' ? 'pointer' : 'default',
        }}
      >
        {children}
      </div>
    );
  }, [view, setDate, setView]);

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

  // Check if we should show the legend
  const shouldShowLegend = context === 'business' || dbUiEvents.some(e => e.resource?.hasPreEvent || e.resource?.hasPostEvent);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-[650px]">
        <div className="animate-pulse">
          <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="grid grid-cols-7 gap-2">
            {[...Array(35)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="calendar-wrapper rounded-xl overflow-hidden shadow-lg bg-white relative"
      style={{
        padding: isMobile ? '0.5rem' : '1rem',
      }}
    >
      {/* Legend for pre/post event indicators - MINIMIZABLE */}
      {shouldShowLegend && (
        <div
          style={{
            position: "absolute",
            bottom: "10px",
            right: "10px",
            background: "rgba(255,255,255,0.95)",
            backdropFilter: "blur(8px)",
            borderRadius: "8px",
            padding: showLegend ? "6px 10px" : "4px 8px",
            fontSize: "11px",
            border: "1px solid rgba(0,0,0,0.1)",
            zIndex: 10,
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            transition: "all 0.2s ease",
            maxWidth: showLegend ? "200px" : "40px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {showLegend && (
              <div style={{ fontWeight: 600, color: "#374151", marginRight: "8px" }}>
                Event Indicators:
              </div>
            )}
            <button
              onClick={() => setShowLegend(!showLegend)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "2px",
                fontSize: "14px",
                color: "#6b7280",
                lineHeight: 1,
              }}
              title={showLegend ? "Minimize" : "Show legend"}
            >
              {showLegend ? "−" : "?"}
            </button>
          </div>
          {showLegend && (
            <div style={{ display: "flex", flexDirection: "column", gap: "2px", color: "#6b7280", marginTop: "4px" }}>
              <div>🍽️ = Pre-event gathering</div>
              <div>☕ = Post-event gathering</div>
              {context === 'business' && <div>BIZ = Business event</div>}
            </div>
          )}
        </div>
      )}

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
          selectable={true}
          onSelectSlot={(slotInfo: any) => {
            console.log('📅 CalendarGrid: Slot selected!', { slotInfo, view });
            if (onSelectSlot) {
              onSelectSlot(slotInfo);
            }
          }}
          onSelectEvent={(event: any) => {
            console.log('📅 CalendarGrid: Event selected!', event);
            if (onSelectEvent) {
              onSelectEvent(event);
            }
          }}
          onEventDrop={isMobile ? undefined : onDrop}
          onEventResize={isMobile ? undefined : onResize}
          onDropFromOutside={isMobile ? undefined : handleDropFromOutside}
          eventPropGetter={eventStyleGetter}
          components={{
            event: EventComponent,
            month: {
              dateHeader: MonthDateHeader,
            },
            dateCellWrapper: DateCellWrapper,
          }}
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
      
      {/* STYLES - Calendar cells + Holiday Banners + Moon containment */}
      <style jsx global>{`
        .calendar-wrapper {
          background: white !important;
        }
        
        .custom-calendar {
          font-size: 14px;
          background: rgba(255, 255, 255, 0.98) !important;
        }
        
        .custom-calendar .rbc-day-bg {
          cursor: pointer !important;
          position: relative !important;
        }
        
        .custom-calendar .rbc-date-cell {
          position: relative;
          z-index: 2;
          color: #374151;
          pointer-events: auto;
          padding-top: 2px;
        }
        
        .holiday-banner-link {
          position: relative;
        }
        
        .holiday-banner-link::after {
          content: 'Click to view';
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%) translateY(-4px);
          background: rgba(88, 28, 135, 0.95);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 10px;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s ease;
          z-index: 100;
        }
        
        .holiday-banner-link:hover::after {
          opacity: 1;
        }
        
        .holiday-banner-link:hover {
          background: linear-gradient(135deg, #ddd6fe 0%, #e9d5ff 100%) !important;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(139, 92, 246, 0.3) !important;
        }
        
        .holiday-banner-link:active {
          transform: translateY(0);
        }
        
        @media (max-width: 768px) {
          .holiday-banner-link::after {
            content: 'Tap';
            font-size: 8px;
            padding: 2px 4px;
          }
        }
        
        .custom-calendar .rbc-event,
        .custom-calendar .rbc-event-content {
          position: relative;
          z-index: 3;
          pointer-events: auto;
        }
        
        .custom-calendar .rbc-time-slot {
          cursor: pointer !important;
          position: relative !important;
        }
        
        .custom-calendar .rbc-header {
          background: #f8fafc;
          border-bottom: 1px solid rgba(0,0,0,0.1);
          padding: 8px 4px;
          font-weight: 600;
          color: #374151;
        }
        
        .custom-calendar .rbc-today {
          background: ${themeStyles.todayBg};
        }
        
        .custom-calendar .rbc-toolbar {
          margin-bottom: 12px;
          padding: 0 8px;
          background: transparent;
        }
        
        .custom-calendar .rbc-toolbar-label {
          color: #1f2937;
          font-weight: 700;
          font-size: 18px;
        }
        
        .custom-calendar .rbc-toolbar button {
          border: 2px solid rgba(0,0,0,0.15);
          background: rgba(255,255,255,0.95);
          color: #1f2937;
          border-radius: 8px;
          padding: 8px 14px;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.2s ease;
          margin: 0 3px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }
        
        .custom-calendar .rbc-toolbar button:hover:not(:disabled) {
          background: ${themeStyles.hover};
          border-color: ${themeStyles.accent};
          transform: translateY(-1px);
          box-shadow: 0 3px 6px rgba(0,0,0,0.12);
        }
        
        .custom-calendar .rbc-toolbar button.rbc-active {
          background: ${themeStyles.accent};
          color: white;
          border-color: ${themeStyles.accent};
          font-weight: 700;
          box-shadow: 0 2px 4px rgba(0,0,0,0.15);
        }
        
        .custom-calendar .rbc-toolbar button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .custom-calendar .rbc-month-view {
          background: white;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .custom-calendar .rbc-day-bg {
          background: white;
        }
        
        .custom-calendar .rbc-day-bg:hover {
          background: ${themeStyles.hover} !important;
          transition: background 0.2s ease;
        }
        
        .custom-calendar .rbc-slot-selection {
          background: ${themeStyles.selection};
          border: 2px dashed ${themeStyles.accent};
          border-radius: 4px;
        }
        
        .custom-calendar .rbc-off-range-bg {
          background: rgba(156, 163, 175, 0.05);
        }
        
        @media (hover: hover) {
          .custom-calendar .rbc-event:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0,0,0,0.15);
            transition: all 0.2s;
            z-index: 4;
          }
          
          .custom-calendar .rbc-event[title*="Moon"]:hover {
            transform: none;
            box-shadow: none;
          }
        }
        
        @media (max-width: 768px) {
          .custom-calendar {
            font-size: 12px;
          }
          
          .custom-calendar .rbc-toolbar {
            flex-direction: column;
            gap: 8px;
            padding: 0 4px;
          }
          
          .custom-calendar .rbc-toolbar-label {
            font-size: 16px;
            font-weight: 700;
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
            font-weight: 600;
          }
          
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
          
          .custom-calendar .rbc-header {
            padding: 6px 2px;
            font-size: 11px;
          }
          
          .custom-calendar .rbc-show-more {
            font-size: 10px;
            padding: 2px 4px;
            background: rgba(255,255,255,0.9);
            border-radius: 3px;
            margin-top: 2px;
          }
          
          .custom-calendar {
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
            -webkit-touch-callout: none;
            -webkit-tap-highlight-color: transparent;
          }
          
          .custom-calendar .rbc-event,
          .custom-calendar .rbc-day-bg {
            cursor: pointer;
            -webkit-tap-highlight-color: ${themeStyles.selection};
          }
        }
        
        .custom-calendar .rbc-event[title*="Moon"] {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        
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
        
        .custom-calendar .rbc-time-view {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }
        
        .custom-calendar .rbc-time-header {
          background: #f9fafb;
        }
        
        .custom-calendar .rbc-time-content {
          border-top: 1px solid #e5e7eb;
          background: white;
        }
        
        .custom-calendar .rbc-time-slot {
          border-top: 1px solid #f3f4f6;
        }
        
        .custom-calendar .rbc-current-time-indicator {
          background-color: #ef4444;
          height: 2px;
        }
        
        .custom-calendar .rbc-time-header-gutter {
          background: #f9fafb;
          border-right: 1px solid #e5e7eb;
        }
        
        .custom-calendar .rbc-label {
          padding: 4px 8px;
          font-size: 11px;
          font-weight: 500;
          color: #6b7280 !important;
          text-align: right;
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        
        .custom-calendar .rbc-time-gutter {
          background: #f9fafb;
        }
        
        .custom-calendar .rbc-timeslot-group {
          min-height: 40px;
          border-left: 1px solid #e5e7eb;
        }
        
        .custom-calendar .rbc-agenda-view {
          color: #111827;
        }
        
        .custom-calendar .rbc-agenda-date-cell,
        .custom-calendar .rbc-agenda-time-cell {
          padding: 8px;
          white-space: nowrap;
          color: #374151;
        }
        
        .custom-calendar .rbc-agenda-event-cell {
          padding: 8px;
        }
      `}</style>
    </div>
  );
}
