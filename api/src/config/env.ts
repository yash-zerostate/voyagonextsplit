import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable ${name}. See .env.example.`);
  }
  return value;
}

function int(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const jwtSecret = required("AUTH_JWT_SECRET");
if (jwtSecret.length < 32) {
  throw new Error("AUTH_JWT_SECRET must be at least 32 characters long.");
}

const sameSite = (process.env.COOKIE_SAMESITE ?? "lax").toLowerCase();
if (!["lax", "strict", "none"].includes(sameSite)) {
  throw new Error(`COOKIE_SAMESITE must be lax, strict or none — got "${sameSite}".`);
}

const secure = (process.env.COOKIE_SECURE ?? "false") === "true";
if (sameSite === "none" && !secure) {
  // Browsers silently drop SameSite=None cookies without Secure, which looks
  // like "login does nothing" — fail loudly at boot instead.
  throw new Error("COOKIE_SAMESITE=none requires COOKIE_SECURE=true (and HTTPS).");
}

export const config = {
  mongoUri: required("MONGODB_URI"),
  mongoDb: process.env.MONGODB_DB ?? "voyago_demo",
  jwtSecret,
  accessTtlMinutes: int("ACCESS_TOKEN_TTL_MIN", 15),
  refreshTtlDays: int("REFRESH_TOKEN_TTL_DAYS", 30),
  port: int("PORT", 5002),
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:4002",
  isProd: process.env.NODE_ENV === "production",
  cookie: {
    domain: process.env.COOKIE_DOMAIN || undefined,
    sameSite: sameSite as "lax" | "strict" | "none",
    secure,
  },
};
