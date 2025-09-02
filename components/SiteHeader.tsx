// components/SiteHeader.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import NotificationBell from "@/components/NotificationBell";
import { checkIsAdmin } from "@/lib/admin-utils";

export default function SiteHeader() {
  const pathname = usePathname();
  const [userId, setUserId] = useState<string | null | "loading">("loading");
  const [openProfileMenu, setOpenProfileMenu] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  // Check if user is admin
  useEffect(() => {
    if (userId && userId !== "loading") {
      checkIsAdmin().then(setIsAdmin);
    }
  }, [userId]);

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
    const active = pathname === href || (href !== "/dashboard" && href !== "/" && (pathname?.startsWith(href) ?? false));
    return (
      <Link href={href} className={`nav-link ${active ? "active" : ""}`}>
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
        <Link href="/dashboard" className="brand" aria-label="MyZenTribe Home">
          <div className="brand-name">
            <span className="brand-zen">My</span>ZenTribe
          </div>
        </Link>

        {userId === "loading" ? (
          <div style={{ height: 38 }} />
        ) : userId ? (
          <>
            <nav className="main-nav">
              <Nav href="/dashboard">Dashboard</Nav>
              <Nav href="/calendar">Calendar</Nav>
              
              {/* Admin Tab - Only visible to admins */}
              {isAdmin && (
                <Nav href="/admin">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    🛠️ Admin
                  </span>
                </Nav>
              )}
              
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
              <Nav href="/safety">Safety</Nav>
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
            <Link href="/login" className="btn btn-brand">
              Log in
            </Link>
          </div>
        )}
      </div>

      <style jsx global>{`
        .main-nav {
          display: flex;
          gap: 8px;
          align-items: center;
          flex: 1;
        }
        .nav-link {
          padding: 6px 12px;
          border-radius: 8px;
          text-decoration: none;
          color: inherit;
          transition: background 0.2s;
        }
        .nav-link:hover {
          background: rgba(124, 58, 237, 0.1);
        }
        .nav-link.active {
          background: rgba(124, 58, 237, 0.15);
          color: #7c3aed;
          font-weight: 500;
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
      `}</style>
    </header>
  );
}
