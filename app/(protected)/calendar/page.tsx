"use client";

import { useEffect, useMemo, useState } from "react";
import ProtectedNav from "@/components/ProtectedNav";
import { monthMoonEvents } from "@/lib/moon";
import { geocode, dailyForecast } from "@/lib/weather";

import {
  Calendar as RBCalendar,
  Views,
  dateFnsLocalizer,
  View,
} from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";

import { format, parse, startOfWeek, getDay } from "date-fns";
import enUS from "date-fns/locale/en-US";

const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

type MZTEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  kind?: "user" | "moon";
  owner?: "me" | "other";
  location?: string;
};

const DnDCalendar = withDragAndDrop<RBCalendar<MZTEvent>>(RBCalendar as any) as any;

export default function CalendarPage() {
  // ------------ UI state ------------
  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<View>(Views.MONTH);
  const [query, setQuery] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);

  // ------------ feature toggles ------------
  const [showMoonPhases, setShowMoonPhases] = useState(true);
  const [showWeather, setShowWeather] = useState(true);

  // ------------ events ------------
  const [events, setEvents] = useState<MZTEvent[]>(() => {
    // load from localStorage once
    try {
      const raw = localStorage.getItem("mzt.events");
      if (!raw) return [];
      const arr = JSON.parse(raw) as any[];
      return arr.map((e) => ({
        ...e,
        start: new Date(e.start),
        end: new Date(e.end),
      })) as MZTEvent[];
    } catch {
      return [];
    }
  });

  // persist user events
  useEffect(() => {
    const toSave = events.filter((e) => e.kind !== "moon");
    localStorage.setItem("mzt.events", JSON.stringify(toSave));
  }, [events]);

  // ------------ moon events for current month ------------
  const moonEvents: MZTEvent[] = useMemo(() => {
    if (!showMoonPhases) return [];
    const year = date.getFullYear();
    const month0 = date.getMonth();
    return monthMoonEvents(year, month0).map((m) => ({
      id: `moon-${m.date}`,
      title: m.label,
      start: new Date(`${m.date}T00:00:00`),
      end: new Date(`${m.date}T23:59:59`),
      allDay: true,
      kind: "moon",
    }));
  }, [date, showMoonPhases]);

  // ------------ combined events + filters ------------
  const combinedEvents = useMemo(() => {
    const base = [...events, ...moonEvents];
    const filteredByMine = onlyMine ? base.filter((e) => e.owner === "me" || e.kind === "moon") : base;
    const q = query.trim().toLowerCase();
    if (!q) return filteredByMine;
    return filteredByMine.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.location ?? "").toLowerCase().includes(q)
    );
  }, [events, moonEvents, onlyMine, query]);

  // ------------ weather overlay ------------
  const [forecast, setForecast] = useState<any>(null);
  const [wError, setWError] = useState<string>("");

  useEffect(() => {
    if (!showWeather) return;
    let cancelled = false;

    async function load() {
      try {
        setWError("");
        const saved = localStorage.getItem("mzt.location") || "";
        let latlon = saved ? await geocode(saved) : null;

        // fallback to browser geolocation
        if (!latlon && navigator.geolocation) {
          await new Promise<void>((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                latlon = { lat: pos.coords.latitude, lon: pos.coords.longitude };
                resolve();
              },
              () => resolve()
            );
          });
        }

        if (!latlon) {
          setWError("Set a default location in Profile to see weather.");
          return;
        }

        const data = await dailyForecast(latlon);
        if (!cancelled) setForecast(data);
      } catch (e: any) {
        if (!cancelled) setWError(e.message || "Weather unavailable.");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [showWeather]);

  // ------------ event handlers ------------
  function handleSelectSlot({ start, end }: { start: Date; end: Date }) {
    const title = prompt("Event title?");
    if (!title) return;
    setEvents((prev) => [
      ...prev,
      {
        id: `evt-${Date.now()}`,
        title,
        start,
        end,
        allDay: false,
        owner: "me",
        kind: "user",
      },
    ]);
  }

  function handleEventResize({ event, start, end }: any) {
    setEvents((prev) =>
      prev.map((e) => (e.id === event.id ? { ...e, start, end } : e))
    );
  }

  function handleEventDrop({ event, start, end, allDay }: any) {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === event.id ? { ...e, start, end, allDay } : e
      )
    );
  }

  function eventPropGetter(event: MZTEvent) {
    if (event.kind === "moon") {
      return {
        className: "",
        style: {
          fontStyle: "italic",
          opacity: 0.85,
          fontSize: "0.8rem",
          background: "#fff",
          border: "1px solid rgba(0,0,0,0.08)",
          color: "#111",
        },
      };
    }
    return {};
  }

  return (
    <div className="min-h-screen">
      <ProtectedNav />

      <main className="max-w-6xl mx-auto p-4 space-y-3">
        <header className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">Calendar</h1>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search events by title, description or location…"
              className="w-80 max-w-full border rounded-lg px-3 py-1.5"
            />

            <button
              onClick={() => {
                const title = prompt("New event title?");
                if (!title) return;
                const start = new Date();
                const end = new Date(start.getTime() + 60 * 60 * 1000);
                setEvents((prev) => [
                  ...prev,
                  {
                    id: `evt-${Date.now()}`,
                    title,
                    start,
                    end,
                    owner: "me",
                    kind: "user",
                  },
                ]);
              }}
              className="px-3 py-1.5 rounded-full border bg-white hover:bg-gray-50"
            >
              Create event
            </button>
          </div>

          <div className="w-full flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={onlyMine}
                onChange={(e) => setOnlyMine(e.target.checked)}
              />
              Only my events
            </label>

            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={showMoonPhases}
                onChange={(e) => setShowMoonPhases(e.target.checked)}
              />
              Show moon phases
            </label>

            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={showWeather}
                onChange={(e) => setShowWeather(e.target.checked)}
              />
              Weather (3–5 days)
            </label>
          </div>
        </header>

        {/* Weather overlay */}
        {showWeather && (
          <div className="card p-3 text-sm">
            {wError ? (
              <span className="text-amber-700">{wError}</span>
            ) : forecast ? (
              <div className="flex flex-wrap gap-2">
                {forecast.daily.time.slice(0, 5).map((d: string, i: number) => (
                  <div
                    key={d}
                    className="px-3 py-2 rounded-lg border bg-white"
                  >
                    <div className="font-medium">
                      {new Date(d).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                    <div className="text-xs">
                      High {Math.round(forecast.daily.temperature_2m_max[i])}° /
                      Low {Math.round(forecast.daily.temperature_2m_min[i])}° ·
                      Rain {forecast.daily.precipitation_probability_max[i] ?? 0}
                      %
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <span className="opacity-70">Loading weather…</span>
            )}
          </div>
        )}

        {/* Calendar */}
        <section className="card p-3">
          <DnDCalendar
            localizer={localizer}
            events={combinedEvents}
            startAccessor="start"
            endAccessor="end"
            views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
            view={view}
            onView={(v) => setView(v)}
            date={date}
            onNavigate={(newDate) => setDate(newDate)}
            selectable
            onSelectSlot={handleSelectSlot}
            resizable
            onEventDrop={handleEventDrop}
            onEventResize={handleEventResize}
            popup
            eventPropGetter={eventPropGetter}
            style={{ height: "calc(100vh - 260px)" }}
          />
        </section>

        {/* Legend */}
        <div className="text-xs text-gray-600 flex items-center gap-3">
          <span>●</span> New • First Quarter • Full • Last Quarter
        </div>

        <p className="text-xs text-gray-500">“Small steps every day.”</p>
      </main>
    </div>
  );
}
