// app/calendar/page.tsx
"use client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

// react-big-calendar
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import {
  startOfWeek,
  getDay,
  format,
  parse,
} from "date-fns";

type DbEvent = {
  id: string | number;
  title: string | null;
  // support either column pair in your DB
  start_at?: string | null;
  end_at?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  visibility?: "public" | "private" | null;
  owner_id?: string | null;
  location?: string | null;
};

type UiEvent = {
  id: string | number;
  title: string;
  start: Date;
  end: Date;
  visibility: "public" | "private";
};

const locales: any = {};
const localizer = dateFnsLocalizer({
  format,
  parse: (str: string, fmt: string, refDate: Date) => parse(str, fmt, refDate),
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

// ---- small helpers ----------------------------------------------------------

function pickDate(e: DbEvent, keyA: keyof DbEvent, keyB: keyof DbEvent): string | null {
  return (e[keyA] as string) ?? (e[keyB] as string) ?? null;
}

function toUi(events: DbEvent[]): UiEvent[] {
  return (events || [])
    .map((e) => {
      const startIso = pickDate(e, "start_at", "start_time");
      const endIso = pickDate(e, "end_at", "end_time");
      if (!startIso || !endIso) return null;
      return {
        id: e.id,
        title: (e.title ?? "Untitled").trim(),
        start: new Date(startIso),
        end: new Date(endIso),
        visibility: (e.visibility ?? "private") as "public" | "private",
      };
    })
    .filter(Boolean) as UiEvent[];
}

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

// ---- page component ---------------------------------------------------------

export default function CalendarPage() {
  const [me, setMe] = useState<string | null>(null);
  const [tab, setTab] = useState<"public" | "mine">("public");
  const [loading, setLoading] = useState(false);
  const [publicEvents, setPublicEvents] = useState<UiEvent[]>([]);
  const [myEvents, setMyEvents] = useState<UiEvent[]>([]);

  // You can change this path if your create page lives elsewhere.
  const CREATE_EVENT_PATH = "/events/new";

  useEffect(() => {
    getUserId().then(setMe);
  }, []);

  async function load() {
    setLoading(true);
    try {
      // PUBLIC (What's Happening)
      {
        // try "events", fallback "calendar_events"
        let r = await supabase
          .from("events")
          .select("id,title,start_at,end_at,start_time,end_time,visibility,owner_id,location")
          .eq("visibility", "public")
          .order("start_at", { ascending: true });
        if (r.error) {
          // fallback to calendar_events
          const r2 = await supabase
            .from("calendar_events")
            .select("id,title,start_at,end_at,start_time,end_time,visibility,owner_id,location")
            .eq("visibility", "public")
            .order("start_at", { ascending: true });
          if (!r2.error && r2.data) setPublicEvents(toUi(r2.data as DbEvent[]));
        } else if (r.data) {
          setPublicEvents(toUi(r.data as DbEvent[]));
        }
      }

      // MINE (My Calendar) — strictly events owned by the logged-in user
      const uid = await getUserId();
      if (uid) {
        let r = await supabase
          .from("events")
          .select("id,title,start_at,end_at,start_time,end_time,visibility,owner_id,location")
          .eq("owner_id", uid)
          .order("start_at", { ascending: true });

        if (r.error) {
          // fallback
          const r2 = await supabase
            .from("calendar_events")
            .select("id,title,start_at,end_at,start_time,end_time,visibility,owner_id,location")
            .eq("owner_id", uid)
            .order("start_at", { ascending: true });
          if (!r2.error && r2.data) setMyEvents(toUi(r2.data as DbEvent[]));
        } else if (r.data) {
          setMyEvents(toUi(r.data as DbEvent[]));
        }
      } else {
        setMyEvents([]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []); // initial

  const events = tab === "public" ? publicEvents : myEvents;

  const toolbar = (
    <div className="flex items-center gap-2">
      <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 bg-white shadow-sm">
        <span>🌤️</span>
        <span>Summer</span>
        <span className="text-neutral-400">▾</span>
      </div>

      <div className="ml-2 inline-flex rounded-lg overflow-hidden border">
        <button
          className={`px-3 py-2 ${tab === "public" ? "bg-neutral-900 text-white" : "bg-white"}`}
          onClick={() => setTab("public")}
        >
          What&apos;s Happening
        </button>
        <button
          className={`px-3 py-2 ${tab === "mine" ? "bg-neutral-900 text-white" : "bg-white"}`}
          onClick={() => setTab("mine")}
        >
          My Calendar
        </button>
      </div>

      <Link href={CREATE_EVENT_PATH} className="btn btn-brand ml-2">
        + Create event
      </Link>

      <button className="btn ml-2" onClick={load}>
        Refresh
      </button>
    </div>
  );

  return (
    <div className="container-app mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <h1 className="page-title">Calendar</h1>

      <div className="mt-3">{toolbar}</div>

      <div className="mt-3 card p-3">
        {loading ? (
          <div className="muted">Loading…</div>
        ) : events.length === 0 ? (
          <div className="muted">Nothing new right now. Check back later.</div>
        ) : (
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            titleAccessor="title"
            defaultView={Views.MONTH}
            style={{ height: 640 }}
            popup
            tooltipAccessor={(e) => e.title}
          />
        )}
      </div>
    </div>
  );
}
