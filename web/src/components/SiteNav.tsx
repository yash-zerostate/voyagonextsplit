import Link from "next/link";

import { SignOutButton } from "@/components/SignOutButton";
import type { SessionUser } from "@/lib/session";

export function SiteNav({ user }: { user: SessionUser | null }) {
  return (
    <header className="border-b border-sand-200 bg-sand-50/90 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-base font-semibold tracking-tight text-deep-900">
            Voyago<span className="text-clay-500">.</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-deep-800/70 sm:flex">
            <Link href="/destinations" className="transition hover:text-deep-900">
              Destinations
            </Link>
            {user && (
              <Link href="/bookings" className="transition hover:text-deep-900">
                My trips
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="hidden text-xs text-deep-800/60 sm:inline">
                {user.name} · <span className="uppercase">{user.tier}</span>
              </span>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-deep-800/70 transition hover:text-deep-900">
                Sign in
              </Link>
              <Link href="/signup" className="btn-primary">
                Join Voyago
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
