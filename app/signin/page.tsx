"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already signed in, go to profile (where terms gate can show)
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      if (data.user) router.replace("/profile");
    });
    return () => {
      mounted = false;
    };
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message || "Invalid login credentials");
      return;
    }
    router.replace("/profile");
  }

  // quick inline styles (so page looks good even if a stylesheet fails to load)
  const bg: React.CSSProperties = {
    minHeight: "100vh",
    background: "#F4ECFF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
  };
  const card: React.CSSProperties = {
    width: "100%",
    maxWidth: 520,
    background: "#fff",
    border: "1px solid #E9D8FD",
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 10px 20px rgba(0,0,0,0.08)",
  };
  const h1: React.CSSProperties = {
    fontSize: 32,
    fontWeight: 700,
    margin: 0,
    textAlign: "center",
  };
  const sub: React.CSSProperties = {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 12,
  };
  const label: React.CSSProperties = { fontSize: 14, display: "block", marginBottom: 6 };
  const input: React.CSSProperties = {
    width: "100%",
    borderRadius: 12,
    border: "1px solid #D1D5DB",
    padding: "10px 12px",
    outline: "none",
  };
  const btnPrimary: React.CSSProperties = {
    width: "100%",
    border: "none",
    borderRadius: 14,
    padding: "12px 16px",
    background: "#6D28D9",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 6px 14px rgba(109,40,217,0.25)",
  };
  const row: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    fontSize: 14,
  };
  const link: React.CSSProperties = { color: "#6D28D9", textDecoration: "underline" };
  const alertErr: React.CSSProperties = {
    marginTop: 8,
    borderRadius: 12,
    border: "1px solid #FCA5A5",
    background: "#FEF2F2",
    color: "#B91C1C",
    padding: "8px 12px",
    fontSize: 14,
  };

  return (
    <main style={bg}>
      <div style={card}>
        <h1 style={h1}>Sign in</h1>
        <p style={sub}>Use your email and password.</p>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 8 }}>
          <label style={label}>Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={input}
            placeholder="you@example.com"
          />

          <label style={{ ...label, marginTop: 6 }}>Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={input}
            placeholder="••••••••"
          />

          {error && <div style={alertErr}>{error}</div>}

          <button type="submit" disabled={loading} style={btnPrimary}>
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <div style={row}>
            <a href="/" style={link}>Back to welcome</a>
            <a href="/forgot-password" style={link}>Forgot password?</a>
          </div>
          <div style={{ textAlign: "center", marginTop: 6 }}>
            <a href="/signup" style={link}>Create profile</a>
          </div>
        </form>
      </div>
    </main>
  );
}
