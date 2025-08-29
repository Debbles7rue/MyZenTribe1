"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ContactPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      setUid(u?.id ?? null);
      setEmail((u?.email as string) ?? "");
    });
  }, []);

  async function submit() {
    setBusy(true);
    setErr(null);
    setDone(false);
    try {
      const { error } = await supabase.from("feedback").insert({
        user_id: uid,
        type: "contact",
        name: name || null,
        email: email || null,
        subject: subject || null,
        message,
      });
      if (error) throw error;
      setDone(true);
      setName(""); setSubject(""); setMessage("");
    } catch (e: any) {
      setErr(e?.message || "Could not send message");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen p-6" style={{ background: "#F4ECFF" }}>
      <div className="mx-auto max-w-2xl rounded-2xl border border-purple-100 bg-white p-6 shadow">
        <h1 className="text-2xl font-semibold mb-2">Contact</h1>
        <p className="text-sm text-neutral-600 mb-4">
          Questions, issues, partnerships—drop us a note.
        </p>

        <div className="grid gap-3">
          <input className="input" placeholder="Your name" value={name} onChange={(e)=>setName(e.target.value)} />
          <input className="input" placeholder="Your email" value={email} onChange={(e)=>setEmail(e.target.value)} />
          <input className="input" placeholder="Subject" value={subject} onChange={(e)=>setSubject(e.target.value)} />
          <textarea className="input" rows={6} placeholder="Your message…" value={message} onChange={(e)=>setMessage(e.target.value)} />
          <div className="flex gap-2 justify-end">
            <button className="btn btn-brand" onClick={submit} disabled={busy || !message.trim()}>
              {busy ? "Sending…" : "Send"}
            </button>
          </div>
          {done && <div className="text-green-700 text-sm">Thanks! We’ll get back to you.</div>}
          {err && <div className="text-rose-600 text-sm">Error: {err}</div>}
        </div>
      </div>
    </main>
  );
}
