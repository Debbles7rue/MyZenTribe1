"use client";

export const dynamic = "force-dynamic";

import { Suspense } from "react";
import TermsInner from "./terms.client";

/**
 * Wrap the client component (which uses useSearchParams) in Suspense
 * to satisfy Next’s prerendering constraint.
 */
export default function TermsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center p-6">Loading…</div>}>
      <TermsInner />
    </Suspense>
  );
}
