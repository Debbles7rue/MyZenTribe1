// app/(protected)/calendar/components/MeditationScheduler.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface MeditationSchedulerProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  onSchedule: (session: any) => void;
}

export default function MeditationScheduler({ open, onClose, userId, onSchedule }: MeditationSchedulerProps) {
  const [sessions, setSessions] = useState({
    morning: { enabled: false, time: '07:00', duration: 10 },
    afternoon: { enabled: false, time: '13:00', duration: 5 },
    evening: { enabled: false, time: '20:00', duration: 15 }
  });
  
  const [meditationType, setMeditationType] = useState<'guided' | 'silent' | 'breathing' | 'body-scan'>('guided');
  const [reminderBefore, setReminderBefore] = useState(5);
  const [streak, setStreak] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);

  // Load user's meditation stats
  useEffect(() => {
    loadMeditationStats();
  }, [userId]);

  const loadMeditationStats = async () => {
    const { data } = await supabase
      .from('meditation_stats')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (data) {
      setStreak(data.streak || 0);
      setTotalMinutes(data.total_minutes || 0);
    }
  };

  const scheduleMeditation = async () => {
    const scheduledSessions = [];
    
    for (const [period, config] of Object.entries(sessions)) {
      if (config.enabled) {
        const sessionData = {
          title: `${period.charAt(0).toUpperCase() + period.slice(1)} Meditation`,
          description: `${config.duration} minute ${meditationType} meditation`,
          event_type: 'meditation',
          meditation_type: meditationType,
          duration_minutes: config.duration,
          recurring: true,
          recurring_pattern: 'daily',
          start_time: config.time,
          reminder_minutes: reminderBefore,
          created_by: userId,
          visibility: 'private',
          source: 'personal',
          icon: '🧘'
        };
        
        scheduledSessions.push(sessionData);
      }
    }
    
    // Create recurring meditation events
    for (const session of scheduledSessions) {
      await supabase.from('events').insert({
        ...session,
        start_time: new Date(`${new Date().toISOString().split('T')[0]}T${session.start_time}`).toISOString(),
        end_time: new Date(new Date(`${new Date().toISOString().split('T')[0]}T${session.start_time}`).getTime() + session.duration_minutes * 60000).toISOString()
      });
    }
    
    onSchedule(scheduledSessions);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">✕</button>
        
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">🧘 Meditation Scheduler</h2>
          
          {/* Stats Display */}
          <div className="flex gap-4 mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{streak}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Day Streak</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{totalMinutes}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Total Minutes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Total Time</div>
            </div>
          </div>
        </div>

        {/* Meditation Type Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Meditation Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['guided', 'silent', 'breathing', 'body-scan'] as const).map(type => (
              <button
                key={type}
                onClick={() => setMeditationType(type)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  meditationType === type
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                }`}
              >
                <div className="text-lg mb-1">
                  {type === 'guided' && '🎧'}
                  {type === 'silent' && '🤫'}
                  {type === 'breathing' && '💨'}
                  {type === 'body-scan' && '👤'}
                </div>
                <div className="text-sm capitalize">{type.replace('-', ' ')}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Session Configuration */}
        <div className="space-y-4 mb-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Daily Sessions</h3>
          
          {Object.entries(sessions).map(([period, config]) => (
            <div key={period} className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setSessions(prev => ({
                  ...prev,
                  [period]: { ...prev[period as keyof typeof prev], enabled: e.target.checked }
                }))}
                className="rounded accent-purple-500"
              />
              <div className="flex-1">
                <div className="font-medium capitalize text-gray-800 dark:text-white">
                  {period} Session
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="time"
                    value={config.time}
                    onChange={(e) => setSessions(prev => ({
                      ...prev,
                      [period]: { ...prev[period as keyof typeof prev], time: e.target.value }
                    }))}
                    disabled={!config.enabled}
                    className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded
                             bg-white dark:bg-gray-700 text-gray-800 dark:text-white
                             disabled:opacity-50"
                  />
                  <select
                    value={config.duration}
                    onChange={(e) => setSessions(prev => ({
                      ...prev,
                      [period]: { ...prev[period as keyof typeof prev], duration: parseInt(e.target.value) }
                    }))}
                    disabled={!config.enabled}
                    className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded
                             bg-white dark:bg-gray-700 text-gray-800 dark:text-white
                             disabled:opacity-50"
                  >
                    <option value="5">5 min</option>
                    <option value="10">10 min</option>
                    <option value="15">15 min</option>
                    <option value="20">20 min</option>
                    <option value="30">30 min</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Reminder Settings */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Remind me before session
          </label>
          <select
            value={reminderBefore}
            onChange={(e) => setReminderBefore(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
          >
            <option value="5">5 minutes</option>
            <option value="10">10 minutes</option>
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={scheduleMeditation}
            disabled={!Object.values(sessions).some(s => s.enabled)}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg
                     hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed
                     transform hover:scale-105 active:scale-95 transition-all"
          >
            Schedule Meditation
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg
                     hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== GratitudeJournalIntegration.tsx =====
interface GratitudeJournalIntegrationProps {
  userId: string;
  date: Date;
  onCreateEntry?: () => void;
}

export function GratitudeJournalIntegration({ userId, date, onCreateEntry }: GratitudeJournalIntegrationProps) {
  const [todaysEntry, setTodaysEntry] = useState<any>(null);
  const [showQuickEntry, setShowQuickEntry] = useState(false);
  const [quickGratitude, setQuickGratitude] = useState(['', '', '']);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    loadTodaysEntry();
    loadStreak();
  }, [date, userId]);

  const loadTodaysEntry = async () => {
    const dateStr = date.toISOString().split('T')[0];
    const { data } = await supabase
      .from('gratitude_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('date', dateStr)
      .single();
    
    setTodaysEntry(data);
  };

  const loadStreak = async () => {
    const { data } = await supabase
      .from('gratitude_stats')
      .select('streak')
      .eq('user_id', userId)
      .single();
    
    if (data) setStreak(data.streak);
  };

  const saveQuickEntry = async () => {
    const dateStr = date.toISOString().split('T')[0];
    const { error } = await supabase
      .from('gratitude_entries')
      .upsert({
        user_id: userId,
        date: dateStr,
        gratitudes: quickGratitude.filter(g => g.trim()),
        quick_entry: true,
        created_at: new Date().toISOString()
      });

    if (!error) {
      setShowQuickEntry(false);
      loadTodaysEntry();
      if (onCreateEntry) onCreateEntry();
    }
  };

  const openFullJournal = () => {
    window.location.href = '/gratitude-journal';
  };

  return (
    <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📝</span>
          <h3 className="font-semibold text-gray-800 dark:text-white">Gratitude Journal</h3>
          {streak > 0 && (
            <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full">
              {streak} day streak 🔥
            </span>
          )}
        </div>
        <button
          onClick={openFullJournal}
          className="text-xs px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          Open Journal
        </button>
      </div>

      {todaysEntry ? (
        <div className="space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">Today's gratitudes:</p>
          <ul className="space-y-1">
            {todaysEntry.gratitudes.map((item: string, idx: number) => (
              <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                <span className="text-purple-500">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div>
          {!showQuickEntry ? (
            <button
              onClick={() => setShowQuickEntry(true)}
              className="w-full py-2 border-2 border-dashed border-purple-300 dark:border-purple-600 rounded-lg
                       text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20
                       transition-colors text-sm"
            >
              + Quick Gratitude Entry
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">What are you grateful for today?</p>
              {quickGratitude.map((item, idx) => (
                <input
                  key={idx}
                  type="text"
                  value={item}
                  onChange={(e) => {
                    const newGratitudes = [...quickGratitude];
                    newGratitudes[idx] = e.target.value;
                    setQuickGratitude(newGratitudes);
                  }}
                  placeholder={`Gratitude ${idx + 1}...`}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded
                           bg-white dark:bg-gray-700 text-gray-800 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              ))}
              <div className="flex gap-2">
                <button
                  onClick={saveQuickEntry}
                  className="flex-1 px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowQuickEntry(false)}
                  className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ===== IntegratedWeatherWidget.tsx =====
interface IntegratedWeatherWidgetProps {
  location?: { lat: number; lon: number; city: string };
  events: any[];
  onWeatherAlert: (alert: any) => void;
}

export function IntegratedWeatherWidget({ location, events, onWeatherAlert }: IntegratedWeatherWidgetProps) {
  const [weather, setWeather] = useState<any>(null);
  const [forecast, setForecast] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  // You can use the same API key from the weather calendar
  const WEATHER_API_KEY = "55dc1d12983cdb4bfdc04fce9bb63a55";

  useEffect(() => {
    if (location) {
      fetchWeather();
      checkWeatherAlerts();
    }
  }, [location]);

  const fetchWeather = async () => {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${location!.lat}&lon=${location!.lon}&appid=${WEATHER_API_KEY}&units=imperial`
      );
      const data = await response.json();
      setWeather(data);

      // Get 5-day forecast
      const forecastResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${location!.lat}&lon=${location!.lon}&appid=${WEATHER_API_KEY}&units=imperial`
      );
      const forecastData = await forecastResponse.json();
      setForecast(forecastData.list.slice(0, 5));
    } catch (error) {
      console.error('Weather fetch error:', error);
    }
  };

  const checkWeatherAlerts = () => {
    // Check if any outdoor events conflict with bad weather
    const outdoorEvents = events.filter(e => 
      e.location?.toLowerCase().includes('park') ||
      e.location?.toLowerCase().includes('outdoor') ||
      e.event_type === 'sports'
    );

    const weatherAlerts: any[] = [];
    
    outdoorEvents.forEach(event => {
      // This would check actual weather for event date
      // For demo, create sample alerts
      if (Math.random() > 0.7) {
        weatherAlerts.push({
          event,
          type: 'rain',
          message: 'Rain expected during this outdoor event'
        });
      }
    });

    setAlerts(weatherAlerts);
    weatherAlerts.forEach(alert => onWeatherAlert(alert));
  };

  if (!weather) return null;

  return (
    <div className="p-4 bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-900/20 dark:to-sky-900/20 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800 dark:text-white">Weather</h3>
        <span className="text-xs text-gray-600 dark:text-gray-400">{location?.city}</span>
      </div>

      <div className="flex items-center gap-4 mb-3">
        <div className="text-4xl">
          {weather.weather[0].main === 'Clear' && '☀️'}
          {weather.weather[0].main === 'Clouds' && '☁️'}
          {weather.weather[0].main === 'Rain' && '🌧️'}
          {weather.weather[0].main === 'Snow' && '❄️'}
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-800 dark:text-white">
            {Math.round(weather.main.temp)}°F
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {weather.weather[0].description}
          </div>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg mb-3">
          <p className="text-xs font-medium text-yellow-800 dark:text-yellow-300">
            ⚠️ {alerts.length} weather alert{alerts.length > 1 ? 's' : ''} for your events
          </p>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto">
        {forecast.map((day, idx) => (
          <div key={idx} className="flex-shrink-0 text-center p-2 bg-white/50 dark:bg-gray-800/50 rounded">
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {new Date(day.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' })}
            </div>
            <div className="text-lg my-1">
              {day.weather[0].main === 'Clear' && '☀️'}
              {day.weather[0].main === 'Clouds' && '☁️'}
              {day.weather[0].main === 'Rain' && '🌧️'}
            </div>
            <div className="text-xs font-medium">{Math.round(day.main.temp)}°</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== ExportImportCalendar.tsx =====
interface ExportImportCalendarProps {
  events: any[];
  userId: string;
  onImport: (events: any[]) => void;
}

export function ExportImportCalendar({ events, userId, onImport }: ExportImportCalendarProps) {
  const [importing, setImporting] = useState(false);

  const exportToICS = () => {
    let ics = 'BEGIN:VCALENDAR\n';
    ics += 'VERSION:2.0\n';
    ics += 'PRODID:-//MyZenTribe//Calendar//EN\n';
    ics += 'CALSCALE:GREGORIAN\n';
    
    events.forEach(event => {
      ics += 'BEGIN:VEVENT\n';
      ics += `UID:${event.id}@myzentribe.com\n`;
      ics += `DTSTART:${formatICSDate(new Date(event.start_time))}\n`;
      ics += `DTEND:${formatICSDate(new Date(event.end_time))}\n`;
      ics += `SUMMARY:${event.title}\n`;
      if (event.description) ics += `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}\n`;
      if (event.location) ics += `LOCATION:${event.location}\n`;
      ics += `CREATED:${formatICSDate(new Date())}\n`;
      ics += 'END:VEVENT\n';
    });
    
    ics += 'END:VCALENDAR';

    // Download file
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `myzentribe-calendar-${new Date().toISOString().split('T')[0]}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatICSDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').replace('.000', '');
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    
    try {
      const text = await file.text();
      const events = parseICS(text);
      
      // Add user ID to imported events
      const eventsWithUser = events.map(e => ({
        ...e,
        created_by: userId,
        imported_at: new Date().toISOString()
      }));
      
      onImport(eventsWithUser);
    } catch (error) {
      console.error('Import error:', error);
    } finally {
      setImporting(false);
    }
  };

  const parseICS = (icsText: string): any[] => {
    // Basic ICS parser - in production use a library like ical.js
    const events: any[] = [];
    const lines = icsText.split('\n');
    let currentEvent: any = null;

    for (const line of lines) {
      if (line.startsWith('BEGIN:VEVENT')) {
        currentEvent = {};
      } else if (line.startsWith('END:VEVENT') && currentEvent) {
        events.push(currentEvent);
        currentEvent = null;
      } else if (currentEvent) {
        const [key, ...valueParts] = line.split(':');
        const value = valueParts.join(':');
        
        switch (key) {
          case 'SUMMARY':
            currentEvent.title = value;
            break;
          case 'DESCRIPTION':
            currentEvent.description = value.replace(/\\n/g, '\n');
            break;
          case 'LOCATION':
            currentEvent.location = value;
            break;
          case 'DTSTART':
            currentEvent.start_time = parseICSDate(value);
            break;
          case 'DTEND':
            currentEvent.end_time = parseICSDate(value);
            break;
        }
      }
    }
    
    return events;
  };

  const parseICSDate = (dateStr: string): string => {
    // Convert ICS date format to ISO
    if (dateStr.length === 8) {
      // Date only: YYYYMMDD
      return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}T00:00:00Z`;
    } else {
      // DateTime: YYYYMMDDTHHMMSS
      return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}T${dateStr.slice(9, 11)}:${dateStr.slice(11, 13)}:${dateStr.slice(13, 15)}Z`;
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={exportToICS}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600
                 flex items-center gap-2 transform hover:scale-105 active:scale-95 transition-all"
      >
        <span>📤</span>
        <span>Export Calendar</span>
      </button>
      
      <label className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600
                      flex items-center gap-2 cursor-pointer transform hover:scale-105 active:scale-95 transition-all">
        <span>📥</span>
        <span>{importing ? 'Importing...' : 'Import Calendar'}</span>
        <input
          type="file"
          accept=".ics,.ical"
          onChange={handleFileImport}
          className="hidden"
          disabled={importing}
        />
      </label>
    </div>
  );
}
