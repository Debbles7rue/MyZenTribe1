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
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  // close dropdowns if clicking elsewhere
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
      <Link href={href} className={`nav-link ${active ? "active" : ""}`} onClick={() => setMobileOpen(false)}>
        {children}
      </Link>
    );
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <header className="site-header">
      <div className="header-inner container-app">
        {/* Left: brand */}
        <Link href="/" className="brand" aria-label="MyZenTribe Home" onClick={() => setMobileOpen(false)}>
          <div className="brand-name">
            <span className="brand-zen">My</span>ZenTribe
          </div>
        </Link>

        {/* Mobile toggle (hidden on desktop) */}
        <button
          className="mobile-toggle"
          aria-label="Open menu"
          onClick={() => setMobileOpen(true)}
        >
          ☰
        </button>

        {/* Desktop nav */}
        {userId === "loading" ? (
          <div style={{ height: 38 }} />
        ) : userId ? (
          <>
            <nav className="main-nav">
              <Nav href="/dashboard">Dashboard</Nav>
              <Nav href="/calendar">Calendar</Nav>
              <Nav href="/communities">Communities</Nav>

              {/* Profile + Business under dropdown */}
              <div className="relative inline-flex">
                <Nav href="/profile">Profile</Nav>
                <button
                  aria-label="Profile menu"
                  className="nav-caret"
                  onClick={() => setOpenProfileMenu((v) => !v)}
                >
                  ▾
                </button>
                {openProfileMenu && (
                  <div className="menu" role="menu">
                    <Link href="/profile" className="menu-item" role="menuitem">
                      Personal profile
                    </Link>
                    <Link href="/business" className="menu-item" role="menuitem">
                      Business profile
                    </Link>
                  </div>
                )}
              </div>

              <Nav href="/meditation">Meditation</Nav>
              <Nav href="/karma">Karma Corner</Nav>
            </nav>

            <div className="auth-area">
              <NotificationBell href="/notifications" />
              <button className="btn" onClick={signOut} aria-label="Sign out">
                Sign out
              </button>
            </div>
          </>
        ) : (
          <div className="auth-area">
            <Link href="/login" className="btn btn-brand" onClick={() => setMobileOpen(false)}>
              Log in
            </Link>
          </div>
        )}
      </div>

      {/* Mobile slide-over menu */}
      {mobileOpen && (
        <>
          <div className="mobile-backdrop" onClick={() => setMobileOpen(false)} />
          <div className="mobile-drawer" role="dialog" aria-modal="true">
            <div className="drawer-header">
              <div className="brand-name">
                <span className="brand-zen">My</span>ZenTribe
              </div>
              <button className="drawer-close" aria-label="Close menu" onClick={() => setMobileOpen(false)}>✕</button>
            </div>
            <div className="drawer-content">
              {userId ? (
                <>
                  <Nav href="/">Home</Nav>
                  <Nav href="/calendar">Calendar</Nav>
                  <Nav href="/communities">Communities</Nav>
                  <Nav href="/profile">Personal profile</Nav>
                  <Nav href="/business">Business profile</Nav>
                  <Nav href="/meditation">Meditation</Nav>
                  <Nav href="/karma">Karma Corner</Nav>
                  <Nav href="/notifications">Notifications</Nav>
                  <button className="btn mt-2 w-full" onClick={signOut}>Sign out</button>
                </>
              ) : (
                <Link href="/login" className="btn btn-brand w-full" onClick={() => setMobileOpen(false)}>
                  Log in
                </Link>
              )}
            </div>
          </div>
        </>
      )}

      <style jsx global>{`
        /* --- Layout visibility --- */
        .mobile-toggle { display:none; margin-left:auto; background:transparent; border:none; font-size:20px; padding:6px 10px; }
        @media (max-width: 900px) {
          .main-nav { display:none; }
          .auth-area { display:none; }
          .mobile-toggle { display:inline-flex; }
        }
        @media (min-width: 901px) {
          .mobile-toggle { display:none; }
        }

        .nav-caret {
          margin-left: -6px;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0 6px;
          color: inherit;
        }
        .menu {
          position: absolute;
          top: 100%;
          left: 0;
          margin-top: 8px;
          background: #fff;
          border: 1px solid rgba(0,0,0,.08);
          border-radius: 10px;
          box-shadow: 0 8px 24px rgba(0,0,0,.12);
          min-width: 180px;
          z-index: 50;
        }
        .menu-item {
          display: block;
          padding: 10px 12px;
          font-size: 14px;
          color: #1f2937;
        }
        .menu-item:hover { background: #f9fafb; }

        /* --- Mobile drawer --- */
        .mobile-backdrop {
          position: fixed; inset: 0;
          background: rgba(0,0,0,.35);
          z-index: 80;
        }
        .mobile-drawer {
          position: fixed; inset: 0 0 0 auto;
          width: min(82vw, 320px);
          background: #fff;
          box-shadow: -6px 0 24px rgba(0,0,0,.2);
          z-index: 90;
          display:flex; flex-direction:column;
        }
        .drawer-header {
          display:flex; align-items:center; justify-content:space-between;
          padding: 14px 14px 10px 16px; border-bottom:1px solid rgba(0,0,0,.06);
        }
        .drawer-close { background:transparent; border:none; font-size:18px; cursor:pointer; padding:6px; }
        .drawer-content {
          padding: 12px 16px 16px 16px;
          display:flex; flex-direction:column; gap:8px;
        }
        .drawer-content .nav-link {
          display:block; padding:10px 12px; border-radius:8px;
        }
        .drawer-content .nav-link.active { background:#f3e8ff; }
      `}</style>
    </header>
  );
}
