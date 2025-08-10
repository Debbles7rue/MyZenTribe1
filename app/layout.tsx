import "./globals.css";
import type { ReactNode } from "react";
import Link from "next/link";
import BrandLogo from "@/components/brand-logo"; // ← uses /public/logo.svg (or .png)

export const metadata = {
  title: "MyZenTribe",
  description: "Feel the vibe, find your tribe.",
};

// Dedication: bringing people together for healing, love, support, and fun. ✨

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="sticky top-0 z-40 border-b bg-white/70 backdrop-blur">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3">
              <BrandLogo />
            </Link>
            <nav className="ml-auto flex gap-4 text-sm">
              <Link href="/events">Events</Link>
              <Link href="/communities">Communities</Link>
              <Link href="/meditation">Meditation</Link>
              <Link href="/journal">Gratitude</Link>
              <Link href="/karma">Karma Corner</Link>
              <Link href="/whats-new">What’s New</Link>
              <Link href="/auth">Login</Link>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>

        <footer className="mt-20 border-t py-8 text-center text-xs opacity-70">
          © {new Date().getFullYear()} MyZenTribe — All love, no spam.
        </footer>
      </body>
    </html>
  );
}
