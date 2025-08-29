export const dynamic = "force-dynamic";

import Link from "next/link";
import SOSButton from "@/components/SOSButton";
import { getEmergencySettings } from "@/lib/sos";
import { Suspense } from "react";

// Small client wrapper to check settings and show the SOS button
function SafetyContent() {
  // Use a client island via async/await inside a wrapper component
  // Next 14 supports async server components, but SOSButton is client-only.
  return (
    <Suspense fallback={<div className="mt-4 text-sm text-neutral-600">Loading…</div>}>
      {/* @ts-expect-error Async Server Component boundary */}
      <SafetyInner />
    </Suspense>
  );
}

// Server component that fetches settings, decides what to render (SSR-safe)
async function SafetyInner() {
  // We can’t call getEmergencySettings() server-side (it uses auth.getUser())
  // so we’ll render a simple notice + client SOS button. The button itself
  // will verify auth client-side. Instructions remain visible.
  return (
    <>
      <div className="prose prose-sm max-w-none text-neutral-800">
        <ul>
          <li><strong>We don’t monitor or vet all events.</strong> Use caution when attending any event—especially new or unverified ones.</li>
          <li><strong>Protect your information.</strong> Be careful sharing personal details. We’re not responsible for what others do with information you share.</li>
          <li><strong>Never send money to strangers.</strong> Scammers exist worldwide. We don’t support or endorse sending money to people you don’t know.</li>
        </ul>
        <p className="mt-4">
          Configure your emergency contact on your <a href="/profile" className="underline">Profile</a> — then use the SOS button below if you feel unsafe.
        </p>
      </div>

      <div className="mt-6">
        <SOSButton />
      </div>
    </>
  );
}

export default function SafetyPage() {
  return (
    <main className="min-h-screen p-6" style={{ background: "#F4ECFF" }}>
      <div className="max-w-3xl mx-auto bg-white border border-purple-100 rounded-2xl shadow p-6">
        <h1 className="text-2xl font-semibold mb-2 text-center">Safety & Disclaimers</h1>
        <p className="text-sm text-neutral-600 mb-4 text-center">
          Please read these important notes about using MyZenTribe.
        </p>

        <SafetyContent />

        <div className="flex justify-center gap-3 mt-8">
          <Link href="/" className="btn">Back to Home</Link>
        </div>
      </div>
    </main>
  );
}
