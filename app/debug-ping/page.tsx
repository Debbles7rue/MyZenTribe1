"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function DebugPing() {
  const [out, setOut] = useState<any>(null);

  const insertRow = async () => {
    setOut("Inserting…");
    const { data, error } = await supabase
      .from("debug_ping")
      .insert({ note: "ping from site" })
      .select("*")
      .single();
    setOut(error ? { error: error.message } : data);
  };

  const listRows = async () => {
    setOut("Loading…");
    const { data, error } = await supabase
      .from("debug_ping")
      .select("id, note, created_at")
      .order("created_at", { ascending: false })
      .limit(5);
    setOut(error ? { error: error.message } : data);
  };

  return (
    <main className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Debug Ping</h1>
      <p className="text-sm">
        This writes/reads from <code>debug_ping</code> using your site’s Supabase URL & anon key.
      </p>
      <div className="flex gap-2">
        <button className="btn btn-brand" onClick={insertRow}>Insert row</button>
        <button className="btn btn-neutral" onClick={listRows}>List last 5</button>
      </div>
      <pre className="rounded-xl border p-4 text-sm whitespace-pre-wrap">
        {JSON.stringify(out, null, 2)}
      </pre>
    </main>
  );
}
