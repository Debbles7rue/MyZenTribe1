// app/auth/callback/route.ts
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { access_token, refresh_token } = await request.json();

  const res = NextResponse.json({ ok: true });

  // Only set cookies if we received tokens
  if (access_token) {
    res.cookies.set("sb-access-token", access_token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60, // 1 hour (typical Supabase access token lifetime)
    });
  }

  if (refresh_token) {
    res.cookies.set("sb-refresh-token", refresh_token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // ~30 days
    });
  }

  return res;
}
