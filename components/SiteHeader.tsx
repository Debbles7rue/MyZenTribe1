// components/SiteHeader.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import NotificationBell from "@/components/NotificationBell";
import "./SiteHeader.css"; // Import the CSS file

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

  // Close dropdowns on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const t = e.target as HTMLElement;
      if (!t.closest(".profile-dropdown") && !t.closest(".profile-menu")) {
        setOpenProfileMenu(false);
      }
      if (!t.closest(".hamburger-btn") && !t.closest(".mobile-menu-panel")) {
        setOpenMobileMenu(false);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setOpenProfileMenu(false);
    setOpenMobileMenu(false);
  }, [pathname]);

  const NavLink = ({ href, children, className = "" }: { 
    href: string; 
    children: React.ReactNode;
    className?: string;
  }) => {
    const active = pathname === href || (href !== "/" && (pathname?.startsWith(href) ?? false));
    return (
      <Link 
        href={href} 
        className={`nav-link ${active ? "active" : ""} ${className}`}
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
    <header className="site-header">
      <div className="header-container">
        {/* Logo/Brand */}
        <Link href="/" className="brand-logo" aria-label="MyZenTribe Home">
          <span className="brand-my">My</span>
          <span className="brand-zen">Zen</span>
          <span className="brand-tribe">Tribe</span>
        </Link>

        {/* Desktop Navigation */}
        {userId === "loading" ? (
          <div className="loading-placeholder" />
        ) : userId ? (
          <>
            <nav className="desktop-nav">
              <NavLink href="/">Home</NavLink>
              <NavLink href="/calendar">Calendar</NavLink>
              <NavLink href="/communities">Communities</NavLink>
              
              {/* Profile Dropdown */}
              <div className="profile-dropdown">
                <button
                  className={`nav-link dropdown-trigger ${
                    pathname?.startsWith("/profile") || pathname?.startsWith("/business") ? "active" : ""
                  }`}
                  onClick={() => setOpenProfileMenu(!openProfileMenu)}
                  aria-expanded={openProfileMenu}
                  aria-haspopup="true"
                >
                  Profile
                  <svg className="dropdown-icon" width="12" height="8" viewBox="0 0 12 8" fill="currentColor">
                    <path d="M6 8L0 0h12L6 8z"/>
                  </svg>
                </button>
                
                {openProfileMenu && (
                  <div className="profile-menu">
                    <Link href="/profile" className="menu-item">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <circle cx="8" cy="4" r="3"/>
                        <path d="M8 9c-3.3 0-6 1.3-6 3v1h12v-1c0-1.7-2.7-3-6-3z"/>
                      </svg>
                      Personal Profile
                    </Link>
                    <Link href="/business" className="menu-item">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M2 2h5v5H2V2zm7 0h5v5H9V2zM2 9h5v5H2V9zm7 0h5v5H9V9z"/>
                      </svg>
                      Business Profile
                    </Link>
                  </div>
                )}
              </div>
              
              <NavLink href="/meditation">Meditation</NavLink>
              <NavLink href="/safety">Safety</NavLink>
              <NavLink href="/karma">Karma Corner</NavLink>
            </nav>

            <div className="desktop-actions">
              <NotificationBell href="/notifications" />
              <button className="sign-out-btn" onClick={signOut}>
                Sign Out
              </button>
            </div>

            {/* Mobile Hamburger Button */}
            <button
              className="hamburger-btn"
              onClick={() => setOpenMobileMenu(!openMobileMenu)}
              aria-expanded={openMobileMenu}
              aria-label="Toggle navigation menu"
            >
              <span className={`hamburger-icon ${openMobileMenu ? "open" : ""}`}>
                <span></span>
                <span></span>
                <span></span>
              </span>
            </button>
          </>
        ) : (
          <>
            <div className="desktop-actions">
              <Link href="/login" className="login-btn">
                Log In
              </Link>
            </div>
            
            <button
              className="hamburger-btn"
              onClick={() => setOpenMobileMenu(!openMobileMenu)}
              aria-expanded={openMobileMenu}
              aria-label="Toggle navigation menu"
            >
              <span className={`hamburger-icon ${openMobileMenu ? "open" : ""}`}>
                <span></span>
                <span></span>
                <span></span>
              </span>
            </button>
          </>
        )}
      </div>

      {/* Mobile Menu Panel */}
      <div className={`mobile-menu-panel ${openMobileMenu ? "open" : ""}`}>
        <nav className="mobile-nav">
          {userId ? (
            <>
              <Link href="/" className="mobile-nav-link">
                <span className="nav-icon">🏠</span>
                Home
              </Link>
              <Link href="/calendar" className="mobile-nav-link">
                <span className="nav-icon">📅</span>
                Calendar
              </Link>
              <Link href="/communities" className="mobile-nav-link">
                <span className="nav-icon">👥</span>
                Communities
              </Link>
              
              <div className="mobile-section-divider" />
              
              <Link href="/profile" className="mobile-nav-link">
                <span className="nav-icon">👤</span>
                Personal Profile
              </Link>
              <Link href="/business" className="mobile-nav-link">
                <span className="nav-icon">💼</span>
                Business Profile
              </Link>
              
              <div className="mobile-section-divider" />
              
              <Link href="/meditation" className="mobile-nav-link">
                <span className="nav-icon">🧘</span>
                Meditation
              </Link>
              <Link href="/safety" className="mobile-nav-link">
                <span className="nav-icon">🛡️</span>
                Safety
              </Link>
              <Link href="/karma" className="mobile-nav-link">
                <span className="nav-icon">✨</span>
                Karma Corner
              </Link>
              
              <div className="mobile-section-divider" />
              
              <Link href="/notifications" className="mobile-nav-link">
                <span className="nav-icon">🔔</span>
                Notifications
              </Link>
              
              <button className="mobile-sign-out" onClick={signOut}>
                Sign Out
              </button>
            </>
          ) : (
            <Link href="/login" className="mobile-login-btn">
              Log In to MyZenTribe
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

// ===================================================
// CREATE THIS NEW FILE: components/SiteHeader.css
// ===================================================

/* components/SiteHeader.css */

.site-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: linear-gradient(to bottom, #ffffff, #fafafa);
  border-bottom: 1px solid rgba(147, 51, 234, 0.1);
  backdrop-filter: blur(10px);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.header-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 20px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 32px;
}

/* Brand Logo */
.brand-logo {
  display: flex;
  align-items: center;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.5px;
  transition: transform 0.2s ease;
}

.brand-logo:hover {
  transform: scale(1.05);
}

.brand-my {
  color: #6b7280;
}

.brand-zen {
  color: #9333ea;
  background: linear-gradient(135deg, #9333ea, #c084fc);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.brand-tribe {
  color: #1f2937;
}

/* Desktop Navigation - ALWAYS VISIBLE NOW */
.desktop-nav {
  display: flex; /* Changed from display: none */
  align-items: center;
  gap: 8px;
  flex: 1;
  justify-content: center;
}

.nav-link {
  position: relative;
  padding: 8px 16px;
  font-size: 15px;
  font-weight: 500;
  color: #4b5563;
  border-radius: 8px;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.nav-link:hover {
  color: #1f2937;
  background: rgba(147, 51, 234, 0.05);
}

.nav-link.active {
  color: #9333ea;
  background: rgba(147, 51, 234, 0.1);
}

/* Profile Dropdown */
.profile-dropdown {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.dropdown-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: none;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
  font-size: 15px;
  font-weight: 500;
  color: #4b5563;
  transition: all 0.2s ease;
}

.dropdown-trigger:hover {
  color: #1f2937;
  background: rgba(147, 51, 234, 0.05);
}

.dropdown-trigger.active {
  color: #9333ea;
  background: rgba(147, 51, 234, 0.1);
  font-weight: 600;
}

.dropdown-icon {
  transition: transform 0.2s ease;
}

.dropdown-trigger[aria-expanded="true"] .dropdown-icon {
  transform: rotate(180deg);
}

.profile-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  min-width: 200px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(147, 51, 234, 0.1);
  overflow: hidden;
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  color: #4b5563;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.menu-item:hover {
  background: rgba(147, 51, 234, 0.05);
  color: #9333ea;
}

.menu-item svg {
  opacity: 0.6;
}

/* Desktop Actions - ALWAYS VISIBLE NOW */
.desktop-actions {
  display: flex; /* Changed from display: none */
  align-items: center;
  gap: 12px;
}

.sign-out-btn {
  padding: 8px 20px;
  background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
  color: #4b5563;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sign-out-btn:hover {
  background: linear-gradient(135deg, #e5e7eb, #d1d5db);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.login-btn {
  padding: 8px 24px;
  background: linear-gradient(135deg, #9333ea, #c084fc);
  color: white;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.login-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 20px rgba(147, 51, 234, 0.3);
}

/* Hamburger Button - Hidden on desktop, visible on mobile */
.hamburger-btn {
  display: none;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: white;
  border: 1px solid rgba(147, 51, 234, 0.2);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.hamburger-btn:hover {
  background: rgba(147, 51, 234, 0.05);
}

.hamburger-icon {
  position: relative;
  width: 20px;
  height: 14px;
}

.hamburger-icon span {
  position: absolute;
  left: 0;
  width: 100%;
  height: 2px;
  background: #4b5563;
  border-radius: 1px;
  transition: all 0.3s ease;
}

.hamburger-icon span:nth-child(1) {
  top: 0;
}

.hamburger-icon span:nth-child(2) {
  top: 6px;
}

.hamburger-icon span:nth-child(3) {
  top: 12px;
}

.hamburger-icon.open span:nth-child(1) {
  top: 6px;
  transform: rotate(45deg);
}

.hamburger-icon.open span:nth-child(2) {
  opacity: 0;
}

.hamburger-icon.open span:nth-child(3) {
  top: 6px;
  transform: rotate(-45deg);
}

/* Mobile Menu Panel */
.mobile-menu-panel {
  position: fixed;
  top: 64px;
  left: 0;
  right: 0;
  bottom: 0;
  background: white;
  transform: translateX(100%);
  transition: transform 0.3s ease;
  overflow-y: auto;
  z-index: 99;
}

.mobile-menu-panel.open {
  transform: translateX(0);
}

@media (min-width: 1024px) {
  .mobile-menu-panel {
    display: none;
  }
}

.mobile-nav {
  padding: 20px;
}

.mobile-nav-link {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  color: #4b5563;
  font-size: 16px;
  font-weight: 500;
  border-radius: 12px;
  transition: all 0.2s ease;
}

.mobile-nav-link:hover {
  background: rgba(147, 51, 234, 0.05);
  color: #9333ea;
  transform: translateX(4px);
}

.nav-icon {
  font-size: 20px;
  width: 28px;
  text-align: center;
}

.mobile-section-divider {
  height: 1px;
  background: rgba(147, 51, 234, 0.1);
  margin: 12px 0;
}

.mobile-sign-out {
  width: 100%;
  margin-top: 20px;
  padding: 14px;
  background: linear-gradient(135deg, #fef2f2, #fee2e2);
  color: #dc2626;
  border: 1px solid rgba(220, 38, 38, 0.2);
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mobile-sign-out:hover {
  background: linear-gradient(135deg, #fee2e2, #fecaca);
  transform: scale(0.98);
}

.mobile-login-btn {
  display: block;
  padding: 16px;
  background: linear-gradient(135deg, #9333ea, #c084fc);
  color: white;
  text-align: center;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.mobile-login-btn:hover {
  transform: scale(0.98);
  box-shadow: 0 4px 20px rgba(147, 51, 234, 0.3);
}

.loading-placeholder {
  width: 100px;
  height: 40px;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .header-container {
    padding: 0 16px;
  }
  
  .brand-logo {
    font-size: 20px;
  }
  
  /* Show navigation on smaller screens */
  .desktop-nav {
    overflow-x: auto;
    scrollbar-width: none;
  }
  
  .desktop-nav::-webkit-scrollbar {
    display: none;
  }
  
  .nav-link {
    padding: 6px 10px;
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  /* On very small screens, show hamburger instead */
  .hamburger-btn {
    display: flex !important;
  }
  
  .desktop-nav {
    display: none !important;
  }
  
  .desktop-actions .sign-out-btn {
    display: none;
  }
}
