// app/forgot-password/page.tsx
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setMsg("");

    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });

    if (error) {
      setStatus("error");
      setMsg(error.message || "Something went wrong.");
      return;
    }
    setStatus("sent");
    setMsg("Check your email for a password reset link.");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#F4ECFF",
        padding: "48px 16px",
        display: "grid",
        placeItems: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 10px 20px rgba(0,0,0,0.05)",
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, textAlign: "center" }}>
          Reset your password
        </h1>
        <p style={{ marginTop: 8, fontSize: 14, color: "#4b5563", textAlign: "center" }}>
          We’ll email you a secure reset link.
        </p>

        <form onSubmit={onSubmit} style={{ marginTop: 16, display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 14 }}>Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{
                width: "100%",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: "10px 12px",
                outline: "none",
              }}
            />
          </label>

          {status !== "idle" && (
            <div
              style={{
                border: status === "error" ? "1px solid #fecaca" : "1px solid #bbf7d0",
                background: status === "error" ? "#fef2f2" : "#f0fdf4",
                color: status === "error" ? "#991b1b" : "#065f46",
                borderRadius: 12,
                padding: "8px 12px",
                fontSize: 14,
              }}
            >
              {msg}
            </div>
          )}

          <button
            type="submit"
            disabled={status === "sending"}
            className="btn btn-brand"
            style={{ width: "100%" }}
          >
            {status === "sending" ? "Sending…" : "Send reset link"}
          </button>
        </form>

        <div
          style={{
            marginTop: 12,
            display: "flex",
            justifyContent: "space-between",
            fontSize: 14,
          }}
        >
          <a href="/signin" className="underline">Back to sign in</a>
          <a href="/" className="underline">Home</a>
        </div>
      </div>
    </main>
  );
}
