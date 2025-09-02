// components/SiteHeader.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import NotificationBell from "@/components/NotificationBell";

export default function SiteHeader() {
  const pathname = usePathname();
  const [userId, setUserId] = useState<string | null | "loading">("loading");
  const [openProfileMenu, setOpenProfileMenu] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  // close dropdown if clicking elsewhere
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const t = e.target as HTMLElement;
      if (!t.closest(".nav-caret") && !t.closest(".menu")) setOpenProfileMenu(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const Nav = ({ href, children }: { href: string; children: React.ReactNode }) => {
    const active = pathname === href || (href !== "/" && (pathname?.startsWith(href) ?? false));
    return (
      <Link 
        href={href} 
        className={`nav-link ${active ? "active" : ""}`}
        style={{
          padding: "8px 16px",
          borderRadius: "8px",
          textDecoration: "none",
          fontWeight: "500",
          transition: "all 0.2s",
          backgroundColor: active ? "rgba(139, 92, 246, 0.1)" : "transparent",
          color: active ? "#7c3aed" : "#4b5563",
        }}
      >
        {children}
      </Link>
    );
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <header className="site-header" style={{ borderBottom: "1px solid #e5e7eb", backgroundColor: "white" }}>
      <div className="header-inner container-app" style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between",
        padding: "12px 20px",
        maxWidth: "1200px",
        margin: "0 auto"
      }}>
        <Link href="/" className="brand" aria-label="MyZenTribe Home" style={{ textDecoration: "none" }}>
          <div className="brand-name" style={{ fontSize: "20px", fontWeight: "bold", color: "#7c3aed" }}>
            <span className="brand-zen">My</span>ZenTribe
          </div>
        </Link>

        {userId === "loading" ? (
          <div style={{ height: 38 }} />
        ) : userId ? (
          <>
            <nav className="main-nav" style={{ 
              display: "flex", 
              gap: "8px",  // Space between nav items
              alignItems: "center"
            }}>
              <Nav href="/dashboard">Dashboard</Nav>
              <Nav href="/calendar">Calendar</Nav>
              <Nav href="/communities">Communities</Nav>
              
              {/* Profile dropdown */}
              <div className="relative inline-flex">
                <Nav href="/profile">Profile</Nav>
                <button
                  aria-label="Profile menu"
                  className="nav-caret"
                  onClick={() => setOpenProfileMenu((v) => !v)}
                  style={{
                    marginLeft: "-8px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "0 6px",
                    color: "#4b5563",
                  }}
                >
                  ▾
                </button>
                {openProfileMenu && (
                  <div className="menu" role="menu" style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    marginTop: "8px",
                    background: "white",
                    border: "1px solid rgba(0,0,0,.08)",
                    borderRadius: "10px",
                    boxShadow: "0 8px 24px rgba(0,0,0,.12)",
                    minWidth: "180px",
                    zIndex: 50,
                  }}>
                    <Link href="/profile" className="menu-item" role="menuitem" style={{
                      display: "block",
                      padding: "10px 12px",
                      fontSize: "14px",
                      color: "#1f2937",
                      textDecoration: "none",
                    }}>
                      Personal profile
                    </Link>
                    <Link href="/business" className="menu-item" role="menuitem" style={{
                      display: "block",
                      padding: "10px 12px",
                      fontSize: "14px",
                      color: "#1f2937",
                      textDecoration: "none",
                    }}>
                      Business profile
                    </Link>
                  </div>
                )}
              </div>

              <Nav href="/meditation">Meditation</Nav>
              <Nav href="/safety">Safety</Nav>
              <Nav href="/karma">Karma Corner</Nav>
            </nav>

            <div className="auth-area" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <NotificationBell href="/notifications" />
              <button 
                className="btn" 
                onClick={signOut} 
                aria-label="Sign out"
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  background: "white",
                  cursor: "pointer",
                  fontWeight: "500",
                  color: "#4b5563",
                }}
              >
                Sign out
              </button>
            </div>
          </>
        ) : (
          <div className="auth-area">
            <Link 
              href="/login" 
              className="btn btn-brand"
              style={{
                padding: "8px 20px",
                borderRadius: "8px",
                backgroundColor: "#7c3aed",
                color: "white",
                textDecoration: "none",
                fontWeight: "500",
              }}
            >
              Log in
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
