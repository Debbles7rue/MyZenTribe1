// components/WeatherBadge.tsx
"use client";

import React, { useEffect, useState } from "react";

export default function WeatherBadge() {
  const [text, setText] = useState<string>("Weather: locating…");

  useEffect(() => {
    let cancelled = false;

    const fetchWx = async (lat: number, lon: number) => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`;
        const res = await fetch(url);
        const json = await res.json();
        const t = Math.round(json?.current?.temperature_2m ?? 0);
        const code = json?.current?.weather_code;
        const label =
          code === 0 ? "Clear" : code < 4 ? "Partly cloudy" : code < 60 ? "Cloudy" : "Precip";
        if (!cancelled) setText(`Weather: ${t}° • ${label}`);
      } catch {
        if (!cancelled) setText("Weather unavailable");
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWx(pos.coords.latitude, pos.coords.longitude),
        () => setText("Weather: location blocked")
      );
    } else {
      setText("Weather: N/A");
    }

    return () => {
      cancelled = true;
    };
  }, []);

  return <div className="badge-wx">{text}</div>;
}
