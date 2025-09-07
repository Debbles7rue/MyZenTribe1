// FIXES TO APPLY TO YOUR page.tsx

// 1. FIX MOBILE HEADER VISIBILITY
// In CalendarHeader.tsx, update the mobile menu button styling:
{isMobile && (
  <button
    onClick={() => setMobileMenuOpen(true)}
    className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700"
    aria-label="Open menu"
  >
    <svg className="w-6 h-6 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  </button>
)}

// 2. REMOVE PHOTO MEMORIES FROM MOBILE QUICK ACTIONS
// In your page.tsx, update the MobileQuickActions component call (around line 650):
{isMobile && (
  <MobileQuickActions
    onMoodTrack={() => setShowMoodTracker(true)}
    // Remove this line: onPhotoMemories={() => setShowMemories(true)}
    onPomodoro={() => setShowPomodoroTimer(true)}
    onTimeBlock={() => setShowTimeBlocking(true)}
    onVoiceCommand={startListening}
    isListening={isListening}
  />
)}

// Also remove the Photo Memories Overlay section (around line 790):
// DELETE THIS ENTIRE SECTION:
{/* Photo Memories Overlay */}
{showMemories && (
  <PhotoMemories
    date={date}
    onClose={() => setShowMemories(false)}
    userId={me}
  />
)}

// 3. FIX CALENDAR CELL CLICK ON MOBILE
// Replace the onSelectSlot function (around line 380):
const onSelectSlot = useCallback((slotInfo: any) => {
  if (batchMode) return;
  
  // Add immediate feedback for mobile
  if (isMobile) {
    // Vibrate immediately to confirm touch
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }
  
  // In month view, clicking/tapping a day should navigate to day view
  if (view === 'month') {
    setDate(slotInfo.start);
    setView('day');
    // Add toast notification for mobile users
    if (isMobile) {
      showToast({ 
        type: 'info', 
        message: `Viewing ${slotInfo.start.toLocaleDateString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric' 
        })}` 
      });
    }
    return;
  }
  
  // In week or day view, clicking a time slot should open the create modal
  if (view === 'week' || view === 'day') {
    const start = slotInfo.start || new Date();
    const end = slotInfo.end || new Date(start.getTime() + 3600000);
    
    setForm(prev => ({
      ...prev,
      start: new Date(start.getTime() - start.getTimezoneOffset() * 60000).toISOString().slice(0, 16),
      end: new Date(end.getTime() - end.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    }));
    setOpenCreate(true);
  }
}, [view, batchMode, isMobile, setForm, showToast]);

// 4. FIX DRAG AND DROP
// Add this to your CalendarGrid component props (around line 750):
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
  // Fix drag and drop by ensuring it's only enabled on desktop
  onDrop={!isMobile ? onDrop : undefined}
  onResize={!isMobile ? onResize : undefined}
  draggableAccessor={!isMobile ? () => true : () => false} // Add this line
  externalDragType={!isMobile ? dragType : 'none'}
  externalDragTitle={!isMobile ? draggedItem?.title : undefined}
  onExternalDrop={!isMobile ? handleExternalDrop : undefined}
  darkMode={darkMode}
  focusMode={focusMode}
  selectedBatchEvents={batchMode ? selectedBatchEvents : undefined}
/>

// 5. ADD MOBILE-SPECIFIC STYLES FOR BETTER TOUCH TARGETS
// Add to your styles section at the bottom:
/* Mobile touch optimization */
@media (max-width: 1024px) {
  /* Make calendar cells more tappable */
  .rbc-day-bg {
    min-height: 60px !important;
    cursor: pointer !important;
  }
  
  .rbc-date-cell {
    padding: 8px !important;
    font-size: 16px !important;
  }
  
  /* Prevent text selection on mobile */
  .rbc-calendar {
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
  }
  
  /* Make events easier to tap */
  .rbc-event {
    min-height: 25px !important;
    padding: 4px !important;
  }
  
  /* Disable drag ghost on mobile */
  .rbc-addons-dnd-drag-preview {
    display: none !important;
  }
}

// 6. UPDATE MobileQuickActions.tsx component to remove photo memories:
// In components/MobileQuickActions.tsx, remove the photo memories button:
interface MobileQuickActionsProps {
  onMoodTrack: () => void;
  // Remove: onPhotoMemories: () => void;
  onPomodoro: () => void;
  onTimeBlock: () => void;
  onVoiceCommand: () => void;
  isListening: boolean;
}

export default function MobileQuickActions({
  onMoodTrack,
  // Remove: onPhotoMemories,
  onPomodoro,
  onTimeBlock,
  onVoiceCommand,
  isListening
}: MobileQuickActionsProps) {
  return (
    <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
      <button
        onClick={onMoodTrack}
        className="flex items-center gap-2 px-3 py-2 bg-white/80 dark:bg-gray-800/80 rounded-lg shadow-sm whitespace-nowrap text-sm"
      >
        😊 Mood
      </button>
      {/* Remove the Photo Memories button */}
      <button
        onClick={onPomodoro}
        className="flex items-center gap-2 px-3 py-2 bg-white/80 dark:bg-gray-800/80 rounded-lg shadow-sm whitespace-nowrap text-sm"
      >
        🍅 Focus
      </button>
      <button
        onClick={onTimeBlock}
        className="flex items-center gap-2 px-3 py-2 bg-white/80 dark:bg-gray-800/80 rounded-lg shadow-sm whitespace-nowrap text-sm"
      >
        📊 Time Block
      </button>
      <button
        onClick={onVoiceCommand}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-sm whitespace-nowrap text-sm ${
          isListening ? 'bg-red-500 text-white' : 'bg-white/80 dark:bg-gray-800/80'
        }`}
      >
        🎤 Voice
      </button>
    </div>
  );
}
