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
  const [openNav, setOpenNav] = useState(false);

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
      if (!t.closest(".mobile-menu") && !t.closest(".hamburger")) setOpenNav(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

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
        <div className="left">
          {/* Mobile hamburger */}
          {userId && userId !== "loading" ? (
            <button
              className="hamburger"
              aria-label="Open navigation"
              onClick={() => setOpenNav((v) => !v)}
            >
              <span />
              <span />
              <span />
            </button>
          ) : null}

          <Link href="/" className="brand" aria-label="MyZenTribe Home">
            <div className="brand-name">
              <span className="brand-zen">My</span>ZenTribe
            </div>
          </Link>
        </div>

        {/* Desktop nav */}
        {userId === "loading" ? (
          <div style={{ height: 38 }} />
        ) : userId ? (
          <>
            <nav className="main-nav desktop-only">
              <Nav href="/">Home
