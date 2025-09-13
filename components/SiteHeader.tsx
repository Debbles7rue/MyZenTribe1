// components/SiteHeader.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SiteHeader() {
  const pathname = usePathname();
  const [userId, setUserId] = useState<string | null | "loading">("loading");
  const [isAdmin, setIsAdmin] = useState(false);
  const [openProfileMenu, setOpenProfileMenu] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUserId(data.user?.id ?? null);
      // Check admin table instead of unreliable metadata
      if (data.user) {
        const { data: adminRecord } = await supabase
          .from('admins')
          .select('user_id')
          .eq('user_id', data.user.id)
          .single();
        
        setIsAdmin(!!adminRecord);
      }
    });
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const t = e.target as HTMLElement;
      if (!t.closest(".profile-dropdown") && !t.closest(".profile-menu")) {
        setOpenProfileMenu(false);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setOpenProfileMenu(false);
  }, [pathname]);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const NavIconButton = ({ 
    href, 
    icon, 
    label, 
    className = "" 
  }: { 
    href: string; 
    icon: React.ReactNode;
    label: string;
    className?: string;
  }) => {
    const active = pathname === href || (href !== "/" && (pathname?.startsWith(href) ?? false));
    return (
      <Link 
        href={href} 
        className={`nav-icon-btn ${active ? "active" : ""} ${className}`}
        aria-label={label}
        title={label}
      >
        <span className="nav-icon">{icon}</span>
        <span className="nav-label">{label}</span>
      </Link>
    );
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

        {/* Loading State */}
        {userId === "loading" ? (
          <div className="loading-placeholder" />
        ) : userId ? (
          // Logged In State
          <>
            <nav className="icon-nav">
              {/* Home */}
              <NavIconButton 
                href="/" 
                label="Home"
                icon={
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
                  </svg>
                }
              />
              
              {/* Profile Dropdown */}
              <div className="profile-dropdown">
                <button
                  className={`nav-icon-btn dropdown-trigger ${
                    pathname?.startsWith("/profile") || pathname?.startsWith("/business") ? "active" : ""
                  }`}
                  onClick={() => setOpenProfileMenu(!openProfileMenu)}
                  aria-expanded={openProfileMenu}
                  aria-haspopup="true"
                  aria-label="Profile Menu"
                  title="Profile"
                >
                  <span className="nav-icon">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                    </svg>
                  </span>
                  <span className="nav-label">Profile</span>
                  <svg className="dropdown-arrow" width="10" height="6" viewBox="0 0 10 6" fill="currentColor">
                    <path d="M5 6L0 0h10L5 6z"/>
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
                        <path d="M3 3h4v4H3V3zm6 0h4v4H9V3zM3 9h4v4H3V9zm6 0h4v4H9V9z"/>
                      </svg>
                      Business Profile
                    </Link>
                  </div>
                )}
              </div>
              
              {/* Calendar */}
              <NavIconButton 
                href="/calendar" 
                label="Calendar"
                icon={
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                  </svg>
                }
              />
              
              {/* Communities */}
              <NavIconButton 
                href="/communities" 
                label="Communities"
                icon={
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
                  </svg>
                }
              />
              
              {/* Meditation */}
              <NavIconButton 
                href="/meditation" 
                label="Meditation"
                icon={
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 3a2 2 0 110 4 2 2 0 010-4zm0 10a6 6 0 01-4.24-1.76l1.42-1.42a4 4 0 005.66 0l1.42 1.42A6 6 0 0110 15z"/>
                  </svg>
                }
              />
              
              {/* Karma */}
              <NavIconButton 
                href="/karma" 
                label="Karma"
                icon={
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                }
              />
              
              {/* Admin - Always visible if admin */}
              {isAdmin && (
                <NavIconButton 
                  href="/admin" 
                  label="Admin"
                  className="admin-btn"
                  icon={
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
                    </svg>
                  }
                />
              )}
            </nav>

            <div className="header-actions">
              {/* Safety */}
              <Link 
                href="/safety" 
                className={`nav-icon-btn safety-btn ${pathname?.startsWith("/safety") ? "active" : ""}`}
                aria-label="Safety"
                title="Safety"
              >
                <span className="nav-icon">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                </span>
                <span className="nav-label">Safety</span>
              </Link>
              
              {/* Sign Out */}
              <button className="sign-out-btn" onClick={signOut} aria-label="Sign Out" title="Sign Out">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd"/>
                </svg>
                <span className="sign-out-text">Sign Out</span>
              </button>
            </div>
          </>
        ) : (
          // Logged Out State
          <div className="header-actions-guest">
            <Link href="/login" className="login-btn">
              <span className="login-icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
              </span>
              <span className="login-text">Log In</span>
            </Link>
          </div>
        )}
      </div>

      <style jsx global>{`
        .site-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: linear-gradient(to bottom, #ffffff, #fafafa);
          border-bottom: 1px solid rgba(147, 51, 234, 0.15);
          backdrop-filter: blur(10px);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .header-container {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 8px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        /* Brand Logo */
        .brand-logo {
          display: flex;
          align-items: center;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.5px;
          transition: transform 0.2s ease;
          white-space: nowrap;
          flex-shrink: 0;
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

        /* Icon Navigation */
        .icon-nav {
          display: flex;
          align-items: center;
          gap: 2px;
          flex: 1;
          justify-content: center;
          max-width: 400px;
        }

        /* Navigation Icon Buttons - ICON ONLY */
        .nav-icon-btn {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 6px;
          min-width: 44px;
          height: 44px;
          background: white;
          border: 1px solid rgba(147, 51, 234, 0.15);
          border-radius: 8px;
          color: #6b7280;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.2s ease;
          cursor: pointer;
          text-decoration: none;
        }

        .nav-icon-btn:hover {
          background: linear-gradient(135deg, #f9f5ff, #ede9fe);
          border-color: rgba(147, 51, 234, 0.3);
          color: #9333ea;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(147, 51, 234, 0.15);
        }

        .nav-icon-btn.active {
          background: linear-gradient(135deg, #9333ea, #a855f7);
          border-color: #9333ea;
          color: white;
          box-shadow: 0 2px 8px rgba(147, 51, 234, 0.25);
        }

        .nav-icon-btn.active:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(147, 51, 234, 0.35);
        }

        .nav-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
        }

        .nav-icon svg {
          width: 18px;
          height: 18px;
        }

        /* Labels always hidden for compact design */
        .nav-label {
          display: none;
        }

        /* Profile Dropdown */
        .profile-dropdown {
          position: relative;
        }

        .dropdown-trigger {
          padding: 6px 8px;
        }

        .dropdown-arrow {
          margin-left: 2px;
          width: 8px;
          height: 5px;
          transition: transform 0.2s ease;
        }

        .dropdown-trigger[aria-expanded="true"] .dropdown-arrow {
          transform: rotate(180deg);
        }

        .profile-menu {
          position: absolute;
          top: calc(100% + 8px);
          left: 50%;
          transform: translateX(-50%);
          min-width: 180px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
          border: 1px solid rgba(147, 51, 234, 0.1);
          overflow: hidden;
          animation: slideDown 0.2s ease;
          z-index: 1000;
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

        /* Header Actions */
        .header-actions {
          display: flex;
          align-items: center;
          gap: 2px;
          flex-shrink: 0;
        }

        .header-actions-guest {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }

        /* Admin Button - Special styling */
        .admin-btn {
          border-color: rgba(234, 179, 8, 0.2);
        }

        .admin-btn:hover {
          background: linear-gradient(135deg, #fffbeb, #fef3c7);
          border-color: rgba(234, 179, 8, 0.3);
          color: #d97706;
          box-shadow: 0 2px 8px rgba(234, 179, 8, 0.15);
        }

        .admin-btn.active {
          background: linear-gradient(135deg, #f59e0b, #fbbf24);
          border-color: #f59e0b;
          color: white;
        }

        /* Safety Button */
        .safety-btn {
          min-width: 44px;
          height: 44px;
        }

        /* Sign Out Button */
        .sign-out-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 6px;
          width: 44px;
          height: 44px;
          background: white;
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 8px;
          color: #ef4444;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .sign-out-btn:hover {
          background: linear-gradient(135deg, #fef2f2, #fee2e2);
          border-color: rgba(239, 68, 68, 0.3);
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.15);
        }

        .sign-out-text {
          display: none;
        }

        /* Login Button */
        .login-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 20px;
          background: linear-gradient(135deg, #9333ea, #c084fc);
          color: white;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s ease;
          text-decoration: none;
        }

        .login-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 20px rgba(147, 51, 234, 0.3);
        }

        .login-icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .login-text {
          display: block;
        }

        .loading-placeholder {
          width: 340px;
          height: 44px;
        }

        /* Tablet (600px+) - Still icons only */
        @media (min-width: 600px) {
          .header-container {
            padding: 0 12px;
            gap: 12px;
          }

          .brand-logo {
            font-size: 20px;
          }

          .icon-nav {
            max-width: 450px;
            gap: 4px;
          }

          .nav-icon-btn {
            min-width: 48px;
            height: 46px;
            padding: 8px;
          }

          .nav-icon {
            width: 20px;
            height: 20px;
          }

          .nav-icon svg {
            width: 20px;
            height: 20px;
          }

          .header-actions {
            gap: 4px;
          }
        }

        /* Desktop (768px+) - Still icons only for space */
        @media (min-width: 768px) {
          .header-container {
            padding: 0 16px;
            height: 64px;
          }

          .brand-logo {
            font-size: 22px;
          }

          .icon-nav {
            gap: 6px;
            max-width: 500px;
          }

          .nav-icon-btn {
            padding: 10px;
            min-width: 48px;
            height: 48px;
          }

          .admin-btn,
          .safety-btn {
            padding: 10px;
            height: 48px;
          }

          .sign-out-btn {
            width: 48px;
            height: 48px;
            padding: 10px;
          }

          .header-actions {
            gap: 6px;
          }
        }

        /* Large Desktop (1024px+) */
        @media (min-width: 1024px) {
          .header-container {
            padding: 0 20px;
            height: 72px;
          }

          .brand-logo {
            font-size: 24px;
          }

          .icon-nav {
            max-width: 550px;
            gap: 8px;
          }

          .nav-icon-btn {
            min-width: 52px;
            height: 52px;
            padding: 12px;
          }

          .admin-btn,
          .safety-btn {
            min-width: 52px;
            height: 52px;
          }

          .sign-out-btn {
            width: 52px;
            height: 52px;
          }
        }

        /* Very small screens (below 380px) */
        @media (max-width: 380px) {
          .header-container {
            padding: 0 6px;
            gap: 6px;
          }

          .brand-logo {
            font-size: 16px;
          }

          .icon-nav {
            gap: 1px;
          }

          .nav-icon-btn,
          .admin-btn,
          .safety-btn {
            min-width: 40px;
            height: 40px;
            padding: 5px;
            border-radius: 6px;
          }

          .nav-icon {
            width: 16px;
            height: 16px;
          }

          .nav-icon svg {
            width: 16px;
            height: 16px;
          }

          .sign-out-btn {
            width: 40px;
            height: 40px;
            padding: 5px;
          }

          .dropdown-arrow {
            width: 6px;
            height: 4px;
          }

          .login-btn {
            padding: 8px 16px;
            font-size: 13px;
          }
        }

        /* Ultra small screens (below 350px) */
        @media (max-width: 350px) {
          .nav-icon-btn,
          .admin-btn,
          .safety-btn {
            min-width: 36px;
            height: 36px;
            padding: 4px;
          }

          .sign-out-btn {
            width: 36px;
            height: 36px;
          }

          .brand-logo {
            font-size: 15px;
          }
        }
      `}</style>
    </header>
  );
}
