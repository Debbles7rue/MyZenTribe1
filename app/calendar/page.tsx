"use client";

import { Calendar, dateFnsLocalizer, Event as RBCEvent } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { format, parse, startOfWeek, getDay } from "date-fns";
import enUS from "date-fns/locale/en-US";
import { useEffect, useMemo, useState } from "react";
import { Dialog } from "@headlessui/react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({
  format, parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay, locales
});

type DBEvent = {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at: string;
  visibility: "public" | "friends" | "private" | "community";
  community_id: number | null;
  owner_id: string;
};

export default function CalendarPage() {
  const [events, setEvents] = useState<DBEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    start_at: "",
    end_at: "",
    visibility: "public" as DBEvent["visibility"],
    community_id: "" as string
  });
  const [communities, setCommunities] = useState<{ id: number; name: string }[]>([]);
  const [sessionUser, setSessionUser] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setSessionUser(data.user?.id ?? null);
    });
  }, []);

  const load = async () => {
    setLoading(true);
    // Load visible events according to RLS
    const { data, error } = await supabase
      .from("events")
      .select("id,title,description,location,start_at,end_at,visibility,community_id,owner_id")
      .order("start_at", { ascending: true });
    if (!error && data) setEvents(data as DBEvent[]);
    setLoading(false);
  };

  const loadCommunities = async () => {
    // Show communities the user can see; if private communities exist, members see them via community_members policy
    const { data } = await supabase.from("communities").select("id,name").order("name");
    setCommunities((data ?? []) as any);
  };

  useEffect(() => {
    load();
    loadCommunities();
  }, []);

  const rbcEvents = useMemo<RBCEvent[]>(() => {
    return events.map((e) => ({
      id: e.id,
      title: e.title,
      start: new Date(e.start_at),
      end: new Date(e.end_at),
      resource: e
    }));
  }, [events]);

  const onSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    setForm((f) => ({
      ...f,
      start_at: new Date(start.getTime() - start.getTimezoneOffset()*60000).toISOString().slice(0,16),
      end_at: new Date(end.getTime() - end.getTimezoneOffset()*60000).toISOString().slice(0,16),
    }));
    setOpen(true);
  };

  const createEvent = async () => {
    if (!sessionUser) {
      alert("Please log in to create an event.");
      return;
    }
    if (!form.title || !form.start_at || !form.end_at) {
      alert("Please fill title, start and end.");
      return;
    }
    const payload: any = {
      title: form.title,
      description: form.description || null,
      location: form.location || null,
      start_at: new Date(form.start_at),
      end_at: new Date(form.end_at),
      visibility: form.visibility,
      community_id: form.visibility === "community" && form.community_id ? Number(form.community_id) : null
    };
    const { error } = await supabase.from("events").insert(payload);
    if (error) {
      alert(error.message);
      return;
    }
    setOpen(false);
    setForm({
      title: "", description: "", location: "",
      start_at: "", end_at: "", visibility: "public", community_id: ""
    });
    await load();
  };

  return (
    <div className="min-h-screen">
      <div className="container-app py-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold logoText">
            My <span className="word-zen">Zen</span> Tribe Calendar
          </h1>
          <div className="flex gap-3">
            <Link href="/" className="btn btn-neutral">Home</Link>
            <button className="btn btn-brand" onClick={() => setOpen(true)}>
              Create event
            </button>
          </div>
        </div>

        <div className="card p-3">
          <Calendar
            localizer={localizer}
            events={rbcEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 680 }}
            selectable
            onSelectSlot={onSelectSlot}
            popup
          />
        </div>

        {loading && <p className="mt-3 text-sm text-neutral-500">Loading events…</p>}
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-lg">
            <Dialog.Title className="text-lg font-semibold mb-4">Create event</Dialog.Title>

            <div className="grid gap-3">
              <label className="block">
                <span className="text-sm">Title</span>
                <input className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2"
                  value={form.title}
                  onChange={(e)=>setForm({...form, title: e.target.value})}/>
              </label>

              <label className="block">
                <span className="text-sm">Description</span>
                <textarea className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2"
                  value={form.description}
                  onChange={(e)=>setForm({...form, description: e.target.value})}/>
              </label>

              <label className="block">
                <span className="text-sm">Location</span>
                <input className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2"
                  value={form.location}
                  onChange={(e)=>setForm({...form, location: e.target.value})}/>
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm">Start</span>
                  <input type="datetime-local"
                    className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2"
                    value={form.start_at}
                    onChange={(e)=>setForm({...form, start_at: e.target.value})}/>
                </label>
                <label className="block">
                  <span className="text-sm">End</span>
                  <input type="datetime-local"
                    className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2"
                    value={form.end_at}
                    onChange={(e)=>setForm({...form, end_at: e.target.value})}/>
                </label>
              </div>

              <label className="block">
                <span className="text-sm">Visibility</span>
                <select
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2"
                  value={form.visibility}
                  onChange={(e)=>setForm({...form, visibility: e.target.value as any})}
                >
                  <option value="public">Public</option>
                  <option value="community">Community</option>
                  <option value="friends">Friends & acquaintances</option>
                  <option value="private">Private (invite only)</option>
                </select>
              </label>

              {form.visibility === "community" && (
                <label className="block">
                  <span className="text-sm">Community</span>
                  <select
                    className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2"
                    value={form.community_id}
                    onChange={(e)=>setForm({...form, community_id: e.target.value})}
                  >
                    <option value="">Select community…</option>
                    {communities.map(c=>(
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </label>
              )}

              <div className="flex justify-end gap-3 mt-2">
                <button className="btn btn-neutral" onClick={()=>setOpen(false)}>Cancel</button>
                <button className="btn btn-brand" onClick={createEvent}>Save</button>
              </div>
            </div>

            <p className="mt-4 text-xs text-neutral-500">
              Tip: “Private” events are only visible to invitees and you.  
              “Friends & acquaintances” are visible to people you’ve added in your network.  
              “Community” shows to members of the selected community.
            </p>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}
