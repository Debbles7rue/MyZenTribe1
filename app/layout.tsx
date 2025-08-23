// app/layout.tsx
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./globals.css";
import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "MyZenTribe",
  description: "Meditation • Community • Presence",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Leaflet CSS for maps */}
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body>
        {/* Single global header (from components/SiteHeader.tsx) */}
        <SiteHeader />

        {/* Page content */}
        <main className="page-wrap">{children}</main>
      </body>
    </html>
  );
}
