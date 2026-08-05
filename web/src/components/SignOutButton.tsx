"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { browserFetch } from "@/lib/api.client";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    // Cross-origin POST — credentials must be included for the API to see the
    // refresh cookie it needs to revoke, and for its clear-cookie headers to stick.
    await browserFetch("/auth/logout", { method: "POST" });
    setBusy(false);
    router.replace("/");
    router.refresh();
  }

  return (
    <button type="button" onClick={signOut} disabled={busy} className="btn-ghost">
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
