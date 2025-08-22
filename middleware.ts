// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

const PROTECTED = [
  "/meditation",
  "/communities",
  "/calendar",
  "/lounge",
  "/profile",
  "/schedule",
];

function isProtected(pathname: string) {
  return PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  // Let assets and the sign-in/onboarding routes pass
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/mz") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.startsWith("/signin") ||
    pathname.startsWith("/onboarding")
  ) {
    return NextResponse.next();
  }

  // Only guard protected routes
  if (!isProtected(pathname)) return NextResponse.next();

  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // 1) Must be authenticated
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    const to = new URL("/signin", req.url);
    to.searchParams.set("redirect", pathname + search);
    return NextResponse.redirect(to);
  }

  // 2) Must have a profile row
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", session.user.id)
    .maybeSingle();

  if (!profile) {
    const to = new URL("/onboarding", req.url);
    to.searchParams.set("redirect", pathname + search);
    return NextResponse.redirect(to);
  }

  return res;
}

export const config = {
  // Run on all pages except static assets (we filter again inside)
  matcher: ["/((?!.*\\.[\\w]+$).*)"],
};
