// middleware.ts - REPLACE ENTIRE FILE
import { NextResponse, type NextRequest } from "next/server";

// Changed from /login to / (landing page)
const LANDING_PAGE = "/";

// Pages that require authentication
const PROTECTED: RegExp[] = [
  /^\/calendar(\/|$)/,
  /^\/meditation(\/|$)/,
  /^\/communities(\/|$)/,
  /^\/profile(\/|$)/,
  /^\/business(\/|$)/,
  /^\/karma(\/|$)/,
  /^\/safety(\/|$)/,
  /^\/commitment(\/|$)/,
  /^\/notifications(\/|$)/,
  /^\/contact(\/|$)/,
  /^\/suggestions(\/|$)/,
  /^\/donate(\/|$)/,
  /^\/admin(\/|$)/,
  /^\/events(\/|$)/,
  /^\/friends(\/|$)/,
  /^\/messages(\/|$)/,
];

function hasSupabaseSessionCookie(req: NextRequest): boolean {
  // supabase-js v2 cookie names
  const access = req.cookies.get("sb-access-token")?.value;
  const refresh = req.cookies.get("sb-refresh-token")?.value;
  // legacy helper cookie (some setups use this)
  const legacy = req.cookies.get("supabase-auth-token")?.value;
  return Boolean((access && refresh) || legacy);
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  
  // Check if this is a protected route
  const isProtected = PROTECTED.some((re) => re.test(url.pathname));
  
  if (!isProtected) return NextResponse.next();
  
  // If protected and no session, redirect to landing page with ?next parameter
  if (!hasSupabaseSessionCookie(req)) {
    const redirectTo = `${LANDING_PAGE}?next=${encodeURIComponent(
      url.pathname + url.search
    )}`;
    return NextResponse.redirect(new URL(redirectTo, url.origin));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api).*)",
  ],
};
