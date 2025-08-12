"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password });
    setMsg(error ? error.message : "Password updated. You can now log in.");
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Set a new password</h1>
      <form onSubmit={handleUpdate} className="space-y-3">
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-neutral-300 px-3 py-2"
          required
        />
        <button className="btn btn-brand w-full">Update password</button>
      </form>
      {msg && (
        <p className="mt-3 text-sm">
          {msg} {msg.includes("updated") && <Link href="/login" className="text-indigo-600 underline">Log in</Link>}
        </p>
      )}
    </div>
  );
}
