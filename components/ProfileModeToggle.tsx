"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ProfileModeToggle() {
  const [mode, setMode] = useState<"personal"|"business">("personal");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("profile_mode")
        .eq("id", user.id)
        .maybeSingle();
      if (data?.profile_mode === "business") setMode("business");
    })();
  }, []);

  async function updateMode(next: "personal"|"business") {
    if (next === mode) return;
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").update({ profile_mode: next }).eq("id", user.id);
    setMode(next);
    setBusy(false);
  }

  return (
    <div className="mt-3 flex items-center gap-2">
      <span className="text-sm text-zinc-600 dark:text-zinc-400">Profile:</span>
      <button
        className={`rounded-xl px-3 py-1 text-sm border ${mode==="personal" ? "bg-black text-white dark:bg-white dark:text-black" : ""}`}
        onClick={() => updateMode("personal")}
        disabled={busy}
      >
        Personal
      </button>
      <button
        className={`rounded-xl px-3 py-1 text-sm border ${mode==="business" ? "bg-black text-white dark:bg-white dark:text-black" : ""}`}
        onClick={() => updateMode("business")}
        disabled={busy}
      >
        Business
      </button>
    </div>
  );
}
