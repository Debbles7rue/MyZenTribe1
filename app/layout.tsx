import "./globals.css";
import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "MyZenTribe",
  description:
    "A spiritual wellness community for events, meditation, gratitude, and kind connections.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gradient-to-br from-[#faf6ff] via-[#f8fff6] to-[#f0f9ff] text-neutral-900">
        <header className="sticky top-0 z-40 border-b bg-white/70 backdrop-blur">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/logo-myzentribe.png"
                alt="MyZenTribe logo"
                width={44}
                height={44}
                priority
              />
              <span className="text-xl font-semibold italic">
                My<span className="not-italic">Zen</span>
                <span className="italic">Tribe</span>
              </span>
            </Link>

            {/* Keep nav minimal until features are ready */}
            <nav className="ml-auto flex gap-4 text-sm">
              <Link href="/" className="hover:opacity-80">Home</Link>
              <Link href="/auth" className="hover:opacity-80">Sign up / Sign in</Link>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>

        <footer className="mt-20 border-t py-8 text-center text-xs opacity-70">
          © {new Date().getFullYear()} MyZenTribe — All love, no spam.
        </footer>
      </body>
    </html>
  );
}
