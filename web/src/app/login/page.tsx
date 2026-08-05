import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/AuthForm";
import { SiteNav } from "@/components/SiteNav";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Sign in" };

function safeNext(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/bookings";
  return value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reason?: string }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);

  if (await getSessionUser()) redirect(next);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav user={null} />

      <main className="container-page flex flex-1 items-center justify-center py-16">
        <div className="w-full max-w-md">
          <div className="card">
            <h1 className="text-xl font-semibold text-deep-900">Welcome back</h1>
            <p className="mt-1 text-sm text-deep-800/60">
              Try <code>pro@example.com</code> / <code>Password123!</code>
            </p>

            {params.reason === "session_expired" && (
              <p className="mt-4 rounded-2xl border border-clay-500/30 bg-clay-500/10 px-4 py-3 text-sm text-clay-600">
                Your session expired. Please sign in again.
              </p>
            )}
            {params.reason === "api_unreachable" && (
              <p className="mt-4 rounded-2xl border border-clay-500/30 bg-clay-500/10 px-4 py-3 text-sm text-clay-600">
                The API is not responding. Start it with <code>npm run dev</code> in{" "}
                <code>api/</code>.
              </p>
            )}

            <div className="mt-6">
              <AuthForm mode="login" next={next} />
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-deep-800/60">
            New here?{" "}
            <Link href="/signup" className="text-clay-600 hover:text-clay-500">
              Create an account
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
