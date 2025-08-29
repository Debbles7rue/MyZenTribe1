"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function WaiverInner() {
  const router = useRouter();
  const search = useSearchParams();
  const nextParam = search.get("next") || "/";

  const [uid, setUid] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
  }, []);

  async function accept() {
    if (!uid) return;
    setSaving(true);

    // Minimal, migration-safe update: only set safety_ack_at.
    // (If you later add emergency_contact fields, we can extend this update.)
    await supabase
      .from("profiles")
      .update({ safety_ack_at: new Date().toISOString() })
      .eq("id", uid);

    setSaving(false);
    router.replace(nextParam || "/");
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6" style={{ background: "#F4ECFF" }}>
      <div className="w-full max-w-3xl rounded-2xl border border-purple-100 bg-white p-6 shadow">
        <h1 className="text-2xl font-semibold mb-2 text-center">Safety Waiver</h1>
        <p className="text-sm text-neutral-600 mb-4 text-center">Please read and acknowledge to continue.</p>

        <div className="prose prose-sm max-w-none text-neutral-800">
          <p>
            I understand that MyZenTribe is a user-generated community platform. Event hosts and participants
            are responsible for their own actions. I will use good judgment, protect my personal information,
            and avoid sending money to strangers. I accept that MyZenTribe is not liable for any interactions,
            losses, or damages arising from my use of the platform.
          </p>
          <p>
            If I ever feel unsafe at an event, I’ll consider leaving immediately and contacting my own trusted
            emergency contacts and local authorities.
          </p>
        </div>

        <div className="flex justify-center mt-6">
          <button className="btn btn-brand" onClick={accept} disabled={!uid || saving}>
            {saving ? "Saving…" : "I Acknowledge"}
          </button>
        </div>
      </div>
    </main>
  );
}
