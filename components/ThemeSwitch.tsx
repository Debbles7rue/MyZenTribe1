"use client";

import { useEffect, useState } from "react";

const THEMES = ["winter", "spring", "summer", "autumn"] as const;
type Theme = (typeof THEMES)[number];

export default function ThemeSwitch() {
  const [theme, setTheme] = useState<Theme>("winter");

  useEffect(() => {
    const stored = (localStorage.getItem("mzt-theme") as Theme) || "winter";
    setTheme(stored);
    document.documentElement.setAttribute("data-theme", stored);
  }, []);

  function apply(next: Theme) {
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("mzt-theme", next);
  }

  return (
    <div className="segmented" title="Theme">
      {THEMES.map((t) => (
        <button
          key={t}
          className={`seg-btn ${theme === t ? "active" : ""}`}
          onClick={() => apply(t)}
          aria-pressed={theme === t}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
