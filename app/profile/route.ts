import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    const payload = {
      id: user.id,
      full_name: String(body.full_name ?? "").slice(0, 120),
      bio: String(body.bio ?? "").slice(0, 1000),
      location: String(body.location ?? "").slice(0, 120),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("profiles").upsert(payload, {
      onConflict: "id",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
