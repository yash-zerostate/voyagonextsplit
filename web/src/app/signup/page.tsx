import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/AuthForm";
import { SiteNav } from "@/components/SiteNav";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Join Voyago" };

export default async function SignupPage() {
  if (await getSessionUser()) redirect("/bookings");

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav user={null} />

      <main className="container-page flex flex-1 items-center justify-center py-16">
        <div className="w-full max-w-md">
          <div className="card">
            <h1 className="text-xl font-semibold text-deep-900">Join Voyago</h1>
            <p className="mt-1 text-sm text-deep-800/60">
              Free plan gets the open itineraries. Pro and Enterprise unlock the rest.
            </p>
            <div className="mt-6">
              <AuthForm mode="signup" next="/destinations" />
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-deep-800/60">
            Already a member?{" "}
            <Link href="/login" className="text-clay-600 hover:text-clay-500">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
