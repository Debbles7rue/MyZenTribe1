"use client";
import { useEffect, useState } from "react";

const THEMES = ["winter", "spring", "summer", "autumn"] as const;
type Theme = (typeof THEMES)[number];

export default function ThemeDropdown() {
  const [theme, setTheme] = useState<Theme>("winter");

  useEffect(() => {
    const stored = (localStorage.getItem("mzt-theme") as Theme) || "winter";
    setTheme(stored);
    document.documentElement.setAttribute("data-theme", stored);
  }, []);

  function change(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as Theme;
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("mzt-theme", next);
  }

  return (
    <label className="check" title="Color theme">
      <span>Color theme</span>
      <select className="select" value={theme} onChange={change} aria-label="Color theme">
        {THEMES.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
    </label>
  );
}
