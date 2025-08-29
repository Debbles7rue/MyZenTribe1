"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Feedback = {
  id: number;
  user_id: string | null;
  type: "contact" | "suggestion";
  name: string | null;
  email: string | null;
  subject: string | null;
  message: string | null;
  created_at: string;
};
type Sos = {
  id: number;
  user_id: string | null;
  message: string | null;
  lat: number | null;
  lon: number | null;
  created_at: string;
};

export default function AdminInbox() {
  const [me, setMe] = useState<any>(null);
  const [tab, setTab] = useState<"feedback" | "suggestions" | "sos">("feedback");
  const [rows, setRows] = useState<(Feedback | Sos)[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        window.location.href = "/login";
        return;
      }
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
      setMe(prof || null);
    })();
  }, []);

  const isAdmin = useMemo(() => me?.role === "admin", [me]);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      if (tab === "sos") {
        const { data, error } = await supabase
          .from("sos_incidents")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200);
        if (error) throw error;
        setRows((data || []) as Sos[]);
      } else {
        const { data, error } = await supabase
          .from("feedback")
          .select("*")
          .eq("type", tab === "feedback" ? "contact" : "suggestion")
          .order("created_at", { ascending: false })
          .limit(200);
        if (error) throw error;
        setRows((data || []) as Feedback[]);
      }
    } catch (e: any) {
      setErr(e?.message || "Could not load data");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, tab]);

  if (me && !isAdmin) {
    return (
      <main className="min-h-screen p-6" style={{ background: "#F4ECFF" }}>
        <div className="mx-auto max-w-3xl rounded-2xl border border-purple-100 bg-white p-6 shadow">
          <h1 className="text-xl font-semibold">Admin</h1>
          <p className="mt-2 text-neutral-700">You don’t have access to this page.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6" style={{ background: "#F4ECFF" }}>
      <div className="mx-auto max-w-5xl rounded-2xl border border-purple-100 bg-white p-6 shadow">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Admin inbox</h1>
          <div className="flex gap-2">
            <button className={`btn ${tab==='feedback'?'btn-brand':''}`} onClick={()=>setTab("feedback")}>Contact</button>
            <button className={`btn ${tab==='suggestions'?'btn-brand':''}`} onClick={()=>setTab("suggestions")}>Suggestions</button>
            <button className={`btn ${tab==='sos'?'btn-brand':''}`} onClick={()=>setTab("sos")}>SOS</button>
          </div>
        </div>

        {loading ? (
          <div className="mt-6">Loading…</div>
        ) : err ? (
          <div className="mt-6 text-rose-600">Error: {err}</div>
        ) : rows.length === 0 ? (
          <div className="mt-6 text-neutral-600">No items.</div>
        ) : tab === "sos" ? (
          <div className="mt-4 space-y-3">
            {(rows as Sos[]).map(r => (
              <div key={r.id} className="rounded border p-3">
                <div className="text-sm text-neutral-500">{new Date(r.created_at).toLocaleString()}</div>
                <div className="font-medium">Message: {r.message || "(none)"}{(r.lat!=null && r.lon!=null) ? ` • (${r.lat}, ${r.lon})` : ""}</div>
                <div className="text-xs text-neutral-600">User: {r.user_id || "—"}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {(rows as Feedback[]).map(r => (
              <div key={r.id} className="rounded border p-3">
                <div className="text-sm text-neutral-500">{new Date(r.created_at).toLocaleString()}</div>
                <div className="font-medium">{r.subject || "(no subject)"} <span className="text-xs text-neutral-500">[{r.type}]</span></div>
                {r.name || r.email ? (
                  <div className="text-xs text-neutral-600">{r.name || "—"} {r.email ? `• ${r.email}` : ""}</div>
                ) : null}
                <div className="mt-1 whitespace-pre-wrap">{r.message}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
