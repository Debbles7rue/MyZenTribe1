// components/WeatherBadge.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

type Unit = "fahrenheit" | "celsius";

export default function WeatherBadge() {
  const [unit, setUnit] = useState<Unit>(() => {
    if (typeof window === "undefined") return "fahrenheit";
    return (localStorage.getItem("mzt-wx-unit") as Unit) || "fahrenheit";
  });
  const [text, setText] = useState<string>("Weather: …");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem("mzt-wx-unit", unit);
  }, [unit]);

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setErr("Weather: unavailable");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setErr(null);
        try {
          const { latitude, longitude } = pos.coords;
          const resp = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&temperature_unit=${unit}`
          );
          const data = await resp.json();
          const t = data?.current?.temperature_2m;
          const unitLabel = unit === "fahrenheit" ? "°F" : "°C";
          if (typeof t === "number") setText(`Weather: ${Math.round(t)}${unitLabel}`);
          else setErr("Weather: unavailable");
        } catch {
          setErr("Weather: unavailable");
        }
      },
      () => setErr("Weather: location blocked"),
      { timeout: 6000 }
    );
  }, [unit]);

  const badge = useMemo(() => (err ? err : text), [err, text]);

  return (
    <div className="badge-wx">
      {badge}
      <select
        aria-label="Temperature units"
        value={unit}
        onChange={(e) => setUnit(e.target.value as Unit)}
        style={{ marginLeft: 8, border: "1px solid #e5e7eb", borderRadius: 8, padding: "2px 6px" }}
      >
        <option value="fahrenheit">°F</option>
        <option value="celsius">°C</option>
      </select>
    </div>
  );
}
