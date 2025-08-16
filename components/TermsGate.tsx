"use client";

import { Dialog } from "@headlessui/react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  userId: string | null;
  version: number; // bump to re-prompt in the future
};

export default function TermsGate({ userId, version }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!userId) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("terms_version, terms_accepted_at")
        .eq("id", userId)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        // fail open (don’t block the app)
        setLoading(false);
        return;
      }

      const alreadyAccepted =
        data?.terms_accepted_at && (data?.terms_version ?? 0) >= version;

      setOpen(!alreadyAccepted);
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [userId, version]);

  async function accept() {
    if (!userId) return;
    const { error } = await supabase
      .from("profiles")
      .update({
        terms_version: version,
        terms_accepted_at: new Date().toISOString(),
      })
      .eq("id", userId);
    if (!error) setOpen(false);
    else alert(error.message);
  }

  if (!userId || loading || !open) return null;

  return (
    <Dialog open={open} onClose={() => {}} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-2xl rounded-2xl border border-neutral-200 bg-white shadow-xl overflow-hidden">
          <div className="p-6 space-y-4" style={{ maxHeight: "80vh", overflowY: "auto" }}>
            <Dialog.Title className="text-xl font-semibold">
              Terms & Community Guidelines
            </Dialog.Title>

            <p className="text-sm text-neutral-700">
              Please review our <a className="underline" href="/legal/terms" target="_blank" rel="noreferrer">full Terms</a>.
              By continuing, you agree to them.
            </p>

            <ul className="text-sm list-disc pl-5 space-y-2">
              <li>Be kind. No harassment or hate speech.</li>
              <li>Respect privacy. Don’t share private info.</li>
              <li>Events and content are community-contributed; use your own judgment.</li>
              <li>MyZenTribe is not liable for user-generated content or off-platform interactions.</li>
            </ul>

            <div className="flex justify-end gap-2 pt-2">
              <a href="/legal/terms" className="btn btn-neutral" target="_blank" rel="noreferrer">
                Read full Terms
              </a>
              <button className="btn btn-brand" onClick={accept}>I Agree</button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
