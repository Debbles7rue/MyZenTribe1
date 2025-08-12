"use client";

import { Dialog } from "@headlessui/react";
import { useEffect, useState } from "react";

type Wx = { tempC?: number; pop?: number };

export default function EventDetails({
  event,
  onClose,
}: {
  event: any | null;
  onClose: () => void;
}) {
  const [wx, setWx] = useState<Wx | null>(null);

  // Lightweight weather using Open-Meteo (no key needed)
  useEffect(() => {
    const run = async () => {
      if (!event?.latitude || !event?.longitude || !event?.start_time) {
        setWx(null);
        return;
      }
      const lat = event.latitude;
      const lon = event.longitude;
      const start = new Date(event.start_time);
      const y = start.getUTCFullYear();
      const m = String(start.getUTCMonth() + 1).padStart(2, "0");
      const d = String(start.getUTCDate()).padStart(2, "0");
      const h = String(start.getUTCHours()).padStart(2, "0");

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation_probability&start_date=${y}-${m}-${d}&end_date=${y}-${m}-${d}&timezone=UTC`;
      try {
        const res = await fetch(url);
        const data = await res.json();
        const idx = data?.hourly?.time?.indexOf(`${y}-${m}-${d}T${h}:00`);
        if (idx != null && idx >= 0) {
          setWx({
            tempC: data.hourly.temperature_2m?.[idx],
            pop: data.hourly.precipitation_probability?.[idx],
          });
        } else {
          setWx(null);
        }
      } catch {
        setWx(null);
      }
    };
    run();
  }, [event]);

  return (
    <Dialog open={!!event} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-lg">
          <Dialog.Title className="text-lg font-semibold mb-2">
            {event?.title ?? "Event"}
          </Dialog.Title>

          {wx && (
            <div className="mb-3 text-sm rounded-xl border border-neutral-200 p-3 bg-[var(--brand-bg)]">
              <div className="font-medium mb-1">Forecast at event</div>
              <div>
                Temp: {Math.round(wx.tempC ?? 0)}°C (
                {Math.round(((wx.tempC ?? 0) * 9) / 5 + 32)}°F)
              </div>
              <div>Precip: {wx.pop ?? "—"}%</div>
            </div>
          )}

          <p className="text-sm text-neutral-700 whitespace-pre-wrap">
            {event?.description || "No description"}
          </p>
          <div className="mt-4 flex justify-end">
            <button className="btn btn-neutral" onClick={onClose}>Close</button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
