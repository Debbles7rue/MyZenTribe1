import type { Metadata } from "next";
import "./globals.css";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";

export const metadata: Metadata = {
  title: "MyZenTribe",
  description: "Feel the vibe, find your tribe.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* No Header here — public pages stay clean, nav is only in (protected)/layout.tsx */}
        <main className="page-wrap">{children}</main>
      </body>
    </html>
  );
}
