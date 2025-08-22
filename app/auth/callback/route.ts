// app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function POST(request: Request) {
  const { access_token, refresh_token } = await request.json();
  const supabase = createRouteHandlerClient({ cookies });

  if (access_token && refresh_token) {
    // sets the sb-access-token/refresh-token cookies for the current domain
    await supabase.auth.setSession({ access_token, refresh_token });
  }

  return NextResponse.json({ ok: true });
}
