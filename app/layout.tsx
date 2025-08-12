import type { Metadata } from "next";
import "./globals.css";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "MyZenTribe",
  description: "Feel the vibe, find your tribe.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main className="page-wrap">{children}</main>
      </body>
    </html>
  );
}
