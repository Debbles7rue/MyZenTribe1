// app/(protected)/weather-calendar/page.tsx
"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import type { View } from "react-big-calendar";
import { supabase } from "@/lib/supabaseClient";
import CreateEventModal from "@/components/CreateEventModal";
import EventDetails from "@/components/EventDetails";
import { useToast } from "@/components/ToastProvider";
import type { DBEvent, Visibility } from "@/lib/types";

// Weather API configuration
const WEATHER_API_KEY = "55dc1d12983cdb4bfdc04fce9bb63a55";
const WEATHER_API_URL = "https://api.openweathermap.org/data/2.5";

// Add this near the top of the component for better user experience
const isWeatherConfigured = WEATHER_API_KEY && WEATHER_API_KEY !== "YOUR_API_KEY_HERE";

// Dynamic import of CalendarGrid with weather support
const WeatherCalendarGrid = dynamic(() => import("@/components/WeatherCalendarGrid"), { 
  ssr: false,
  loading: () => (
    <div className="card p-3">
      <div style={{ height: "680px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="space-y-3">
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-8 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
});

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

interface LocationData {
  lat: number;
  lon: number;
  city: string;
}

export default function WeatherCalendarPage() {
  const { showToast } = useToast();
  
  // Core states
  const [me, setMe] = useState<string | null>(null);
  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<View>("week"); // Default to week view for weather
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Weather states
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [weatherEnabled, setWeatherEnabled] = useState(true);
  const [temperatureUnit, setTemperatureUnit] = useState<'celsius' | 'fahrenheit'>('fahrenheit');
  const [weatherAnimations, setWeatherAnimations] = useState(true);
  
  // Modal states
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [selected, setSelected] = useState<DBEvent | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  // Form state
  const [form, setForm] = useState<{
    title: string;
    description: string;
    location: string;
    start: string;
    end: string;
    visibility: Visibility;
    event_type: string;
    community_id: string;
    source: "personal" | "business";
    image_path: string;
  }>({
    title: "",
    description: "",
    location: "",
    start: "",
    end: "",
    visibility: "private",
    event_type: "",
    community_id: "",
    source: "personal",
    image_path: "",
  });

  // Helper function for date formatting
  const toLocalInput = useCallback((d: Date) => {
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }, []);

  // Get user location
  const getUserLocation = useCallback(async () => {
    // First try browser geolocation
    if ('geolocation' in navigator) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 10000,
            enableHighAccuracy: true
          });
        });
        
        const { latitude, longitude } = position.coords;
        
        // Get city name from reverse geocoding
        const response = await fetch(
          `${WEATHER_API_URL}/weather?lat=${latitude}&lon=${longitude}&appid=${WEATHER_API_KEY}`
        );
        const data = await response.json();
        
        setLocation({
          lat: latitude,
          lon: longitude,
          city: data.name || 'Your Location'
        });
        
        return { lat: latitude, lon: longitude };
      } catch (error) {
        console.error('Geolocation error:', error);
        // Fall back to IP-based location or default
        return getDefaultLocation();
      }
    } else {
      return getDefaultLocation();
    }
  }, []);

  // Default location fallback (Greenville, Texas as per your config)
  const getDefaultLocation = () => {
    const defaultLoc = {
      lat: 33.1384,
      lon: -96.1108,
      city: 'Greenville, TX'
    };
    setLocation(defaultLoc);
    return defaultLoc;
  };

  // Map weather conditions to our categories
  const mapWeatherCondition = (weatherCode: number, description: string): WeatherData['condition'] => {
    // OpenWeatherMap condition codes: https://openweathermap.org/weather-conditions
    if (weatherCode >= 200 && weatherCode < 300) return 'stormy'; // Thunderstorm
    if (weatherCode >= 300 && weatherCode < 600) return 'rainy'; // Drizzle and Rain
    if (weatherCode >= 600 && weatherCode < 700) return 'snowy'; // Snow
    if (weatherCode === 701 || weatherCode === 741) return 'foggy'; // Mist/Fog
    if (weatherCode === 800) return 'sunny'; // Clear sky
    if (weatherCode === 801 || weatherCode === 802) return 'partly-cloudy'; // Few/scattered clouds
    if (weatherCode >= 803) return 'cloudy'; // Broken/overcast clouds
    return 'sunny'; // Default
  };

  // Fetch weather data
  const fetchWeatherData = useCallback(async () => {
    if (!location || !WEATHER_API_KEY || WEATHER_API_KEY === "YOUR_API_KEY_HERE") {
      showToast({
        type: 'info',
        message: '🔑 Please add your OpenWeatherMap API key to enable weather features'
      });
      return;
    }

    setWeatherLoading(true);
    
    try {
      // Fetch forecast data (5 day / 3 hour forecast - free tier)
      const response = await fetch(
        `${WEATHER_API_URL}/forecast?lat=${location.lat}&lon=${location.lon}&appid=${WEATHER_API_KEY}&units=${temperatureUnit === 'celsius' ? 'metric' : 'imperial'}`
      );
      
      if (!response.ok) throw new Error('Weather API request failed');
      
      const data = await response.json();
      
      // Process and aggregate weather data by day
      const dailyWeather: Map<string, WeatherData> = new Map();
      
      data.list.forEach((item: any) => {
        const date = new Date(item.dt * 1000);
        const dateKey = date.toISOString().split('T')[0];
        
        // If we don't have data for this day yet, or if this is the midday reading (better representation)
        if (!dailyWeather.has(dateKey) || date.getHours() === 12) {
          dailyWeather.set(dateKey, {
            date: dateKey,
            temp: Math.round(item.main.temp),
            tempMin: Math.round(item.main.temp_min),
            tempMax: Math.round(item.main.temp_max),
            condition: mapWeatherCondition(item.weather[0].id, item.weather[0].description),
            description: item.weather[0].description,
            icon: item.weather[0].icon,
            humidity: item.main.humidity,
            windSpeed: Math.round(item.wind.speed)
          });
        }
      });
      
      setWeatherData(Array.from(dailyWeather.values()));
      
    } catch (error) {
      console.error('Weather fetch error:', error);
      showToast({
        type: 'error',
        message: '⚠️ Could not load weather data'
      });
    } finally {
      setWeatherLoading(false);
    }
  }, [location, temperatureUnit, showToast]);

  // Load user and location on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
    getUserLocation();
  }, [getUserLocation]);

  // Load weather when location is available
  useEffect(() => {
    if (location && weatherEnabled) {
      fetchWeatherData();
    }
  }, [location, weatherEnabled, fetchWeatherData]);

  // Load calendar events
  async function loadCalendar() {
    if (!me) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .or(`created_by.eq.${me},visibility.in.(public,friends)`)
        .order("start_time", { ascending: true });

      if (error) throw error;

      const safe = (data || []).filter((e: any) => e?.start_time && e?.end_time);
      setEvents(safe);
    } catch (error: any) {
      console.error("Load calendar error:", error);
      showToast({
        type: 'error',
        message: 'Failed to load events'
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (me) {
      loadCalendar();
    }
  }, [me]);

  // Calendar event handlers
  const onSelectSlot = useCallback((slotInfo: any) => {
    const start = slotInfo.start || new Date();
    const end = slotInfo.end || new Date(start.getTime() + 3600000);
    
    setForm(prev => ({
      ...prev,
      start: toLocalInput(start),
      end: toLocalInput(end)
    }));
    setOpenCreate(true);
  }, [toLocalInput]);

  const onSelectEvent = useCallback((evt: any) => {
    const r = evt.resource as any;
    setSelected(r as DBEvent);
    setDetailsOpen(true);
  }, []);

  const onDrop = async ({ event, start, end }: any) => {
    const r = (event.resource || {}) as DBEvent;
    if (!me || r.created_by !== me) {
      showToast({
        type: 'error',
        message: 'You can only move your own events'
      });
      return;
    }

    const { error } = await supabase
      .from("events")
      .update({ start_time: start.toISOString(), end_time: end.toISOString() })
      .eq("id", r.id);
    
    if (!error) {
      showToast({ type: 'success', message: 'Event moved!' });
      loadCalendar();
    }
  };

  const onResize = async ({ event, start, end }: any) => {
    const r = (event.resource || {}) as DBEvent;
    if (!me || r.created_by !== me) {
      showToast({
        type: 'error',
        message: 'You can only resize your own events'
      });
      return;
    }

    const { error } = await supabase
      .from("events")
      .update({ start_time: start.toISOString(), end_time: end.toISOString() })
      .eq("id", r.id);
    
    if (!error) {
      showToast({ type: 'success', message: 'Event resized!' });
      loadCalendar();
    }
  };

  const createEvent = async () => {
    if (!me || !form.title || !form.start || !form.end) {
      showToast({ type: 'error', message: 'Please fill required fields' });
      return;
    }

    const payload: any = {
      title: form.title,
      description: form.description || null,
      location: form.location || null,
      start_time: new Date(form.start).toISOString(),
      end_time: new Date(form.end).toISOString(),
      visibility: form.visibility,
      created_by: me,
      event_type: form.event_type || null,
      source: form.source,
    };

    const { error } = await supabase.from("events").insert(payload);
    if (!error) {
      setOpenCreate(false);
      resetForm();
      showToast({ type: 'success', message: '✨ Event created!' });
      loadCalendar();
    }
  };

  const updateEvent = async () => {
    if (!selected || !me) return;

    const { error } = await supabase
      .from("events")
      .update({
        title: form.title,
        description: form.description || null,
        location: form.location || null,
        start_time: new Date(form.start).toISOString(),
        end_time: new Date(form.end).toISOString(),
        visibility: form.visibility,
      })
      .eq("id", selected.id)
      .eq("created_by", me);
      
    if (!error) {
      setOpenEdit(false);
      setSelected(null);
      resetForm();
      showToast({ type: 'success', message: '✨ Event updated!' });
      loadCalendar();
    }
  };

  const handleEdit = (event: DBEvent) => {
    setSelected(event);
    setForm({
      title: event.title,
      description: event.description || '',
      location: event.location || '',
      start: toLocalInput(new Date(event.start_time)),
      end: toLocalInput(new Date(event.end_time)),
      visibility: event.visibility,
      event_type: event.event_type || '',
      community_id: event.community_id || '',
      source: event.source || 'personal',
      image_path: event.image_path || '',
    });
    setDetailsOpen(false);
    setOpenEdit(true);
  };

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      location: "",
      start: "",
      end: "",
      visibility: "private",
      event_type: "",
      community_id: "",
      source: "personal",
      image_path: "",
    });
  };

  // Get weather for a specific date
  const getWeatherForDate = (targetDate: Date) => {
    const dateKey = targetDate.toISOString().split('T')[0];
    return weatherData.find(w => w.date === dateKey);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-sky-50 relative overflow-hidden">
      {/* Animated weather background overlay */}
      {weatherAnimations && weatherEnabled && weatherData.length > 0 && (
        <div className="fixed inset-0 pointer-events-none">
          {weatherData[0]?.condition === 'sunny' && (
            <>
              <div className="absolute top-10 right-10 w-32 h-32 bg-yellow-300 rounded-full 
                            opacity-30 animate-pulse-slow" />
              <div className="absolute top-16 right-16 w-24 h-24 bg-orange-300 rounded-full 
                            opacity-20 animate-pulse-slow animation-delay-1000" />
            </>
          )}
          {weatherData[0]?.condition === 'cloudy' && (
            <>
              <div className="cloud cloud1" />
              <div className="cloud cloud2" />
              <div className="cloud cloud3" />
            </>
          )}
          {weatherData[0]?.condition === 'rainy' && (
            <div className="rain-container">
              {Array.from({ length: 50 }).map((_, i) => (
                <div key={i} className="raindrop" style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 2}s` }} />
              ))}
            </div>
          )}
          {weatherData[0]?.condition === 'snowy' && (
            <div className="snow-container">
              {Array.from({ length: 30 }).map((_, i) => (
                <div key={i} className="snowflake" style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 3}s` }}>❄</div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="relative z-10 container mx-auto px-4 py-6 max-w-7xl">
        {/* Header with Weather Controls */}
        <div className="mb-6 bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-4">
          <div className="flex flex-col gap-4">
            {/* Title and Back Button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => window.location.href = '/calendar'}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg 
                           transition-all flex items-center gap-2"
                >
                  ← Back to Regular Calendar
                </button>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 
                             bg-clip-text text-transparent">
                  Weather Calendar Experiment
                </h1>
              </div>
              
              {/* Location Display */}
              {location && (
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg">
                  <span className="text-2xl">📍</span>
                  <span className="text-sm font-medium text-blue-700">{location.city}</span>
                  <button
                    onClick={getUserLocation}
                    className="ml-2 text-xs text-blue-600 hover:text-blue-800"
                  >
                    Update
                  </button>
                </div>
              )}
            </div>

            {/* Weather Controls */}
            <div className="flex items-center gap-4 flex-wrap">
              {/* Weather Toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={weatherEnabled}
                  onChange={(e) => setWeatherEnabled(e.target.checked)}
                  className="w-4 h-4 rounded accent-blue-600"
                />
                <span className="text-sm font-medium">Show Weather</span>
              </label>

              {/* Animation Toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={weatherAnimations}
                  onChange={(e) => setWeatherAnimations(e.target.checked)}
                  className="w-4 h-4 rounded accent-blue-600"
                />
                <span className="text-sm font-medium">Weather Animations</span>
              </label>

              {/* Temperature Unit */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Temperature:</span>
                <button
                  onClick={() => setTemperatureUnit('fahrenheit')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                    temperatureUnit === 'fahrenheit' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  °F
                </button>
                <button
                  onClick={() => setTemperatureUnit('celsius')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                    temperatureUnit === 'celsius' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  °C
                </button>
              </div>

              {/* View Selector - Week and Day only */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">View:</span>
                <button
                  onClick={() => setView('week')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                    view === 'week' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setView('day')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                    view === 'day' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Day
                </button>
                <button
                  onClick={() => setView('month')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                    view === 'month' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Month (No Weather)
                </button>
              </div>

              {/* Create Event Button */}
              <button
                onClick={() => setOpenCreate(true)}
                className="ml-auto px-4 py-2 rounded-full font-medium text-white
                         bg-gradient-to-r from-blue-600 to-cyan-600
                         shadow-lg hover:shadow-xl transform hover:scale-105 
                         active:scale-95 transition-all duration-200"
              >
                + Create Event
              </button>
            </div>

            {/* Weather Forecast Strip - Only for Week/Day views */}
            {weatherEnabled && (view === 'week' || view === 'day') && weatherData.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {weatherData.slice(0, view === 'week' ? 7 : 1).map((day) => (
                  <div
                    key={day.date}
                    className="flex-shrink-0 p-3 bg-white/80 rounded-lg border border-blue-200
                             shadow-sm hover:shadow-md transition-all min-w-[120px]"
                  >
                    <div className="text-xs font-medium text-gray-600">
                      {new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-2xl">
                        {day.condition === 'sunny' && '☀️'}
                        {day.condition === 'partly-cloudy' && '⛅'}
                        {day.condition === 'cloudy' && '☁️'}
                        {day.condition === 'rainy' && '🌧️'}
                        {day.condition === 'stormy' && '⛈️'}
                        {day.condition === 'snowy' && '❄️'}
                        {day.condition === 'foggy' && '🌫️'}
                      </span>
                      <div className="text-right">
                        <div className="text-lg font-bold">{day.temp}°</div>
                        <div className="text-xs text-gray-500">
                          {day.tempMin}° / {day.tempMax}°
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 mt-1 capitalize">{day.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Calendar with Weather */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden">
          <WeatherCalendarGrid
            dbEvents={events as any}
            moonEvents={[]}
            showMoon={false}
            showWeather={weatherEnabled && (view === 'week' || view === 'day')}
            weatherData={weatherData}
            temperatureUnit={temperatureUnit}
            theme="weather"
            date={date}
            setDate={setDate}
            view={view}
            setView={setView}
            onSelectSlot={onSelectSlot}
            onSelectEvent={onSelectEvent}
            onDrop={onDrop}
            onResize={onResize}
          />
        </div>

        {/* Modals */}
        <EventDetails 
          event={selected} 
          onClose={() => {
            setDetailsOpen(false);
            setSelected(null);
          }}
          onEdit={handleEdit}
          isOwner={selected?.created_by === me}
        />

        <CreateEventModal
          open={openCreate}
          onClose={() => {
            setOpenCreate(false);
            resetForm();
          }}
          sessionUser={me}
          value={form}
          onChange={(updates) => setForm(prev => ({ ...prev, ...updates }))}
          onSave={createEvent}
        />

        <CreateEventModal
          open={openEdit}
          onClose={() => {
            setOpenEdit(false);
            setSelected(null);
            resetForm();
          }}
          sessionUser={me}
          value={form}
          onChange={(updates) => setForm(prev => ({ ...prev, ...updates }))}
          onSave={updateEvent}
          isEdit={true}
        />
      </div>

      {/* Weather Animation Styles */}
      <style jsx>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }
        
        @keyframes float-cloud {
          0% { transform: translateX(-100px); }
          100% { transform: translateX(calc(100vw + 100px)); }
        }
        
        @keyframes rain-fall {
          0% { transform: translateY(-100px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(calc(100vh + 100px)); opacity: 0; }
        }
        
        @keyframes snow-fall {
          0% { transform: translateY(-100px) translateX(0); opacity: 0; }
          10% { opacity: 1; }
          100% { 
            transform: translateY(calc(100vh + 100px)) translateX(50px); 
            opacity: 0;
          }
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
        
        .animation-delay-1000 {
          animation-delay: 1s;
        }
        
        .cloud {
          position: absolute;
          background: linear-gradient(to bottom, #ffffff, #e5e7eb);
          border-radius: 100px;
          opacity: 0.6;
          animation: float-cloud 20s linear infinite;
        }
        
        .cloud::before,
        .cloud::after {
          content: '';
          position: absolute;
          background: linear-gradient(to bottom, #ffffff, #e5e7eb);
          border-radius: 100px;
        }
        
        .cloud1 {
          width: 100px;
          height: 40px;
          top: 20%;
          animation-duration: 25s;
        }
        
        .cloud1::before {
          width: 50px;
          height: 50px;
          top: -25px;
          left: 10px;
        }
        
        .cloud1::after {
          width: 60px;
          height: 40px;
          top: -15px;
          right: 10px;
        }
        
        .cloud2 {
          width: 80px;
          height: 35px;
          top: 40%;
          animation-duration: 30s;
          animation-delay: -5s;
        }
        
        .cloud2::before {
          width: 40px;
          height: 40px;
          top: -20px;
          left: 15px;
        }
        
        .cloud2::after {
          width: 50px;
          height: 35px;
          top: -10px;
          right: 15px;
        }
        
        .cloud3 {
          width: 120px;
          height: 45px;
          top: 60%;
          animation-duration: 35s;
          animation-delay: -10s;
        }
        
        .cloud3::before {
          width: 60px;
          height: 60px;
          top: -30px;
          left: 20px;
        }
        
        .cloud3::after {
          width: 70px;
          height: 45px;
          top: -15px;
          right: 20px;
        }
        
        .rain-container {
          position: absolute;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        
        .raindrop {
          position: absolute;
          width: 2px;
          height: 100px;
          background: linear-gradient(to bottom, transparent, rgba(100, 150, 200, 0.6));
          animation: rain-fall 1.5s linear infinite;
        }
        
        .snow-container {
          position: absolute;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        
        .snowflake {
          position: absolute;
          color: white;
          font-size: 1.5rem;
          animation: snow-fall 5s linear infinite;
          text-shadow: 0 0 5px rgba(255, 255, 255, 0.8);
        }
      `}</style>
    </div>
  );
}
