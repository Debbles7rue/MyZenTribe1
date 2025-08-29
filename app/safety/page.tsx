export const dynamic = "force-dynamic";

import Link from "next/link";

export default function SafetyPage() {
  return (
    <main className="min-h-screen p-6" style={{ background: "#F4ECFF" }}>
      <div className="max-w-3xl mx-auto bg-white border border-purple-100 rounded-2xl shadow p-6">
        <h1 className="text-2xl font-semibold mb-2 text-center">Safety & Disclaimers</h1>
        <p className="text-sm text-neutral-600 mb-4 text-center">
          Please read these important notes about using MyZenTribe.
        </p>

        <div className="prose prose-sm max-w-none text-neutral-800">
          <ul>
            <li><strong>We don’t monitor or vet all events.</strong> Use caution when attending any event—especially new or unverified ones.</li>
            <li><strong>Protect your information.</strong> Be careful sharing personal details. We’re not responsible for what others do with information you share.</li>
            <li><strong>Never send money to strangers.</strong> Scammers exist worldwide. We don’t support or endorse sending money to people you don’t know.</li>
          </ul>
          <p className="mt-4">
            You can configure your SOS/Emergency Contact in your profile and optionally enable quick
            actions to notify them via email or text if you feel unsafe at an event.
          </p>
        </div>

        <div className="flex justify-center gap-3 mt-6">
          <Link href="/safety/waiver" className="btn btn-brand">Open Safety Waiver</Link>
          <Link href="/" className="btn">Back to Home</Link>
        </div>
      </div>
    </main>
  );
}
