import type { NextConfig } from "next";

/**
 * Where the Express API actually lives. Used for server-to-server calls and,
 * when the proxy below is active, as the rewrite target.
 */
const API_ORIGIN =
  process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5002";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // No next/image anywhere in this app, and the optimizer drags in
  // sharp/libvips — the source of every remaining `npm audit` advisory.
  // Disabling it drops that surface instead of shipping an unused vulnerable path.
  images: { unoptimized: true },

  /**
   * Same-origin proxy, for the deployment where the site and the API sit on
   * DIFFERENT registrable domains (e.g. Vercel `*.vercel.app` + Render
   * `*.onrender.com`).
   *
   * Why it is needed: the API's auth cookies are scoped to the API's host. A
   * browser will happily send them to the API cross-site (`SameSite=None;
   * Secure`), but it will never send them to the *Next.js server* — so Server
   * Components and middleware would see no session at all, and `/bookings`
   * could not be rendered on the server.
   *
   * Routing browser traffic through `/api-proxy/*` puts the cookies on the
   * site's own origin, which fixes SSR and middleware without changing a line
   * of application code. Turn it on by setting, in the frontend deployment:
   *
   *     NEXT_PUBLIC_API_URL=/api-proxy
   *     API_INTERNAL_URL=https://voyago-api.onrender.com
   *
   * If instead the site and API share a parent domain (app.acme.com +
   * api.acme.com), skip the proxy: point NEXT_PUBLIC_API_URL straight at the
   * API and set COOKIE_DOMAIN=.acme.com on the backend.
   */
  async rewrites() {
    return [{ source: "/api-proxy/:path*", destination: `${API_ORIGIN}/:path*` }];
  },
};

export default nextConfig;
