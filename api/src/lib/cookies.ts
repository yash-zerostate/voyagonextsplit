import type { CookieOptions, Response } from "express";

import { config } from "../config/env.js";

export const ACCESS_COOKIE = "voyago_access";
export const REFRESH_COOKIE = "voyago_refresh";
/** No secret in it — lets the Next.js middleware decide whether to try a refresh. */
export const SESSION_HINT_COOKIE = "voyago_session";
/**
 * The Preta context JWT (`data-ctx-cookie`). Like SESSION_HINT_COOKIE it is
 * deliberately NOT httpOnly — the loader runs in the browser and has to read it.
 *
 * That is safe because of what is inside: a *signed* token carrying only
 * targeting attributes. Editing it breaks the signature, and it authenticates
 * nothing against this API — the real session stays in the two cookies above.
 */
export const PRETA_COOKIE = "preta_ctx";

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

/**
 * Written on its own from PATCH /auth/me too, where the session is untouched but
 * the attributes just changed — hence a separate exported function.
 */
export function setPretaCookie(res: Response, token: string | null): void {
  if (!token) return; // no key configured — the visitor is simply anonymous to Preta
  res.cookie(PRETA_COOKIE, token, {
    ...baseOptions(),
    httpOnly: false, // the loader must be able to read it
    maxAge: config.accessTtlMinutes * 60 * 1000,
  });
}

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string; pretaToken?: string | null },
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
  // Refreshed on the same schedule as the access token, so it can never go stale
  // while the session is alive — login, register and every refresh pass through here.
  setPretaCookie(res, tokens.pretaToken ?? null);
}

export function clearAuthCookies(res: Response): void {
  const options = baseOptions();
  res.clearCookie(ACCESS_COOKIE, options);
  res.clearCookie(REFRESH_COOKIE, options);
  res.clearCookie(SESSION_HINT_COOKIE, { ...options, httpOnly: false });
  // Clearing this is what removes personalised elements at logout — the loader
  // finds no cookie, sends no context, and the edge matches nothing.
  res.clearCookie(PRETA_COOKIE, { ...options, httpOnly: false });
}
