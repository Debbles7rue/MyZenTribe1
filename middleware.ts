// middleware.ts — REPLACE ENTIRE FILE

import { NextResponse, type NextRequest } from "next/server";

const SIGNIN_PATH = "/login";

// Pages that require being signed in
const PROTECTED: RegExp[] = [
  /^\/calendar(\/|$)/,
  /^\/meditation\/schedule(\/|$)/,
  /^\/communities(\/|$)/,
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
  const isProtected = PROTECTED.some((re) => re.test(url.pathname));

  if (!isProtected) return NextResponse.next();

  if (!hasSupabaseSessionCookie(req)) {
    const redirectTo = `${SIGNIN_PATH}?redirect=${encodeURIComponent(
      url.pathname + url.search
    )}`;
    return NextResponse.redirect(new URL(redirectTo, url.origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
