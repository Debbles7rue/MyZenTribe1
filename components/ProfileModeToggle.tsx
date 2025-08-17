"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ProfileModeToggle() {
  const [mode, setMode] = useState<"personal" | "business">("personal");
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

  async function updateMode(next: "personal" | "business") {
    if (next === mode || busy) return;
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase
        .from("profiles")
        .update({ profile_mode: next })
        .eq("id", user.id);
      if (error) throw error;
      setMode(next);
    } catch (e) {
      console.error(e);
      alert("Could not change profile mode.");
    } finally {
      setBusy(false);
    }
  }

  const base = "rounded-xl px-3 py-1 text-sm border";
  const on = " bg-black text-white dark:bg-white dark:text-black";

  return (
    <div className="mt-3 flex items-center gap-2">
      <span className="text-sm text-zinc-600 dark:text-zinc-400">Profile:</span>
      <button
        aria-pressed={mode === "personal"}
        className={base + (mode === "personal" ? on : "")}
        onClick={() => updateMode("personal")}
        disabled={busy}
      >
        Personal
      </button>
      <button
        aria-pressed={mode === "business"}
        className={base + (mode === "business" ? on : "")}
        onClick={() => updateMode("business")}
        disabled={busy}
      >
        Business
      </button>
    </div>
  );
}
