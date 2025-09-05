// hooks/useKeyboardShortcuts.tsx
import { useEffect, useCallback } from 'react';

interface ShortcutActions {
  createEvent: () => void;
  switchToMonth: () => void;
  switchToWeek: () => void;
  switchToDay: () => void;
  navigateNext: () => void;
  navigatePrevious: () => void;
  navigateToday: () => void;
  openSearch: () => void;
  openTemplates: () => void;
  openAnalytics: () => void;
  toggleMoon: () => void;
  createReminder: () => void;
  createTodo: () => void;
  showHelp: () => void;
  escape: () => void;
}

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: keyof ShortcutActions;
}

const SHORTCUTS: ShortcutConfig[] = [
  // Navigation
  { key: 'm', description: 'Month view', action: 'switchToMonth' },
  { key: 'w', description: 'Week view', action: 'switchToWeek' },
  { key: 'd', description: 'Day view', action: 'switchToDay' },
  { key: 'ArrowRight', description: 'Next period', action: 'navigateNext' },
  { key: 'ArrowLeft', description: 'Previous period', action: 'navigatePrevious' },
  { key: 't', description: 'Go to today', action: 'navigateToday' },
  
  // Creation
  { key: 'n', description: 'New event', action: 'createEvent' },
  { key: 'r', description: 'New reminder', action: 'createReminder' },
  { key: 'o', description: 'New to-do', action: 'createTodo' },
  { key: 'p', description: 'Open templates', action: 'openTemplates' },
  
  // Features
  { key: '/', description: 'Search', action: 'openSearch' },
  { key: 'a', description: 'Analytics', action: 'openAnalytics' },
  { key: 'l', description: 'Toggle moon phases', action: 'toggleMoon' },
  
  // System
  { key: '?', shift: true, description: 'Show shortcuts', action: 'showHelp' },
  { key: 'Escape', description: 'Close modal', action: 'escape' },
];

export function useKeyboardShortcuts(
  actions: ShortcutActions,
  enabled: boolean = true
) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;
    
    // Don't trigger shortcuts when typing in inputs
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Still allow Escape to work
      if (e.key === 'Escape') {
        actions.escape();
      }
      return;
    }
    
    // Find matching shortcut
    const shortcut = SHORTCUTS.find(s => {
      const keyMatch = e.key === s.key || e.key.toLowerCase() === s.key.toLowerCase();
      const ctrlMatch = s.ctrl ? (e.ctrlKey || e.metaKey) : true;
      const shiftMatch = s.shift ? e.shiftKey : !e.shiftKey;
      const altMatch = s.alt ? e.altKey : !e.altKey;
      
      return keyMatch && ctrlMatch && shiftMatch && altMatch;
    });
    
    if (shortcut && actions[shortcut.action]) {
      e.preventDefault();
      actions[shortcut.action]();
    }
  }, [actions, enabled]);
  
  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, enabled]);
  
  return SHORTCUTS;
}

// Keyboard Shortcuts Help Component
export function KeyboardShortcutsHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  
  const groupedShortcuts = {
    'Navigation': SHORTCUTS.filter(s => 
      ['switchToMonth', 'switchToWeek', 'switchToDay', 'navigateNext', 'navigatePrevious', 'navigateToday']
        .includes(s.action)
    ),
    'Creation': SHORTCUTS.filter(s => 
      ['createEvent', 'createReminder', 'createTodo', 'openTemplates'].includes(s.action)
    ),
    'Features': SHORTCUTS.filter(s => 
      ['openSearch', 'openAnalytics', 'toggleMoon'].includes(s.action)
    ),
    'System': SHORTCUTS.filter(s => 
      ['showHelp', 'escape'].includes(s.action)
    ),
  };
  
  const formatKey = (shortcut: ShortcutConfig) => {
    const parts = [];
    if (shortcut.ctrl) parts.push('Ctrl');
    if (shortcut.shift) parts.push('Shift');
    if (shortcut.alt) parts.push('Alt');
    
    let key = shortcut.key;
    if (key === 'ArrowRight') key = '→';
    else if (key === 'ArrowLeft') key = '←';
    else if (key === 'ArrowUp') key = '↑';
    else if (key === 'ArrowDown') key = '↓';
    else if (key === 'Escape') key = 'Esc';
    
    parts.push(key);
    return parts.join('+');
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">⌨️ Keyboard Shortcuts</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
          {Object.entries(groupedShortcuts).map(([group, shortcuts]) => (
            <div key={group} className="mb-6">
              <h3 className="text-sm font-semibold text-gray-600 uppercase mb-3">{group}</h3>
              <div className="space-y-2">
                {shortcuts.map((shortcut) => (
                  <div key={shortcut.action} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">{shortcut.description}</span>
                    <kbd className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm font-mono">
                      {formatKey(shortcut)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <p className="text-sm text-purple-800">
              💡 <strong>Pro tip:</strong> These shortcuts work from anywhere in the calendar. 
              Press <kbd className="px-2 py-1 bg-purple-100 rounded text-xs">?</kbd> at any time to see this help.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
