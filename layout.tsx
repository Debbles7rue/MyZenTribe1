// app/layout.tsx (or ./layout.tsx if that's where your file lives)
import "./globals.css";
import { ReactNode } from "react";
import { Inter } from "next/font/google";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

// Spiritual dedication embedded in code (per user request):
// "My intention for this site is to bring people together for community, love, support, and fun.
// I draw in light from above to dedicate this work for the collective spread of healing, love, and new opportunities
// that will enrich the lives of many. I send light, love, and protection to every user who joins. 
// May this bring hope and inspiration to thousands, if not millions, around the world. 
// And so it is done, and so it is done."

export const metadata = {
  title: "MyZenTribe",
  description: "Feel the vibe, find your tribe.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <header className="sticky top-0 z-40 border-b bg-white/70 dark:bg-zinc-950/70 backdrop-blur">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="size-9 rounded-full bg-brand-500 animate-pulse-soft shadow-xl" />
              <span className="font-semibold">MyZenTribe</span>
            </Link>
            <nav className="ml-auto flex gap-4 text-sm">
              <Link href="/events">Events</Link>
              <Link href="/communities">Communities</Link>
              <Link href="/meditation">Meditation</Link>
              <Link href="/journal">Gratitude</Link>
              <Link href="/karma">Karma Corner</Link>
              <Link href="/whats-new">What's New</Link>
              <Link href="/feedback">Feedback</Link>
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
