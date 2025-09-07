// Key changes to make in your page.tsx file:

// 1. FIX THE MOBILE BUTTON TEXT - Update the CalendarHeader component call
// Find the CalendarHeader component in your page.tsx and modify the mode buttons section

// In CalendarHeader.tsx, update the mode switcher buttons:
<div className="flex bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-xl p-1 shadow-lg">
  <button
    onClick={() => setMode('my')}
    className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
      mode === 'my'
        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg transform scale-105'
        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
    }`}
  >
    <span className="hidden sm:inline">My Calendar</span>
    <span className="sm:hidden">My</span>
  </button>
  <button
    onClick={() => setMode('whats')}
    className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
      mode === 'whats'
        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg transform scale-105'
        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
    }`}
  >
    <span className="hidden sm:inline">What's Happening</span>
    <span className="sm:hidden">Events</span>
  </button>
</div>

// 2. REPLACE THE FEED VIEW WITH CALENDAR GRID FOR WHAT'S HAPPENING
// In your page.tsx, find this section around line 750-780 and replace it:

{/* Calendar or Feed View */}
<div className="flex-1" ref={calendarRef}>
  {mode === 'whats' ? (
    // Show calendar grid for What's Happening with special event colors
    <CalendarGrid
      dbEvents={processWhatsHappeningEvents(feed)}
      moonEvents={moonEvents}
      showMoon={showMoon}
      showWeather={showWeather}
      theme={calendarTheme}
      date={date}
      setDate={setDate}
      view={view}
      setView={setView}
      onSelectSlot={onSelectSlot}
      onSelectEvent={onSelectEvent}
      onDrop={undefined} // Disable drag/drop in What's Happening mode
      onResize={undefined} // Disable resize in What's Happening mode
      externalDragType={'none'}
      externalDragTitle={undefined}
      onExternalDrop={undefined}
      darkMode={darkMode}
      focusMode={focusMode}
      selectedBatchEvents={undefined}
      isWhatsHappening={true} // Add this prop to indicate special mode
    />
  ) : (
    // Show normal calendar for My Calendar
    <CalendarGrid
      dbEvents={calendarEvents}
      moonEvents={moonEvents}
      showMoon={showMoon}
      showWeather={showWeather}
      theme={calendarTheme}
      date={date}
      setDate={setDate}
      view={view}
      setView={setView}
      onSelectSlot={onSelectSlot}
      onSelectEvent={onSelectEvent}
      onDrop={isMobile ? undefined : onDrop}
      onResize={isMobile ? undefined : onResize}
      externalDragType={dragType}
      externalDragTitle={draggedItem?.title}
      onExternalDrop={handleExternalDrop}
      darkMode={darkMode}
      focusMode={focusMode}
      selectedBatchEvents={batchMode ? selectedBatchEvents : undefined}
      isWhatsHappening={false}
    />
  )}
</div>

// 3. ADD HELPER FUNCTION TO PROCESS EVENTS WITH COLOR CODING
// Add this function near your other helper functions (around line 480):

const processWhatsHappeningEvents = useCallback((feedEvents: any[]) => {
  // Filter for business, creator, community, and friend invite events only
  const filteredEvents = feedEvents.filter(event => {
    // Check if event is from business, creator, community, or friend invite
    return event.source === 'business' || 
           event.source === 'creator' || 
           event.source === 'community' ||
           (event.source === 'friend' && event.is_invite);
  });

  // Add color coding based on user's interaction
  return filteredEvents.map(event => {
    let color = '#6B7280'; // Default gray for no interaction
    
    // Check if user has shown interest or RSVP'd
    const userEvent = events.find(e => 
      e.original_event_id === event.id && e.created_by === me
    );
    
    if (userEvent) {
      if (userEvent.rsvp) {
        color = '#10B981'; // Green for RSVP'd
      } else if (userEvent.interested) {
        color = '#F59E0B'; // Amber for interested
      }
    }
    
    return {
      ...event,
      color,
      title: event.title + (userEvent?.rsvp ? ' ✓' : userEvent?.interested ? ' ★' : '')
    };
  });
}, [events, me]);

// 4. UPDATE THE EVENT SELECTION FOR WHAT'S HAPPENING MODE
// Modify the onSelectEvent function to handle What's Happening events differently:

const onSelectEvent = useCallback((evt: any) => {
  const r = evt.resource as any;
  if (r?.moonPhase) return;
  
  vibrate();
  
  // Handle batch mode selection
  if (batchMode) {
    const eventId = r?.id || evt.id;
    setSelectedBatchEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
    return;
  }
  
  // Check if we're in What's Happening mode
  if (mode === 'whats' && r?.id) {
    // Show action modal for interested/RSVP instead of edit
    setSelectedFeedEvent(r);
    setDetailsOpen(true);
    // The details modal should show "Interested" and "RSVP" buttons
  } else if (r?.id) {
    // Normal event selection for My Calendar
    setSelected(r);
    setDetailsOpen(true);
  }
}, [batchMode, mode, setSelected, setSelectedFeedEvent, vibrate]);

// 5. ADD CUSTOM STYLES FOR EVENT COLORS
// Add these styles to your style section:

/* Event status colors */
.rbc-event.interested {
  background-color: #F59E0B !important; /* Amber for interested */
  border-left: 3px solid #D97706 !important;
}

.rbc-event.rsvp {
  background-color: #10B981 !important; /* Green for RSVP */
  border-left: 3px solid #059669 !important;
}

.rbc-event.no-interaction {
  background-color: #6B7280 !important; /* Gray for no interaction */
  opacity: 0.8;
}

/* What's Happening mode indicators */
.whats-happening-mode .rbc-event {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.whats-happening-mode .rbc-event:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Legend for What's Happening */
.event-legend {
  display: flex;
  gap: 1rem;
  padding: 0.5rem;
  background: white;
  border-radius: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.legend-dot.interested {
  background-color: #F59E0B;
}

.legend-dot.rsvp {
  background-color: #10B981;
}

.legend-dot.available {
  background-color: #6B7280;
}
