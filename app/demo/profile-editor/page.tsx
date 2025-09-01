// app/demo/profile-editor/page.tsx
"use client";

import { useEffect, useState } from "react";
import supabase from "@/lib/supabaseClient";

function projectRef(url?: string) {
  try { const u = new URL(url || ""); return u.hostname.split(".")[0] || "unknown"; }
  catch { return "unknown"; }
}

export default function ProfileEditorPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const ref = projectRef(url);

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");
  const [otp, setOtp] = useState<string>("");
  const [waitingOtp, setWaitingOtp] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  const [sessionExp, setSessionExp] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");

  // Load current session + profile
  async function refreshUser() {
    const { data: sess } = await supabase.auth.getSession();
    setSessionExp(
      sess.session?.expires_at ? new Date(sess.session.expires_at * 1000).toISOString() : null
    );

    const { data } = await supabase.auth.getUser();
    setUserId(data.user?.id ?? null);

    if (data.user?.id) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", data.user.id)
        .maybeSingle();

      setDisplayName(prof?.display_name ?? "");
      setAvatarUrl(prof?.avatar_url ?? "");
    } else {
      setDisplayName("");
      setAvatarUrl("");
    }
  }

  useEffect(() => { refreshUser(); }, []);

  // ---- Auth helpers (email OTP flow) ----
  async function sendOtp() {
    setStatus("Sending magic link…");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + "/demo/profile-editor" },
    });
    if (error) setStatus("Error: " + error.message);
    else { setStatus("Check your email for the magic link."); setWaitingOtp(true); }
  }

  async function verifyOtp() {
    setStatus("Verifying code…");
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: "email" });
    if (error) setStatus("Error: " + error.message);
    else { setStatus("Signed in ✅"); setWaitingOtp(false); setOtp(""); await refreshUser(); }
  }

  async function refreshSession() {
    setStatus("Refreshing session…");
    const { data, error } = await supabase.auth.refreshSession();
    if (error) setStatus("Error: " + error.message);
    else {
      setStatus("Session refreshed ✅");
      setSessionExp(
        data.session?.expires_at ? new Date(data.session.expires_at * 1000).toISOString() : null
      );
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setStatus("Signed out.");
    await refreshUser();
  }

  // ---- Profile save ----
  async function uploadAvatar() {
    if (!avatarFile || !userId) return avatarUrl;
    const ext = (avatarFile.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, avatarFile, {
      upsert: false,
      cacheControl: "3600",
      contentType: avatarFile.type || undefined,
    });
    if (error) throw error;
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return data.publicUrl;
  }

  async function saveProfile() {
    setStatus("Saving…");
    try {
      let url = avatarUrl;
      if (avatarFile) url = await uploadAvatar();

      const { error } = await supabase.rpc("upsert_my_profile", {
        p_display_name: displayName,
        p_avatar_url: url,
      });

      if (error) throw error;
      setStatus("Saved ✅");
      setAvatarFile(null);
      setAvatarUrl(url);
      await refreshUser();
    } catch (e: any) {
      // Our RPC returns NO_SESSION if not signed in — show clearly on mobile
      setStatus("Save failed: " + e.message);
    }
  }

  const signedIn = !!userId;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EDE7F6] to-[#F6EFE5] text-neutral-800">
      <div className="max-w-md mx-auto p-6 space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">Profile (Mobile-Safe)</h1>
          <p className="text-xs text-gray-600 mt-1">
            Project: <code className="font-mono">{projectRef(process.env.NEXT_PUBLIC_SUPABASE_URL)}</code>
          </p>
        </header>

        {!signedIn ? (
          <div className="bg-white rounded-2xl p-4 shadow">
            <h2 className="font-semibold mb-2">Sign in</h2>
            <label className="block text-sm mb-1">Email</label>
            <input
              className="w-full border rounded-lg p-2 mb-3"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              inputMode="email"
            />
            {!waitingOtp ? (
              <button onClick={sendOtp} className="w-full rounded-xl bg-purple-500 hover:bg-purple-600 text-white py-2">
                Send magic link
              </button>
            ) : (
              <>
                <label className="block text-sm mt-3 mb-1">Or paste the 6-digit code</label>
                <input
                  className="w-full border rounded-lg p-2 mb-3"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  inputMode="numeric"
                  placeholder="123456"
                />
                <button onClick={verifyOtp} className="w-full rounded-xl bg-green-600 hover:bg-green-700 text-white py-2">
                  Verify code
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl p-4 shadow">
              <div className="text-sm mb-3">
                User ID: <code className="font-mono break-all">{userId}</code>
              </div>
              <div className="text-xs text-gray-600">
                Session expires: <code className="font-mono">{sessionExp ?? "unknown"}</code>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={refreshSession} className="flex-1 rounded-xl bg-gray-100 py-2">Refresh session</button>
                <button onClick={signOut} className="flex-1 rounded-xl bg-gray-100 py-2">Sign out</button>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow">
              <h2 className="font-semibold mb-3">Edit profile</h2>
              <label className="block text-sm mb-1">Display name</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full border rounded-lg p-2 mb-3"
                placeholder="Your name"
              />
              <label className="block text-sm mb-1">Avatar</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                className="mb-2"
              />
              {avatarUrl && (
                <img src={avatarUrl} alt="avatar" className="w-24 h-24 rounded-full object-cover border mb-3" />
              )}
              <button onClick={saveProfile} className="w-full rounded-xl bg-purple-500 hover:bg-purple-600 text-white py-2">
                Save profile
              </button>
            </div>
          </>
        )}

        {status && (
          <div className="text-sm text-gray-800">{status}</div>
        )}
      </div>
    </div>
  );
}
