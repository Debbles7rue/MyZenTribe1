// lib/events.ts
"use client";

import { supabase } from "@/lib/supabaseClient";

/**
 * Insert an event for the current user in a schema-agnostic way.
 * We try both "events" and "calendar_events" and multiple column name variants:
 * - owner: owner_id | user_id | created_by
 * - time: (start_at,end_at) | (start_time,end_time) | (starts_at,ends_at)
 * - visibility: visibility ("public"/"private") | is_public (boolean)
 * - description: notes | description (we pass in notes; you can update description after)
 */
export async function insertEventForUser(input: {
  title: string;
  startISO: string;
  endISO: string;
  visibility?: "public" | "private";
  location?: string | null;
  notes?: string | null;
}) {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) throw new Error("Please sign in.");

  const tables = ["events", "calendar_events"];

  // candidate owner field names
  const ownerKeys = ["owner_id", "user_id", "created_by"];

  // candidate time column pairs
  const timePairs: Array<[string, string]> = [
    ["start_at", "end_at"],
    ["start_time", "end_time"],
    ["starts_at", "ends_at"],
  ];

  // candidate visibility representations
  const makeVisibilityVariants = (v: "public" | "private") => [
    { visibility: v },
    { is_public: v === "public" },
  ];

  const baseCommon = {
    title: (input.title || "").trim() || "Untitled",
    location: input.location ?? null,
    notes: input.notes ?? null,
    source: "personal",
    rsvp_public: true,
  } as Record<string, any>;

  let lastErr: any = null;

  for (const table of tables) {
    // try each owner key
    for (const ownerKey of ownerKeys) {
      // try each time column pair
      for (const [startKey, endKey] of timePairs) {
        // try visibility as enum or boolean
        for (const vis of makeVisibilityVariants(input.visibility ?? "private")) {
          const payload: Record<string, any> = {
            ...baseCommon,
            [ownerKey]: user.id,
            [startKey]: input.startISO,
            [endKey]: input.endISO,
            ...vis,
          };

          const res = await supabase.from(table).insert(payload).select("id").single();
          if (!res.error && res.data) return res.data;
          lastErr = res.error;
        }
      }
    }
  }

  throw new Error(lastErr?.message || "Could not create event.");
}
