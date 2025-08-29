// components/FirstRunGate.tsx
"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { TERMS_VERSION } from "@/lib/terms";

/**
 * Client-only gate that redirects signed-in users who have not:
 *  - accepted the latest TERMS_VERSION  -> /legal/terms
 *  - acknowledged safety waiver         -> /safety/waiver
 *
 * Runs globally from app/layout.tsx. No conditional hooks; single effect.
 */
export default function FirstRunGate() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let active = true;

    // Pages where we should NOT gate to avoid loops.
    const PASS_THROUGH_PREFIXES = [
      "/login",
      "/signin",
      "/signup",
      "/legal/terms",
      "/safety",
      "/safety/waiver",
      "/api", // any api routes
    ];

    const isPassThrough = PASS_THROUGH_PREFIXES.some((p) =>
      pathname?.startsWith(p)
    );

    const run = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const uid = data.user?.id;
        if (!active || !uid) return; // only gate signed-in users

        if (isPassThrough) return; // don't interfere on legal/safety/auth pages

        // Fetch minimum profile fields we need
        const { data: prof } = await supabase
          .from("profiles")
          .select("terms_version, terms_accepted_at, safety_ack_at")
          .eq("id", uid)
          .maybeSingle();

        // If profile missing, don't block (user can still complete onboarding later)
        if (!prof) return;

        // Gate 1: Terms up-to-date?
        const termsOk =
          prof.terms_accepted_at && String(prof.terms_version) === String(TERMS_VERSION);
        if (!termsOk) {
          const next = pathname || "/";
          router.replace(`/legal/terms?next=${encodeURIComponent(next)}`);
          return;
        }

        // Gate 2: Safety waiver?
        if (!prof.safety_ack_at) {
          const next = pathname || "/";
          router.replace(`/safety/waiver?next=${encodeURIComponent(next)}`);
          return;
        }
      } catch {
        // Best-effort: never block the app on errors
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [pathname, router]);

  return null;
}
