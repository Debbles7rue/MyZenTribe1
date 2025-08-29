// lib/events.ts
"use client";

import { supabase } from "@/lib/supabaseClient";

/**
 * Insert an event for the current user.
 * - Ensures owner_id is set to the signed-in user.
 * - Tries both "events" and "calendar_events" tables (first one that exists).
 * - Tries both column pairs: start_at/end_at, then start_time/end_time (first that works).
 * - Returns { id } of the created row.
 */
export async function insertEventForUser(input: {
  title: string;
  startISO: string;     // e.g. 2025-08-29T18:00:00.000Z
  endISO: string;       // e.g. 2025-08-29T19:00:00.000Z
  visibility?: "public" | "private"; // "public" => appears in Happenings; "private" => My Calendar only
  location?: string | null;
  notes?: string | null;
}) {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) throw new Error("Please sign in.");

  const visibility = input.visibility ?? "private";
  const base = {
    title: (input.title || "").trim() || "Untitled",
    visibility,
    owner_id: user.id,
    location: input.location ?? null,
    notes: input.notes ?? null,
  };

  const byStartAt = { ...base, start_at: input.startISO, end_at: input.endISO };
  const byStartTime = { ...base, start_time: input.startISO, end_time: input.endISO };

  const tables = ["events", "calendar_events"];
  let lastErr: any = null;

  for (const table of tables) {
    // Try start_at/end_at first
    let r = await supabase.from(table).insert(byStartAt).select("id").single();
    if (!r.error && r.data) return r.data;

    // If that failed (maybe columns differ), try start_time/end_time
    let r2 = await supabase.from(table).insert(byStartTime).select("id").single();
    if (!r2.error && r2.data) return r2.data;

    lastErr = r2.error || r.error;
  }

  throw new Error(lastErr?.message || "Could not create event.");
}
