// components/ErrorBoundary.tsx
"use client";

import React from "react";

type Props = {
  fallback?: React.ReactNode;
  children: React.ReactNode;
};

type State = { hasError: boolean; error?: any };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    // Keep this log so we can see what happened in the console
    console.error("[Calendar ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="card p-3" style={{ background: "#fff7ed", borderColor: "#fed7aa" }}>
            <div className="text-lg font-semibold">We hit a snag loading the calendar.</div>
            <p className="mt-1 text-sm">
              I’ve disabled the extra decorations for now. You can{" "}
              <a className="underline" href="/calendar-list">
                open the list view
              </a>{" "}
              or try reloading.
            </p>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
