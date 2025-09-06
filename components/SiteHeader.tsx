// components/SiteHeader.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import NotificationBell from "./NotificationBell";

export default function SiteHeader() {
  const pathname = usePathname();
  const [userId, setUserId] = useState<string | "loading" | null>("loading");
  const [openProfileMenu, setOpenProfileMenu] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkUser();
  }, [pathname]);

  const checkUser = async () => {
    const { data } = await supabase.auth.getUser();
    setUserId(data.user?.id || null);
    
    // Check if user is admin
    if (data.user?.id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", data.user.id)
        .single();
      
      setIsAdmin(profile?.is_admin === true);
    }
  };

  const Nav = ({ href, children }: { href: string; children: React.ReactNode }) => {
    const isActive = href === "/" ? pathname === "/" : pathname?.startsWith(href);
    const handleClick = () => {
      // Close mobile menu when navigating
      setOpenMobileMenu(false);
    };
    return (
      <Link href={href} className={`nav-link ${isActive ? "active" : ""}`} onClick={handleClick}>
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
        <Link href="/" className="brand" aria-label="MyZenTribe Home">
          <div className="brand-name">
            <span className="brand-zen">My</span>ZenTribe
          </div>
        </Link>

        {userId === "loading" ? (
          <div style={{ height: 38 }} />
        ) : userId ? (
          <>
            <nav className="main-nav">
              <Nav href="/">Home</Nav>
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
              
              {/* Admin link - only visible to admins */}
              {isAdmin && (
                <Nav href="/admin">
                  <span style={{ color: '#dc2626', fontWeight: 600 }}>Admin</span>
                </Nav>
              )}
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
