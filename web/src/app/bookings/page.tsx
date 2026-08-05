import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CancelBookingButton } from "@/components/CancelBookingButton";
import { SiteNav } from "@/components/SiteNav";
import { serverFetch } from "@/lib/api.server";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "My trips" };

type Booking = {
  id: string;
  reference: string;
  travellers: number;
  departureDate: string;
  totalInr: number;
  status: "confirmed" | "cancelled" | "completed";
  destination: { name: string; country: string; heroEmoji: string; nights: number } | null;
};

export default async function BookingsPage() {
  const user = await getSessionUser();
  // Middleware routes unauthenticated visitors away, but the API is the real
  // gate — if it says no, so do we.
  if (!user) redirect("/login?next=/bookings");

  const result = await serverFetch<{ bookings: Booking[] }>("/bookings");
  const bookings = result.ok ? result.data.bookings : [];

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav user={user} />

      <main className="container-page flex-1 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-deep-900">Your trips</h1>
            <p className="mt-1 text-sm text-deep-800/60">
              {user.loyaltyPoints.toLocaleString("en-IN")} loyalty points ·{" "}
              <span className="uppercase">{user.tier}</span> tier
            </p>
          </div>
          <Link href="/destinations" className="btn-primary">
            Book another trip
          </Link>
        </div>

        {!result.ok && (
          <p className="card mt-8 text-sm text-clay-600">{result.message}</p>
        )}

        {result.ok && bookings.length === 0 ? (
          <p className="card mt-8 text-sm text-deep-800/70">
            No trips yet. Pick something from the destinations page.
          </p>
        ) : (
          <ul className="mt-8 space-y-4">
            {bookings.map((booking) => (
              <li key={booking.id} className="card flex flex-wrap items-center gap-6">
                <span className="text-3xl">{booking.destination?.heroEmoji ?? "🧳"}</span>
                <div className="min-w-[200px] flex-1">
                  <h2 className="text-base font-semibold text-deep-900">
                    {booking.destination?.name ?? "Trip"}
                  </h2>
                  <p className="text-xs uppercase tracking-wider text-deep-800/50">
                    {booking.reference} · {booking.destination?.country} ·{" "}
                    {new Date(booking.departureDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  <p className="mt-2 text-sm text-deep-800/70">
                    {booking.travellers} traveller{booking.travellers === 1 ? "" : "s"} · ₹
                    {booking.totalInr.toLocaleString("en-IN")}
                  </p>
                </div>
                <span className="pill">{booking.status}</span>
                {booking.status === "confirmed" && <CancelBookingButton bookingId={booking.id} />}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
