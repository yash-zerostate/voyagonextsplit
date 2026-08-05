import type { CookieOptions, Response } from "express";

import { config } from "../config/env.js";

export const ACCESS_COOKIE = "voyago_access";
export const REFRESH_COOKIE = "voyago_refresh";
/** No secret in it — lets the Next.js middleware decide whether to try a refresh. */
export const SESSION_HINT_COOKIE = "voyago_session";

/**
 * The site and this API are different origins. In production they share a
 * registrable domain (app.acme.com / api.acme.com) and the cookie is scoped to
 * `.acme.com`; if they are on genuinely different domains you need
 * `SameSite=None; Secure`, which is what COOKIE_SAMESITE controls.
 *
 * In development both are `localhost` — cookies ignore the port, so a cookie set
 * by :5002 is sent to :4002 and `SameSite=Lax` is enough.
 */
function baseOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: config.cookie.sameSite,
    secure: config.cookie.secure,
    domain: config.cookie.domain,
    path: "/",
  };
}

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
): void {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...baseOptions(),
    maxAge: config.accessTtlMinutes * 60 * 1000,
  });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...baseOptions(),
    maxAge: config.refreshTtlDays * 24 * 60 * 60 * 1000,
  });
  res.cookie(SESSION_HINT_COOKIE, "1", {
    ...baseOptions(),
    httpOnly: false, // the frontend reads this one to render the right nav
    maxAge: config.refreshTtlDays * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(res: Response): void {
  const options = baseOptions();
  res.clearCookie(ACCESS_COOKIE, options);
  res.clearCookie(REFRESH_COOKIE, options);
  res.clearCookie(SESSION_HINT_COOKIE, { ...options, httpOnly: false });
}
