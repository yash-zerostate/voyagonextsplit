// Signs the Preta context JWT (RS256). Preta verifies it with the matching PUBLIC
// key registered for the frontend's domain — voyago-public.pem.
//
// This API sets the token as a cookie itself, unlike the DeskDesk API which has to
// hand it back in the response body. It works here because browser traffic goes
// through the `/api-proxy` rewrite in web/next.config.ts, so the response reaches
// the browser from the SITE's origin and the cookie is scoped there — exactly how
// the existing voyago_access / voyago_refresh cookies already reach it.
import jwt from "jsonwebtoken";

/** Attributes Preta targets on. No email, no raw database id. */
export type PretaAttributes = {
  plan: string;
  role: string;
  active: boolean;
  risk_score: number;
};

/** Seconds the token stays valid — matched to the access token so both refresh together. */
export const PRETA_TOKEN_TTL_SECONDS = 900;

/**
 * Returns null instead of throwing when the key is missing or malformed: a broken
 * Preta config must never break signing in.
 */
export function createPretaContextToken(attributes: PretaAttributes): string | null {
  const raw = process.env.PRETA_PRIVATE_KEY;
  if (!raw) return null;

  // The PEM may carry real newlines or \n escapes depending on how the host stores it.
  const pem = raw.includes("BEGIN")
    ? raw.replace(/\\n/g, "\n")
    : Buffer.from(raw, "base64").toString("utf8");

  try {
    return jwt.sign({ "preta:user": attributes }, pem, {
      algorithm: "RS256",
      expiresIn: PRETA_TOKEN_TTL_SECONDS,
    });
  } catch (e) {
    console.error("[Preta] context sign failed:", (e as Error)?.message);
    return null;
  }
}
