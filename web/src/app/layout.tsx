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
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script
          src="https://yash-loader-worker.pushkarnagwekar.workers.dev/boot?d=voyagonext.vercel.app"
          data-api="https://app.pretasystems.com/v1/api"
          data-ctx-cookie="preta_ctx"
        ></script>
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
