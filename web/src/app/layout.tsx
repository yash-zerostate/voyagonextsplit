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
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
