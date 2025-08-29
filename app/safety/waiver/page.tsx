// app/safety/waiver/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function SafetyWaiverPage() {
  const router = useRouter();
  const search = useSearchParams();
  const [uid, setUid] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  const next = search?.get("next") || "/";

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
  }, []);

  async function accept() {
    if (!uid || !checked) return;
    setSaving(true);
    try {
      // Mark safety acknowledgment on profiles if the column exists.
      const { error } = await supabase
        .from("profiles")
        .update({ safety_ack_at: new Date().toISOString() as any })
        .eq("id", uid);

      // Even if the column doesn't exist, continue (we’ll store prefs on /safety).
      if (error && !/column .* does not exist/i.test(error.message)) {
        console.warn("profiles.safety_ack_at update:", error.message);
      }
      router.replace(`/safety?first=1&next=${encodeURIComponent(next)}`);
    } catch (e: any) {
      alert(e?.message || "Could not record safety acknowledgment.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6" style={{ background: "#F4ECFF" }}>
      <div className="w-full max-w-3xl rounded-2xl border border-purple-100 bg-white p-6 shadow">
        <h1 className="text-2xl font-semibold mb-2 text-center">Safety Waiver</h1>
        <p className="text-sm text-neutral-600 mb-4 text-center">
          Please acknowledge these safety disclaimers to continue.
        </p>

        <div className="prose prose-sm max-w-none text-neutral-800">
          <p><strong>We don’t verify or monitor events.</strong> Use caution, especially at new or unverified events.</p>
          <ul>
            <li>Protect your personal information; share only what you’re comfortable sharing.</li>
            <li>Never send money to strangers. Scammers can be persuasive; stay vigilant.</li>
            <li>Follow local laws and use good judgment at all times.</li>
          </ul>
          <p>
            By acknowledging, you accept that MyZenTribe is not responsible for outcomes of your interactions
            and that you’ll use the platform responsibly.
          </p>
        </div>

        <div className="mt-5 flex items-center gap-2">
          <input
            id="ack"
            type="checkbox"
            className="h-4 w-4"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          <label htmlFor="ack" className="text-sm text-neutral-700">
            I understand and accept these safety disclaimers
          </label>
        </div>

        <div className="flex justify-center mt-6">
          <button
            className="btn btn-brand"
            onClick={accept}
            disabled={!uid || saving || !checked}
            title={!checked ? "Please check the box to continue" : undefined}
          >
            {saving ? "Saving…" : "Continue"}
          </button>
        </div>
      </div>
    </main>
  );
}
