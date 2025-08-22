// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// CONFIG
const SIGNIN_PATH = "/login";      // your working login page
const REQUIRE_PROFILE = true;      // set false if you only require auth
const PROTECTED = [
  "/meditation",
  "/communities",
  "/calendar",
  "/lounge",
  "/schedule",
  "/profile",
];

function isProtected(pathname: string) {
  return PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

// Supabase REST calls (no client lib needed)
async function getUserFromSupabase(token: string) {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`;
  const res = await fetch(url, {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) return null;
  return (await res.json()) as { id: string } | null;
}

async function hasProfileRow(token: string, userId: string) {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?select=id&id=eq.${userId}`;
  const res = await fetch(url, {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) return false;
  const rows = (await res.json()) as Array<{ id: string }>;
  return Array.isArray(rows) && rows.length > 0;
}

function extractAccessToken(req: NextRequest): string | null {
  // Newer helpers set 'sb-access-token'
  const direct = req.cookies.get("sb-access-token")?.value;
  if (direct) return direct;

  // Older helper used 'supabase-auth-token' JSON cookie: ["access","refresh"]
  const legacy = req.cookies.get("supabase-auth-token")?.value;
  if (legacy) {
    try {
      const arr = JSON.parse(legacy);
      if (Array.isArray(arr) && typeof arr[0] === "string") return arr[0];
    } catch {}
  }
  return null;
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Allow assets, api, and auth/onboarding routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots") ||
    pathname.startsWith("/sitemap") ||
    pathname.startsWith("/signin") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/auth") ||
    pathname === "/"
  ) {
    return NextResponse.next();
  }

  if (!isProtected(pathname)) return NextResponse.next();

  // Require Supabase access token
  const accessToken = extractAccessToken(req);
  if (!accessToken) {
    const to = new URL(SIGNIN_PATH, req.url);
    to.searchParams.set("redirect", pathname + search);
    return NextResponse.redirect(to);
    }

  // Verify token
  const user = await getUserFromSupabase(accessToken);
  if (!user) {
    const to = new URL(SIGNIN_PATH, req.url);
    to.searchParams.set("redirect", pathname + search);
    return NextResponse.redirect(to);
  }

  // Optionally require profile row
  if (REQUIRE_PROFILE) {
    const ok = await hasProfileRow(accessToken, user.id);
    if (!ok) {
      const to = new URL("/onboarding", req.url);
      to.searchParams.set("redirect", pathname + search);
      return NextResponse.redirect(to);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\.[\\w]+$).*)"], // run on all pages except static files
};
