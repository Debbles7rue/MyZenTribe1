"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedNav from "@/components/ProtectedNav";
import { supabase } from "@/lib/supabaseClient";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function check() {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!data.user) router.replace("/");
      else setAuthed(true);
      setReady(true);
    }
    check();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (!mounted) return;
      if (!session?.user) router.replace("/");
      else setAuthed(true);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  if (!ready || !authed) return null;

  return (
    <div className="min-h-screen">
      <ProtectedNav />
      {children}
    </div>
  );
}
