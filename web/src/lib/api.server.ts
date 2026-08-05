import "server-only";

import { cookies } from "next/headers";

import { API_URL, toResult, unreachable, type ApiResult } from "@/lib/api-shared";

/**
 * Server-side calls need an ABSOLUTE url. When the browser is pointed at the
 * `/api-proxy` rewrite (see next.config.ts), NEXT_PUBLIC_API_URL is a relative
 * path, so API_INTERNAL_URL must carry the real origin — fail loudly rather
 * than fetching a relative path from the server and getting a confusing error.
 */
const INTERNAL_API_URL = process.env.API_INTERNAL_URL ?? API_URL;
if (!/^https?:\/\//.test(INTERNAL_API_URL)) {
  throw new Error(
    `API_INTERNAL_URL must be an absolute URL (got "${INTERNAL_API_URL}"). ` +
      "Set it to the API's origin, e.g. https://voyago-api.onrender.com",
  );
}

/**
 * Server-side call to the API.
 *
 * The auth cookies live on the API's host, but the site and the API share a
 * registrable domain (localhost in dev, `.acme.com` in prod), so the browser
 * sends them to *us* as well — which means we can forward them onward. That is
 * what lets Server Components render authenticated data.
 */
export async function serverFetch<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  const cookieHeader = (await cookies())
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  try {
    const response = await fetch(`${INTERNAL_API_URL}${path}`, {
      ...init,
      headers: {
        ...(init.headers as Record<string, string> | undefined),
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
      cache: "no-store",
    });
    return await toResult<T>(response);
  } catch {
    return unreachable<T>(INTERNAL_API_URL);
  }
}
