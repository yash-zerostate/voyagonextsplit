"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { browserFetch } from "@/lib/api.client";

export function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    setBusy(true);
    setError(null);

    let result = await browserFetch(`/bookings/${bookingId}/cancel`, { method: "POST" });

    if (!result.ok && result.status === 401) {
      const refreshed = await browserFetch("/auth/refresh", { method: "POST" });
      if (refreshed.ok) {
        result = await browserFetch(`/bookings/${bookingId}/cancel`, { method: "POST" });
      } else {
        router.push("/login?next=/bookings&reason=session_expired");
        return;
      }
    }

    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="text-right">
      <button type="button" onClick={cancel} disabled={busy} className="btn-ghost text-xs">
        {busy ? "Cancelling…" : "Cancel"}
      </button>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
