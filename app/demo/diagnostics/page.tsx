"use client";

import { useEffect, useState } from "react";
import supabase from "@/lib/supabaseClient";

function projectRef(url?: string) {
  try { const u = new URL(url || ""); return u.hostname.split(".")[0] || "unknown"; }
  catch { return "unknown"; }
}

export default function DiagnosticsPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const ref = projectRef(url);

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [whoami, setWhoami] = useState<string | null>(null);
  const [dbNow, setDbNow] = useState<string | null>(null);
  const [sessionExp, setSessionExp] = useState<string | null>(null);
  const [logResult, setLogResult] = useState<string>("");
  const [profileResult, setProfileResult] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      setSessionExp(sess.session?.expires_at ? new Date(sess.session.expires_at * 1000).toISOString() : null);

      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id || null);
      setEmail(data.user?.email || null);

      const who = await supabase.rpc("whoami");
      setWhoami(who.data ?? null);

      const now = await supabase.rpc("db_now");
      setDbNow(now.data ?? null);
    })();
  }, []);

  async function writeLog() {
    setLogResult("…");
    const payload = {
      ua: navigator.userAgent,
      viewport: { w: window.innerWidth, h: window.innerHeight },
      ref,
    };
    const { error } = await supabase.rpc("debug_log", {
      p_route: "/demo/diagnostics",
      p_action: "tap_write_log",
      p_note: "hello from device",
      p_payload: payload as any,
    });
    setLogResult(error ? `ERROR: ${error.message}` : "wrote log ✅");
  }

  async function tryProfileSave() {
    setProfileResult("…");
    const { error } = await supabase.rpc("upsert_my_profile", {
      p_display_name: "Test from device " + new Date().toISOString(),
      p_avatar_url: "",
    });
    setProfileResult(error ? `ERROR: ${error.message}` : "saved profile ✅");
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#EDE7F6] to-[#F6EFE5] text-neutral-800">
      <div className="max-w-xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-4">Diagnostics</h1>

        <div className="bg-white rounded-2xl shadow p-4 space-y-2 text-sm">
          <Row k="Project ref" v={ref} />
          <Row k="Supabase URL" v={url} />
          <Row k="auth.getUser().id" v={userId || "null"} />
          <Row k="auth.getUser().email" v={email || "null"} />
          <Row k="auth.getSession().expires_at" v={sessionExp || "null"} />
          <Row k="RPC whoami()" v={whoami || "null"} />
          <Row k="RPC db_now()" v={dbNow || "null"} />
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card
            title="Write test log"
            body={logResult || "Write a row into mobile_debug with your user + device info."}
            btn="Write log"
            onClick={writeLog}
          />
          <Card
            title="Try profile save"
            body={profileResult || "Calls upsert_my_profile(). If you’re not logged in, it will say NO_SESSION."}
            btn="Save profile"
            onClick={tryProfileSave}
          />
        </div>

        <p className="mt-6 text-xs text-gray-500">
          Tip: open this page on desktop and mobile—both should show the same <code className="font-mono">Project ref</code>.
        </p>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="text-gray-500">{k}</div>
      <code className="font-mono break-all">{v}</code>
    </div>
  );
}

function Card({ title, body, btn, onClick }: any) {
  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <h2 className="font-semibold mb-2">{title}</h2>
      <p className="text-sm mb-3">{body}</p>
      <button onClick={onClick} className="w-full rounded-xl bg-purple-500 hover:bg-purple-600 text-white py-2">
        {btn}
      </button>
    </div>
  );
}
