"use client";

export const dynamic = "force-dynamic";

import { Suspense } from "react";
import WaiverInner from "./waiver.client";

/**
 * Wrap the client component (which uses useSearchParams) in Suspense.
 */
export default function WaiverPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center p-6">Loading…</div>}>
      <WaiverInner />
    </Suspense>
  );
}
