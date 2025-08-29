"use client";

import Link from "next/link";

const DONATE_URL = process.env.NEXT_PUBLIC_DONATE_URL || "";

export default function DonationsPage() {
  return (
    <main className="min-h-screen p-6" style={{ background: "#F4ECFF" }}>
      <div className="mx-auto max-w-2xl rounded-2xl border border-purple-100 bg-white p-6 shadow">
        <h1 className="text-2xl font-semibold mb-2">Donations</h1>
        <p className="text-sm text-neutral-600 mb-4">
          If you’d like to support the mission, you can donate below. Thank you for helping us bring people together.
        </p>

        {DONATE_URL ? (
          <a className="btn btn-brand" href={DONATE_URL} target="_blank" rel="noreferrer">Donate</a>
        ) : (
          <div className="rounded-lg border p-3 text-sm text-neutral-700 bg-violet-50">
            <p className="mb-2"><strong>Setup needed:</strong></p>
            <p>
              Add <code>NEXT_PUBLIC_DONATE_URL</code> to your environment (e.g., a PayPal/Stripe link), then redeploy.
            </p>
          </div>
        )}

        <div className="mt-6">
          <Link href="/" className="btn">Back to Home</Link>
        </div>
      </div>
    </main>
  );
}
