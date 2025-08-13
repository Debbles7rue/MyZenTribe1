export type MoonEvent = { date: string; label: "New Moon" | "First Quarter" | "Full Moon" | "Last Quarter" };

function phaseFraction(date: Date) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const k = month < 3 ? month + 12 : month;
  const y = month < 3 ? year - 1 : year;
  const n = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (k + 1)) + day - 1524.5;
  const phase = ((n - 2451550.1) / 29.53058867) % 1;
  return (phase + 1) % 1;
}

export function monthMoonEvents(year: number, month0: number): MoonEvent[] {
  const start = new Date(Date.UTC(year, month0, 1));
  const end = new Date(Date.UTC(year, month0 + 1, 0));
  const labels = [
    { p: 0.00, label: "New Moon" as const },
    { p: 0.25, label: "First Quarter" as const },
    { p: 0.50, label: "Full Moon" as const },
    { p: 0.75, label: "Last Quarter" as const }
  ];
  const events: MoonEvent[] = [];
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const f = phaseFraction(d);
    for (const q of labels) {
      let delta = Math.abs(f - q.p);
      delta = Math.min(delta, 1 - delta);
      if (delta < 0.04) { // ~1.2 days tolerance
        events.push({ date: d.toISOString().slice(0, 10), label: q.label });
        break;
      }
    }
  }
  const map = new Map<string, MoonEvent>();
  for (const e of events) if (!map.has(e.date)) map.set(e.date, e);
  return [...map.values()];
}
