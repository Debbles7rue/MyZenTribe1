"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const TERMS_VERSION = 1;

export default function TermsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      if (!data.user) router.replace("/signin"); // must be signed in
      setReady(true);
    });
    return () => { mounted = false; };
  }, [router]);

  async function accept() {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return router.replace("/signin");

    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: uid,
        terms_version: TERMS_VERSION,
        terms_accepted_at: new Date().toISOString(),
        // terms_accepted_ip can be set via an edge function later if you want the real IP
      }, { onConflict: "id" });

    if (error) {
      alert(error.message);
      return;
    }
    // Send them where they were headed; default to profile
    router.replace("/profile");
  }

  if (!ready) return null;

  return (
    <main style={{ minHeight: "100vh", background: "#F4ECFF", padding: "48px 16px", display: "grid", placeItems: "center" }}>
      <div style={{ width: "100%", maxWidth: 880, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 24, boxShadow: "0 10px 20px rgba(0,0,0,0.05)" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, textAlign: "center" }}>Terms of Use & Waiver</h1>

        <div style={{ marginTop: 16, color: "#374151", lineHeight: 1.65 }}>
          <p><strong>No medical or legal advice.</strong> Content on MyZenTribe (including events, posts, and comments) is for community connection and inspiration only, not medical, legal, or professional advice.</p>
          <p><strong>User responsibility.</strong> You are responsible for your choices and interactions on and off the platform, including any events you host or attend.</p>
          <p><strong>Release of liability.</strong> To the fullest extent permitted by law, MyZenTribe and its operators are not liable for damages or losses arising from use of the site, participation in events, third-party links, or user-generated content.</p>
          <p><strong>Community guidelines.</strong> Be respectful. Do not post harmful, unlawful, or infringing content. We may remove content or suspend accounts for violations.</p>
          <p><strong>Privacy.</strong> We never display your email in the UI. Personal profiles offer visibility controls; business profiles are public by design.</p>
          <p><strong>Updates.</strong> We may update these terms; we’ll prompt you to accept new versions.</p>
        </div>

        <div style={{ marginTop: 20, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={accept} className="btn btn-brand">I Agree</button>
          <a href="/" className="btn btn-neutral">Cancel</a>
        </div>
      </div>
    </main>
  );
}
