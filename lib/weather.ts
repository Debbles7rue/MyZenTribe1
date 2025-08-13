export type LatLon = { lat: number; lon: number };

export async function geocode(q: string): Promise<LatLon | null> {
  const m = q.trim().match(/^\s*(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)\s*$/);
  if (m) return { lat: parseFloat(m[1]), lon: parseFloat(m[3]) };
  const url = `https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&format=json&name=${encodeURIComponent(q)}`;
  const r = await fetch(url);
  if (!r.ok) return null;
  const j = await r.json();
  const item = j?.results?.[0];
  if (!item) return null;
  return { lat: item.latitude, lon: item.longitude };
}

export async function dailyForecast({ lat, lon }: LatLon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("weather fetch failed");
  return r.json();
}
