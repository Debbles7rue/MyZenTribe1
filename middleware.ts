// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

/**
 * CONFIG
 * - SIGNIN_PATH: your working login route (you said /login is correct)
 * - REQUIRE_PROFILE: set to true to also require a row in public.profiles for access
 * - PROTECTED: all routes (and subroutes) that should be members-only
 */
const SIGNIN_PATH = "/login";
const REQUIRE_PROFILE = true;
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

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Always allow static assets, API, and auth/onboarding pages to pass
  if (
    pathname.startsWith("/_next") ||      // Next.js assets
    pathname.startsWith("/api") ||        // API routes
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots") ||
    pathname.startsWith("/sitemap") ||
    pathname.startsWith("/signin") ||     // legacy compat
    pathname.startsWith("/login") ||      // your login page
    pathname.startsWith("/onboarding") || // first-time profile setup
    pathname.startsWith("/auth") ||       // Supabase OAuth callbacks
    pathname === "/"                      // homepage (public)
  ) {
    return NextResponse.next();
  }

  // Only guard the routes in PROTECTED
  if (!isProtected(pathname)) return NextResponse.next();

  // Create a response and Supabase client bound to this request
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // 1) Require an authenticated session
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    const to = new URL(SIGNIN_PATH, req.url);
    to.searchParams.set("redirect", pathname + search);
    return NextResponse.redirect(to);
  }

  // 2) Optionally require a profile row (public.profiles with id = auth uid)
  if (REQUIRE_PROFILE) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", session.user.id)
      .maybeSingle();

    // If no row (or an error fetching), send them to onboarding
    if (!profile || error) {
      const to = new URL("/onboarding", req.url);
      to.searchParams.set("redirect", pathname + search);
      return NextResponse.redirect(to);
    }
  }

  // All good — proceed
  return res;
}

// Run on all pages except actual files (e.g., .css, .png, etc.)
export const config = {
  matcher: ["/((?!.*\\.[\\w]+$).*)"],
};
