"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { browserFetch } from "@/lib/api.client";

/**
 * Books a trip against the separate API. On a 401 it retries once through
 * /auth/refresh — the access token is only 15 minutes old, and a user sitting on
 * a page longer than that should not be punished with a failed click.
 */
export function BookingDialog({
  destinationId,
  destinationName,
  pricePerPerson,
  seatsLeft,
}: {
  destinationId: string;
  destinationName: string;
  pricePerPerson: number;
  seatsLeft: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [travellers, setTravellers] = useState(1);
  const [departureDate, setDepartureDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    const body = JSON.stringify({ destinationId, travellers, departureDate });
    let result = await browserFetch("/bookings", { method: "POST", body });

    if (!result.ok && result.status === 401) {
      const refreshed = await browserFetch("/auth/refresh", { method: "POST" });
      if (refreshed.ok) {
        result = await browserFetch("/bookings", { method: "POST", body });
      } else {
        router.push("/login?next=/destinations&reason=session_expired");
        return;
      }
    }

    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setOpen(false);
    router.push("/bookings");
    router.refresh();
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-accent text-xs">
        Book
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-deep-900/40 p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
        <h2 className="text-base font-semibold text-deep-900">{destinationName}</h2>
        <p className="mt-1 text-xs text-deep-800/60">
          ₹{pricePerPerson.toLocaleString("en-IN")} per person · {seatsLeft} seats left
        </p>

        {error && (
          <p className="mt-4 rounded-2xl border border-clay-500/30 bg-clay-500/10 px-4 py-3 text-sm text-clay-600">
            {error}
          </p>
        )}

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <label className="label" htmlFor="travellers">
              Travellers
            </label>
            <input
              id="travellers"
              type="number"
              min={1}
              max={Math.min(9, seatsLeft)}
              value={travellers}
              onChange={(event) => setTravellers(Number(event.target.value))}
              className="input"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="departureDate">
              Departure date
            </label>
            <input
              id="departureDate"
              type="date"
              value={departureDate}
              onChange={(event) => setDepartureDate(event.target.value)}
              className="input"
              required
            />
          </div>

          <p className="text-sm text-deep-800/70">
            Total:{" "}
            <span className="font-semibold text-deep-900">
              ₹{(pricePerPerson * travellers).toLocaleString("en-IN")}
            </span>
          </p>

          <div className="flex gap-3">
            <button type="submit" className="btn-accent flex-1" disabled={busy}>
              {busy ? "Booking…" : "Confirm booking"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
