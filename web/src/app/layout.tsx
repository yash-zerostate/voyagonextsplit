import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Voyago — small-group trips, properly planned",
    template: "%s · Voyago",
  },
  description:
    "Voyago runs small-group itineraries with local guides, honest pricing and no filler days.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Preta loader. The signed context JWT travels in the `preta_ctx` cookie,
            which the API sets — it reaches this origin through the /api-proxy
            rewrite, so nothing here reads cookies and pages stay cacheable. */}
        {/* Warm the loader connection early. No crossOrigin: a plain <script src> uses a
            credentialed connection, and a crossorigin preconnect would warm the wrong pool. */}
        <link rel="preconnect" href="https://loader-v1.pretasystems.com" />
        {/* Two tags instead of /boot, so the preload scanner starts both with the document
            and nothing waits on /boot to name them. Order matters: the bundle reads
            window.PRETA_CONFIG as it initialises, so config must execute first. No async
            (bundle could run before config) and no defer (runs too late to paint early).
            data-* belong on the loader tag — the bundle finds them via document.currentScript. */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="https://loader-v1.pretasystems.com/config?d=voyagonext.vercel.app"></script>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script
          src="https://loader-v1.pretasystems.com/l/pretaloader.js?d=voyagonext.vercel.app"
          data-api="https://app.pretasystems.com/v1/api"
          data-ctx-cookie="preta_ctx"
          data-debug="true"
        ></script>
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
