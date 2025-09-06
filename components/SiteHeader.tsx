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
  const [openMobileMenu, setOpenMobileMenu] = useState(false);
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
      setOpenMobileMenu(false);
    };
    
    return (
      <Link 
        href={href} 
        onClick={handleClick}
        style={{
          padding: '8px 12px',
          textDecoration: 'none',
          color: isActive ? '#7c3aed' : '#4b5563',
          backgroundColor: isActive ? '#ede9fe' : 'transparent',
          borderRadius: '8px',
          fontWeight: isActive ? '500' : '400',
          display: 'inline-block',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
            e.currentTarget.style.color = '#1f2937';
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#4b5563';
          }
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
    <header style={{ 
      backgroundColor: 'white', 
      borderBottom: '1px solid #e5e7eb',
      position: 'sticky',
      top: 0,
      zIndex: 40
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        padding: '12px 24px',
        maxWidth: '1280px',
        margin: '0 auto'
      }}>
        <Link href="/" style={{ 
          fontSize: '20px', 
          fontWeight: '600', 
          textDecoration: 'none',
          color: '#1f2937'
        }}>
          <span style={{ fontStyle: 'italic' }}>My</span>ZenTribe
        </Link>

        {userId === "loading" ? (
          <div style={{ height: 38 }} />
        ) : userId ? (
          <>
            {/* Mobile menu button */}
            <button 
              style={{
                display: window.innerWidth <= 768 ? 'block' : 'none',
                background: 'transparent',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '20px',
                cursor: 'pointer',
                marginLeft: 'auto',
                marginRight: '8px'
              }}
              onClick={() => setOpenMobileMenu(!openMobileMenu)}
              aria-label="Menu"
            >
              ☰
            </button>

            {/* Desktop nav */}
            <nav style={{ 
              flex: 1,
              display: window.innerWidth <= 768 ? 'none' : 'flex',
              gap: '8px',
              alignItems: 'center'
            }}>
              <Nav href="/">Home</Nav>
              <Nav href="/calendar">Calendar</Nav>
              <Nav href="/communities">Communities</Nav>

              {/* Profile + Business under dropdown */}
              <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                <Nav href="/profile">Profile</Nav>
                <button
                  aria-label="Profile menu"
                  style={{
                    marginLeft: '4px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0 6px',
                    color: '#4b5563'
                  }}
                  onClick={() => setOpenProfileMenu(!openProfileMenu)}
                >
                  ▾
                </button>
                {openProfileMenu && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '8px',
                    background: '#fff',
                    border: '1px solid rgba(0,0,0,.08)',
                    borderRadius: '10px',
                    boxShadow: '0 8px 24px rgba(0,0,0,.12)',
                    minWidth: '180px',
                    zIndex: 50
                  }}>
                    <Link 
                      href="/profile" 
                      style={{
                        display: 'block',
                        padding: '10px 12px',
                        fontSize: '14px',
                        color: '#1f2937',
                        textDecoration: 'none'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      Personal profile
                    </Link>
                    <Link 
                      href="/business" 
                      style={{
                        display: 'block',
                        padding: '10px 12px',
                        fontSize: '14px',
                        color: '#1f2937',
                        textDecoration: 'none'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
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
                  <span style={{ color: '#dc2626', fontWeight: '600' }}>Admin</span>
                </Nav>
              )}
            </nav>

            {/* Mobile nav - shown when menu is open */}
            {openMobileMenu && (
              <nav style={{
                display: 'block',
                position: 'fixed',
                top: '60px',
                left: 0,
                right: 0,
                background: 'white',
                borderBottom: '1px solid #e5e7eb',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                padding: '12px',
                zIndex: 100,
                maxHeight: 'calc(100vh - 60px)',
                overflowY: 'auto'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <Nav href="/">Home</Nav>
                  <Nav href="/calendar">Calendar</Nav>
                  <Nav href="/communities">Communities</Nav>
                  <Nav href="/profile">Profile</Nav>
                  <Nav href="/business">Business</Nav>
                  <Nav href="/meditation">Meditation</Nav>
                  <Nav href="/karma">Karma Corner</Nav>
                  {isAdmin && (
                    <Nav href="/admin">
                      <span style={{ color: '#dc2626', fontWeight: '600' }}>Admin</span>
                    </Nav>
                  )}
                  <Nav href="/notifications">Notifications</Nav>
                  <button 
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      marginTop: '8px',
                      background: '#fee2e2',
                      color: '#dc2626',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                    onClick={signOut}
                  >
                    Sign out
                  </button>
                </div>
              </nav>
            )}

            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              marginLeft: window.innerWidth <= 768 ? 'auto' : '0'
            }}>
              <NotificationBell href="/notifications" />
              <button 
                style={{
                  display: window.innerWidth <= 768 ? 'none' : 'block',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  background: 'white',
                  color: '#4b5563',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={signOut} 
                aria-label="Sign out"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                  e.currentTarget.style.borderColor = '#d1d5db';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                }}
              >
                Sign out
              </button>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link 
              href="/login" 
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                background: '#7c3aed',
                color: 'white',
                textDecoration: 'none',
                display: 'inline-block',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#6d28d9'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#7c3aed'}
            >
              Log in
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
