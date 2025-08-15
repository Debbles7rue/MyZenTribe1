"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog } from "@headlessui/react";
import {
  Calendar,
  dateFnsLocalizer,
  Views,
  View,
  Event as RBCEvent,
} from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import {
  format,
  parse,
  startOfWeek,
  getDay,
  startOfYear,
  endOfYear,
  addDays,
} from "date-fns";
import enUS from "date-fns/locale/en-US";

import { supabase } from "@/lib/supabaseClient";
import EventDetails from "@/components/EventDetails";
import AvatarUpload from "@/components/AvatarUpload";
import { geocode, dailyForecast } from "@/lib/weather";

type Visibility = "public" | "friends" | "private" | "community";

type DBEvent = {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  visibility: Visibility;
  created_by: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  rrule: string | null;
  event_type: string | null;
  rsvp_public: boolean | null;
  community_id: string | null;
  created_at: string;

  // Extra fields we added
  image_path: string | null;
  source: "personal" | "business";
  location_requires_rsvp?: boolean | null;
};

type RSVP = {
  id: string;
  event_id: string;
  user_id: string;
  status: "yes" | "no" | "maybe" | "interested";
  pinned: boolean | null;
  shareable: boolean | null;
};

type UiEvent = RBCEvent & { resource: any };

const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

const DnDCalendar = withDragAndDrop<UiEvent, object>(Calendar as any);

/* ---------------- Moon phases (approx) ---------------- */
function generateLunarEventsForYear(year: number): UiEvent[] {
  const SYNODIC = 29.530588;
  const FIRST_Q = 7.382647;
  const FULL = 14.765294;
  const LAST_Q = 22.147941;
  const epoch = new Date(Date.UTC(2000, 0, 6, 18, 14));
  const yearStart = startOfYear(new Date(Date.UTC(year, 0, 1)));
  const yearEnd = endOfYear(new Date(Date.UTC(year, 11, 31)));

  const daysBetween = (a: Date, b: Date) =>
    (b.getTime() - a.getTime()) / 86400000;
  let k = Math.floor(daysBetween(epoch, yearStart) / SYNODIC) - 1;

  const events: UiEvent[] = [];
  const pushPhase = (d: Date, title: string, key: string) => {
    const local = new Date(d);
    const start = new Date(local.getFullYear(), local.getMonth(), local.getDate());
    const end = addDays(start, 1);
    events.push({
      id: `${key}-${start.toISOString()}`,
      title,
      start,
      end,
      allDay: true,
      resource: { moonPhase: key, title },
    });
  };

  for (let i = 0; i < 20; i++) {
    const newMoon = new Date(epoch.getTime() + (k + i) * SYNODIC * 86400000);
    if (newMoon > addDays(yearEnd, 2)) break;

    const firstQuarter = new Date(newMoon.getTime() + FIRST_Q * 86400000);
    const fullMoon = new Date(newMoon.getTime() + FULL * 86400000);
    const lastQuarter = new Date(newMoon.getTime() + LAST_Q * 86400000);

    const maybeAdd = (d: Date, title: string, key: string) => {
      if (d >= addDays(yearStart, -2) && d <= addDays(yearEnd, 2)) pushPhase(d, title, key);
    };

    maybeAdd(newMoon, "New Moon", "moon-new");
    maybeAdd(firstQuarter, "First Quarter", "moon-first");
    maybeAdd(fullMoon, "Full Moon", "moon-full");
    maybeAdd(lastQuarter, "Last Quarter", "moon-last");
  }
  return events;
}

