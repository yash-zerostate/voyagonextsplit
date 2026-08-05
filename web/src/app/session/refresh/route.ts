import { NextResponse, type NextRequest } from "next/server";

const INTERNAL_API_URL =
  process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5002";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A tiny backend-for-frontend hop, used only for navigations.
 *
 * Middleware sends the browser here when the access cookie has expired. We ask
 * the API to rotate the refresh token, copy its `Set-Cookie` headers onto our
 * own redirect, and send the user back where they were going. Without this, a
 * server-rendered page could never recover from an expired access token — a
 * Server Component cannot set cookies.
 */
export async function GET(request: NextRequest) {
  const nextParam = request.nextUrl.searchParams.get("next") || "/bookings";
  const target =
    nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/bookings";

  const cookieHeader = request.headers.get("cookie") ?? "";

  let apiResponse: Response;
  try {
    apiResponse = await fetch(`${INTERNAL_API_URL}/auth/refresh`, {
      method: "POST",
      headers: { cookie: cookieHeader, "Content-Type": "application/json" },
      cache: "no-store",
    });
  } catch {
    const loginUrl = new URL("/login", request.nextUrl.origin);
    loginUrl.searchParams.set("reason", "api_unreachable");
    return NextResponse.redirect(loginUrl);
  }

  const destination = apiResponse.ok
    ? new URL(target, request.nextUrl.origin)
    : (() => {
        const loginUrl = new URL("/login", request.nextUrl.origin);
        loginUrl.searchParams.set("next", target);
        loginUrl.searchParams.set("reason", "session_expired");
        return loginUrl;
      })();

  const response = NextResponse.redirect(destination);

  // Relay every cookie the API set (or cleared) so the browser ends up in the
  // same state it would have been in talking to the API directly.
  for (const value of apiResponse.headers.getSetCookie()) {
    response.headers.append("set-cookie", value);
  }

  return response;
}
