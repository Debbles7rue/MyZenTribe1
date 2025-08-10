import Link from "next/link";
import { MotionDiv } from "@/components/motion";
import LogoAura from "@/components/logo-aura";

export default function HomePage() {
  return (
    <div className="grid md:grid-cols-2 gap-10 items-center">
      <MotionDiv className="space-y-6">
        <LogoAura />
        <h1 className="text-4xl font-bold tracking-tight">
          Feel the vibe, find your tribe.
        </h1>
        <p className="text-lg opacity-80">
          A spiritual wellness community for events, meditation, gratitude,
          and kind connections.
        </p>
        <div className="flex gap-3">
          <Link href="/events" className="px-4 py-2 rounded-2xl bg-black text-white">
            Explore Events
          </Link>
          <Link href="/auth" className="px-4 py-2 rounded-2xl border">
            Join / Sign in
          </Link>
        </div>
      </MotionDiv>

      <MotionDiv className="rounded-2xl p-6 border bg-white/70 shadow-lg">
        <h2 className="font-semibold mb-2">Live Meditation Pulse (24h)</h2>
        <div className="h-40 rounded-xl border grid place-items-center">
          <span className="text-sm opacity-70">Coming soon: 24h activity graph</span>
        </div>
        <p className="text-sm mt-3 opacity-80">
          Our goal: a continuous 24/7 flow of healing energy being sent into the world.
        </p>
      </MotionDiv>
    </div>
  );
}
