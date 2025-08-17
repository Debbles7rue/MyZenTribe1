// app/layout.tsx
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./globals.css";
import Link from "next/link";

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
        {/* Global app tabs */}
        <header
          className="w-full"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            backdropFilter: "blur(6px)",
            background: "linear-gradient(#F4EBFF, #ffffff)",
            borderBottom: "1px solid #eadfff",
          }}
        >
          <nav
            className="container-app"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 0",
              gap: 12,
            }}
          >
            <Link href="/" className="link" style={{ fontWeight: 700 }}>
              MyZenTribe
            </Link>
            <div className="flex items-center gap-2">
              <Link className="btn btn-neutral" href="/profile">Profile</Link>
              <Link className="btn btn-neutral" href="/calendar">Calendar</Link>
              <Link className="btn btn-neutral" href="/communities">Communities</Link>
              <Link className="btn btn-neutral" href="/meditation">Meditation</Link>
            </div>
          </nav>
        </header>

        <div className="page-wrap">{children}</div>
      </body>
    </html>
  );
}
