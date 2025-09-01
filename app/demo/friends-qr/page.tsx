// app/demo/friends-qr/page.tsx
"use client";

import { useEffect, useState } from "react";
import supabase from "@/lib/supabaseClient";
import EnvBadge from "@/components/EnvBadge";

export default function FriendsQRPage() {
  const [myId, setMyId] = useState<string>("");
  const [targetId, setTargetId] = useState<string>("");
  const [token, setToken] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setMyId(data.user.id);
    })();
  }, []);

  async function createToken() {
    try {
      const { data, error } = await supabase.rpc("friend_invite_create", { target_user: targetId });
      if (error) throw error;
      setToken(data as string);
      setStatus("Invite token created. Share it via QR.");
    } catch (e: any) {
      setStatus("Error: " + e.message);
    }
  }

  async function acceptToken() {
    try {
      const { error } = await supabase.rpc("friend_invite_accept", { p_token: token });
      if (error) throw error;
      setStatus("Invite accepted ✅");
    } catch (e: any) {
      setStatus("Error: " + e.message);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EDE7F6] to-[#F6EFE5] text-neutral-800">
      <div className="max-w-md mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-2">Friend QR Connect</h1>
        <p className="text-sm mb-4">Create a token to share via QR, or paste one you scanned to accept.</p>

        <div className="bg-white rounded-2xl p-4 shadow mb-6">
          <h2 className="font-semibold mb-2">Create invite token</h2>
          <label className="block text-sm mb-1">Friend’s user_id (UUID)</label>
          <input
            className="w-full border rounded-lg p-2 mb-2"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            placeholder="their auth user_id"
          />
          <button onClick={createToken} className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-white py-2">
            Create Token
          </button>
          {token && (
            <div className="mt-3 text-xs">
              Token: <code className="font-mono break-all">{token}</code>
              <p className="mt-1">Encode this into your QR. The other user opens this page and pastes it.</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-4 shadow">
          <h2 className="font-semibold mb-2">Accept invite token</h2>
          <label className="block text-sm mb-1">Token from QR</label>
          <input
            className="w-full border rounded-lg p-2 mb-2"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="paste token here"
          />
          <button onClick={acceptToken} className="w-full rounded-xl bg-green-600 hover:bg-green-700 text-white py-2">
            Accept Invite
          </button>
        </div>

        {status && <p className="mt-4 text-sm">{status}</p>}

        <div className="text-xs text-gray-500 mt-6">
          Your user_id: <code className="font-mono">{myId}</code>
        </div>
      </div>
      <EnvBadge />
    </div>
  );
}
