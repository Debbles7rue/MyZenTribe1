"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // If already signed in, go to profile
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
    setInfo(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${window.location.origin}/profile` },
    });

    setLoading(false);

    if (error) {
      setError(error.message || "Sign up failed");
      return;
    }

    // If email confirmations are enabled, there's no session yet.
    if (!data.session) {
      setInfo(
        "Check your email to confirm your address. After confirming, you’ll be redirected to your profile."
      );
      return;
    }

    router.replace("/profile");
  }

  // Inline styles so page looks good even if global CSS fails
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
    fontSize: 28,
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
  const alertInfo: React.CSSProperties = {
    marginTop: 8,
    borderRadius: 12,
    border: "1px solid #A7F3D0",
    background: "#ECFDF5",
    color: "#065F46",
    padding: "8px 12px",
    fontSize: 14,
  };

  return (
    <main style={bg}>
      <div style={card}>
        <h1 style={h1}>Create your profile</h1>
        <p style={sub}>One quick account to join MyZenTribe.</p>

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
          {info && <div style={alertInfo}>{info}</div>}

          <button type="submit" disabled={loading} style={btnPrimary}>
            {loading ? "Creating…" : "Create profile"}
          </button>

          <div style={row}>
            <a href="/" style={link}>Back to welcome</a>
            <a href="/signin" style={link}>Have an account? Sign in</a>
          </div>

          <p style={{ fontSize: 12, color: "#6B7280", textAlign: "center", marginTop: 8 }}>
            By creating an account you agree to our{" "}
            <a href="/legal/terms" style={link}>Terms</a>.
          </p>
        </form>
      </div>
    </main>
  );
}
