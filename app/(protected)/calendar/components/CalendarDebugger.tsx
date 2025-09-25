// app/(protected)/calendar/components/CalendarDebugger.tsx
// 
// DEBUGGING COMPONENT - Add this to your calendar page temporarily
// Place it right after your CalendarGrid component
// It will show you exactly what's happening with your calendar interactions
//
// Usage: 
// import CalendarDebugger from './components/CalendarDebugger';
// 
// Then in your JSX:
// <CalendarGrid ... />
// <CalendarDebugger 
//   onSelectSlot={onSelectSlot}
//   onSelectEvent={onSelectEvent}
//   events={calendarEvents}
// />

import React, { useEffect, useState, useRef } from 'react';

interface CalendarDebuggerProps {
  onSelectSlot?: any;
  onSelectEvent?: any;
  events?: any[];
  showDetailed?: boolean;
}

export default function CalendarDebugger({ 
  onSelectSlot, 
  onSelectEvent, 
  events,
  showDetailed = true 
}: CalendarDebuggerProps) {
  const [clickLog, setClickLog] = useState<string[]>([]);
  const [calendarInfo, setCalendarInfo] = useState<any>({});
  const [isExpanded, setIsExpanded] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  // Log to both console and UI
  const log = (message: string, data?: any) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(`🔍 ${logEntry}`, data || '');
    setClickLog(prev => [...prev.slice(-9), logEntry]);
  };

  // Check calendar setup on mount
  useEffect(() => {
    log('CalendarDebugger mounted');
    
    // Check what's passed as props
    const info = {
      hasOnSelectSlot: !!onSelectSlot,
      hasOnSelectEvent: !!onSelectEvent,
      onSelectSlotType: typeof onSelectSlot,
      onSelectEventType: typeof onSelectEvent,
      eventsCount: events?.length || 0,
      hasDOMCalendar: false,
      calendarCells: 0,
      hasClickHandlers: false
    };

    // Check DOM after a delay (for calendar to render)
    setTimeout(() => {
      const calendarEl = document.querySelector('.rbc-calendar');
      const dayCells = document.querySelectorAll('.rbc-day-bg');
      const timeSlots = document.querySelectorAll('.rbc-time-slot');
      const eventEls = document.querySelectorAll('.rbc-event');
      
      info.hasDOMCalendar = !!calendarEl;
      info.calendarCells = dayCells.length;
      
      // Try to detect if cells have click handlers
      if (dayCells.length > 0) {
        const firstCell = dayCells[0] as HTMLElement;
        
        // Check various ways click handlers might be attached
        info.hasClickHandlers = !!(
          firstCell.onclick ||
          firstCell.hasAttribute('onclick') ||
          firstCell.getAttribute('role') === 'button'
        );

        // Log cell properties
        log(`First cell properties:`, {
          className: firstCell.className,
          role: firstCell.getAttribute('role'),
          cursor: window.getComputedStyle(firstCell).cursor,
          pointerEvents: window.getComputedStyle(firstCell).pointerEvents
        });
      }

      log('Calendar DOM check:', info);
      setCalendarInfo(info);

      // Add test click listeners to detect if clicks are reaching elements
      dayCells.forEach((cell, index) => {
        cell.addEventListener('click', (e) => {
          log(`Day cell ${index} clicked via addEventListener`);
          e.stopPropagation();
        }, true);
      });

      eventEls.forEach((event, index) => {
        event.addEventListener('click', (e) => {
          log(`Event ${index} clicked via addEventListener`);
          e.stopPropagation();
        }, true);
      });
    }, 1000);

    // Global click listener to catch all clicks
    const globalClickHandler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const classNames = target.className || '';
      
      if (classNames.includes('rbc-')) {
        log(`Global click on calendar element: ${classNames.substring(0, 50)}`);
        
        // Check if it's a day cell
        if (classNames.includes('rbc-day-bg')) {
          log('Day background clicked! Checking handler...');
          if (onSelectSlot) {
            log('onSelectSlot exists, should be called');
          } else {
            log('⚠️ onSelectSlot is undefined!');
          }
        }
        
        // Check if it's an event
        if (classNames.includes('rbc-event')) {
          log('Event clicked! Checking handler...');
          if (onSelectEvent) {
            log('onSelectEvent exists, should be called');
          } else {
            log('⚠️ onSelectEvent is undefined!');
          }
        }
      }
    };

    document.addEventListener('click', globalClickHandler, true);

    return () => {
      document.removeEventListener('click', globalClickHandler, true);
    };
  }, [onSelectSlot, onSelectEvent, events]);

  // Try to manually trigger handlers for testing
  const testSlotClick = () => {
    log('Testing onSelectSlot manually...');
    if (onSelectSlot) {
      try {
        const testSlotInfo = {
          start: new Date(),
          end: new Date(Date.now() + 3600000),
          slots: [new Date()],
          action: 'select'
        };
        onSelectSlot(testSlotInfo);
        log('✅ onSelectSlot called successfully with test data');
      } catch (error) {
        log('❌ Error calling onSelectSlot:', error);
      }
    } else {
      log('❌ onSelectSlot is not defined');
    }
  };

  const testEventClick = () => {
    log('Testing onSelectEvent manually...');
    if (onSelectEvent) {
      try {
        const testEvent = {
          title: 'Test Event',
          start: new Date(),
          end: new Date(Date.now() + 3600000),
          resource: { id: 'test-123' }
        };
        onSelectEvent(testEvent);
        log('✅ onSelectEvent called successfully with test data');
      } catch (error) {
        log('❌ Error calling onSelectEvent:', error);
      }
    } else {
      log('❌ onSelectEvent is not defined');
    }
  };

  // Clear logs
  const clearLogs = () => {
    setClickLog([]);
    log('Logs cleared');
  };

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: isExpanded ? '400px' : '200px',
        maxHeight: isExpanded ? '500px' : '160px',
        background: 'rgba(0, 0, 0, 0.9)',
        color: '#00ff00',
        padding: '10px',
        borderRadius: '8px',
        fontFamily: 'monospace',
        fontSize: '11px',
        zIndex: 9999,
        transition: 'all 0.3s ease',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(0, 255, 0, 0.3)'
      }}
    >
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '10px',
        borderBottom: '1px solid rgba(0, 255, 0, 0.3)',
        paddingBottom: '5px'
      }}>
        <strong style={{ color: '#00ff00' }}>🔍 Calendar Debugger</strong>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            background: 'none',
            border: '1px solid #00ff00',
            color: '#00ff00',
            padding: '2px 8px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '10px'
          }}
        >
          {isExpanded ? 'Minimize' : 'Expand'}
        </button>
      </div>

      {/* Status Indicators */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
          <StatusIndicator 
            label="onSelectSlot" 
            status={!!onSelectSlot} 
            type={typeof onSelectSlot}
          />
          <StatusIndicator 
            label="onSelectEvent" 
            status={!!onSelectEvent}
            type={typeof onSelectEvent}
          />
          <StatusIndicator 
            label="Calendar DOM" 
            status={calendarInfo.hasDOMCalendar}
            count={calendarInfo.calendarCells}
          />
          <StatusIndicator 
            label="Events" 
            status={events && events.length > 0}
            count={events?.length}
          />
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Test Buttons */}
          <div style={{ 
            display: 'flex', 
            gap: '5px', 
            marginBottom: '10px',
            flexWrap: 'wrap'
          }}>
            <TestButton onClick={testSlotClick} label="Test Slot" />
            <TestButton onClick={testEventClick} label="Test Event" />
            <TestButton onClick={clearLogs} label="Clear Logs" />
          </div>

          {/* Click Log */}
          <div 
            ref={logRef}
            style={{ 
              height: '250px',
              overflowY: 'auto',
              background: 'rgba(0, 0, 0, 0.5)',
              padding: '5px',
              borderRadius: '4px',
              border: '1px solid rgba(0, 255, 0, 0.2)'
            }}
          >
            <div style={{ color: '#888', marginBottom: '5px' }}>
              Click Log (most recent last):
            </div>
            {clickLog.length === 0 ? (
              <div style={{ color: '#666' }}>No clicks detected yet...</div>
            ) : (
              clickLog.map((log, i) => (
                <div key={i} style={{ 
                  color: log.includes('❌') ? '#ff4444' : 
                         log.includes('✅') ? '#44ff44' : 
                         log.includes('⚠️') ? '#ffaa44' : '#00ff00',
                  marginBottom: '2px'
                }}>
                  {log}
                </div>
              ))
            )}
          </div>

          {/* Instructions */}
          <div style={{ 
            marginTop: '10px',
            padding: '5px',
            background: 'rgba(0, 255, 0, 0.1)',
            borderRadius: '4px',
            fontSize: '10px',
            color: '#aaa'
          }}>
            <strong>Instructions:</strong><br/>
            1. Click on calendar cells and events<br/>
            2. Watch the log for click detection<br/>
            3. Use test buttons to verify handlers<br/>
            4. Check status indicators above<br/>
            5. Remove this component when done
          </div>
        </>
      )}
    </div>
  );
}

// Status Indicator Component
function StatusIndicator({ 
  label, 
  status, 
  type,
  count 
}: { 
  label: string; 
  status: boolean;
  type?: string;
  count?: number;
}) {
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center',
      gap: '5px',
      padding: '2px',
      background: 'rgba(0, 255, 0, 0.05)',
      borderRadius: '3px'
    }}>
      <span style={{ 
        width: '8px', 
        height: '8px', 
        borderRadius: '50%',
        background: status ? '#44ff44' : '#ff4444',
        display: 'inline-block'
      }} />
      <span style={{ fontSize: '10px', color: status ? '#aaa' : '#ff4444' }}>
        {label}
        {type && <span style={{ color: '#666' }}> ({type})</span>}
        {count !== undefined && <span style={{ color: '#666' }}> [{count}]</span>}
      </span>
    </div>
  );
}

// Test Button Component
function TestButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'rgba(0, 255, 0, 0.1)',
        border: '1px solid #00ff00',
        color: '#00ff00',
        padding: '3px 8px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '10px',
        transition: 'all 0.2s'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(0, 255, 0, 0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(0, 255, 0, 0.1)';
      }}
    >
      {label}
    </button>
  );
}
