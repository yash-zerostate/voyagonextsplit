import { serverFetch } from "@/lib/api.server";

/** The shared user profile — identical field names across all three demo apps. */
export type SessionUser = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  plan: "free" | "pro" | "enterprise";
  role: "developer" | "security" | "marketing" | "compliance";
  riskScore: number;
};

/**
 * There is no local session state in this app — the API is the only authority.
 * Every render asks it who the visitor is, forwarding the cookies we received.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const result = await serverFetch<{ user: SessionUser }>("/auth/me");
  return result.ok ? result.data.user : null;
}
