import "./globals.css";
import { Inter } from "next/font/google";
import Link from "next/link";
import Image from "next/image";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "MyZenTribe",
  description:
    "A spiritual wellness community for events, meditation, gratitude, and kind connections.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <header className="flex items-center justify-between px-6 py-4 shadow-md">
          <div className="flex items-center space-x-3">
            <Link href="/">
              <Image
                src="/logo-myzentribe.png"
                alt="MyZenTribe logo"
                width={50}
                height={50}
                priority
              />
            </Link>
            <Link href="/" className="text-2xl font-semibold italic">
              MyZenTribe
            </Link>
          </div>
          <nav className="flex space-x-6">
            <Link href="/events">Events</Link>
            <Link href="/communities">Communities</Link>
            <Link href="/meditation">Meditation</Link>
            <Link href="/gratitude">Gratitude</Link>
            <Link href="/karma-corner">Karma Corner</Link>
            <Link href="/whats-new">What’s New</Link>
            <Link href="/login">Login</Link>
          </nav>
        </header>
        <main className="px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
