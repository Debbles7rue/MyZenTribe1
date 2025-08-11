import React from "react";
import Logo from "./Logo";
import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-neutral-200 bg-white/70 backdrop-blur sticky top-0 z-50">
      <div className="container-app flex items-center gap-4 py-3">
        <Logo size={44} />
        <div className="flex-1">
          <h1 className="logoText text-2xl font-semibold tracking-tight">
            <span className="align-middle">My</span>{" "}
            <span className="word-zen align-middle">Zen</span>{" "}
            <span className="align-middle">Tribe</span>
          </h1>
        </div>
        <nav className="flex items-center gap-3">
          <Link
            href="/signup"
            className="btn btn-neutral"
            aria-label="Create account"
          >
            Sign up
          </Link>
          <Link
            href="/login"
            className="btn btn-brand"
            aria-label="Log in"
          >
            Log in
          </Link>
        </nav>
      </div>
    </header>
  );
}
