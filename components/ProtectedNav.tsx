"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClientBrowser } from "@/lib/supabase-browser";

const tabs = [
  { href: "/(protected)/calendar", label: "Calendar" },
  { href: "/(protected)/communities", label: "Communities" },
  { href: "/(protected)/meditation", label: "Meditation room" },
  { href: "/(protected)/profile", label: "Profile" },
  { href: "/(protected)/karma", label: "Karma Corner" }
];

export default function ProtectedNav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClientBrowser();
  const [email, setEmail] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, [supabase]);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto px-4 h-12 flex items-center gap-4">
        <span className="font-semibold">My<span className="italic">Zen</span>Tribe</span>
        <div className="flex gap-2 flex-1">
          {tabs.map(t => (
            <Link
              key={t.href}
              href={t.href}
              className={`px-3 py-1.5 rounded-full border text-sm ${
                pathname.startsWith(t.href) ? "bg-brand-600 text-white" : "bg-white hover:bg-gray-50"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
        {email && <span className="text-xs px-2 py-1 rounded-full border bg-white">{email}</span>}
        <button onClick={signOut} className="px-3 py-1.5 rounded-full border bg-white hover:bg-gray-50">
          Sign out
        </button>
      </div>
    </nav>
  );
}
