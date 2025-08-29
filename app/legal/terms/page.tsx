// app/legal/terms/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { TERMS_VERSION } from "@/lib/terms";

export default function TermsPage() {
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
    await supabase
      .from("profiles")
      .update({
        terms_version: TERMS_VERSION,
        terms_accepted_at: new Date().toISOString(),
      })
      .eq("id", uid);

    setSaving(false);
    // After terms, route to safety waiver (and pass through 'next')
    router.replace(`/safety/waiver?next=${encodeURIComponent(nextParam)}`);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6" style={{ background: "#F4ECFF" }}>
      <div className="w-full max-w-3xl rounded-2xl border border-purple-100 bg-white p-6 shadow">
        <h1 className="text-2xl font-semibold mb-2 text-center">Terms of Use</h1>
        <p className="text-sm text-neutral-600 mb-4 text-center">Please review and accept to continue.</p>

        <div className="prose prose-sm max-w-none text-neutral-800">
          <p><strong>Disclaimer.</strong> MyZenTribe is a community platform. Content is user-generated and provided “as is.” We don’t provide medical, legal, or professional advice, and we aren’t liable for actions you take based on content here.</p>
          <ul>
            <li>You’re responsible for your interactions and decisions.</li>
            <li>No diagnosis, treatment, or legal advice is offered.</li>
            <li>Follow community guidelines and applicable laws.</li>
            <li>We may update these terms and will re-prompt for consent.</li>
          </ul>
          <p>By selecting “I Agree,” you acknowledge these terms.</p>
        </div>

        <div className="flex justify-center mt-6">
          <button className="btn btn-brand" onClick={accept} disabled={!uid || saving}>
            {saving ? "Saving…" : "I Agree"}
          </button>
        </div>
      </div>
    </main>
  );
}
