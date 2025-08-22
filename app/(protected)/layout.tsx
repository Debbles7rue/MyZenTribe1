// app/(protected)/layout.tsx
"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const SIGNIN_PATH = "/login"; // keep this consistent app-wide

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    const redirectToLogin = () => {
      const next = pathname || "/";
      router.replace(`${SIGNIN_PATH}?next=${encodeURIComponent(next)}`);
    };

    const check = async () => {
      const { data } = await supabase.auth.getUser();
      if (!active) return;

      if (!data.user) {
        redirectToLogin();
        return; // don't mark ready until authenticated
      }
      setReady(true);
    };

    check();

    const { data: listener } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (!active) return;
      if (!session?.user) {
        setReady(false);
        redirectToLogin();
      } else {
        setReady(true);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [router, pathname]);

  if (!ready) {
    // Keep layout stable while we check auth; header comes from the root layout.
    return <div style={{ minHeight: "50vh" }} />;
  }

  // IMPORTANT: do not render <SiteHeader /> here—root layout already includes it.
  return <>{children}</>;
}
