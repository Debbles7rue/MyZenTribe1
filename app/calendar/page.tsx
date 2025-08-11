"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Dialog } from "@headlessui/react";
import {
  Calendar,
  dateFnsLocalizer,
  Event as RBCEvent,
  Views,
  View,
} from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { format, parse, startOfWeek, getDay } from "date-fns";
import enUS from "date-fns/locale/en-US";

import { supabase } from "@/lib/supabaseClient";
import Legend from "@/components/Legend";
import EventDetails from "@/components/EventDetails";

// --- Local helper mini component (keeps this file self-contained)
function VisibilityPill({ v }: { v: "public" | "friends" | "private" | "community" }) {
  const map = {
    public: "bg-green-100 text-green-700",
    friends: "bg-blue-100 text-blue-700",
    private: "bg-rose-100 text-rose-700",
    community: "bg-violet-100 text-violet-700",
  } as const;
  const label = {
    public: "Public",
    friends: "Friends",
    private: "Private",
    community: "Community",
  }[v];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] ${map[v]}`}>
      {label}
    </span>
  );
}

// --- date-fns localizer for react-big-calendar
const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

// --- DB event type aligned to your Supabase SQL (start_time / end_time)
type DBEvent = {
  id: string;
  title: string;
  description: string | null;
  start_time: string; // ISO
  end_time: string;   // ISO
  visibility: "public" | "friends" | "private" | "community";
  created_by: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  rrule: string | null;
  event_type: string | null;
  rsvp_public: boolean | null;
  created_at: string;
};

export default function CalendarPage() {
  // --- UI State
  const [sessionUser, setSessionUser] = useState<string | null>(null);
  const [events, setEvents] = useState<DBEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & search
  const [filters, setFilters] = useState<{
    mine: boolean;
    visibility: "all" | DBEvent["visibility"];
    type: "all" | string;
    q: string;
  }>({
    mine: false,
    visibility: "all",
    type: "all",
    q: "",
  });

  const [types] = useState<string[]>([
    "Coffee",
    "Meditation",
    "Sound Bath",
    "Yoga",
    "Drum Circle",
    "Qi Gong",
  ]);

  // Calendar view/date
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState<Date>(new Date());

  // Create dialog state
  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    start: "",
    end: "",
    allDay: false,
    visibility: "public" as DBEvent["visibility"],
    latitude: "",
    longitude: "",
    event_type: "",
  });

  // Details dialog state
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState<DBEvent | null>(null);

  // --- Load auth user once
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setSessionUser(data.user?.id ?? null);
    });
  }, []);

  // --- Load events with filters (RLS will enforce visibility per user)
  const loadEvents = async () => {
    setLoading(true);
    let q = supabase
      .from("events")
      .select(
        "id,title,description,start_time,end_time,visibility,created_by,location,latitude,longitude,rrule,event_type,rsvp_public,created_at"
      )
      .order("start_time", { ascending: true });

    if (filters.mine && sessionUser) q = q.eq("created_by", sessionUser);
    if (filters.visibility !== "all") q = q.eq("visibility", filters.visibility);
    if (filters.type !== "all") q = q.eq("event_type", filters.type);

    const { data, error } = await q;
    if (error) {
      console.error(error.message);
      setEvents([]);
      setLoading(false);
      return;
    }
    let rows = (data ?? []) as DBEvent[];
    if (filters.q.trim()) {
      const needle = filters.q.trim().toLowerCase();
      rows = rows.filter(
        (e) =>
          e.title.toLowerCase().includes(needle) ||
          (e.description ?? "").toLowerCase().includes(needle) ||
          (e.location ?? "").toLowerCase().includes(needle)
      );
    }
    setEvents(rows);
    setLoading(false);
  };

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionUser, filters.mine, filters.visibility, filters.type, filters.q]);

  // --- rbc events
  const rbcEvents = useMemo<RBCEvent[]>(
    () =>
      events.map((e) => ({
        id: e.id,
        title: e.title,
        start: new Date(e.start_time),
        end: new Date(e.end_time),
        allDay: false,
        resource: e,
      })),
    [events]
  );

  // --- calendar slot click -> prefill create form
  const onSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    const toLocal = (d: Date) =>
      new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setForm((f) => ({
      ...f,
      start: toLocal(start),
      end: toLocal(end),
    }));
    setOpenCreate(true);
  };

  // --- calendar event click -> details
  const onSelectEvent = (evt: any) => {
    const e: DBEvent = evt.resource;
    setSelected(e);
    setDetailsOpen(true);
  };

  // --- style by visibility
  const eventStyleGetter = (event: any) => {
    const v = (event.resource?.visibility ?? "public") as DBEvent["visibility"];
    const colors: Record<DBEvent["visibility"], string> = {
      public: "#DCFCE7",
      friends: "#DBEAFE",
      private: "#FFE4E6",
      community: "#EDE9FE",
    };
    const style = {
      backgroundColor: colors[v],
      borderRadius: "10px",
      border: "1px solid #ddd",
    };
    return { style };
  };
   const createEvent = async () => {
    if (!sessionUser) {
      alert("Please log in to create an event.");
      return;
    }
    if (!form.title || !form.start || !form.end) {
      alert("Please fill in title, start, and end.");
      return;
    }
    const payload: Partial<DBEvent> & {
      start_time: Date;
      end_time: Date;
    } = {
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
    };

    const { error } = await supabase.from("events").insert(payload);
    if (error) {
      alert(error.message);
      return;
    }
    setOpenCreate(false);
    setForm({
      title: "",
      description: "",
      location: "",
      start: "",
      end: "",
      allDay: false,
      visibility: "public",
      latitude: "",
      longitude: "",
      event_type: "",
    });
    await loadEvents();
  };

  return (
    <div className="min-h-screen">
      <div className="container-app py-6">
        {/* Header */}
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h1 className="text-2xl font-semibold logoText">
            My <span className="word-zen">Zen</span> Tribe Calendar
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/" className="btn btn-neutral">
              Home
            </Link>
            <button className="btn btn-brand" onClick={() => setOpenCreate(true)}>
              Create event
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input
            placeholder="Search title, description, or location…"
            className="rounded-xl border border-neutral-300 px-3 py-2 text-sm w-full md:w-80"
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
          />
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filters.mine}
              onChange={(e) => setFilters({ ...filters, mine: e.target.checked })}
            />
            My events only
          </label>
          <select
            className="rounded-xl border border-neutral-300 px-3 py-2 text-sm"
            value={filters.visibility}
            onChange={(e) =>
              setFilters({
                ...filters,
                visibility: e.target.value as any,
              })
            }
          >
            <option value="all">All visibilities</option>
            <option value="public">Public</option>
            <option value="friends">Friends</option>
            <option value="private">Private</option>
            <option value="community">Community</option>
          </select>
          <select
            className="rounded-xl border border-neutral-300 px-3 py-2 text-sm"
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          >
            <option value="all">All types</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <Legend />
        </div>

        {/* Calendar */}
        <div className="card p-3">
          <Calendar
            localizer={localizer}
            events={rbcEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 680 }}
            selectable
            onSelectSlot={onSelectSlot}
            onSelectEvent={onSelectEvent}
            popup
            view={view}
            onView={setView}
            date={date}
            onNavigate={setDate}
            eventPropGetter={eventStyleGetter}
            components={{
              event: ({ event }) => (
                <div className="text-[11px] leading-tight">
                  <div className="font-medium">{event.title}</div>
                  <VisibilityPill v={event.resource.visibility} />
                </div>
              ),
              toolbar: (props) => (
                <div className="flex items-center justify-between p-2">
                  <div className="flex items-center gap-2">
                    <button className="btn btn-neutral" onClick={() => props.onNavigate("TODAY")}>
                      Today
                    </button>
                    <button className="btn btn-neutral" onClick={() => props.onNavigate("PREV")}>
                      Prev
                    </button>
                    <button className="btn btn-neutral" onClick={() => props.onNavigate("NEXT")}>
                      Next
                    </button>
                  </div>
                  <div className="text-sm">{format(props.date, "MMMM yyyy")}</div>
                  <div className="flex items-center gap-2">
                    <button
                      className={`btn ${props.view === Views.MONTH ? "btn-brand" : "btn-neutral"}`}
                      onClick={() => props.onView(Views.MONTH)}
                    >
                      Month
                    </button>
                    <button
                      className={`btn ${props.view === Views.WEEK ? "btn-brand" : "btn-neutral"}`}
                      onClick={() => props.onView(Views.WEEK)}
                    >
                      Week
                    </button>
                    <button
                      className={`btn ${props.view === Views.DAY ? "btn-brand" : "btn-neutral"}`}
                      onClick={() => props.onView(Views.DAY)}
                    >
                      Day
                    </button>
                    <button
                      className={`btn ${props.view === Views.AGENDA ? "btn-brand" : "btn-neutral"}`}
                      onClick={() => props.onView(Views.AGENDA)}
                    >
                      Agenda
                    </button>
                  </div>
                </div>
              ),
            }}
          />
        </div>

        {loading && (
          <p className="mt-3 text-sm text-neutral-500">Loading events…</p>
        )}
      </div>

      {/* Create Event Dialog */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-2xl rounded-2xl border border-neutral-200 bg-white p-6 shadow-lg">
            <Dialog.Title className="text-lg font-semibold mb-4">Create event</Dialog.Title>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className="text-sm">Title</span>
                <input
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm">Description</span>
                <textarea
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </label>

              <label className="block">
                <span className="text-sm">Location</span>
                <input
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </label>

              <label className="block">
                <span className="text-sm">Type</span>
                <select
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2"
                  value={form.event_type}
                  onChange={(e) => setForm({ ...form, event_type: e.target.value })}
                >
                  <option value="">{`(optional)`}</option>
                  {types.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:col-span-2">
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
              </div>

              <label className="block">
                <span className="text-sm">Visibility</span>
                <select
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2"
                  value={form.visibility}
                  onChange={(e) =>
                    setForm({ ...form, visibility: e.target.value as DBEvent["visibility"] })
                  }
                >
                  <option value="public">Public</option>
                  <option value="friends">Friends & acquaintances</option>
                  <option value="private">Private (invite only)</option>
                  <option value="community">Community</option>
                </select>
              </label>

              <div className="grid grid-cols-1 gap-3">
                <label className="block">
                  <span className="text-sm">Latitude (optional)</span>
                  <input
                    className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2"
                    value={form.latitude}
                    onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="text-sm">Longitude (optional)</span>
                  <input
                    className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2"
                    value={form.longitude}
                    onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                  />
                </label>
              </div>

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
              Tip: “Private” events are only visible to invitees and you. “Friends” are visible to your
              accepted friends/acquaintances. “Community” is visible to members of that community.
            </p>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Details modal */}
      <EventDetails event={detailsOpen ? selected : null} onClose={() => setDetailsOpen(false)} />
    </div>
  );
}
