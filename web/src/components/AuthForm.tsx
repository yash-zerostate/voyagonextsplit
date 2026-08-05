"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { browserFetch } from "@/lib/api.client";

const PLAN_OPTIONS = ["free", "pro", "enterprise"] as const;
const ROLE_OPTIONS = ["developer", "security", "marketing", "compliance"] as const;
const RISK_SCORE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next: string }) {
  const router = useRouter();
  const [fields, setFields] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFields({});
    setFormError(null);
    setSubmitting(true);

    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    const result = await browserFetch<{ user: unknown }>(
      mode === "login" ? "/auth/login" : "/auth/register",
      { method: "POST", body: JSON.stringify(payload) },
    );

    setSubmitting(false);

    if (!result.ok) {
      setFields(result.fields ?? {});
      setFormError(result.message);
      return;
    }

    // The API's Set-Cookie headers are already applied to the browser; re-render
    // the server tree so it sees the new session.
    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {formError && (
        <p className="rounded-2xl border border-clay-500/30 bg-clay-500/10 px-4 py-3 text-sm text-clay-600">
          {formError}
        </p>
      )}

      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input id="email" name="email" type="email" className="input" autoComplete="email" required />
        {fields.email && <p className="field-error">{fields.email}</p>}
      </div>

      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
        />
        {fields.password && <p className="field-error">{fields.password}</p>}
      </div>

      {mode === "signup" && (
        <>
          <div>
            <label className="label" htmlFor="name">
              Full name <span className="normal-case text-deep-800/40">(optional)</span>
            </label>
            <input id="name" name="name" className="input" autoComplete="name" />
            {fields.name && <p className="field-error">{fields.name}</p>}
          </div>

          <div className="rounded-2xl border border-sand-200 bg-sand-100/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-deep-700/70">
              Profile attributes
            </p>
            <p className="mt-1 text-xs text-deep-800/50">
              All optional — pick any combination to create a test account with those attributes.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="plan">
                  Plan
                </label>
                <select id="plan" name="plan" className="input" defaultValue="free">
                  {PLAN_OPTIONS.map((plan) => (
                    <option key={plan} value={plan}>
                      {plan}
                    </option>
                  ))}
                </select>
                {fields.plan && <p className="field-error">{fields.plan}</p>}
              </div>

              <div>
                <label className="label" htmlFor="role">
                  Role
                </label>
                <select id="role" name="role" className="input" defaultValue="developer">
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                {fields.role && <p className="field-error">{fields.role}</p>}
              </div>

              <div>
                <label className="label" htmlFor="riskScore">
                  Risk score
                </label>
                <select id="riskScore" name="riskScore" className="input" defaultValue="1">
                  {RISK_SCORE_OPTIONS.map((score) => (
                    <option key={score} value={score}>
                      {score}
                    </option>
                  ))}
                </select>
                {fields.riskScore && <p className="field-error">{fields.riskScore}</p>}
              </div>

              <div>
                <label className="label" htmlFor="active">
                  Active
                </label>
                <select id="active" name="active" className="input" defaultValue="yes">
                  <option value="yes">yes</option>
                  <option value="no">no</option>
                </select>
                {fields.active && <p className="field-error">{fields.active}</p>}
              </div>
            </div>

            <p className="mt-3 text-xs text-deep-800/50">
              The plan you pick decides which itineraries you can book — the API enforces it, not
              the button.
            </p>
          </div>
        </>
      )}

      <button type="submit" className="btn-primary w-full" disabled={submitting}>
        {submitting ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
      </button>
    </form>
  );
}