/* ------------- Weather -> calendar items (5 days) ------------- */
function generateWeatherEventsFromForecast(forecast: any): UiEvent[] {
  if (!forecast?.daily?.time?.length) return [];
  const days = forecast.daily.time.slice(0, 5);
  const highs = forecast.daily.temperature_2m_max || [];
  const lows = forecast.daily.temperature_2m_min || [];
  const rain = forecast.daily.precipitation_probability_max || [];

  return days.map((iso: string, i: number) => {
    const d = new Date(iso);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const end = addDays(start, 1);
    const title = `${Math.round(highs[i] ?? 0)}°/${Math.round(lows[i] ?? 0)}° · ${rain[i] ?? 0}%`;
    return {
      id: `weather-${iso}`,
      title,
      start,
      end,
      allDay: true,
      resource: { weather: true, high: highs[i], low: lows[i], rain: rain[i] },
    } as UiEvent;
  });
}

export default function CalendarPage() {
  const [sessionUser, setSessionUser] = useState<string | null>(null);

  const [mode, setMode] = useState<"whats" | "mine">("whats");
  const [showMoon, setShowMoon] = useState(true);
  const [showWeather, setShowWeather] = useState(true);
  const [typeFilter, setTypeFilter] = useState<"all" | "personal" | "business">("all");

  const [events, setEvents] = useState<DBEvent[]>([]);
  const [friendGoingIds, setFriendGoingIds] = useState<Set<string>>(new Set());
  const [interestedIds, setInterestedIds] = useState<Set<string>>(new Set());
  const [followedCreatorIds, setFollowedCreatorIds] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);
  const [calendarView, setCalendarView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState<Date>(new Date());
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState<DBEvent | null>(null);

  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    start: "",
    end: "",
    visibility: "public" as Visibility,
    latitude: "",
    longitude: "",
    event_type: "",
    community_id: "",
    source: "personal" as "personal" | "business",
    image_path: "",
    location_requires_rsvp: false,
  });

  const [query, setQuery] = useState("");

  // Forecast card units
  const [units, setUnits] = useState<"F" | "C">("F");
  const toUnit = (c: number) => (units === "F" ? Math.round(c * 9/5 + 32) : Math.round(c));

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSessionUser(data.user?.id ?? null));
  }, []);

  const loadData = async () => {
    if (!sessionUser) return;
    setLoading(true);

    const myRsvpRes = await supabase
      .from("event_rsvps")
      .select("event_id,status")
      .eq("user_id", sessionUser);

    const rsvpEventIds = new Set<string>();
    const interested = new Set<string>();
    if (!myRsvpRes.error && myRsvpRes.data) {
      for (const r of myRsvpRes.data as RSVP[]) {
        rsvpEventIds.add(r.event_id);
        if (r.status === "interested") interested.add(r.event_id);
      }
    }
    setInterestedIds(interested);

    const friendsRes = await supabase
      .from("friends")
      .select("friend_user_id,user_id,status")
      .or(`user_id.eq.${sessionUser},friend_user_id.eq.${sessionUser}`)
      .eq("status", "accepted");

    const friendIds = new Set<string>();
    if (!friendsRes.error && friendsRes.data) {
      for (const row of friendsRes.data) {
        const other =
          row.user_id === sessionUser ? row.friend_user_id : row.user_id;
        friendIds.add(other);
      }
    }

    let friendsGoing = new Set<string>();
    if (friendIds.size) {
      const rsvpFriends = await supabase
        .from("event_rsvps")
        .select("event_id")
        .in("user_id", Array.from(friendIds))
        .in("status", ["yes", "maybe", "interested"])
        .eq("shareable", true);
      if (!rsvpFriends.error && rsvpFriends.data) {
        for (const r of rsvpFriends.data as RSVP[]) friendsGoing.add(r.event_id);
      }
    }
    setFriendGoingIds(friendsGoing);

    const followsRes = await supabase
      .from("follows")
      .select("followed_id")
      .eq("follower_id", sessionUser);
    const followedIds = new Set<string>();
    if (!followsRes.error && followsRes.data) {
      for (const f of followsRes.data) followedIds.add(f.followed_id);
    }
    setFollowedCreatorIds(followedIds);

    const cmRes = await supabase
      .from("community_members")
      .select("community_id")
      .eq("user_id", sessionUser);
    const myCommunityIds = new Set<string>();
    if (!cmRes.error && cmRes.data) {
      for (const c of cmRes.data) myCommunityIds.add(c.community_id);
    }

    let all: DBEvent[] = [];
    if (mode === "mine") {
      const ors: string[] = [`created_by.eq.${sessionUser}`];
      if (rsvpEventIds.size) ors.push(`id.in.(${Array.from(rsvpEventIds).join(",")})`);
      const { data } = await supabase
        .from("events")
        .select("*")
        .or(ors.join(","))
        .order("start_time", { ascending: true });
      all = (data ?? []) as DBEvent[];
    } else {
      const orClauses: string[] = [`created_by.eq.${sessionUser}`];
      if (followedIds.size)
        orClauses.push(`created_by.in.(${Array.from(followedIds).join(",")})`);
      if (friendsGoing.size)
        orClauses.push(`id.in.(${Array.from(friendsGoing).join(",")})`);
      if (myCommunityIds.size)
        orClauses.push(`community_id.in.(${Array.from(myCommunityIds).join(",")})`);
      const { data } = await supabase
        .from("events")
        .select("*")
        .or(orClauses.join(","))
        .order("start_time", { ascending: true });
      all = (data ?? []) as DBEvent[];
    }

    if (typeFilter !== "all") {
      all = all.filter((e) => (e.source || "personal") === typeFilter);
    }

    setEvents(all);
    setLoading(false);
  };

  useEffect(() => {
    if (sessionUser) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionUser, mode, typeFilter]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return events;
    return events.filter((e) => {
      return (
        e.title.toLowerCase().includes(q) ||
        (e.description ?? "").toLowerCase().includes(q) ||
        (e.location ?? "").toLowerCase().includes(q)
      );
    });
  }, [events, query]);

  const rbcDbEvents = useMemo<UiEvent[]>(
    () =>
      filtered.map((e) => ({
        id: e.id,
        title: e.title,
        start: new Date(e.start_time),
        end: new Date(e.end_time),
        allDay: false,
        resource: e,
      })),
    [filtered]
  );

  const lunarEvents = useMemo<UiEvent[]>(() => {
    if (!showMoon) return [];
    return generateLunarEventsForYear(date.getFullYear());
  }, [date, showMoon]);

  /* ---------- Weather card data ---------- */
  const [forecast, setForecast] = useState<any>(null);
  const [wError, setWError] = useState<string>("");

  useEffect(() => {
    if (!showWeather) return;
    let cancelled = false;

    async function load() {
      try {
        setWError("");
        // 1) Try saved default location from Profile
        const saved = localStorage.getItem("mzt.location") || "";
        let data: any = null;

        try {
          if (saved) {
            const latlon = await geocode(saved);
            data = await dailyForecast(latlon);
          }
        } catch {}

        // 2) Fallback: Open-Meteo via browser location (no key)
        if (!data) {
          let lat = 32.7767, lon = -96.7970; // Dallas fallback
          await new Promise<void>((resolve) => {
            if (!navigator.geolocation) return resolve();
            navigator.geolocation.getCurrentPosition(
              (pos) => { lat = pos.coords.latitude; lon = pos.coords.longitude; resolve(); },
              () => resolve()
            );
          });
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;
          const res = await fetch(url);
          data = await res.json();
        }

        if (!cancelled) setForecast(data);
      } catch (e: any) {
        if (!cancelled) setWError(e.message || "Weather unavailable.");
      }
    }

    load();
    return () => { cancelled = true; };
  }, [showWeather]);

  // Weather overlays on the grid? Keep off by default (quieter)
  const SHOW_WEATHER_ON_GRID = false;
  const weatherEvents = useMemo<UiEvent[]>(() => {
    if (!showWeather || !forecast) return [];
    return generateWeatherEventsFromForecast(forecast);
  }, [forecast, showWeather]);

  const allUiEvents = useMemo<UiEvent[]>(
    () => SHOW_WEATHER_ON_GRID
          ? [...rbcDbEvents, ...lunarEvents, ...weatherEvents]
          : [...rbcDbEvents, ...lunarEvents],
    [rbcDbEvents, lunarEvents, weatherEvents]
  );

  const onSelectEvent = (evt: UiEvent) => {
    if (evt.resource?.moonPhase) {
      alert(`${evt.title} — ${evt.start.toLocaleString()}`);
      return;
    }
    setSelected(evt.resource as DBEvent);
    setDetailsOpen(true);
  };

  const onSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    if (calendarView === Views.MONTH) {
      setDate(start);
      setCalendarView(Views.DAY);
      return;
    }
    const toLocal = (d: Date) =>
      new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
    setForm((f) => ({ ...f, start: toLocal(start), end: toLocal(end) }));
    setOpenCreate(true);
  };

  const eventPropGetter = (event: UiEvent) => {
    const r = event.resource || {};

    // Moon icons: subtle, no strip
    if (r.moonPhase) {
      return {
        style: {
          backgroundColor: "transparent",
          border: "0",
          fontWeight: 600,
          color: "#0f172a",
        },
        className: "text-[11px] leading-tight",
      };
    }

    // Regular events
    const e: DBEvent = r;
    let backgroundColor = "#9ca3af";
    if (friendGoingIds.has(e.id)) backgroundColor = "#22c55e";
    else if (interestedIds.has(e.id)) backgroundColor = "#fde68a";
    else if (followedCreatorIds.has(e.created_by)) backgroundColor = "#60a5fa";
    else if (e.visibility === "community" || e.community_id)
      backgroundColor = "#a78bfa";
    if (e.source === "business") backgroundColor = "#c4b5fd";
    return {
      style: { backgroundColor, border: "1px solid #e5e7eb", borderRadius: 10 },
      className: "text-[11px] leading-tight",
    };
  };

  const canEdit = (e: DBEvent) => sessionUser && e.created_by === sessionUser;

  const onEventDrop = async ({
    event,
    start,
    end,
  }: {
    event: UiEvent;
    start: Date;
    end: Date;
  }) => {
    const db: DBEvent = event.resource;
    if (!canEdit(db)) return alert("You can only move events you created.");
    const { error } = await supabase
      .from("events")
      .update({ start_time: start.toISOString(), end_time: end.toISOString() })
      .eq("id", db.id);
    if (error) return alert(error.message);
    loadData();
  };

  const onEventResize = async ({
    event,
    start,
    end,
  }: {
    event: UiEvent;
    start: Date;
    end: Date;
  }) => {
    const db: DBEvent = event.resource;
    if (!canEdit(db)) return alert("You can only resize events you created.");
    const { error } = await supabase
      .from("events")
      .update({ start_time: start.toISOString(), end_time: end.toISOString() })
      .eq("id", db.id);
    if (error) return alert(error.message);
    loadData();
  };

  const createEvent = async () => {
    if (!sessionUser) return alert("Please log in.");
    if (!form.title || !form.start || !form.end) return alert("Missing fields.");

    const payload: Partial<DBEvent> & { start_time: Date; end_time: Date } = {
      title: form.title,
      description: form.description || null,
      location: form.location || null,
      start_time: new Date(form.start),
      end_time: new Date(form.end),
      visibility: form.visibility,
      created_by: sessionUser,
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
      rrule: null,
      event_type: form.event_type || null,
      rsvp_public: true,
      community_id: form.community_id || null,
      image_path: form.image_path || null,
      source: form.source,
      location_requires_rsvp: form.location_requires_rsvp,
    };

    const { error } = await supabase.from("events").insert(payload);
    if (error) return alert(error.message);

    setOpenCreate(false);
    setMode("mine");
    setDate(new Date(form.start));
    setCalendarView(Views.DAY);
    setForm({
      title: "",
      description: "",
      location: "",
      start: "",
      end: "",
      visibility: "public",
      latitude: "",
      longitude: "",
      event_type: "",
      community_id: "",
      source: "personal",
      image_path: "",
      location_requires_rsvp: false,
    });
    loadData();
  };

  return (
    <div className="page">
      <div className="container-app">
        <div className="header-bar">
          <h1 className="page-title">Calendar</h1>

          <div className="controls">
            <div className="segmented">
              <button
                className={`seg-btn ${mode === "whats" ? "active" : ""}`}
                onClick={() => setMode("whats")}
              >
                What’s happening
              </button>
              <button
                className={`seg-btn ${mode === "mine" ? "active" : ""}`}
                onClick={() => setMode("mine")}
              >
                Only my events
              </button>
            </div>

            <label className="check">
              <span>Type</span>
              <select
                className="select"
                value={typeFilter}
                onChange={(e) =>
                  setTypeFilter(e.target.value as "all" | "personal" | "business")
                }
              >
                <option value="all">All</option>
                <option value="personal">Personal</option>
                <option value="business">Business</option>
              </select>
            </label>

            <label className="check">
              <input
                type="checkbox"
                checked={showMoon}
                onChange={(e) => setShowMoon(e.target.checked)}
              />
              Show moon phases
            </label>

            <label className="check">
              <input
                type="checkbox"
                checked={showWeather}
                onChange={(e) => setShowWeather(e.target.checked)}
              />
              Weather card
            </label>

            <button className="btn btn-brand" onClick={() => setOpenCreate(true)}>
              Create event
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="card p-3 mb-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events by title, description or location…"
            className="search-input"
          />
        </div>

        <div className="card p-3">
          <DnDCalendar
            localizer={localizer}
            events={allUiEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 680 }}
            selectable
            resizable
            popup
            step={30}
            timeslots={2}
            scrollToTime={new Date(1970, 1, 1, 8, 0, 0)} // 8am
            view={calendarView}
            onView={setCalendarView}
            date={date}
            onNavigate={setDate}
            onSelectSlot={onSelectSlot}
            onSelectEvent={onSelectEvent}
            onEventDrop={onEventDrop}
            onEventResize={onEventResize}
            eventPropGetter={eventPropGetter}
            components={{
              event: ({ event }) => {
                const r = (event as UiEvent).resource;
                if (r?.moonPhase) {
                  const icon =
                    r.moonPhase === "moon-full" ? "🌕" :
                    r.moonPhase === "moon-new" ? "🌑" :
                    r.moonPhase === "moon-first" ? "🌓" : "🌗";
                  return <div className="text-[11px] leading-tight">{icon} {r.title}</div>;
                }
                return (
                  <div className="text-[11px] leading-tight">
                    <div className="font-medium">{event.title}</div>
                  </div>
                );
              },
            }}
          />
        </div>

        {/* Forecast card BELOW the calendar */}
        {showWeather && (
          <div className="card p-3 text-sm mt-3">
            <div className="flex items-center gap-2 mb-2">
              <strong>Forecast</strong>
              <select
                className="select"
                value={units}
                onChange={(e) => setUnits(e.target.value as "F" | "C")}
                title="Units"
              >
                <option value="F">°F</option>
                <option value="C">°C</option>
              </select>
              {wError && <span className="text-amber-700">{wError}</span>}
            </div>
            {forecast ? (
              <div className="flex flex-wrap gap-2">
                {forecast.daily.time.slice(0, 5).map((d: string, i: number) => (
                  <div key={d} className="px-3 py-2 rounded-lg border bg-white">
                    <div className="font-medium">
                      {new Date(d).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                    <div className="text-xs">
                      High {toUnit(forecast.daily.temperature_2m_max[i])}° /
                      Low {toUnit(forecast.daily.temperature_2m_min[i])}° ·
                      Rain {forecast.daily.precipitation_probability_max[i] ?? 0}%
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <span className="opacity-70">Loading weather…</span>
            )}
          </div>
        )}

        {loading && <p className="muted mt-3">Loading…</p>}
        <p className="muted mt-2 text-xs">
          🌑 New • 🌓 First Quarter • 🌕 Full • 🌗 Last Quarter
        </p>
      </div>

      {/* Create dialog (pretty, spacious) */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-2xl rounded-2xl border border-neutral-200 bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-semibold">Create event</Dialog.Title>
              <button className="btn" onClick={() => setOpenCreate(false)}>Close</button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className="text-sm">Title</span>
                <input
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Sound Bath at the Park"
                />
              </label>

              <div className="md:col-span-2">
                <span className="text-sm">Event photo</span>
                <div className="mt-2">
                  <AvatarUpload
                    userId={sessionUser}
                    value={form.image_path}
                    onChange={(url) => setForm({ ...form, image_path: url })}
                    bucket="event-photos"
                    label="Upload event photo"
                  />
                </div>
              </div>

              <label className="block">
                <span className="text-sm">Type</span>
                <select
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2"
                  value={form.source}
                  onChange={(e) =>
                    setForm({ ...form, source: e.target.value as "personal" | "business" })
                  }
                >
                  <option value="personal">Personal</option>
                  <option value="business">Business</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm">Location</span>
                <input
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Greenville, TX"
                />
              </label>

              <label className="block">
                <span className="text-sm">Type (tag)</span>
                <input
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2"
                  value={form.event_type}
                  onChange={(e) => setForm({ ...form, event_type: e.target.value })}
                  placeholder="Coffee, Yoga, Drum circle…"
                />
              </label>

              <label className="block">
                <span className="text-sm">Start</span>
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2"
                  value={form.start}
                  onChange={(e) => setForm({ ...form, start: e.target.value })}
                />
              </label>

              <label className="block">
                <span className="text-sm">End</span>
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2"
                  value={form.end}
                  onChange={(e) => setForm({ ...form, end: e.target.value })}
                />
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm">Description</span>
                <textarea
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2"
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Share details attendees should know…"
                />
              </label>

              <label className="block">
                <span className="text-sm">Visibility</span>
                <select
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2"
                  value={form.visibility}
                  onChange={(e) =>
                    setForm({ ...form, visibility: e.target.value as Visibility })
                  }
                >
                  <option value="public">Public</option>
                  <option value="friends">Friends & acquaintances</option>
                  <option value="private">Private (invite only)</option>
                  <option value="community">Community</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm">Community (optional)</span>
                <input
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2"
                  value={form.community_id}
                  onChange={(e) =>
                    setForm({ ...form, community_id: e.target.value })
                  }
                  placeholder="Community UUID (picker later)"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm">Address privacy</span>
                <div className="check mt-1">
                  <input
                    type="checkbox"
                    checked={form.location_requires_rsvp}
                    onChange={(e) => setForm({ ...form, location_requires_rsvp: e.target.checked })}
                  />
                  <span>Only show the address after someone RSVPs (public events)</span>
                </div>
              </label>

              <div className="md:col-span-2 flex justify-end gap-3 mt-2">
                <button className="btn btn-neutral" onClick={() => setOpenCreate(false)}>
                  Cancel
                </button>
                <button className="btn btn-brand" onClick={createEvent}>
                  Save
                </button>
              </div>
            </div>

            <p className="mt-4 text-xs text-neutral-500">
              Tip: In Month view, click a day to zoom into it. Drag events to reschedule. Resize edges to change duration.
            </p>
          </Dialog.Panel>
        </div>
      </Dialog>

      <EventDetails event={detailsOpen ? selected : null} onClose={() => setDetailsOpen(false)} />
    </div>
  );
}
