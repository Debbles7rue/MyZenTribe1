import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const form = await req.formData();
  const email = String(form.get("email"));
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) return NextResponse.json({ ok:false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok:true });
}
