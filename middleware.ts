// middleware.ts  (REPLACE ENTIRE FILE)
import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

const SIGNIN_PATH = "/login";

// Only protect these paths
const PROTECTED: RegExp[] = [
  /^\/calendar(\/|$)/,
  /^\/meditation\/schedule(\/|$)/,
  /^\/communities(\/|$)/,
];

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const res = NextResponse.next();

  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();

  // if requesting a protected route and not signed in, bounce to login
  const isProtected = PROTECTED.some((re) => re.test(url.pathname));
  if (isProtected && !session) {
    const redirectTo = `${SIGNIN_PATH}?redirect=${encodeURIComponent(url.pathname + url.search)}`;
    return NextResponse.redirect(new URL(redirectTo, url.origin));
  }

  return res;
}

export const config = {
  matcher: [
    // run on everything except static/_next
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|images/|public/).*)",
  ],
};
