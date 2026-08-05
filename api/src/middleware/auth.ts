import type { NextFunction, Request, Response } from "express";

import { ACCESS_COOKIE } from "../lib/cookies.js";
import { verifyAccessToken, type AccessClaims } from "../lib/tokens.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AccessClaims;
    }
  }
}

/**
 * Accepts the access token from the httpOnly cookie (how the browser talks to
 * us) or from an `Authorization: Bearer` header (how server-to-server callers
 * and curl do). Same verification either way.
 */
export function readAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  const token = bearer ?? (req.cookies?.[ACCESS_COOKIE] as string | undefined);

  if (token) {
    const claims = verifyAccessToken(token);
    if (claims) req.auth = claims;
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.auth) {
    res.status(401).json({ error: { code: "unauthenticated", message: "Sign in to continue." } });
    return;
  }
  next();
}

export function requireRole(...roles: Array<AccessClaims["role"]>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ error: { code: "unauthenticated", message: "Sign in to continue." } });
      return;
    }
    if (!roles.includes(req.auth.role)) {
      res.status(403).json({ error: { code: "forbidden", message: "Not allowed." } });
      return;
    }
    next();
  };
}
