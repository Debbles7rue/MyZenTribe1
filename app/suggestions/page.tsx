"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SuggestionsPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
  }, []);

  async function submit() {
    setBusy(true);
    setErr(null);
    setDone(false);
    try {
      const { error } = await supabase.from("feedback").insert({
        user_id: uid,
        type: "suggestion",
        subject: title || null,
        message: details,
      });
      if (error) throw error;
      setDone(true);
      setTitle(""); setDetails("");
    } catch (e: any) {
      setErr(e?.message || "Could not submit suggestion");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen p-6" style={{ background: "#F4ECFF" }}>
      <div className="mx-auto max-w-2xl rounded-2xl border border-purple-100 bg-white p-6 shadow">
        <h1 className="text-2xl font-semibold mb-2">Suggestions</h1>
        <p className="text-sm text-neutral-600 mb-4">
          Have an idea to improve MyZenTribe? We’d love to hear it.
        </p>

        <div className="grid gap-3">
          <input className="input" placeholder="Short title" value={title} onChange={(e)=>setTitle(e.target.value)} />
          <textarea className="input" rows={6} placeholder="Describe your idea…" value={details} onChange={(e)=>setDetails(e.target.value)} />
          <div className="flex gap-2 justify-end">
            <button className="btn btn-brand" onClick={submit} disabled={busy || !details.trim()}>
              {busy ? "Submitting…" : "Submit"}
            </button>
          </div>
          {done && <div className="text-green-700 text-sm">Thanks! We’ll review it.</div>}
          {err && <div className="text-rose-600 text-sm">Error: {err}</div>}
        </div>
      </div>
    </main>
  );
}
