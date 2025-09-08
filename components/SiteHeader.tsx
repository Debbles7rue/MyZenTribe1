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
  const [openMobileMenu, setOpenMobileMenu] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  // Close dropdowns if clicking elsewhere
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const t = e.target as HTMLElement;
      const clickedProfileBits = t.closest(".nav-caret") || t.closest(".menu");
      const clickedHamburger = t.closest(".hamburger") || t.closest(".mobile-menu");
      if (!clickedProfileBits) setOpenProfileMenu(false);
      if (!clickedHamburger) setOpenMobileMenu(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setOpenProfileMenu(false);
    setOpenMobileMenu(false);
  }, [pathname]);

  const Nav = ({ href, children }: { href: string; children: React.ReactNode }) => {
    const active = pathname === href || (href !== "/" && (pathname?.startsWith(href) ?? false));
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
        {/* Brand */}
        <Link href="/" className="brand" aria-label="MyZenTribe Home">
          <div className="brand-name">
            <span className="brand-zen">My</span>ZenTribe
          </div>
        </Link>

        {/* Desktop nav */}
        {userId === "loading" ? (
          <div style={{ height: 38 }} />
        ) : userId ? (
          <>
            <nav className="main-nav desktop">
              <Nav href="/">Home</Nav>
              <Nav href="/calendar">Calendar</Nav>
              <Nav href="/communities">Communities</Nav>

              {/* Profile + Business under dropdown (desktop) */}
              <div className="relative inline-flex items-center">
                <Nav href="/profile">Profile</Nav>
                <button
                  aria-label="Profile menu"
                  className="nav-caret"
                  onClick={() => setOpenProfileMenu((v) => !v)}
                  aria-expanded={openProfileMenu}
                  aria-haspopup="menu"
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

            {/* Desktop right side */}
            <div className="auth-area desktop">
              <NotificationBell href="/notifications" />
              <button className="btn" onClick={signOut} aria-label="Sign out">
                Sign out
              </button>
            </div>

            {/* Mobile hamburger (shows on small screens) */}
            <button
              className="hamburger mobile"
              aria-label="Open menu"
              aria-expanded={openMobileMenu}
              onClick={() => setOpenMobileMenu((v) => !v)}
            >
              <span />
              <span />
              <span />
            </button>
          </>
        ) : (
          <>
            <div className="auth-area desktop">
              <Link href="/login" className="btn btn-brand">
                Log in
              </Link>
            </div>
            <button
              className="hamburger mobile"
              aria-label="Open menu"
              aria-expanded={openMobileMenu}
              onClick={() => setOpenMobileMenu((v) => !v)}
            >
              <span />
              <span />
              <span />
            </button>
          </>
        )}
      </div>

      {/* Mobile dropdown menu */}
      {openMobileMenu && (
        <div className="mobile-menu">
          {userId ? (
            <>
              <Link href="/" className="mobile-item">Home</Link>
              <Link href="/calendar" className="mobile-item">Calendar</Link>
              <Link href="/communities" className="mobile-item">Communities</Link>

              {/* Profile section expanded inline for simplicity */}
              <div className="mobile-group">
                <div className="mobile-group-title">Profile</div>
                <Link href="/profile" className="mobile-subitem">Personal profile</Link>
                <Link href="/business" className="mobile-subitem">Business profile</Link>
              </div>

              <Link href="/meditation" className="mobile-item">Meditation</Link>
              <Link href="/safety" className="mobile-item">Safety</Link>
              <Link href="/karma" className="mobile-item">Karma Corner</Link>

              <div className="mobile-divider" />
              <Link href="/notifications" className="mobile-item">Notifications</Link>
              <button className="mobile-item danger" onClick={signOut}>Sign out</button>
            </>
          ) : (
            <>
              <Link href="/login" className="mobile-item primary">Log in</Link>
            </>
          )}
        </div>
      )}

      {/* Styles */}
      <style jsx global>{`
        .site-header {
          position: sticky;
          top: 0;
          z-index: 40;
          background: #fff;
          border-bottom: 1px solid rgba(0,0,0,.06);
        }
        .header-inner {
          display: flex;
          align-items: center;
          justify-content: space-between; /* fixes "smushed left" */
          gap: 16px;
          padding: 10px 16px;
        }
        .brand-name {
          font-weight: 700;
          font-size: 20px;
          letter-spacing: 0.2px;
        }
        .brand-zen { color: #7c3aed; } /* lavender accent */

        /* Desktop nav layout */
        .main-nav.desktop {
          display: flex;
          align-items: center;
          gap: 18px;
          flex-wrap: wrap; /* allow wrap if needed */
        }

        .nav-link {
          padding: 6px 10px;
          border-radius: 10px;
          color: #111827;
          line-height: 1;
          white-space: nowrap;
        }
        .nav-link:hover { background: #f3f4f6; }
        .nav-link.active {
          color: #7c3aed;
          background: #f3e8ff;
        }

        .nav-caret {
          margin-left: -6px;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0 6px;
          color: inherit;
          line-height: 1;
        }

        .menu {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          background: #fff;
          border: 1px solid rgba(0,0,0,.08);
          border-radius: 10px;
          box-shadow: 0 8px 24px rgba(0,0,0,.12);
          min-width: 200px;
          z-index: 50;
          overflow: hidden;
        }
        .menu-item {
          display: block;
          padding: 10px 12px;
          font-size: 14px;
          color: #1f2937;
        }
        .menu-item:hover { background: #f9fafb; }

        .auth-area.desktop {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        /* Hamburger (mobile only) */
        .hamburger {
          display: none;
          width: 40px;
          height: 34px;
          border: 1px solid rgba(0,0,0,.1);
          border-radius: 10px;
          background: #fff;
          align-items: center;
          justify-content: center;
          padding: 6px;
        }
        .hamburger span {
          display: block;
          width: 18px;
          height: 2px;
          background: #111827;
          margin: 3px 0;
          border-radius: 2px;
        }

        /* Mobile menu panel */
        .mobile-menu {
          display: none;
          position: absolute;
          left: 0;
          right: 0;
          top: 100%;
          background: #ffffff;
          border-bottom: 1px solid rgba(0,0,0,.06);
          box-shadow: 0 8px 24px rgba(0,0,0,.08);
          padding: 10px 16px 16px;
        }
        .mobile-item, .mobile-subitem {
          display: block;
          padding: 12px 8px;
          border-radius: 10px;
          color: #111827;
        }
        .mobile-item:hover, .mobile-subitem:hover { background: #f9fafb; }
        .mobile-item.primary { background: #7c3aed; color: #fff; text-align: center; }
        .mobile-item.primary:hover { background: #6d28d9; }
        .mobile-item.danger { color: #b91c1c; text-align: left; }

        .mobile-group { padding: 8px 0; }
        .mobile-group-title {
          font-size: 12px;
          text-transform: uppercase;
          color: #6b7280;
          letter-spacing: 0.04em;
          padding: 6px 8px 0;
        }
        .mobile-divider {
          height: 1px;
          background: rgba(0,0,0,.06);
          margin: 8px 0;
        }

        /* Responsive behavior */
        @media (max-width: 1024px) {
          .main-nav.desktop { display: none; }
          .auth-area.desktop { display: none; }
          .hamburger.mobile { display: inline-flex; }
          .mobile-menu { display: block; }
        }
        @media (min-width: 1025px) {
          .hamburger.mobile { display: none; }
        }
      `}</style>
    </header>
  );
}
