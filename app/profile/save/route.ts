// app/profile/save/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function clip(v: unknown, max: number) {
  if (v == null) return "";
  const s = typeof v === "string" ? v : String(v);
  return s.slice(0, max);
}
function asBool(v: unknown) {
  return v === true || v === "true" || v === 1 || v === "1";
}

export async function POST(req: Request) {
  try {
    const supabase = createClient();

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const body = await req.json();

    // Normalize inputs
    const full_name = clip(body.full_name, 120) || null;
    const bio = clip(body.bio, 1000) || null;

    // New fields (preferred)
    const location_text_input =
      body.location_text != null ? body.location_text : body.location; // back-compat
    const location_text = clip(location_text_input, 120) || null;
    const location_is_public = asBool(body.location_is_public);

    // Try modern payload first (uses new columns)
    const payloadNew: Record<string, any> = {
      id: user.id,
      full_name,
      bio,
      location_text,
      location_is_public,
      updated_at: new Date().toISOString(),
    };

    // Also keep the legacy "location" column in sync if you still have it.
    // If the column doesn't exist, the first upsert may fail; we'll retry without it.
    const payloadWithLegacy = { ...payloadNew, location: location_text };

    let { error } = await supabase.from("profiles").upsert(payloadWithLegacy, {
      onConflict: "id",
    });

    // If the table doesn't have the new columns yet, retry with legacy shape
    if (
      error &&
      /column .* (location_text|location_is_public)/i.test(error.message)
    ) {
      const legacy = {
        id: user.id,
        full_name,
        bio,
        location: location_text,
        updated_at: new Date().toISOString(),
      };
      const retry = await supabase.from("profiles").upsert(legacy, {
        onConflict: "id",
      });
      error = retry.error || null;
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
