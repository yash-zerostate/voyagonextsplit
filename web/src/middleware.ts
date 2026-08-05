import { NextResponse, type NextRequest } from "next/server";

/**
 * The frontend cannot verify a token — the JWT secret lives only on the API, and
 * that is on purpose. So middleware does UX routing, not authorization:
 *
 *   no session cookie at all       → straight to /login (skip a pointless render)
 *   session cookie but no access   → bounce through /session/refresh, which asks
 *                                    the API to rotate, then returns here
 *   access cookie present          → render, and the API decides for real
 *
 * Anything that matters is still enforced server-side by the API on every call.
 */
const ACCESS_COOKIE = "voyago_access";
const SESSION_HINT_COOKIE = "voyago_session";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const target = `${pathname}${search}`;

  if (request.cookies.has(ACCESS_COOKIE)) {
    return NextResponse.next();
  }

  if (request.cookies.has(SESSION_HINT_COOKIE)) {
    const refreshUrl = new URL("/session/refresh", request.nextUrl.origin);
    refreshUrl.searchParams.set("next", target);
    return NextResponse.redirect(refreshUrl);
  }

  const loginUrl = new URL("/login", request.nextUrl.origin);
  loginUrl.searchParams.set("next", target);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/bookings/:path*", "/profile/:path*"],
};
