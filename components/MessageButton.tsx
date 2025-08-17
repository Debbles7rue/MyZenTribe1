// components/MessageButton.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function MessageButton({ otherUserId }: { otherUserId: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function onClick() {
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push(`/login?next=${encodeURIComponent(`/u/${otherUserId}`)}`); return; }

    const { data: threadId, error } =
      await supabase.rpc("get_or_create_dm_thread", { p_other: otherUserId });

    setBusy(false);
    if (error || !threadId) { alert("Couldn't start the chat. Try again."); return; }
    router.push(`/messages/${threadId}`);
  }

  return <button className="btn btn-neutral" onClick={onClick} disabled={busy}>
    {busy ? "Opening…" : "Message"}
  </button>;
}
