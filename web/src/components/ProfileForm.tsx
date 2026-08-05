"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { browserFetch } from "@/lib/api.client";
import type { SessionUser } from "@/lib/session";

const PLAN_OPTIONS = ["free", "pro", "enterprise"] as const;
const ROLE_OPTIONS = ["developer", "security", "marketing", "compliance"] as const;
const RISK_SCORE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export function ProfileForm({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [plan, setPlan] = useState<SessionUser["plan"]>(user.plan);
  const [role, setRole] = useState<SessionUser["role"]>(user.role);
  const [riskScore, setRiskScore] = useState(String(user.riskScore));
  const [active, setActive] = useState<"yes" | "no">(user.active ? "yes" : "no");
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus(null);
    setFields({});
    setBusy(true);

    const body = JSON.stringify({ name, plan, role, riskScore, active });
    let result = await browserFetch<{ user: SessionUser }>("/auth/me", { method: "PATCH", body });

    // The access token is only 15 minutes old; recover once rather than making
    // the user re-login because they sat on this page.
    if (!result.ok && result.status === 401) {
      const refreshed = await browserFetch("/auth/refresh", { method: "POST" });
      if (refreshed.ok) {
        result = await browserFetch<{ user: SessionUser }>("/auth/me", { method: "PATCH", body });
      } else {
        router.push("/login?next=/profile&reason=session_expired");
        return;
      }
    }

    setBusy(false);

    if (!result.ok) {
      setFields(result.fields ?? {});
      setStatus({ kind: "error", text: result.message });
      return;
    }

    setStatus({ kind: "ok", text: "Profile updated." });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      {status && (
        <p
          className={`rounded-2xl px-4 py-3 text-sm ${
            status.kind === "ok"
              ? "border border-deep-700/30 bg-deep-700/10 text-deep-800"
              : "border border-clay-500/30 bg-clay-500/10 text-clay-600"
          }`}
        >
          {status.text}
        </p>
      )}

      <div>
        <label className="label" htmlFor="name">
          Display name
        </label>
        <input
          id="name"
          className="input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        {fields.name && <p className="field-error">{fields.name}</p>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="plan">
            Plan
          </label>
          <select
            id="plan"
            className="input"
            value={plan}
            onChange={(event) => setPlan(event.target.value as SessionUser["plan"])}
          >
            {PLAN_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="role">
            Role
          </label>
          <select
            id="role"
            className="input"
            value={role}
            onChange={(event) => setRole(event.target.value as SessionUser["role"])}
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="riskScore">
            Risk score
          </label>
          <select
            id="riskScore"
            className="input"
            value={riskScore}
            onChange={(event) => setRiskScore(event.target.value)}
          >
            {RISK_SCORE_OPTIONS.map((score) => (
              <option key={score} value={score}>
                {score}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="active">
            Active
          </label>
          <select
            id="active"
            className="input"
            value={active}
            onChange={(event) => setActive(event.target.value as "yes" | "no")}
          >
            <option value="yes">yes</option>
            <option value="no">no</option>
          </select>
        </div>
      </div>

      <p className="text-xs text-deep-800/50">
        Changing your plan changes which itineraries you can book — the API enforces it on every
        booking, so try switching to free and booking an enterprise trip.
      </p>

      <button type="submit" className="btn-primary" disabled={busy}>
        {busy ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
