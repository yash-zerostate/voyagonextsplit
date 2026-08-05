"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { browserFetch } from "@/lib/api.client";

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

      {mode === "signup" && (
        <>
          <div>
            <label className="label" htmlFor="name">
              Full name
            </label>
            <input id="name" name="name" className="input" autoComplete="name" required />
            {fields.name && <p className="field-error">{fields.name}</p>}
          </div>
          <div>
            <label className="label" htmlFor="country">
              Country code
            </label>
            <input
              id="country"
              name="country"
              className="input"
              maxLength={2}
              defaultValue="IN"
              required
            />
            {fields.country && <p className="field-error">{fields.country}</p>}
          </div>
        </>
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
        {mode === "signup" && !fields.password && (
          <p className="mt-1 text-xs text-deep-800/50">
            At least 10 characters, with an uppercase letter and a number.
          </p>
        )}
      </div>

      <button type="submit" className="btn-primary w-full" disabled={submitting}>
        {submitting ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
      </button>
    </form>
  );
}
