import Link from "next/link";

import { SiteNav } from "@/components/SiteNav";
import { serverFetch } from "@/lib/api.server";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type Destination = {
  id: string;
  slug: string;
  name: string;
  country: string;
  nights: number;
  basePriceInr: number;
  rating: number;
  heroEmoji: string;
  summary: string;
};

export default async function HomePage() {
  // Two independent calls to the separate API — fired together, not in sequence.
  const [user, catalogue] = await Promise.all([
    getSessionUser(),
    serverFetch<{ destinations: Destination[] }>("/destinations"),
  ]);

  const featured = catalogue.ok ? catalogue.data.destinations.slice(0, 3) : [];

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav user={user} />

      <main className="flex-1">
        <section className="container-page py-20">
          <span className="pill">Small groups · 12 travellers max</span>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-tight text-deep-900 sm:text-5xl">
            Trips planned by people who have actually been there.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-deep-800/70">
            Every Voyago itinerary is run with a local guide, capped at twelve travellers, and
            priced with the transfers, permits and tips already in.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/destinations" className="btn-primary">
              Browse destinations
            </Link>
            {!user && (
              <Link href="/signup" className="btn-ghost">
                Create an account
              </Link>
            )}
          </div>
        </section>

        <section className="container-page pb-20">
          <div className="flex items-end justify-between">
            <h2 className="text-lg font-semibold text-deep-900">Departing soon</h2>
            <Link href="/destinations" className="text-sm text-clay-600 hover:text-clay-500">
              See all →
            </Link>
          </div>

          {!catalogue.ok ? (
            <p className="card mt-6 text-sm text-clay-600">{catalogue.message}</p>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {featured.map((destination) => (
                <article key={destination.id} className="card">
                  <div className="text-3xl">{destination.heroEmoji}</div>
                  <h3 className="mt-4 text-base font-semibold text-deep-900">{destination.name}</h3>
                  <p className="text-xs uppercase tracking-wider text-deep-800/50">
                    {destination.country} · {destination.nights} nights
                  </p>
                  <p className="mt-3 line-clamp-3 text-sm text-deep-800/70">{destination.summary}</p>
                  <p className="mt-4 text-sm font-semibold text-deep-900">
                    ₹{destination.basePriceInr.toLocaleString("en-IN")}
                    <span className="font-normal text-deep-800/50"> / person</span>
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-sand-200 py-8">
        <div className="container-page text-xs text-deep-800/50">
          © {new Date().getFullYear()} Voyago — a demo app. Frontend on :4002, API on :5002.
        </div>
      </footer>
    </div>
  );
}
