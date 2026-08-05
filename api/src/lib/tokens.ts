import { createHash, randomBytes, randomUUID } from "node:crypto";

import jwt from "jsonwebtoken";

import { config } from "../config/env.js";

export type AccessClaims = {
  sub: string;
  email: string;
  name: string;
  role: "traveller" | "agent";
  tier: "explorer" | "voyager" | "elite";
  sid: string;
};

const ISSUER = "voyago-api";
const AUDIENCE = "voyago-web";

export function signAccessToken(claims: AccessClaims): string {
  // `sub` is already part of the payload, so the `subject` option must NOT be
  // passed as well — jsonwebtoken rejects the pair outright.
  return jwt.sign(claims, config.jwtSecret, {
    algorithm: "HS256",
    expiresIn: `${config.accessTtlMinutes}m`,
    issuer: ISSUER,
    audience: AUDIENCE,
  });
}

/** Null for anything invalid or expired — callers never see an exception. */
export function verifyAccessToken(token: string): AccessClaims | null {
  try {
    const payload = jwt.verify(token, config.jwtSecret, {
      algorithms: ["HS256"],
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    if (typeof payload === "string" || !payload.sub) return null;
    return {
      sub: String(payload.sub),
      email: String(payload.email ?? ""),
      name: String(payload.name ?? ""),
      role: (payload.role as AccessClaims["role"]) ?? "traveller",
      tier: (payload.tier as AccessClaims["tier"]) ?? "explorer",
      sid: String(payload.sid ?? ""),
    };
  } catch {
    return null;
  }
}

/** Opaque and therefore revocable — the whole point of not using a JWT here. */
export function generateRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newFamilyId(): string {
  return randomUUID();
}
