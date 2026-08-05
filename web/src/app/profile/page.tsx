import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProfileForm } from "@/components/ProfileForm";
import { SiteNav } from "@/components/SiteNav";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/profile");

  const attributes: Array<[string, string]> = [
    ["Name", user.name],
    ["Email", user.email],
    ["Active", user.active ? "yes" : "no"],
    ["Plan", user.plan],
    ["Role", user.role],
    ["Risk score", String(user.riskScore)],
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav user={user} />

      <main className="container-page flex-1 py-12">
        <h1 className="text-2xl font-semibold text-deep-900">Your profile</h1>
        <p className="mt-1 text-sm text-deep-800/60">
          These attributes come from the API, not from this app — it holds no user state of its own.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[320px_1fr]">
          <section className="card h-fit">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-deep-700/70">
              Current values
            </h2>
            <dl className="mt-4 space-y-3">
              {attributes.map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-4">
                  <dt className="text-xs uppercase tracking-wider text-deep-800/50">{label}</dt>
                  <dd className="truncate text-sm text-deep-900">{value}</dd>
                </div>
              ))}
              <div className="flex items-baseline justify-between gap-4 border-t border-sand-200 pt-3">
                <dt className="text-xs uppercase tracking-wider text-deep-800/50">User id</dt>
                <dd className="truncate font-mono text-xs text-deep-800/60">{user.id}</dd>
              </div>
            </dl>
          </section>

          <section>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-deep-700/70">
              Edit
            </h2>
            <ProfileForm user={user} />
          </section>
        </div>
      </main>
    </div>
  );
}
