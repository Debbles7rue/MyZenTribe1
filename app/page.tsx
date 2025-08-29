"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/**
 * Home page
 * - Signed-out: friendly hero (unchanged vibe)
 * - Signed-in: composer + feed
 */
export default function HomePage() {
  const LOGO_SRC = "/logo-myzentribe.png";

  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUserId(data.session?.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // --- styles (lavender shell + soft cards) ---
  const shell: React.CSSProperties = {
    minHeight: "100vh",
    background:
      "linear-gradient(180deg, rgba(244,236,255,1) 0%, rgba(249,245,255,1) 40%, #ffffff 100%)",
    padding: "42px 16px",
  };
  const container: React.CSSProperties = {
    maxWidth: 900,
    margin: "0 auto",
  };
  const card: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #ece9fe",
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 10px 24px rgba(67, 56, 202, 0.06)",
  };
  const title: React.CSSProperties = { fontSize: 36, fontWeight: 800, margin: 0 };
  const p: React.CSSProperties = {
    color: "#374151",
    marginTop: 10,
    lineHeight: 1.6,
  };
  const row: React.CSSProperties = {
    marginTop: 16,
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  };
  const btnLavender: React.CSSProperties = {
    display: "inline-block",
    padding: "10px 18px",
    borderRadius: 14,
    background: "#8b5cf6",
    color: "#fff",
    fontWeight: 600,
    boxShadow: "0 6px 14px rgba(139,92,246,0.35)",
    border: "1px solid #8b5cf6",
  };

  const signedIn = !!userId;

  return (
    <main style={shell}>
      <section style={container}>
        {!signedIn ? (
          <>
            {/* HERO for signed-out users (kept from your version) */}
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={LOGO_SRC}
                alt="MyZenTribe Logo"
                width={260}
                height={260}
                style={{ width: 260, height: "auto" }}
              />
            </div>

            <div style={card}>
              <h1 style={title}>
                Welcome to <span style={{ color: "#111827" }}>MyZenTribe</span>
              </h1>
              <p style={p}>
                A space to connect, recharge, and share what matters. From daily mindfulness and
                gratitude practices to meaningful events, MyZenTribe makes it easy to find your
                people and build something good together.
              </p>
              <div style={row}>
                <Link href="/signin" style={btnLavender}>
                  Sign in
                </Link>
                <Link href="/signin" style={btnLavender}>
                  Create profile
                </Link>
              </div>
            </div>

            <div style={{ ...card, marginTop: 22 }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Our Intention</h2>
              <p style={p}>
                To bring people together across local and global communities, support talented small
                businesses, and encourage every member to play a part in making the world a better
                place.
              </p>
              <div style={{ marginTop: 12 }}>
                <Link href="/commitment" style={btnLavender}>
                  Our Commitment
                </Link>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* FEED for signed-in users */}
            <div style={{ display: "grid", gap: 14 }}>
              <PostComposer onPosted={() => { /* Feed subscribes itself; noop */ }} />

              <HomeFeed />
            </div>
          </>
        )}
      </section>

      {/* compact footer bar */}
      <FooterBar />
      {/* floating SOS button */}
      {signedIn && <SosButton />}
    </main>
  );
}

/* ----------------------------- Feed pieces ----------------------------- */

type Post = {
  id: string;
  user_id: string;
  body: string;
  privacy: "public" | "friends" | "private";
  created_at: string;
};

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

function PostComposer({ onPosted }: { onPosted?: () => void }) {
  const [body, setBody] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "friends" | "private">("friends");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("posts").insert({ body: text, privacy });
      if (error) throw error;
      setBody("");
      onPosted?.();
    } catch (e: any) {
      alert(e.message || "Could not post");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #ece9fe",
        borderRadius: 16,
        padding: 14,
      }}
    >
      <div style={{ display: "grid", gap: 8 }}>
        <textarea
          className="input"
          rows={3}
          placeholder="Share something with your friends…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          style={{
            width: "100%",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            padding: 10,
            outline: "none",
          }}
        />
        <div style={{ display: "flex", gap: 8, justifyContent: "space-between", flexWrap: "wrap" }}>
          <select
            value={privacy}
            onChange={(e) => setPrivacy(e.target.value as any)}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              padding: "8px 10px",
              background: "#fff",
            }}
          >
            <option value="public">Public</option>
            <option value="friends">Friends</option>
            <option value="private">Only me</option>
          </select>
          <button
            className="btn btn-brand"
            onClick={submit}
            disabled={busy || !body.trim()}
            style={{
              background: "#8b5cf6",
              color: "#fff",
              borderRadius: 12,
              padding: "8px 14px",
              border: "1px solid #8b5cf6",
              fontWeight: 600,
            }}
          >
            {busy ? "Posting…" : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
}

function HomeFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [authors, setAuthors] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      const rows = (data ?? []) as Post[];
      setPosts(rows);

      // fetch author profiles
      const ids = Array.from(new Set(rows.map((r) => r.user_id)));
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", ids);
        const map: Record<string, Profile> = {};
        (profs ?? []).forEach((p: any) => (map[p.id] = p));
        setAuthors(map);
      } else {
        setAuthors({});
      }
    } catch (e: any) {
      alert(e.message || "Could not load the feed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // realtime refresh
    const ch = supabase
      .channel("posts-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, load)
      .subscribe();
    return () => {
      try {
        // @ts-ignore
        supabase.removeChannel?.(ch);
      } catch {}
    };
  }, []);

  if (loading) return <div className="muted">Loading feed…</div>;
  if (posts.length === 0)
    return <div className="muted">Your feed is quiet. Say hi with a post above!</div>;

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {posts.map((p) => {
        const a = authors[p.user_id];
        return (
          <article
            key={p.id}
            className="card"
            style={{
              background: "#fff",
              border: "1px solid #ece9fe",
              borderRadius: 16,
              padding: 14,
            }}
          >
            <header style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={(a?.avatar_url || "/default-avatar.png") + "?t=1"}
                alt=""
                width={36}
                height={36}
                style={{ borderRadius: 9999, objectFit: "cover" }}
              />
              <div style={{ lineHeight: 1.2 }}>
                <div style={{ fontWeight: 600 }}>{a?.full_name || "Member"}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {new Date(p.created_at).toLocaleString()} · {p.privacy}
                </div>
              </div>
            </header>
            <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{p.body}</div>
          </article>
        );
      })}
    </div>
  );
}

/* --------------------------- Footer + SOS UI --------------------------- */

function FooterBar() {
  const bar: React.CSSProperties = {
    position: "fixed",
    bottom: 12,
    left: "50%",
    transform: "translateX(-50%)",
    background: "#ffffff",
    border: "1px solid #ece9fe",
    borderRadius: 999,
    boxShadow: "0 8px 22px rgba(67,56,202,.10)",
    display: "flex",
    gap: 10,
    padding: "8px 12px",
    alignItems: "center",
    zIndex: 20,
  };
  const link: React.CSSProperties = {
    padding: "6px 10px",
    borderRadius: 999,
    fontWeight: 600,
    color: "#6d28d9",
    border: "1px solid #ede9fe",
    background: "#faf5ff",
  };
  return (
    <nav style={bar} aria-label="Quick links">
      <Link href="/contact" style={link}>
        Contact
      </Link>
      <Link href="/suggestions" style={link}>
        Suggestions
      </Link>
      <Link href="/donate" style={link}>
        Donations
      </Link>
    </nav>
  );
}

function SosButton() {
  const btn: React.CSSProperties = {
    position: "fixed",
    right: 14,
    bottom: 72, // leave space above the footer bar
    background: "#ef4444",
    color: "#fff",
    borderRadius: 9999,
    padding: "10px 14px",
    border: "1px solid #ef4444",
    fontWeight: 700,
    boxShadow: "0 10px 20px rgba(239,68,68,.35)",
    zIndex: 30,
  };

  async function triggerSOS() {
    if (!confirm("Send a safety alert to your emergency contact?")) return;

    // try to get location (best-effort)
    let lat: number | null = null;
    let lon: number | null = null;
    try {
      if ("geolocation" in navigator) {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              lat = pos.coords.latitude;
              lon = pos.coords.longitude;
              resolve();
            },
            () => resolve(),
            { enableHighAccuracy: true, timeout: 5000 }
          );
        });
      }
    } catch {
      /* ignore */
    }

    const { error } = await supabase
      .from("sos_incidents")
      .insert({ message: "I don't feel safe", lat, lon });

    if (error) {
      alert("Could not send SOS. " + error.message);
    } else {
      alert("SOS sent. We’ll notify your emergency contact.");
      // (Optional) if you add an edge function / trigger, it will dispatch SMS/email.
    }
  }

  return (
    <button style={btn} onClick={triggerSOS} aria-label="Send safety alert">
      SOS
    </button>
  );
}
