// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

const SIGNIN_PATH = "/login";        // 🔒 use YOUR working login route
const REQUIRE_PROFILE = true;        // set false if you want auth-only

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

  // let assets/api/signin pass
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots") ||
    pathname.startsWith("/sitemap") ||
    pathname.startsWith("/signin") || // in case old links hit /signin
    pathname.startsWith("/onboarding")
  ) {
    return NextResponse.next();
  }

  if (!isProtected(pathname)) return NextResponse.next();

  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // 1) require auth
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    const to = new URL(SIGNIN_PATH, req.url);
    to.searchParams.set("redirect", pathname + search);
    return NextResponse.redirect(to);
  }

  // 2) optionally require a profile row
  if (REQUIRE_PROFILE) {
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
  }

  return res;
}

export const config = { matcher: ["/((?!.*\\.[\\w]+$).*)"] };
