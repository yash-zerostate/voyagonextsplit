import type { Metadata } from "next";
import Link from "next/link";

import { BookingDialog } from "@/components/BookingDialog";
import { SiteNav } from "@/components/SiteNav";
import { serverFetch } from "@/lib/api.server";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Destinations" };

type Destination = {
  id: string;
  slug: string;
  name: string;
  country: string;
  region: string;
  summary: string;
  nights: number;
  basePriceInr: number;
  rating: number;
  heroEmoji: string;
  minimumTier: "explorer" | "voyager" | "elite";
  seatsLeft: number;
};

const TIER_RANK = { explorer: 0, voyager: 1, elite: 2 } as const;

export default async function DestinationsPage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string; q?: string }>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  if (params.region) query.set("region", params.region);
  if (params.q) query.set("q", params.q);

  const [user, catalogue] = await Promise.all([
    getSessionUser(),
    serverFetch<{ destinations: Destination[]; regions: string[] }>(
      `/destinations${query.toString() ? `?${query}` : ""}`,
    ),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav user={user} />

      <main className="container-page flex-1 py-12">
        <h1 className="text-2xl font-semibold text-deep-900">Every current itinerary</h1>
        <p className="mt-2 text-sm text-deep-800/60">
          Filtering happens on the API, not in the browser — the list you see is the list it sent.
        </p>

        {!catalogue.ok ? (
          <p className="card mt-8 text-sm text-clay-600">{catalogue.message}</p>
        ) : (
          <>
            <form className="mt-8 flex flex-wrap items-end gap-3" action="/destinations">
              <div className="w-64">
                <label className="label" htmlFor="q">
                  Search
                </label>
                <input
                  id="q"
                  name="q"
                  className="input"
                  placeholder="Kyoto, Norway…"
                  defaultValue={params.q ?? ""}
                />
              </div>
              <div className="w-48">
                <label className="label" htmlFor="region">
                  Region
                </label>
                <select
                  id="region"
                  name="region"
                  className="input"
                  defaultValue={params.region ?? "all"}
                >
                  <option value="all">All regions</option>
                  {catalogue.data.regions.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn-primary">
                Apply
              </button>
              {(params.q || params.region) && (
                <Link href="/destinations" className="btn-ghost">
                  Clear
                </Link>
              )}
            </form>

            {catalogue.data.destinations.length === 0 ? (
              <p className="card mt-8 text-sm text-deep-800/70">
                Nothing matches that search. Try a different region.
              </p>
            ) : (
              <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {catalogue.data.destinations.map((destination) => {
                  const locked =
                    !user || TIER_RANK[user.tier] < TIER_RANK[destination.minimumTier];
                  return (
                    <article key={destination.id} className="card flex flex-col">
                      <div className="flex items-start justify-between">
                        <span className="text-3xl">{destination.heroEmoji}</span>
                        <span className="pill">★ {destination.rating.toFixed(1)}</span>
                      </div>
                      <h2 className="mt-4 text-base font-semibold text-deep-900">
                        {destination.name}
                      </h2>
                      <p className="text-xs uppercase tracking-wider text-deep-800/50">
                        {destination.country} · {destination.region} · {destination.nights} nights
                      </p>
                      <p className="mt-3 flex-1 text-sm leading-relaxed text-deep-800/70">
                        {destination.summary}
                      </p>

                      <div className="mt-5 flex items-end justify-between">
                        <div>
                          <p className="text-sm font-semibold text-deep-900">
                            ₹{destination.basePriceInr.toLocaleString("en-IN")}
                          </p>
                          <p className="text-[11px] text-deep-800/50">
                            {destination.seatsLeft} seats left
                          </p>
                        </div>

                        {user ? (
                          locked ? (
                            <span className="pill">{destination.minimumTier} only</span>
                          ) : (
                            <BookingDialog
                              destinationId={destination.id}
                              destinationName={destination.name}
                              pricePerPerson={destination.basePriceInr}
                              seatsLeft={destination.seatsLeft}
                            />
                          )
                        ) : (
                          <Link href="/login?next=/destinations" className="btn-ghost text-xs">
                            Sign in to book
                          </Link>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
