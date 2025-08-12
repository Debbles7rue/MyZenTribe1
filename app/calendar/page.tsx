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
import { format, parse, startOfWeek, getDay, startOfYear, endOfYear, addDays } from "date-fns";
import enUS from "date-fns/locale/en-US";

import { supabase } from "@/lib/supabaseClient";
import Legend from "@/components/Legend";
import EventDetails from "@/components/EventDetails";

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
};

type RSVP = {
  id: string;
  event_id: string;
  user_id: string;
  status: "yes" | "no" | "maybe" | "interested";
  pinned: boolean | null;
  shareable: boolean | null;
};

type UiEvent = RBCEvent & {
  resource: any;
};

// ---- date-fns localizer
const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

// =========================================================
// Moon phase overlay (approximate; ±1 day).
// Based on synodic month ~29.530588 days from a known new moon epoch.
// We derive New, First Quarter (+7.38d), Full (+14.77d), Last Quarter (+22.15d).
// =========================================================
function generateLunarEventsForYear(year: number): UiEvent[] {
  const SYNODIC = 29.530588; // days
  const FIRST_Q = 7.382647;
  const FULL = 14.765294;
  const LAST_Q = 22.147941;

  // Known new moon epoch near J2000 (UTC): 2000-01-06 18:14
  const epoch = new Date(Date.UTC(2000, 0, 6, 18, 14));
  const yearStart = startOfYear(new Date(Date.UTC(year, 0, 1)));
  const yearEnd = endOfYear(new Date(Date.UTC(year, 11, 31)));

  // find k such that epoch + k*synodic enters this year
  const daysBetween = (a: Date, b: Date) => (b.getTime() - a.getTime()) / 86400000;
  let k = Math.floor(daysBetween(epoch, yearStart) / SYNODIC) - 1;

  const events: UiEvent[] = [];
  const pushPhase = (d: Date, title: string, key: string, color: string) => {
    // Render as all-day marker (00:00 to 23:59 local)
    const local = new Date(d); // approximate is fine
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

  // Generate until we pass the year end
  // Safety cap on iterations
  for (let i = 0; i < 20; i++) {
    const newMoon = new Date(epoch.getTime() + (k + i) * SYNODIC * 86400000);

    if (newMoon > addDays(yearEnd, 2)) break;

    const firstQuarter = new Date(newMoon.getTime() + FIRST_Q * 86400000);
    const fullMoon = new Date(newMoon.getTime() + FULL * 86400000);
    const lastQuarter = new Date(newMoon.getTime() + LAST_Q * 86400000);

    // Only include phases that land within the year window (with a small buffer)
    const maybeAdd = (d: Date, title: string, key: string, color: string) => {
      if (d >= addDays(yearStart, -2) && d <= addDays(yearEnd, 2)) {
        pushPhase(d, title, key, color);
      }
    };

    maybeAdd(newMoon, "New Moon", "moon-new", "#E5E7EB");
    maybeAdd(firstQuarter, "First Quarter", "moon-first", "#DBEAFE");
    maybeAdd(fullMoon, "Full Moon", "moon-full", "#FEF3C7");
    maybeAdd(lastQuarter, "Last Quarter", "moon-last", "#EDE9FE");
  }

  return events;
}

// =========================================================

function VisibilityPill({ v }: { v: Visibility }) {
  const map = {
    public: "bg-green-100 text-green-700",
    friends: "bg-blue-100 text-blue-700",
    private: "bg-rose-100 text-rose-700",
    community: "bg-violet-100 text-violet-700",
  } as const;
  const label = { public: "Public", friends: "Friends", private: "Private", community: "Community" }[v];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] ${map[v]}`}>
      {label}
    </span>
  );
}

export default function CalendarPage() {
  const [sessionUser, setSessionUser] = useState<string | null>(null);

  // Modes & toggles
  const [mode, setMode] = useState<"whats" | "mine">("whats");
  const [showMoon, setShowMoon] = useState(true);

  // Data
  const [events, setEvents] = useState<DBEvent[]>([]);
  const [friendGoingIds, setFriendGoingIds] = useState<Set<string>>(new Set());
  const [interestedIds, setInterestedIds] = useState<Set<string>>(new Set());
  const [followedCreatorIds, setFollowedCreatorIds] = useState<Set<string>>(new Set());
  const [myEventIds, setMyEventIds] = useState<Set<string>>(new Set());

  // UI bits
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState<Date>(new Date());
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState<DBEvent | null>(null);

  // Create dialog state
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
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSessionUser(data.user?.id ?? null));
  }, []);

  const loadData = async () => {
    if (!sessionUser) return;
    setLoading(true);

    // 1) My RSVPs
    const myRsvpRes = await supabase
      .from("event_rsvps")
      .select("event_id,status")
      .eq("user_id", sessionUser);
    const myEvents = new Set<string>();
    const interested = new Set<string>();
    if (!myRsvpRes.error && myRsvpRes.data) {
      for (const r of myRsvpRes.data as RSVP[]) {
        myEvents.add(r.event_id);
        if (r.status === "interested") interested.add(r.event_id);
      }
    }
    setMyEventIds(myEvents);
    setInterestedIds(interested);

    // 2) Friends (accepted)
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

    // 3) RSVPs by friends (shareable only)
    let friendsGoing = new Set<string>();
    if (friendIds.size) {
      const friendList = Array.from(friendIds);
      const rsvpFriends = await supabase
        .from("event_rsvps")
        .select("event_id")
        .in("user_id", friendList)
        .in("status", ["yes", "maybe", "interested"])
        .eq("shareable", true);

      if (!rsvpFriends.error && rsvpFriends.data) {
        for (const r of rsvpFriends.data as RSVP[]) friendsGoing.add(r.event_id);
      }
    }
    setFriendGoingIds(friendsGoing);

    // 4) Followed creators
    const followsRes = await supabase
      .from("follows")
      .select("followed_id")
      .eq("follower_id", sessionUser);
    const followedIds = new Set<string>();
    if (!followsRes.error && followsRes.data) {
      for (const f of followsRes.data) followedIds.add(f.followed_id);
    }
    setFollowedCreatorIds(followedIds);

    // 5) My communities
    const cmRes = await supabase
      .from("community_members")
      .select("community_id")
      .eq("user_id", sessionUser);
    const myCommunityIds = new Set<string>();
    if (!cmRes.error && cmRes.data) {
      for (const c of cmRes.data) myCommunityIds.add(c.community_id);
    }

    // 6) Load events depending on mode
    let all: DBEvent[] = [];

    if (mode === "mine") {
      // Only events I responded to (any status, including private)
      if (myEvents.size) {
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .in("id", Array.from(myEvents))
          .order("start_time", { ascending: true });
        if (!error && data) all = data as DBEvent[];
      }
    } else {
      // "What's happening"
      const orClauses: string[] = [];

      if (followedIds.size) {
        orClauses.push(`created_by.in.(${Array.from(followedIds).join(",")})`);
      }
      if (friendsGoing.size) {
        orClauses.push(`id.in.(${Array.from(friendsGoing).join(",")})`);
      }
      if (myCommunityIds.size) {
        orClauses.push(`community_id.in.(${Array.from(myCommunityIds).join(",")})`);
      }

      if (!orClauses.length) {
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .eq("visibility", "public")
          .gte("end_time", new Date().toISOString())
          .order("start_time", { ascending: true });
        if (!error && data) all = data as DBEvent[];
      } else {
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .or(orClauses.join(","))
          .gte("end_time", new Date().toISOString())
          .order("start_time", { ascending: true });
        if (!error && data) all = data as DBEvent[];
      }
    }

    setEvents(all);
    setLoading(false);
  };

  useEffect(() => {
    if (sessionUser) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionUser, mode]);

  // RBC mapping for DB events
  const rbcDbEvents = useMemo<UiEvent[]>(
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

  // Moon events for the current calendar year (toggle)
  const lunarEvents = useMemo<UiEvent[]>(() => {
    if (!showMoon) return [];
    const y = date.getFullYear();
    return generateLunarEventsForYear(y);
  }, [date, showMoon]);

  // Combined events for display
  const allUiEvents = useMemo<UiEvent[]>(
    () => [...rbcDbEvents, ...lunarEvents],
    [rbcDbEvents, lunarEvents]
  );

  const onSelectEvent = (evt: UiEvent) => {
    if (evt.resource?.moonPhase) return; // do nothing for moon markers
    const e: DBEvent = evt.resource;
    setSelected(e);
    setDetailsOpen(true);
  };

  const onSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    const toLocal = (d: Date) =>
      new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
    setForm((f) => ({ ...f, start: toLocal(start), end: toLocal(end) }));
    setOpenCreate(true);
  };

  // Coloring rule (priority): moon phases (distinct) > friends-going > interested (me) > followed orgs > community > other
  const eventPropGetter = (event: UiEvent) => {
    const r = event.resource || {};
    if (r.moonPhase) {
      const colors: Record<string, string> = {
        "moon-full": "#FEF3C7",   // amber-100
        "moon-new": "#E5E7EB",    // gray-200
        "moon-first": "#DBEAFE",  // blue-100
        "moon-last": "#EDE9FE",   // violet-100
      };
      const bg = colors[r.moonPhase] || "#E5E7EB";
      return {
        style: {
          backgroundColor: bg,
          border: "1px dashed #CBD5E1",
          borderRadius: "10px",
          fontStyle: "italic",
        },
      };
    }

    const e: DBEvent = r;
    let backgroundColor = "#9ca3af"; // other
    if (friendGoingIds.has(e.id)) backgroundColor = "#22c55e";          // green-500
    else if (interestedIds.has(e.id)) backgroundColor = "#fde68a";      // amber-200
    else if (followedCreatorIds.has(e.created_by)) backgroundColor = "#60a5fa"; // blue-400
    else if (e.visibility === "community" || e.community_id) backgroundColor = "#a78bfa"; // violet-400

    return {
      style: {
        backgroundColor,
        border: "1px solid #e5e7eb",
        borderRadius: "10px",
      },
    };
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
    };
    const { error } = await supabase.from("events").insert(payload);
    if (error) return alert(error.message);
    setOpenCreate(false);
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
    });
    loadData();
  };

  return (
    <div className="min-h-screen">
      <div className="container-app py-6">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h1 className="text-2xl font-semibold logoText">What’s happening</h1>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className={`btn ${mode === "whats" ? "btn-brand" : "btn-neutral"}`}
              onClick={() => setMode("whats")}
            >
              What’s happening
            </button>
            <button
              className={`btn ${mode === "mine" ? "btn-brand" : "btn-neutral"}`}
              onClick={() => setMode("mine")}
            >
              Only my events
            </button>

            <label className="ml-2 inline-flex items-center gap-2 text-sm border rounded-xl px-3 py-2">
              <input type="checkbox" checked={showMoon} onChange={(e) => setShowMoon(e.target.checked)} />
              Show moon phases
            </label>

            <Link href="/" className="btn btn-neutral">Home</Link>
            <button className="btn btn-brand" onClick={() => setOpenCreate(true)}>
              Create event
            </button>
          </div>
        </div>

        <Legend />

        <div className="card p-3 mt-3">
          <Calendar
            localizer={localizer}
            events={allUiEvents}
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
            eventPropGetter={eventPropGetter}
            components={{
              event: ({ event }) => {
                if ((event as UiEvent).resource?.moonPhase) {
                  return (
                    <div className="text-[11px] leading-tight italic">
                      {(event as UiEvent).resource?.title ?? "Moon"}
                    </div>
                  );
                }
                return (
                  <div className="text-[11px] leading-tight">
                    <div className="font-medium">{event.title}</div>
                    <VisibilityPill v={(event as UiEvent).resource.visibility} />
                  </div>
                );
              },
            }}
          />
        </div>

        {loading && <p className="mt-3 text-sm text-neutral-500">Loading…</p>}
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
                <input
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2"
                  value={form.event_type}
                  onChange={(e) => setForm({ ...form, event_type: e.target.value })}
                  placeholder="Coffee, Yoga, etc."
                />
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
                  onChange={(e) => setForm({ ...form, visibility: e.target.value as Visibility })}
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
                  onChange={(e) => setForm({ ...form, community_id: e.target.value })}
                  placeholder="Community UUID (picker coming soon)"
                />
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
              Tip: “Friends going” shows events where at least one friend RSVP’d shareably.
              “Only my events” shows anything you RSVP’d (including private) or pinned.
            </p>
          </Dialog.Panel>
        </div>
      </Dialog>

      <EventDetails event={detailsOpen ? selected : null} onClose={() => setDetailsOpen(false)} />
    </div>
  );
}
