// app/login/page.tsx - REPLACE ENTIRE FILE
"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Preserve any ?next= parameter when redirecting
    const next = searchParams.get("next");
    const redirectUrl = next ? `/signin?next=${encodeURIComponent(next)}` : "/signin";
    router.replace(redirectUrl);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="text-center">
        <div className="inline-flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          <span className="text-gray-600">Redirecting to sign in...</span>
        </div>
      </div>
    </div>
  );
}
