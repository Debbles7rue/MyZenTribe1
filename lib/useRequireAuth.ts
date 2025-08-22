"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export function useRequireAuth(redirectTo: string = "/login") {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!alive) return;

      const u = data?.user ?? null;
      setUserId(u?.id ?? null);
      setReady(true);

      if (!u) {
        const qs = `?next=${encodeURIComponent(pathname || "/")}`;
        router.replace(`${redirectTo}${qs}`);
      }
    })();
    return () => {
      alive = false;
    };
  }, [router, pathname, redirectTo]);

  return { ready, userId };
}
